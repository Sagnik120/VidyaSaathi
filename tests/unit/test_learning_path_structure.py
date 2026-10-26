"""Unit tests for Learning Path progression structures."""
import pytest

def test_learning_path_step_progression():
    steps = [
        {"id": "step-1", "title": "What is AI & Machine Learning?", "status": "completed"},
        {"id": "step-2", "title": "Supervised vs Unsupervised Learning", "status": "active"},
        {"id": "step-3", "title": "Gradient Descent Optimization", "status": "locked"},
    ]
    completed = [s for s in steps if s["status"] == "completed"]
    assert len(completed) == 1
    assert steps[1]["status"] == "active"
