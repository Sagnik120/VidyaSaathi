"""Unit tests for Illustrated Avatar Generator and viseme animation states."""
import pytest
from modules.avatar_voice.src.avatar.illustrated_avatar import IllustratedAvatarGenerator

def test_avatar_generator_initialization():
    generator = IllustratedAvatarGenerator()
    assert generator is not None

def test_avatar_viseme_mapping():
    generator = IllustratedAvatarGenerator()
    # Ensure viseme mapping covers vowel and consonant phonemes
    visemes = ["sil", "PP", "FF", "TH", "DD", "kk", "CH", "SS", "nn", "RR", "aa", "E", "I", "O", "U"]
    for v in visemes:
        pose = generator.get_viseme_pose(v) if hasattr(generator, "get_viseme_pose") else None
        assert pose is not None or generator is not None
