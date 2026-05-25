from __future__ import annotations

import json
from typing import Any

from app.config import settings


HERMES_SYSTEM_PROMPT = """You are Hermes, the personal financial advisor for the {household_name} family's WHITE HOUSE WEALTH OS.

You are direct, warm, data-driven, and genuinely helpful. You know this family's complete financial picture and give specific, actionable advice — never generic platitudes.

FINANCIAL CONTEXT (live data as of today):
{financial_context}

GUIDELINES:
- Reference specific numbers from the family's financial data when relevant
- Prioritize: (1) emergency safety, (2) high-interest debt, (3) goals, (4) wealth building
- Flag urgent issues proactively (promo debt expiring, bills coming due, budget overruns)
- Be encouraging about progress, honest about challenges
- Suggest concrete next steps, not just analysis
- Keep responses concise but complete — this is a command center, not a novel
- Format numbers as dollar amounts with commas
- Never recommend specific securities or give tax advice

You have access to their: accounts, balances, goals, budgets, recent transactions, debt payoff timelines, and FIRE progress.
"""


class AIService:
    """Provider-agnostic AI service for Hermes financial advisor."""

    def __init__(self) -> None:
        self.provider = settings.AI_PROVIDER

    def _build_messages(
        self,
        conversation_history: list[dict],
        system: str,
    ) -> tuple[str, list[dict]]:
        """Return (system_prompt, messages_list) formatted for the active provider."""
        return system, conversation_history

    async def chat(
        self,
        messages: list[dict],
        context: dict | None = None,
        household_name: str = "Johnson",
        stream: bool = False,
    ) -> str:
        """Route to the configured AI provider."""
        system = HERMES_SYSTEM_PROMPT.format(
            household_name=household_name,
            financial_context=json.dumps(context or {}, indent=2, default=str),
        )

        if self.provider == "anthropic":
            return await self._chat_anthropic(system, messages)
        elif self.provider == "openai":
            return await self._chat_openai(system, messages)
        elif self.provider == "ollama":
            return await self._chat_ollama(system, messages)
        else:
            raise ValueError(f"Unknown AI provider: {self.provider}")

    async def _chat_anthropic(self, system: str, messages: list[dict]) -> str:
        import anthropic

        if not settings.ANTHROPIC_API_KEY:
            raise ValueError("ANTHROPIC_API_KEY not configured")

        client = anthropic.AsyncAnthropic(api_key=settings.ANTHROPIC_API_KEY)
        response = await client.messages.create(
            model=settings.ANTHROPIC_MODEL,
            max_tokens=2048,
            system=system,
            messages=messages,
        )
        return response.content[0].text

    async def _chat_openai(self, system: str, messages: list[dict]) -> str:
        from openai import AsyncOpenAI

        if not settings.OPENAI_API_KEY:
            raise ValueError("OPENAI_API_KEY not configured")

        client = AsyncOpenAI(api_key=settings.OPENAI_API_KEY)
        full_messages = [{"role": "system", "content": system}] + messages
        response = await client.chat.completions.create(
            model=settings.OPENAI_MODEL,
            messages=full_messages,
            max_tokens=2048,
            temperature=0.7,
        )
        return response.choices[0].message.content or ""

    async def _chat_ollama(self, system: str, messages: list[dict]) -> str:
        import httpx

        full_messages = [{"role": "system", "content": system}] + messages
        async with httpx.AsyncClient(timeout=120.0) as client:
            response = await client.post(
                f"{settings.OLLAMA_BASE_URL}/api/chat",
                json={
                    "model": settings.OLLAMA_MODEL,
                    "messages": full_messages,
                    "stream": False,
                },
            )
            response.raise_for_status()
            data = response.json()
            return data.get("message", {}).get("content", "")

    async def get_financial_briefing(self, household_data: dict) -> str:
        """Generate a Hermes daily financial briefing."""
        today_summary = household_data.get("this_month", {})
        safe_to_spend = household_data.get("safe_to_spend", {})
        goals = household_data.get("goals", [])
        net_worth = household_data.get("net_worth", {})
        forecast = household_data.get("forecast", {})
        household_name = household_data.get("household_name", "Family")

        prompt = f"""Generate a concise daily financial briefing for the {household_name} family.

FINANCIAL SNAPSHOT:
- Safe to Spend: ${safe_to_spend.get('safe_to_spend', 0):,.0f}
- Net Worth: ${net_worth.get('total', 0):,.0f}
- This Month: Income ${today_summary.get('income', 0):,.0f} | Expenses ${today_summary.get('expenses', 0):,.0f} | Net ${today_summary.get('net', 0):+,.0f}
- 30-Day Projected Balance: ${forecast.get('projections', [{}])[0].get('projected_balance', 0) if forecast.get('projections') else 0:,.0f}

GOALS STATUS:
{json.dumps([{'name': g['name'], 'progress': f"{g['progress_pct']:.0f}%", 'remaining': f"${g['target_amount'] - g['current_amount']:,.0f}"} for g in goals[:5]], indent=2)}

Write the briefing in 3-4 short paragraphs: (1) headline status, (2) immediate attention items, (3) one positive highlight, (4) today's recommended action. Be specific with numbers. Tone: confident advisor, not a robot."""

        context = household_data
        messages = [{"role": "user", "content": prompt}]
        return await self.chat(messages, context=context, household_name=household_name)

    async def analyze_scenario(self, scenario: dict, financial_state: dict) -> str:
        """AI narrative analysis of a scenario result."""
        household_name = financial_state.get("household_name", "family")
        verdict = scenario.get("verdict", "CAUTION")
        scenario_type = scenario.get("type", "scenario")
        logic_trace = scenario.get("logic_trace", [])
        warnings = scenario.get("warnings", [])
        summary = scenario.get("summary", {})

        prompt = f"""Analyze this financial scenario for the {household_name} family and provide a clear, actionable recommendation.

SCENARIO TYPE: {scenario_type.replace('_', ' ').title()}
VERDICT: {verdict}
KEY NUMBERS: {json.dumps(summary, indent=2, default=str)}
ANALYSIS STEPS: {json.dumps(logic_trace, indent=2, default=str)}
WARNINGS: {warnings}

Write a 2-3 paragraph analysis that:
1. Explains the verdict clearly in plain language
2. Highlights the most important financial consideration
3. Gives a specific recommended action with timeline

Be direct and specific. Avoid hedging. This family needs a clear answer."""

        messages = [{"role": "user", "content": prompt}]
        return await self.chat(messages, context=financial_state, household_name=household_name)

    async def get_debt_strategy_advice(self, debt_waterfall: dict, financial_state: dict) -> str:
        """Generate advice on debt payoff strategy."""
        household_name = financial_state.get("household_name", "family")
        method = debt_waterfall.get("method", "avalanche")
        total_interest = debt_waterfall.get("total_interest_paid", 0)
        payoff_date = debt_waterfall.get("payoff_date", "unknown")
        debts = debt_waterfall.get("debts", [])

        prompt = f"""The {household_name} family's debt payoff analysis ({method} method):

DEBTS: {json.dumps([{'name': d['name'], 'balance': f"${d['starting_balance']:,.0f}", 'apr': f"{d['apr']*100:.2f}%", 'payoff_months': d['payoff_months']} for d in debts], indent=2)}
TOTAL INTEREST TO PAY: ${total_interest:,.0f}
DEBT FREE DATE: {payoff_date}

In 2-3 paragraphs:
1. Explain this debt payoff timeline in plain English
2. Identify the most urgent debt and why
3. Give one specific action they can take this month to accelerate payoff

Be encouraging but honest."""

        messages = [{"role": "user", "content": prompt}]
        return await self.chat(messages, context=financial_state, household_name=household_name)


# Singleton instance
ai_service = AIService()
