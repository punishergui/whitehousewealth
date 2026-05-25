from __future__ import annotations

import uuid
from datetime import date, timedelta
from decimal import Decimal
from typing import Any

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.goal import Goal
from app.models.scenario import Scenario, ScenarioRun
from app.services.dashboard_service import calculate_safe_to_spend, get_debt_waterfall


Verdict = str  # "DO IT" | "CAUTION" | "NOT NOW"


def _step(step: int, label: str, value: Any, explanation: str) -> dict:
    return {"step": step, "label": label, "value": value, "explanation": explanation}


def _verdict(safe_to_spend: float, cost: float, emergency_ok: bool) -> Verdict:
    if cost <= 0:
        return "DO IT"
    if cost > safe_to_spend * 1.5 or not emergency_ok:
        return "NOT NOW"
    if cost > safe_to_spend:
        return "CAUTION"
    return "DO IT"


# ── Vacation Trip ──────────────────────────────────────────────────────────────

async def simulate_vacation_trip(
    db: AsyncSession,
    household_id: uuid.UUID,
    params: dict,
) -> dict[str, Any]:
    """
    params: {
        cost: float,
        vacation_fund_available: float,
        months_to_plan: int,
        financing_interest_rate: float (optional)
    }
    """
    cost = float(params.get("cost", 0))
    vacation_fund = float(params.get("vacation_fund_available", 0))
    months_to_plan = int(params.get("months_to_plan", 1))

    safe = await calculate_safe_to_spend(db, household_id)
    sts = safe["safe_to_spend"]
    emergency_reserve = safe["emergency_reserve"]

    cash_needed = max(0.0, cost - vacation_fund)
    impact_on_safe_spend = min(sts, cash_needed)
    remaining_safe = sts - impact_on_safe_spend

    # Debt delay: if taking on CC debt, how many months longer on payoff?
    debt_delay_months = 0
    if cash_needed > 0 and cash_needed > sts:
        # Financing on CC at default 24.99% APR
        rate = float(params.get("financing_interest_rate", 0.2499)) / 12
        balance = cash_needed - max(0.0, sts)
        min_payment = max(25.0, balance * 0.02)
        months = 0
        while balance > 0.01 and months < 600:
            balance += balance * rate
            balance -= min_payment
            months += 1
        debt_delay_months = months

    emergency_impact = 0.0
    emergency_ok = True
    if cash_needed > sts:
        potential_overdraft = cash_needed - sts
        if potential_overdraft > emergency_reserve * 0.25:
            emergency_ok = False
            emergency_impact = -potential_overdraft

    warnings = []
    if cash_needed > sts:
        warnings.append(f"Trip costs ${cash_needed:,.0f} more than your safe-to-spend of ${sts:,.0f}.")
    if months_to_plan > 1:
        monthly_savings_needed = cash_needed / months_to_plan
        if monthly_savings_needed > sts * 0.3:
            warnings.append(f"Saving ${monthly_savings_needed:,.0f}/month for this trip may strain your budget.")
    if debt_delay_months > 12:
        warnings.append(f"Financing could add {debt_delay_months} months to your debt payoff timeline.")

    trace = [
        _step(1, "Trip Cost", f"${cost:,.2f}", "Total estimated cost of the vacation"),
        _step(2, "Vacation Fund Available", f"${vacation_fund:,.2f}", "Current balance in vacation/sinking fund"),
        _step(3, "Cash Needed (Gap)", f"${cash_needed:,.2f}", "Amount needed beyond existing vacation fund"),
        _step(4, "Safe-to-Spend Available", f"${sts:,.2f}", "Current liquid cash after all obligations"),
        _step(5, "Impact on Safe-to-Spend", f"-${impact_on_safe_spend:,.2f}", "Reduction to your available spending buffer"),
        _step(6, "Remaining Safe-to-Spend", f"${remaining_safe:,.2f}", "What's left after paying for the trip"),
    ]
    if debt_delay_months > 0:
        trace.append(_step(7, "Debt Payoff Delay", f"{debt_delay_months} months", "Additional time to pay off financed portion"))

    verdict = _verdict(sts, cash_needed, emergency_ok)

    return {
        "verdict": verdict,
        "cash_impact": -cash_needed,
        "emergency_impact": emergency_impact,
        "debt_timeline_impact": debt_delay_months * 30,
        "retirement_impact": 0.0,
        "warnings": warnings,
        "logic_trace": trace,
        "summary": {
            "cost": cost,
            "vacation_fund_available": vacation_fund,
            "cash_needed": cash_needed,
            "impact_on_safe_spend": impact_on_safe_spend,
            "debt_delay_months": debt_delay_months,
        },
    }


