import json
import logging
from typing import Optional, List, Any
from modules.ai_agent_orchestration.src.agents.base import BaseAgent
from modules.ai_agent_orchestration.src.schemas.lesson import LessonNode, LearnerConstraints
from modules.ai_agent_orchestration.src.schemas.teaching import TeachingSegment

logger = logging.getLogger(__name__)

# A narrated minute is roughly this many spoken words, and only part of each
# node's budget is narration (the rest is the checkpoint and thinking time).
SPEAKING_RATE_WPM = 140
TEACH_TIME_SHARE = 0.7
MIN_TARGET_WORDS = 100
MAX_TARGET_WORDS = 600
# Retrieved chunks often overlap; past this many characters extra context adds
# input tokens without improving grounding.
GROUNDING_CHAR_BUDGET = 6000


def compact_grounding(chunks: List[Any]) -> List[str]:
    """Whitespace-normalised, de-duplicated chunks within GROUNDING_CHAR_BUDGET."""
    out, seen, used = [], set(), 0
    for c in chunks:
        text = " ".join((c.text if hasattr(c, "text") else str(c)).split())
        key = text[:200].lower()
        if not text or key in seen:
            continue
        room = GROUNDING_CHAR_BUDGET - used
        if room <= 200:
            break
        text = text[:room]
        seen.add(key)
        out.append(text)
        used += len(text)
    return out


def target_words_for(est_minutes: int) -> int:
    """Words of script that fill `est_minutes` of teaching at a natural pace."""
    raw = int(round((est_minutes or 1) * TEACH_TIME_SHARE * SPEAKING_RATE_WPM))
    return max(MIN_TARGET_WORDS, min(MAX_TARGET_WORDS, raw))


class ExplainerAgent(BaseAgent):
    def generate_segment(
        self,
        node: LessonNode,
        constraints: LearnerConstraints,
        grounding_chunks: Optional[List[Any]] = None,
        previous_feedback: Optional[str] = None
    ) -> TeachingSegment:
        """
        Generate a TeachingSegment from a LessonNode.
        """
        system_prompt = self.load_prompt("explainer_system.md")
        
        target = target_words_for(node.est_minutes)
        user_content = {
            "node": node.model_dump(exclude_none=True),
            "constraints": constraints.model_dump(exclude_none=True),
            "script_length": {
                "target_words": target,
                "min_words": int(target * 0.75),
                "max_words": int(target * 1.25),
            },
        }

        if grounding_chunks:
            # Enforce anti-hallucination when grounding context is present
            user_content["grounding_context"] = compact_grounding(grounding_chunks)
            
        if previous_feedback:
            # Used for MODIFY transitions
            user_content["previous_feedback"] = previous_feedback
            user_content["instruction"] = "The previous explanation was misunderstood or incomplete. You MUST provide a NEW analogy or example to explain the concept. Do not repeat the previous explanation verbatim."
            
        user_prompt = f"Please generate a teaching segment based on the following inputs:\n{self.to_prompt_json(user_content)}"
        
        segment = self.call_llm_json(system_prompt, user_prompt, TeachingSegment, max_retries=2)

        # Segments that come back far under target are why a 15-minute lesson
        # used to render as 38 seconds of video; surface it in the server log.
        words = len(segment.script_text.split())
        logger.info(
            "Explainer node=%s script_words=%s target_words=%s",
            node.node_id, words, target,
        )
        return segment
