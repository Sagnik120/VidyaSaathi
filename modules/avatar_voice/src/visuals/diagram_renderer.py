"""
Diagram Visual Renderer.
Renders structured process flowcharts, concept hierarchies, and network nodes with arrows.
"""

import json
import logging
import os
import uuid
from typing import Any, Dict, List, Union
from PIL import Image, ImageDraw
from modules.avatar_voice.src.models import VisualRenderResult
from modules.avatar_voice.src.visuals.base import BaseRenderer, THEME

logger = logging.getLogger(__name__)


class DiagramRenderer(BaseRenderer):
    """Renders structured diagrams, flowcharts, and concept relationship maps."""

    def render(self, visual_spec: Union[Dict[str, Any], Any]) -> VisualRenderResult:
        content = (
            visual_spec.get("content")
            if isinstance(visual_spec, dict)
            # A VisualSpec model arrives here, not a dict: without the
            # attribute lookup the whole object became "content", no
            # branch below matched it, and every board fell through to
            # placeholder labels.
            else getattr(visual_spec, "content", visual_spec)
        )
        session_id = uuid.uuid4().hex[:8]
        output_path = os.path.join(self.output_dir, f"diagram_{session_id}.png")

        nodes: List[str] = []
        title = "Concept Architecture & Process Flow"

        if isinstance(content, dict):
            title = content.get("title", title)
            if "nodes" in content:
                nodes = [n.get("label", str(n)) if isinstance(n, dict) else str(n) for n in content["nodes"]]
            elif "steps" in content:
                nodes = [str(s) for s in content["steps"]]
        elif isinstance(content, list):
            nodes = [str(x) for x in content]
        elif isinstance(content, str):
            try:
                parsed = json.loads(content)
                if isinstance(parsed, dict):
                    title = parsed.get("title", title)
                    nodes = [str(x) for x in parsed.get("nodes", parsed.get("steps", []))]
                elif isinstance(parsed, list):
                    nodes = [str(x) for x in parsed]
            except Exception:
                nodes = [line.strip() for line in content.split("\n") if line.strip()]
                if not nodes:
                    nodes = [content]

        # Sample labels ("Input Data → Processing Engine") used to render whenever
        # the spec was empty or off-schema, putting unrelated content on a physics
        # board. A takeaway card built from the real title is always topical.
        nodes = [n for n in nodes if str(n).strip()]
        if not nodes:
            logger.warning(
                "Diagram spec had no usable nodes; falling back to a concept takeaway card for %r",
                title,
            )
            return self._render_takeaway_fallback(title, content, output_path)

        img, draw = self.create_canvas(title=title, subtitle="")

        # Ordered "steps" read as a flow; a set of related "nodes" reads better
        # as a concept map around the central idea. A spec may force either.
        layout = content.get("layout") if isinstance(content, dict) else None
        is_steps = isinstance(content, dict) and "steps" in content and "nodes" not in content
        if layout == "hub" or (layout != "flow" and not is_steps and len(nodes) >= 3):
            img = self._render_hub(img, title, nodes[:6])
            img.save(output_path, "PNG")
            return VisualRenderResult(image_path=output_path, width=self.width, height=self.height, visual_type="diagram")

        num_nodes = len(nodes[:5])
        gap = 56
        card_w = min(360, int((1180 - (num_nodes - 1) * gap) / max(1, num_nodes)))
        font_node = self._get_font(32 if num_nodes <= 3 else 28, bold=True)
        font_num = self._get_font(24, bold=True)
        line_h = 44
        wrapped = [self._wrap_label(str(label), max_chars=max(9, card_w // 18), font=font_node, max_px=card_w - 36)[:5] for label in nodes[:5]]
        tallest = max(len(w) for w in wrapped)
        card_h = max(300, 150 + tallest * line_h)
        board_top, board_bottom = 180, self.height - 60
        start_x = (self.width - (num_nodes * card_w + (num_nodes - 1) * gap)) // 2
        start_y = board_top + ((board_bottom - board_top) - card_h) // 2

        colors = [THEME["accent_cyan"], THEME["accent_teal"], THEME["accent_indigo"], THEME["accent_amber"], THEME["accent_rose"]]

        for idx, lines in enumerate(wrapped):
            bx, by = start_x + idx * (card_w + gap), start_y
            accent = colors[idx % len(colors)]
            tint = accent[:3] + (34,)
            # Tinted card with a solid accent spine and a numbered badge.
            draw.rounded_rectangle([bx, by, bx + card_w, by + card_h], radius=24, fill=(15, 23, 42, 230), outline=accent[:3] + (200,), width=3)
            draw.rounded_rectangle([bx + 3, by + 3, bx + card_w - 3, by + card_h - 3], radius=22, fill=tint)
            draw.rounded_rectangle([bx + 3, by + 3, bx + card_w - 3, by + 14], radius=8, fill=accent)
            cxn = bx + card_w // 2
            draw.ellipse([cxn - 30, by + 40, cxn + 30, by + 100], fill=accent)
            draw.text((cxn, by + 70), str(idx + 1), fill=(15, 23, 42, 255), font=font_num, anchor="mm")

            text_y = by + 100 + (card_h - 100 - len(lines) * line_h) // 2 + line_h // 2
            for l in lines:
                draw.text((cxn, text_y), l, fill=THEME["text_main"], font=font_node, anchor="mm")
                text_y += line_h

            if idx < num_nodes - 1:
                ax0, ay = bx + card_w + 10, by + card_h // 2
                ax1 = ax0 + gap - 20
                draw.line([(ax0, ay), (ax1 - 8, ay)], fill=THEME["accent_cyan"], width=6)
                draw.polygon([(ax1 - 14, ay - 12), (ax1 + 2, ay), (ax1 - 14, ay + 12)], fill=THEME["accent_cyan"])

        img.save(output_path, "PNG")

        return VisualRenderResult(
            image_path=output_path,
            width=self.width,
            height=self.height,
            visual_type="diagram",
        )

    # -- helpers -------------------------------------------------------------

    def _render_hub(self, img: Image.Image, title: str, nodes: List[str]) -> Image.Image:
        """Concept map: a glowing central idea with curved links to related ideas."""
        import math
        from PIL import ImageFilter

        cx, cy = self.width // 2, 610
        rx, ry = 430, 300
        colors = [THEME["accent_cyan"], THEME["accent_teal"], THEME["accent_indigo"], THEME["accent_amber"], THEME["accent_rose"], THEME["accent_cyan"]]
        n = len(nodes)
        pts = [(cx + int(rx * math.cos(-math.pi / 2 + 2 * math.pi * i / n)),
                cy + int(ry * math.sin(-math.pi / 2 + 2 * math.pi * i / n))) for i in range(n)]

        # soft glow behind the hub
        glow = Image.new("RGBA", img.size, (0, 0, 0, 0))
        ImageDraw.Draw(glow).ellipse([cx - 170, cy - 170, cx + 170, cy + 170], fill=(6, 182, 212, 90))
        img = img.convert("RGBA")
        img.alpha_composite(glow.filter(ImageFilter.GaussianBlur(40)))
        img = img.convert("RGB")
        draw = ImageDraw.Draw(img, "RGBA")

        # curved links (quadratic bezier bowed sideways)
        for (px, py), col in zip(pts, colors):
            mx, my = (cx + px) / 2, (cy + py) / 2
            nx, ny = -(py - cy) * 0.18, (px - cx) * 0.18
            curve = [((1 - t) ** 2 * cx + 2 * (1 - t) * t * (mx + nx) + t * t * px,
                      (1 - t) ** 2 * cy + 2 * (1 - t) * t * (my + ny) + t * t * py) for t in [i / 40 for i in range(41)]]
            draw.line(curve, fill=col[:3] + (170,), width=5, joint="curve")

        # hub
        draw.ellipse([cx - 125, cy - 125, cx + 125, cy + 125], fill=(15, 23, 42, 255), outline=THEME["accent_cyan"], width=5)
        hub_font = self._get_font(30, bold=True)
        lines = self._wrap_label(title, 14, font=hub_font, max_px=210)[:4]
        y = cy - (len(lines) - 1) * 19
        for line in lines:
            draw.text((cx, y), line, fill=THEME["text_main"], font=hub_font, anchor="mm")
            y += 38

        # satellites
        font = self._get_font(26, bold=True)
        for i, ((px, py), label, col) in enumerate(zip(pts, nodes, colors)):
            lines = self._wrap_label(str(label), 18, font=font, max_px=270)[:3]
            bw = max(200, min(330, max(int(draw.textlength(l, font=font)) for l in lines) + 56))
            bh = 34 + len(lines) * 36
            box = [px - bw // 2, py - bh // 2, px + bw // 2, py + bh // 2]
            draw.rounded_rectangle(box, radius=22, fill=(15, 23, 42, 245), outline=col, width=3)
            draw.rounded_rectangle([box[0] + 3, box[1] + 3, box[2] - 3, box[3] - 3], radius=20, fill=col[:3] + (30,))
            draw.ellipse([box[0] - 16, py - 16, box[0] + 16, py + 16], fill=col)
            draw.text((box[0], py), str(i + 1), fill=(15, 23, 42, 255), font=self._get_font(18, bold=True), anchor="mm")
            ty = py - (len(lines) - 1) * 18
            for l in lines:
                draw.text((px + 6, ty), l, fill=THEME["text_main"], font=font, anchor="mm")
                ty += 36
        return img

    def _wrap_label(self, label: str, max_chars: int, font: Any = None, max_px: int = 0) -> List[str]:
        """Word-wrap a node label so long stage names stay inside their card.
        With a font, wrap by rendered width: Hindi has far more code points per
        visible letter, so character counts let it spill out of the box."""
        lines: List[str] = []
        current = ""
        measure = ImageDraw.Draw(Image.new("RGB", (1, 1))) if font is not None and max_px else None
        for word in label.split():
            candidate = f"{current} {word}".strip()
            too_long = measure.textlength(candidate, font=font) > max_px if measure else len(candidate) > max_chars
            if current and too_long:
                lines.append(current)
                current = word
            else:
                current = candidate
        if current:
            lines.append(current)
        return lines or [label]

    def _render_takeaway_fallback(self, title: str, content: Any, output_path: str) -> VisualRenderResult:
        """Title + concept takeaway card, used when the spec has no usable nodes."""
        img, draw = self.create_canvas(title=title, subtitle="")

        body = content if isinstance(content, str) else ""
        if isinstance(content, dict):
            body = str(content.get("summary") or content.get("description") or "")

        bullets: List[str] = []
        for sentence in str(body).replace("\n", " ").split(". "):
            sentence = sentence.strip(" .")
            if sentence:
                bullets.append(sentence)
        bullets = bullets[:4]

        font_bullet = self._get_font(36)
        y = 300
        for bullet in bullets:
            for i, line in enumerate(self._wrap_label(bullet, max_chars=58)[:2]):
                if i == 0:
                    draw.ellipse([110, y + 14, 128, y + 32], fill=THEME["accent_cyan"])
                draw.text((160, y), line, fill=THEME["text_main"], font=font_bullet)
                y += 50
            y += 24

        if not bullets:
            font_note = self._get_font(40)
            draw.text(
                (self.width // 2, (self.height + 140) // 2),
                title,
                fill=THEME["text_main"], font=font_note, anchor="mm",
            )

        img.save(output_path, "PNG")
        return VisualRenderResult(
            image_path=output_path,
            width=self.width,
            height=self.height,
            visual_type="diagram",
        )