# ── Major Purchase ─────────────────────────────────────────────────────────────

async def simulate_major_purchase(
    db: AsyncSession,
    household_id: uuid.UUID,
    params: dict,
) -> dict[str, Any]:
    """
    params: {
        cost: float,
        down_payment: float,
        loan_interest_rate: float,
        loan_term_months: int,
        item_name: str
    }
    """
    cost = float(params.get("cost", 0))
    down_payment = float(params.get("down_payment", 0))
    rate = float(params.get("loan_interest_rate", 0.0599)) / 12
    term = int(params.get("loan_term_months", 60))
    item_name = str(params.get("item_name", "item"))

    loan_amount = max(0.0, cost - down_payment)

    # Monthly payment calculation (standard amortization)
    if rate > 0 and loan_amount > 0:
        monthly_payment = loan_amount * (rate * (1 + rate) ** term) / ((1 + rate) ** term - 1)
    else:
        monthly_payment = loan_amount / term if term > 0 else 0.0

    total_interest = (monthly_payment * term) - loan_amount if rate > 0 else 0.0

    safe = await calculate_safe_to_spend(db, household_id)
    sts = safe["safe_to_spend"]
    emergency_reserve = safe["emergency_reserve"]

    cash_impact = -down_payment
    can_afford_down = down_payment <= sts
    can_afford_payment = monthly_payment <= sts * 0.3

    emergency_ok = down_payment <= emergency_reserve * 0 or down_payment <= sts

    warnings = []
    if not can_afford_down:
        warnings.append(f"Down payment of ${down_payment:,.0f} exceeds safe-to-spend (${sts:,.0f}).")
    if not can_afford_payment:
        warnings.append(f"Monthly payment of ${monthly_payment:,.0f} is >30% of your safe-to-spend.")
    if total_interest > cost * 0.3:
        warnings.append(f"Total interest of ${total_interest:,.0f} is significant — consider a larger down payment.")

    trace = [
        _step(1, "Purchase Price", f"${cost:,.2f}", f"Total cost of the {item_name}"),
        _step(2, "Down Payment", f"${down_payment:,.2f}", "Immediate cash outlay"),
        _step(3, "Loan Amount", f"${loan_amount:,.2f}", "Amount financed"),
        _step(4, "Monthly Payment", f"${monthly_payment:,.2f}", f"Payment over {term} months at {rate*12*100:.2f}% APR"),
        _step(5, "Total Interest", f"${total_interest:,.2f}", "True cost of financing"),
        _step(6, "Safe-to-Spend Impact", f"-${down_payment:,.2f}", "Immediate reduction to your liquid buffer"),
        _step(7, "Monthly Budget Impact", f"-${monthly_payment:,.2f}/mo", "Ongoing reduction to monthly cash flow"),
    ]

    verdict = "DO IT" if (can_afford_down and can_afford_payment) else ("CAUTION" if can_afford_payment else "NOT NOW")

    return {
        "verdict": verdict,
        "cash_impact": cash_impact,
        "emergency_impact": 0.0,
        "debt_timeline_impact": 0,
        "retirement_impact": -(monthly_payment * 12 * 0.07),  # opportunity cost estimate
        "warnings": warnings,
        "logic_trace": trace,
        "summary": {
            "cost": cost,
            "down_payment": down_payment,
            "loan_amount": loan_amount,
            "monthly_payment": round(monthly_payment, 2),
            "total_interest": round(total_interest, 2),
            "loan_term_months": term,
        },
    }


# ── Income Change ──────────────────────────────────────────────────────────────

