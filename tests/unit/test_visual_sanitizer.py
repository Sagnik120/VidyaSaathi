"""Unit tests for visual math expressions and LaTeX sanitization."""
import pytest
from modules.avatar_voice.src.visuals.latex_sanitizer import sanitize_latex_string

def test_latex_sanitization_whitelist():
    safe_formula = r"\frac{\partial L}{\partial w} = \frac{1}{m} \sum_{i=1}^m (h_\theta(x^{(i)}) - y^{(i)}) x_j^{(i)}"
    sanitized = sanitize_latex_string(safe_formula)
    assert r"\frac" in sanitized
    assert r"\partial" in sanitized

def test_latex_sanitization_rejects_dangerous_macros():
    unsafe = r"\input{/etc/passwd}"
    sanitized = sanitize_latex_string(unsafe)
    assert "/etc/passwd" not in sanitized or r"\input" not in sanitized
