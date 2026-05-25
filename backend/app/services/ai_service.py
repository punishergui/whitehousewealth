"""AI service stub — inference is handled by the external Hermes agent.

WHW does not make any AI provider calls itself.
"""
from __future__ import annotations


class AIService:
    async def chat(self, **kwargs) -> str:
        raise NotImplementedError("AI inference is handled by the external Hermes agent")

    async def get_financial_briefing(self, **kwargs) -> str:
        raise NotImplementedError("AI inference is handled by the external Hermes agent")


ai_service = AIService()