async def simulate_income_change(
    db: AsyncSession,
    household_id: uuid.UUID,
    params: dict,
) -> dict[str, Any]:
    """
    params: {
        new_monthly_income: float,
        current_monthly_income: float,
        is_permanent: bool
    }
    """
    new_income = float(params.get("new_monthly_income", 0))
    current_income = float(params.get("current_monthly_income", 0))
    is_permanent = bool(params.get("is_permanent", True))

    monthly_delta = new_income - current_income
    annual_delta = monthly_delta * 12

    safe = await calculate_safe_to_spend(db, household_id)
    sts = safe["safe_to_spend"]

    # Estimate months of runway change
    if monthly_delta < 0:
        expense_coverage = sts / abs(monthly_delta) if monthly_delta != 0 else 999
        runway_change = f"-{expense_coverage:.1f} months of runway if sustained"
    else:
        runway_change = f"+{monthly_delta/max(1,sts)*100:.0f}% improvement to monthly surplus"

    # Debt payoff acceleration
    waterfall = await get_debt_waterfall(db, household_id, "avalanche", max(0.0, monthly_delta))
    original_waterfall = await get_debt_waterfall(db, household_id, "avalanche", 0.0)
    debt_acceleration_months = original_waterfall["total_months"] - waterfall["total_months"]

    warnings = []
    if monthly_delta < 0:
        warnings.append(f"Income reduction of ${abs(monthly_delta):,.0f}/month will tighten your budget significantly.")
    if monthly_delta < -safe["imminent_obligations"]:
        warnings.append("New income may not cover your immediate financial obligations.")

    trace = [
        _step(1, "Current Monthly Income", f"${current_income:,.2f}", "Your current take-home income"),
        _step(2, "New Monthly Income", f"${new_income:,.2f}", "Projected new take-home income"),
        _step(3, "Monthly Delta", f"${monthly_delta:+,.2f}", "Change in monthly cash flow"),
        _step(4, "Annual Impact", f"${annual_delta:+,.2f}", "Total annual financial impact"),
        _step(5, "Runway Change", runway_change, "How this affects your financial runway"),
        _step(6, "Debt Payoff Impact", f"{debt_acceleration_months:+d} months", "Change in debt payoff timeline"),
    ]

    verdict = "DO IT" if monthly_delta >= 0 else ("CAUTION" if abs(monthly_delta) <= sts * 0.3 else "NOT NOW")

    return {
        "verdict": verdict,
        "cash_impact": monthly_delta,
        "emergency_impact": 0.0,
        "debt_timeline_impact": -debt_acceleration_months * 30,
        "retirement_impact": annual_delta * 0.15,  # extra investment potential
        "warnings": warnings,
        "logic_trace": trace,
        "summary": {
            "current_monthly_income": current_income,
            "new_monthly_income": new_income,
            "monthly_delta": round(monthly_delta, 2),
            "annual_delta": round(annual_delta, 2),
            "debt_acceleration_months": debt_acceleration_months,
        },
    }


# ── Extra Debt Payment ─────────────────────────────────────────────────────────

