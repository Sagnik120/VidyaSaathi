import json
import logging
from typing import Type, TypeVar
from pydantic import BaseModel, ValidationError
from modules.ai_agent_orchestration.src.adapters.llm_adapter import LLMAdapter
from functools import lru_cache
from pathlib import Path

logger = logging.getLogger(__name__)

T = TypeVar("T", bound=BaseModel)

class BaseAgent:
    """Base utility for all AI agents providing robust JSON-mode LLM calling."""
    
    def __init__(self, llm_adapter: LLMAdapter):
        self.llm = llm_adapter
        self.prompts_dir = Path(__file__).parent.parent / "prompts"

    def load_prompt(self, filename: str) -> str:
        """Load a system prompt template from the prompts directory."""
        return _read_prompt(str(self.prompts_dir / filename))

    @staticmethod
    def to_prompt_json(data) -> str:
        """Compact JSON for prompts: no indentation, and raw UTF-8 so Hindi text isn't
        inflated into \\uXXXX escapes (both cut input tokens substantially)."""
        return json.dumps(data, ensure_ascii=False, separators=(",", ":"), default=str)

    def call_llm_json(
        self,
        system_prompt: str,
        user_prompt: str,
        response_model: Type[T],
        max_retries: int = 1
    ) -> T:
        """Call the LLM and enforce structured JSON output matching the Pydantic model."""
        messages = [
            {"role": "system", "content": system_prompt},
            {"role": "user", "content": user_prompt}
        ]
        
        last_error = None
        for attempt in range(max_retries + 1):
            try:
                response_text = self.llm.complete(messages)
                
                # Extract JSON if wrapped in markdown
                if "```json" in response_text:
                    json_str = response_text.split("```json")[1].split("```")[0].strip()
                elif "```" in response_text:
                    json_str = response_text.split("```")[1].split("```")[0].strip()
                else:
                    json_str = response_text.strip()
                    
                data = json.loads(json_str)
                return response_model.model_validate(data)
                
            except (json.JSONDecodeError, ValidationError) as e:
                last_error = e
                logger.warning(f"LLM JSON extraction failed on attempt {attempt}: {e}")
                
                # Repair prompt sequence
                if attempt < max_retries:
                    messages.append({"role": "assistant", "content": response_text})
                    messages.append({
                        "role": "user",
                        "content": f"Your previous response failed validation. Error: {str(e)[:500]}. Please provide a valid JSON matching the exact schema requested, with no extra text or markdown wrappers."
                    })
                    
        raise ValueError(f"Failed to get valid JSON from LLM after {max_retries} retries. Last error: {last_error}")


@lru_cache(maxsize=None)
def _read_prompt(path: str) -> str:
    prompt_path = Path(path)
    if not prompt_path.exists():
        raise FileNotFoundError(f"Prompt file not found: {prompt_path}")
    return prompt_path.read_text(encoding="utf-8")
