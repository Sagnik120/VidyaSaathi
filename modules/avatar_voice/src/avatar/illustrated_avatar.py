"""
Illustrated 2D Avatar Adapter (Tier 1.5).
A shaded, supersampled teacher portrait with blinking, gentle head motion and
six mouth shapes chosen from the narration's energy and brightness (RMS + zero
crossing rate). CPU only. Any failure falls back to the Tier 1 viseme avatar.
"""

import io
import logging
import math
import os
import random
import shutil
import subprocess
import tempfile
import uuid
import wave
from typing import Dict, List, Optional, Tuple

import numpy as np
from PIL import Image, ImageChops, ImageDraw, ImageFilter

from modules.avatar_voice.src.avatar.viseme_avatar import VisemeAvatarAdapter
from modules.avatar_voice.src.models import AvatarRenderResult

logger = logging.getLogger(__name__)

SS = 2                      # supersampling factor; drawn at 2x, downscaled
W, H = 576, 432             # output frame size (matches the compositor's PIP)
FPS = 24
MIN_HOLD = 2                # frames a mouth shape is held, to avoid jitter

SKIN = (214, 158, 120)
SKIN_SHADE = (176, 118, 86)
HAIR = (38, 28, 24)
HAIR_LIGHT = (70, 52, 44)
TOP = (34, 112, 120)        # teal top, close to the site's sky/sage family
TOP_DARK = (24, 82, 90)
CARDIGAN = (232, 226, 212)
LIP = (166, 84, 78)
MOUTH_IN = (92, 36, 40)
TEETH = (246, 242, 236)
TONGUE = (196, 98, 100)
IRIS = (74, 46, 32)


def _ffmpeg() -> Optional[str]:
    path = shutil.which("ffmpeg")
    if path:
        return path
    try:
        import imageio_ffmpeg
        return imageio_ffmpeg.get_ffmpeg_exe()
    except Exception:
        return None