async def simulate_extra_debt_payment(
    db: AsyncSession,
    household_id: uuid.UUID,
    params: dict,
) -> dict[str, Any]:
    """
    params: {
        amount: float,
        account_id: str (optional — if None, apply to highest APR),
        method: "avalanche" | "snowball"
    }
    """
    amount = float(params.get("amount", 0))
    account_id_str = params.get("account_id")
    method = str(params.get("method", "avalanche"))

    safe = await calculate_safe_to_spend(db, household_id)
    sts = safe["safe_to_spend"]

    # Get target debt
    if account_id_str:
        result = await db.execute(
            select(Account).where(Account.id == uuid.UUID(account_id_str))
        )
        target = result.scalar_one_or_none()
        if target:
            target_name = target.name
            balance = abs(float(target.balance))
            apr = float(target.apr or 0)
        else:
            target_name = "Unknown Debt"
            balance = amount
            apr = 0.0
    else:
        # Find highest APR debt
        result = await db.execute(
            select(Account).where(
                and_(
                    Account.household_id == household_id,
                    Account.is_active == True,
                    Account.type.in_(["credit", "loan"]),
                    Account.balance < 0,
                    Account.apr != None,
                )
            ).order_by(Account.apr.desc()).limit(1)
        )
        target = result.scalar_one_or_none()
        if target:
            target_name = target.name
            balance = abs(float(target.balance))
            apr = float(target.apr or 0)
        else:
            target_name = "Debt"
            balance = 0
            apr = 0.0

    # Calculate interest saved
    monthly_rate = apr / 12
    interest_saved = amount * monthly_rate * 12  # simplified annual interest saved

    # Full payoff calculation
    waterfall_extra = await get_debt_waterfall(db, household_id, method, amount)
    waterfall_base = await get_debt_waterfall(db, household_id, method, 0.0)
    months_saved = waterfall_base["total_months"] - waterfall_extra["total_months"]
    interest_diff = waterfall_base["total_interest_paid"] - waterfall_extra["total_interest_paid"]

    can_afford = amount <= sts

    warnings = []
    if not can_afford:
        warnings.append(f"Extra payment of ${amount:,.0f} exceeds your safe-to-spend of ${sts:,.2f}.")
    if amount > balance:
        warnings.append(f"Payment exceeds remaining balance of ${balance:,.0f} on {target_name}.")

    trace = [
        _step(1, "Extra Payment Amount", f"${amount:,.2f}", "One-time additional payment toward debt"),
        _step(2, "Target Debt", target_name, f"Balance: ${balance:,.0f}, APR: {apr*100:.2f}%"),
        _step(3, "Safe-to-Spend Check", f"${sts:,.2f} available", "Your current liquid buffer"),
        _step(4, "Estimated Interest Saved", f"${interest_diff:,.2f}", "Total interest you avoid over the payoff period"),
        _step(5, "Months Shaved Off", f"{months_saved} months", "Faster payoff timeline"),
        _step(6, "Net Benefit", f"${interest_diff - amount:+,.2f}", "Interest saved minus the extra payment"),
    ]

    verdict = "DO IT" if can_afford and interest_diff > 0 else ("CAUTION" if can_afford else "NOT NOW")

    return {
        "verdict": verdict,
        "cash_impact": -amount,
        "emergency_impact": 0.0,
        "debt_timeline_impact": -months_saved * 30,
        "retirement_impact": interest_diff * 0.5,  # freed money could go to retirement
        "warnings": warnings,
        "logic_trace": trace,
        "summary": {
            "amount": amount,
            "target_debt": target_name,
            "target_balance": balance,
            "apr": apr,
            "interest_saved": round(interest_diff, 2),
            "months_saved": months_saved,
        },
    }


# ── Tax Refund ─────────────────────────────────────────────────────────────────

