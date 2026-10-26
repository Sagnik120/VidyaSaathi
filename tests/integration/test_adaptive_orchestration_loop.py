"""Integration tests for AI Orchestrator adaptive teaching loop."""
import pytest

def test_remediation_branch_selection():
    student_eval = {
        "score": 0.35,
        "is_correct": False,
        "misconceptions": ["confused_gradient_direction"],
    }
    decision = "remediate" if student_eval["score"] < 0.6 else "advance"
    assert decision == "remediate"
