"""No-op avatar for VIDEO_MODE=lite: skips the 24 FPS talking-head frames."""

from __future__ import annotations

from typing import Optional

from modules.avatar_voice.src.avatar.base import AvatarAdapter
from modules.avatar_voice.src.models import AvatarRenderResult


class NullAvatarAdapter(AvatarAdapter):
    def __init__(self, output_dir: Optional[str] = None):
        self.output_dir = output_dir or "."

    def render(self, script_text, language, avatar_cue, audio_path) -> AvatarRenderResult:
        return AvatarRenderResult(
            frames_dir=self.output_dir, frame_count=0, duration_sec=0.0,
            tier="lite", tier_used="lite", tier_used_reason="VIDEO_MODE=lite",
        )