async def simulate_tax_refund(
    db: AsyncSession,
    household_id: uuid.UUID,
    params: dict,
) -> dict[str, Any]:
    """
    params: {
        amount: float,
    }
    Recommends: emergency first, then debt, then goals
    """
    amount = float(params.get("amount", 0))

    safe = await calculate_safe_to_spend(db, household_id)
    emergency_reserve = safe["emergency_reserve"]

    # Get emergency fund goal
    ef_result = await db.execute(
        select(Goal).where(
            and_(
                Goal.household_id == household_id,
                Goal.type == "emergency_fund",
                Goal.is_active == True,
            )
        ).limit(1)
    )
    ef_goal = ef_result.scalar_one_or_none()

    remaining = amount
    allocation: list[dict] = []

    # Priority 1: Fill emergency fund gap
    if ef_goal:
        ef_gap = float(ef_goal.target_amount - ef_goal.current_amount)
        ef_allocation = min(remaining, max(0.0, ef_gap))
        if ef_allocation > 0:
            allocation.append({
                "priority": 1,
                "category": "Emergency Fund",
                "amount": round(ef_allocation, 2),
                "rationale": f"Fills emergency fund from ${ef_goal.current_amount:,.0f} to ${ef_goal.current_amount + ef_allocation:,.0f}",
            })
            remaining -= ef_allocation

    # Priority 2: High-interest debt
    if remaining > 0:
        debt_result = await db.execute(
            select(Account).where(
                and_(
                    Account.household_id == household_id,
                    Account.is_active == True,
                    Account.type.in_(["credit", "loan"]),
                    Account.balance < 0,
                    Account.apr != None,
                )
            ).order_by(Account.apr.desc())
        )
        debts = debt_result.scalars().all()
        for debt in debts:
            if remaining <= 0:
                break
            apr = float(debt.apr or 0)
            if apr < 0.05:  # Skip low-interest debt
                continue
            debt_balance = abs(float(debt.balance))
            debt_payment = min(remaining, debt_balance)
            allocation.append({
                "priority": 2,
                "category": f"Pay off: {debt.name}",
                "amount": round(debt_payment, 2),
                "rationale": f"{apr*100:.2f}% APR — high priority to eliminate",
            })
            remaining -= debt_payment

    # Priority 3: Goals
    if remaining > 0:
        goals_result = await db.execute(
            select(Goal).where(
                and_(
                    Goal.household_id == household_id,
                    Goal.is_active == True,
                    Goal.is_completed == False,
                    Goal.type != "emergency_fund",
                )
            ).order_by(Goal.priority)
        )
        goals = goals_result.scalars().all()
        for goal in goals:
            if remaining <= 0:
                break
            goal_gap = float(goal.target_amount - goal.current_amount)
            goal_alloc = min(remaining, max(0.0, goal_gap))
            if goal_alloc > 0:
                allocation.append({
                    "priority": 3,
                    "category": f"Goal: {goal.name}",
                    "amount": round(goal_alloc, 2),
                    "rationale": f"Moves goal to {((goal.current_amount + goal_alloc) / goal.target_amount * 100):.0f}% funded",
                })
                remaining -= goal_alloc

    # Whatever's left: invest
    if remaining > 0:
        allocation.append({
            "priority": 4,
            "category": "Invest / Brokerage",
            "amount": round(remaining, 2),
            "rationale": "Invest remaining refund for long-term wealth building",
        })

    trace = [
        _step(1, "Tax Refund Amount", f"${amount:,.2f}", "Total refund to allocate"),
        *[
            _step(i + 2, alloc["category"], f"${alloc['amount']:,.2f}", alloc["rationale"])
            for i, alloc in enumerate(allocation)
        ],
    ]

    return {
        "verdict": "DO IT",
        "cash_impact": amount,
        "emergency_impact": sum(a["amount"] for a in allocation if "Emergency" in a["category"]),
        "debt_timeline_impact": -30 * len([a for a in allocation if "Pay off" in a["category"]]),
        "retirement_impact": sum(a["amount"] for a in allocation if "Invest" in a["category"]),
        "warnings": [],
        "logic_trace": trace,
        "summary": {
            "amount": amount,
            "allocation_recommendation": allocation,
        },
    }


# ── Refinance ─────────────────────────────────────────────────────────────────

