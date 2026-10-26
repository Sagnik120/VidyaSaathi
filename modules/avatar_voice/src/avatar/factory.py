"""Avatar Factory supporting Tier 1 (Viseme) and Tier 2 (MuseTalk) resolution."""

import os
from typing import Optional
from modules.avatar_voice.src.avatar.base import AvatarAdapter
from modules.avatar_voice.src.avatar.viseme_avatar import VisemeAvatarAdapter
from modules.avatar_voice.src.avatar.musetalk_avatar import MuseTalkAvatarAdapter


class AvatarFactory:
    """Factory for resolving and instantiating avatar generation adapters."""

    @staticmethod
    def get_adapter(
        engine: str = "auto",
        checkpoint_dir: Optional[str] = None,
        output_dir: Optional[str] = None,
        test_mode: bool = False,
    ) -> AvatarAdapter:
        """Resolve avatar adapter based on requested tier.

        Options:
            - 'auto': Attempts Tier 2 MuseTalk if GPU & weights exist; falls back to Tier 1.
            - 'tier1' / 'viseme': Strictly Tier 1 2D procedural visemes.
            - 'tier2' / 'musetalk': Strictly Tier 2 neural MuseTalk (errors if prerequisites missing).
        """
        if os.getenv("VIDEO_MODE", "full").strip().lower() == "lite":
            from modules.avatar_voice.src.avatar.null_avatar import NullAvatarAdapter
            return NullAvatarAdapter(output_dir=output_dir)

        engine_key = (engine or "auto").strip().lower()

        if engine_key in ("tier1", "viseme", "procedural"):
            return VisemeAvatarAdapter(output_dir=output_dir)

        if engine_key in ("illustrated", "tier1.5"):
            from modules.avatar_voice.src.avatar.illustrated_avatar import IllustratedAvatarAdapter
            return IllustratedAvatarAdapter(output_dir=output_dir)

        if engine_key in ("tier2", "musetalk", "neural"):
            return MuseTalkAvatarAdapter(
                checkpoint_dir=checkpoint_dir,
                output_dir=output_dir,
                force_tier2=True,
                test_mode=test_mode,
            )

        # Default: auto-detection with graceful, transparent reporting
        return MuseTalkAvatarAdapter(
            checkpoint_dir=checkpoint_dir,
            output_dir=output_dir,
            force_tier2=False,
            test_mode=test_mode,
        )