class IllustratedAvatarAdapter:
    """Tier 1.5: polished illustrated teacher, CPU-only, with automatic fallback."""

    def __init__(self, output_dir: Optional[str] = None):
        self.output_dir = output_dir or os.path.join(tempfile.gettempdir(), "shikshak_avatar")
        os.makedirs(self.output_dir, exist_ok=True)
        self.width, self.height, self.fps = W, H, FPS
        self.fallback = VisemeAvatarAdapter(output_dir=output_dir)
        self._body: Optional[Image.Image] = None
        self._cache: Dict[Tuple, bytes] = {}

    # ── public ────────────────────────────────────────────────────────────
    def render(
        self, script_text: str, language: str, avatar_cue: str = "neutral", audio_path: str = ""
    ) -> AvatarRenderResult:
        try:
            return self._render(audio_path)
        except Exception as exc:  # never let the avatar break a lesson
            logger.warning("Illustrated avatar failed (%s); using Tier 1 viseme avatar.", exc)
            return self.fallback.render(script_text, language, avatar_cue, audio_path)

    # ── pipeline ──────────────────────────────────────────────────────────
    def _render(self, audio_path: str) -> AvatarRenderResult:
        frames_dir = os.path.join(self.output_dir, f"avatar_{uuid.uuid4().hex[:8]}")
        os.makedirs(frames_dir, exist_ok=True)

        rms, zcr, duration = self._analyse(audio_path)
        mouths = self._mouth_track(rms, zcr)
        blinks = self._blink_track(len(mouths))
        rng = random.Random(7)
        phase = rng.uniform(0, math.pi)

        for i, mouth in enumerate(mouths):
            t = i / FPS
            # Slow sway plus a small lift on stressed syllables.
            dy = round(2.2 * math.sin(t * 1.4 + phase) - 2.0 * rms[i])
            dx = round(1.2 * math.sin(t * 0.7))
            brow = 1 if rms[i] > 0.8 else 0
            key = (mouth, blinks[i], dx, dy, brow)
            data = self._cache.get(key)
            if data is None:
                buf = io.BytesIO()
                self._sprite(*key).save(buf, "PNG", compress_level=1)
                data = self._cache[key] = buf.getvalue()
            with open(os.path.join(frames_dir, f"frame_{i:05d}.png"), "wb") as fh:
                fh.write(data)

        return AvatarRenderResult(
            frames_dir=frames_dir,
            frame_count=len(mouths),
            fps=FPS,
            duration_sec=duration,
            is_transparent=True,
            tier="tier1_illustrated",
            tier_used="tier1_illustrated",
            tier_used_reason="Tier 1.5 illustrated avatar (shaded portrait, blink, 6 visemes; CPU mode)",
        )

    # ── audio ─────────────────────────────────────────────────────────────
    def _samples(self, audio_path: str) -> Tuple[np.ndarray, int]:
        try:
            with wave.open(audio_path, "rb") as wf:
                sr, ch, sw, n = wf.getframerate(), wf.getnchannels(), wf.getsampwidth(), wf.getnframes()
                raw = wf.readframes(n)
            if sw != 2:
                raise ValueError("not 16-bit")
            data = np.frombuffer(raw, dtype="<i2").astype(np.float32)
            if ch > 1:
                data = data.reshape(-1, ch).mean(axis=1)
            return data, sr
        except Exception:
            ff = _ffmpeg()
            if not ff:
                raise
            out = subprocess.run(
                [ff, "-v", "error", "-i", audio_path, "-f", "s16le", "-ac", "1", "-ar", "16000", "-"],
                capture_output=True, check=True, timeout=60,
            ).stdout
            return np.frombuffer(out, dtype="<i2").astype(np.float32), 16000

    def _analyse(self, audio_path: str) -> Tuple[List[float], List[float], float]:
        if not audio_path or not os.path.exists(audio_path):
            n = int(3.0 * FPS)
            return [0.2 + 0.4 * abs(math.sin(i * 0.4)) for i in range(n)], [0.1] * n, 3.0
        data, sr = self._samples(audio_path)
        duration = len(data) / float(sr)
        spf = max(1, int(sr / FPS))
        n = max(1, int(duration * FPS))
        data = np.pad(data, (0, max(0, n * spf - len(data))))[: n * spf].reshape(n, spf)
        rms = np.sqrt((data ** 2).mean(axis=1))
        zcr = (np.abs(np.diff(np.sign(data), axis=1)) > 0).mean(axis=1)
        peak = np.percentile(rms, 95) or 1.0
        rms = np.clip(rms / peak, 0, 1)
        # Fast attack, slower release: jaws open quickly and close softly.
        smooth = np.empty_like(rms)
        level = 0.0
        for i, v in enumerate(rms):
            level = v if v > level else level * 0.55 + v * 0.45
            smooth[i] = level
        return smooth.tolist(), zcr.tolist(), round(duration, 2)

    @staticmethod
    def _mouth_track(rms: List[float], zcr: List[float]) -> List[str]:
        track, last, held = [], "rest", MIN_HOLD
        for e, z in zip(rms, zcr):
            if e < 0.12:
                want = "rest"
            elif e < 0.3:
                want = "slight"
            elif z > 0.22:
                want = "ee"          # bright/fricative sounds: wide, teeth
            elif e > 0.75:
                want = "wide"
            elif z < 0.07:
                want = "oo"          # dark, rounded vowels
            else:
                want = "mid"
            if want != last and (held >= MIN_HOLD or want == "rest"):
                last, held = want, 1
            else:
                held += 1
            track.append(last)
        return track

    @staticmethod
    def _blink_track(n: int) -> List[int]:
        rng = random.Random(11)
        out = [0] * n
        i = int(FPS * rng.uniform(1.0, 2.5))
        while i < n:
            for k, state in enumerate((1, 2, 2, 1)):   # half, shut, shut, half
                if i + k < n:
                    out[i + k] = state
            i += int(FPS * rng.uniform(2.5, 5.0))
        return out

    # ── drawing ───────────────────────────────────────────────────────────
    def _body_layer(self) -> Image.Image:
        if self._body is not None:
            return self._body
        w, h = W * SS, H * SS
        cx = w // 2
        img = Image.new("RGBA", (w, h), (0, 0, 0, 0))

        shadow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        ImageDraw.Draw(shadow).rounded_rectangle([cx - 330, 580, cx + 330, h + 200], radius=150, fill=(0, 0, 0, 110))
        img.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(28)))

        d = ImageDraw.Draw(img)
        # Shoulders: a wide rounded torso, sloping arms, top under an open cardigan.
        d.rounded_rectangle([cx - 310, 572, cx + 310, h + 200], radius=150, fill=CARDIGAN)
        d.polygon([(cx - 150, 577), (cx + 150, 577), (cx + 190, h), (cx - 190, h)], fill=TOP)
        d.line([(cx - 150, 579), (cx - 196, h)], fill=(206, 198, 182), width=8)
        d.line([(cx + 150, 579), (cx + 196, h)], fill=(206, 198, 182), width=8)
        d.line([(cx - 250, 760), (cx - 262, h)], fill=(214, 206, 190), width=5)   # arm creases
        d.line([(cx + 250, 760), (cx + 262, h)], fill=(214, 206, 190), width=5)
        d.rounded_rectangle([cx - 82, 470, cx + 82, 600], radius=40, fill=SKIN)  # neck
        d.polygon([(cx - 96, 572), (cx + 96, 572), (cx, 690)], fill=SKIN)     # V-neck
        d.line([(cx - 100, 572), (cx, 695), (cx + 100, 572)], fill=TOP_DARK, width=10, joint="curve")
        # neck shadow under the chin
        sh = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        ImageDraw.Draw(sh).ellipse([cx - 100, 450, cx + 100, 560], fill=SKIN_SHADE + (210,))
        mask = Image.new("L", (w, h), 0)
        ImageDraw.Draw(mask).rounded_rectangle([cx - 82, 470, cx + 82, 600], radius=40, fill=255)
        sh = sh.filter(ImageFilter.GaussianBlur(14))
        sh.putalpha(ImageChops.multiply(sh.getchannel("A"), mask))
        img.alpha_composite(sh)
        self._body = img
        return img

    def _sprite(self, mouth: str, blink: int, dx: int, dy: int, brow: int) -> Image.Image:
        w, h = W * SS, H * SS
        img = self._body_layer().copy()
        head = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        d = ImageDraw.Draw(head)
        cx, cy = w // 2, 330
        fx0, fy0, fx1, fy1 = cx - 150, cy - 185, cx + 150, cy + 185

        # back hair (shoulder length)
        # Chin-length bob: ends at the jaw so the neck stays visible.
        d.rounded_rectangle([cx - 192, cy - 210, cx + 192, cy + 150], radius=150, fill=HAIR)
        # ears
        for sx in (-1, 1):
            d.ellipse([cx + sx * 150 - 24, cy - 10, cx + sx * 150 + 24, cy + 62], fill=SKIN_SHADE)
        # face with soft side shading and blush
        d.ellipse([fx0, fy0, fx1, fy1], fill=SKIN)
        face_mask = Image.new("L", (w, h), 0)
        ImageDraw.Draw(face_mask).ellipse([fx0, fy0, fx1, fy1], fill=255)
        shade = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        sd = ImageDraw.Draw(shade)
        sd.ellipse([fx0 + 190, fy0 - 20, fx1 + 120, fy1 + 40], fill=SKIN_SHADE + (105,))
        sd.ellipse([fx0 - 40, fy0 - 120, fx1 + 40, fy0 + 70], fill=SKIN_SHADE + (120,))   # under-fringe
        for sx in (-1, 1):
            sd.ellipse([cx + sx * 88 - 40, cy + 52, cx + sx * 88 + 40, cy + 92], fill=(226, 120, 110, 90))
        shade = shade.filter(ImageFilter.GaussianBlur(26))
        shade.putalpha(ImageChops.multiply(shade.getchannel("A"), face_mask))
        head.alpha_composite(shade)
        d = ImageDraw.Draw(head)

        # fringe: a side-swept part
        d.chord([cx - 168, cy - 222, cx + 168, cy + 10], 180, 360, fill=HAIR)
        d.ellipse([cx - 192, cy - 215, cx + 80, cy - 72], fill=HAIR)          # swoop over the left brow
        d.ellipse([cx - 196, cy - 140, cx - 110, cy + 60], fill=HAIR)         # framing lock
        d.arc([cx - 150, cy - 205, cx + 120, cy - 30], 200, 300, fill=HAIR_LIGHT, width=6)

        # brows
        by = cy - 48 - 8 * brow
        for sx in (-1, 1):
            x0 = cx + sx * 30
            x1 = cx + sx * 102
            d.line([(x0, by + 4), ((x0 + x1) // 2, by - 6), (x1, by + 2)], fill=HAIR, width=11, joint="curve")

        # eyes
        ey = cy + 4
        for sx in (-1, 1):
            ex = cx + sx * 64
            if blink == 2:
                d.arc([ex - 30, ey - 14, ex + 30, ey + 14], 15, 165, fill=HAIR, width=6)
                continue
            top = ey - (8 if blink == 1 else 20)
            d.ellipse([ex - 30, top, ex + 30, ey + 18], fill=(250, 248, 244))
            d.ellipse([ex - 15, ey - 14 if blink == 0 else top, ex + 15, ey + 16], fill=IRIS)
            d.ellipse([ex - 7, ey - 6, ex + 7, ey + 8], fill=(20, 14, 12))
            d.ellipse([ex + 3, ey - 9, ex + 10, ey - 2], fill=(255, 255, 255))
            d.arc([ex - 32, top - 4, ex + 32, ey + 24], 195, 345, fill=HAIR, width=7)      # upper lid line
            d.line([(ex + sx * 30, ey - 6), (ex + sx * 40, ey - 14)], fill=HAIR, width=5)  # lash flick

        # nose
        d.arc([cx - 22, cy + 34, cx + 22, cy + 76], 20, 160, fill=SKIN_SHADE, width=6)

        self._mouth(d, cx, cy + 112, mouth)

        if dx or dy:
            head = ImageChops.offset(head, dx * SS, dy * SS)
        img.alpha_composite(head)
        return img.resize((W, H), Image.LANCZOS)

    @staticmethod
    def _mouth(d: ImageDraw.ImageDraw, mx: int, my: int, shape: str) -> None:
        if shape == "rest":
            d.arc([mx - 42, my - 22, mx + 42, my + 14], 20, 160, fill=LIP, width=8)
            return
        wid, hgt = {
            "slight": (36, 12), "mid": (42, 24), "wide": (48, 38), "oo": (24, 26), "ee": (54, 16),
        }[shape]
        box = [mx - wid, my - hgt // 2, mx + wid, my + hgt]
        d.ellipse(box, fill=MOUTH_IN, outline=LIP, width=7)
        if shape in ("mid", "wide", "ee"):
            d.chord([mx - wid + 8, my - hgt // 2 + 4, mx + wid - 8, my + hgt // 2 + 2], 180, 360, fill=TEETH)
        if shape in ("wide", "mid"):
            d.chord([mx - wid // 2, my + hgt // 3, mx + wid // 2, my + hgt - 4], 0, 180, fill=TONGUE)


IllustratedAvatarGenerator = IllustratedAvatarAdapter