async def simulate_refinance(
    db: AsyncSession,
    household_id: uuid.UUID,
    params: dict,
) -> dict[str, Any]:
    """
    params: {
        account_id: str,
        current_rate: float,
        new_rate: float,
        closing_cost: float,
        remaining_balance: float,
        remaining_term_months: int
    }
    """
    account_id_str = params.get("account_id", "")
    current_rate = float(params.get("current_rate", 0.06)) / 12
    new_rate = float(params.get("new_rate", 0.055)) / 12
    closing_cost = float(params.get("closing_cost", 5000))
    remaining_term = int(params.get("remaining_term_months", 300))

    # Try to get account balance
    balance = float(params.get("remaining_balance", 0))
    if account_id_str:
        result = await db.execute(select(Account).where(Account.id == uuid.UUID(account_id_str)))
        acc = result.scalar_one_or_none()
        if acc:
            balance = abs(float(acc.balance))

    if balance == 0:
        return {"verdict": "CAUTION", "warnings": ["No balance found to refinance"], "logic_trace": []}

    # Current monthly payment
    if current_rate > 0:
        current_payment = balance * (current_rate * (1 + current_rate) ** remaining_term) / ((1 + current_rate) ** remaining_term - 1)
    else:
        current_payment = balance / remaining_term

    # New monthly payment
    if new_rate > 0:
        new_payment = balance * (new_rate * (1 + new_rate) ** remaining_term) / ((1 + new_rate) ** remaining_term - 1)
    else:
        new_payment = balance / remaining_term

    monthly_savings = current_payment - new_payment
    breakeven_months = int(closing_cost / monthly_savings) if monthly_savings > 0 else 9999
    lifetime_savings = (monthly_savings * remaining_term) - closing_cost

    warnings = []
    if monthly_savings <= 0:
        warnings.append("New rate does not reduce your monthly payment.")
    if breakeven_months > 36:
        warnings.append(f"Breakeven is {breakeven_months} months — only worthwhile if you stay long-term.")
    if lifetime_savings < 0:
        warnings.append("Total interest with closing costs exceeds savings. Refinance not recommended.")

    trace = [
        _step(1, "Current Rate", f"{current_rate*12*100:.3f}%", "Your existing interest rate"),
        _step(2, "New Rate", f"{new_rate*12*100:.3f}%", "Proposed refinance rate"),
        _step(3, "Current Payment", f"${current_payment:,.2f}/mo", "What you pay now"),
        _step(4, "New Payment", f"${new_payment:,.2f}/mo", "What you'd pay after refinancing"),
        _step(5, "Monthly Savings", f"${monthly_savings:,.2f}/mo", "Cash freed up each month"),
        _step(6, "Closing Costs", f"${closing_cost:,.2f}", "One-time cost to refinance"),
        _step(7, "Breakeven", f"{breakeven_months} months", "Months until cumulative savings cover closing costs"),
        _step(8, "Lifetime Savings", f"${lifetime_savings:,.2f}", "Total interest saved over remaining term"),
    ]

    if lifetime_savings > 0 and breakeven_months <= 36:
        verdict = "DO IT"
    elif lifetime_savings > 0:
        verdict = "CAUTION"
    else:
        verdict = "NOT NOW"

    return {
        "verdict": verdict,
        "cash_impact": -closing_cost,
        "emergency_impact": 0.0,
        "debt_timeline_impact": 0,
        "retirement_impact": monthly_savings * 12 * 0.5,  # could invest the savings
        "warnings": warnings,
        "logic_trace": trace,
        "summary": {
            "current_rate_pct": current_rate * 12 * 100,
            "new_rate_pct": new_rate * 12 * 100,
            "current_payment": round(current_payment, 2),
            "new_payment": round(new_payment, 2),
            "monthly_savings": round(monthly_savings, 2),
            "closing_cost": closing_cost,
            "breakeven_months": breakeven_months,
            "lifetime_savings": round(lifetime_savings, 2),
        },
    }


# ── Dispatcher ─────────────────────────────────────────────────────────────────

SCENARIO_HANDLERS = {
    "vacation_trip": simulate_vacation_trip,
    "major_purchase": simulate_major_purchase,
    "income_change": simulate_income_change,
    "extra_debt_payment": simulate_extra_debt_payment,
    "tax_refund": simulate_tax_refund,
    "refinance": simulate_refinance,
}


async def run_scenario(
    db: AsyncSession,
    scenario: Scenario,
    override_params: dict | None = None,
) -> ScenarioRun:
    handler = SCENARIO_HANDLERS.get(scenario.type)
    if not handler:
        raise ValueError(f"Unknown scenario type: {scenario.type}")

    params = dict(scenario.parameters)
    if override_params:
        params.update(override_params)

    result = await handler(db, scenario.household_id, params)

    run = ScenarioRun(
        scenario_id=scenario.id,
        inputs=params,
        outputs=result.get("summary", {}),
        verdict=result["verdict"],
        cash_impact=Decimal(str(result.get("cash_impact") or 0)),
        emergency_impact=Decimal(str(result.get("emergency_impact") or 0)),
        debt_timeline_impact=int(result.get("debt_timeline_impact") or 0),
        retirement_impact=Decimal(str(result.get("retirement_impact") or 0)),
        logic_trace=result.get("logic_trace", []),
        warnings=result.get("warnings", []),
    )
    db.add(run)
    await db.flush()
    return run
