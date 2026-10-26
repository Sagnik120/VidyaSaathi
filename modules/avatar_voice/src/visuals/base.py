"""
Base interfaces and protocols for visual synthesis renderers.
Canvas target: 1344x1080 (70% viewport of 1920x1080 video canvas).
"""

import os
import tempfile
from typing import Any, Dict, Protocol, Tuple, Union
from PIL import Image, ImageDraw, ImageFont
from modules.avatar_voice.src.models import VisualRenderResult

# Bundled Noto Sans + Noto Sans Devanagari merged into one face, so Hindi and
# mixed Hindi/English board text renders as glyphs instead of tofu boxes.
FONT_DIR = os.path.join(os.path.dirname(__file__), "..", "..", "assets", "fonts")
FONT_REGULAR = os.path.abspath(os.path.join(FONT_DIR, "VidyaSaathiSans-Regular.ttf"))
FONT_BOLD = os.path.abspath(os.path.join(FONT_DIR, "VidyaSaathiSans-Bold.ttf"))
_MPL_READY = False

try:
    from PIL import features as _features
    _HAS_RAQM = bool(_features.check("raqm"))
except Exception:
    _HAS_RAQM = False


def use_board_font_in_matplotlib() -> None:
    """Register the bundled face with matplotlib (once) and make it the default."""
    global _MPL_READY
    if _MPL_READY:
        return
    try:
        import matplotlib
        from matplotlib import font_manager
        for path in (FONT_REGULAR, FONT_BOLD):
            if os.path.exists(path):
                font_manager.fontManager.addfont(path)
        name = font_manager.FontProperties(fname=FONT_REGULAR).get_name()
        matplotlib.rcParams["font.family"] = [name, "DejaVu Sans"]
        # Mathtext keeps its own fonts; plain text uses the bundled face.
        _MPL_READY = True
    except Exception:
        pass

THEME = {
    "bg": (15, 23, 42, 255),
    "card_bg": (30, 41, 59, 255),
    "card_border": (51, 65, 85, 255),
    "text_main": (248, 250, 252, 255),
    "text_muted": (148, 163, 184, 255),
    "accent_cyan": (6, 182, 212, 255),
    "accent_teal": (20, 184, 166, 255),
    "accent_amber": (245, 158, 11, 255),
    "accent_indigo": (99, 102, 241, 255),
    "accent_rose": (244, 63, 94, 255),
}


class VisualRenderer(Protocol):
    """Protocol for specialized subject-aware visual renderers."""

    def render(self, visual_spec: Union[Dict[str, Any], Any]) -> VisualRenderResult:
        """Render the given visual spec into an image asset."""
        ...


class BaseRenderer:
    """Helper base class providing standard 1344x1080 canvas creation and layout tools."""

    def __init__(self, output_dir: str = None):
        self.output_dir = output_dir or os.path.join(tempfile.gettempdir(), "shikshak_visuals")
        os.makedirs(self.output_dir, exist_ok=True)
        self.width = 1344
        self.height = 1080

    def create_canvas(self, title: str = "", subtitle: str = "") -> Tuple[Image.Image, ImageDraw.Draw]:
        """Create a 1344x1080 board: soft gradient, faint grid, bold title, raised content panel."""
        from PIL import ImageFilter

        w, h = self.width, self.height
        # Vertical gradient from the theme background to a slightly lifted navy.
        top, bot = THEME["bg"], (22, 32, 58, 255)
        grad = Image.linear_gradient("L").resize((w, h))
        img = Image.composite(Image.new("RGBA", (w, h), bot), Image.new("RGBA", (w, h), top), grad)
        img = img.convert("RGB")
        draw = ImageDraw.Draw(img, "RGBA")
        for gx in range(40, w, 48):
            for gy in range(40, h, 48):
                draw.point((gx, gy), fill=(148, 163, 184, 40))

        header_bottom = 168 if subtitle else 140
        font_title = self._get_font(50, bold=True)
        img = img.convert("RGBA")
        draw = ImageDraw.Draw(img, "RGBA")
        draw.text((64, 48), title or "Concept Explanation", fill=THEME["text_main"], font=font_title)
        bar_y = header_bottom - (8 if subtitle else 22)
        draw.rounded_rectangle([64, bar_y, 184, bar_y + 8], radius=4, fill=THEME["accent_cyan"])
        draw.rounded_rectangle([192, bar_y, 232, bar_y + 8], radius=4, fill=THEME["accent_amber"])
        if subtitle:
            draw.text((64, 108), subtitle, fill=THEME["text_muted"], font=self._get_font(28))

        panel = [40, header_bottom + 14, w - 40, h - 40]
        shadow = Image.new("RGBA", (w, h), (0, 0, 0, 0))
        ImageDraw.Draw(shadow).rounded_rectangle([panel[0] + 6, panel[1] + 14, panel[2] + 6, panel[3] + 14], radius=28, fill=(0, 0, 0, 120))
        img.alpha_composite(shadow.filter(ImageFilter.GaussianBlur(18)))
        # RGB + an "RGBA" draw blends translucent fills; on RGBA Pillow overwrites.
        img = img.convert("RGB")
        draw = ImageDraw.Draw(img, "RGBA")
        draw.rounded_rectangle(panel, radius=28, fill=(30, 41, 59, 235), outline=(71, 85, 105, 255), width=2)
        draw.line([(panel[0] + 28, panel[1] + 1), (panel[2] - 28, panel[1] + 1)], fill=(148, 163, 184, 70), width=2)

        return img, draw

    def _get_font(self, size: int, bold: bool = False) -> ImageFont.ImageFont:
        """Retrieve appropriate font with cross-platform fallback."""
        try:
            font_names = [
                FONT_BOLD if bold else FONT_REGULAR,
                "Helvetica", "Arial", "DejaVuSans", "NotoSans-Regular",
                "/System/Library/Fonts/Helvetica.ttc",
                "/Library/Fonts/Arial.ttf",
                "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"
            ]
            for fn in font_names:
                try:
                    # Raqm (when libraqm/fribidi are installed) shapes Devanagari
                    # conjuncts and matras; basic layout still draws the glyphs.
                    return ImageFont.truetype(fn, size, layout_engine=ImageFont.Layout.RAQM if _HAS_RAQM else ImageFont.Layout.BASIC)
                except Exception:
                    continue
            return ImageFont.load_default()
        except Exception:
            return ImageFont.load_default()
