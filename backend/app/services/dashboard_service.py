from __future__ import annotations

import uuid
import calendar
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy import and_, func, select, case
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.models.account import Account
from app.models.budget import Budget, BudgetPeriod
from app.models.goal import Goal
from app.models.transaction import Category, Transaction
from app.models.bill import Bill
from app.models.agent import AgentBriefing, AgentPriority


# ── Safe-to-Spend Calculation ──────────────────────────────────────────────────

async def calculate_safe_to_spend(
    db: AsyncSession,
    household_id: uuid.UUID,
) -> dict[str, Any]:
    """
    Safe-to-Spend formula:
        total_liquid_cash = sum of checking + savings balances
        emergency_reserve = goal.current_amount WHERE type=emergency_fund
        sinking_funds_total = sum of all non-emergency goal current_amounts
        imminent_obligations = sum of bills/recurring due within 14 days
        promo_payoff_reserves = sum of promo debt balances where expiry < 60 days
        safe_to_spend = total_liquid_cash - emergency_reserve - sinking_funds_total
                        - imminent_obligations - promo_payoff_reserves
    """
    today = date.today()
    horizon_14 = today + timedelta(days=14)
    horizon_60 = today + timedelta(days=60)

    # 1. Liquid cash (checking + savings)
    liquid_result = await db.execute(
        select(func.sum(Account.balance)).where(
            and_(
                Account.household_id == household_id,
                Account.is_active == True,
                Account.type.in_(["checking", "savings"]),
            )
        )
    )
    total_liquid_cash = Decimal(str(liquid_result.scalar() or 0))

    # 2. Emergency fund reserve
    emergency_result = await db.execute(
        select(func.sum(Goal.current_amount)).where(
            and_(
                Goal.household_id == household_id,
                Goal.type == "emergency_fund",
                Goal.is_active == True,
            )
        )
    )
    emergency_reserve = Decimal(str(emergency_result.scalar() or 0))

    # 3. Sinking funds (all non-emergency goals)
    sinking_result = await db.execute(
        select(func.sum(Goal.current_amount)).where(
            and_(
                Goal.household_id == household_id,
                Goal.type != "emergency_fund",
                Goal.is_active == True,
                Goal.is_completed == False,
            )
        )
    )
    sinking_funds_total = Decimal(str(sinking_result.scalar() or 0))

    # 4. Imminent obligations — bills due within 14 days
    bills_result = await db.execute(
        select(Bill).where(
            and_(
                Bill.household_id == household_id,
                Bill.is_active == True,
            )
        )
    )
    active_bills = bills_result.scalars().all()
    imminent_obligations = Decimal("0")
    for bill in active_bills:
        year, month = today.year, today.month
        last_day = calendar.monthrange(year, month)[1]
        this_month_due = date(year, month, min(bill.due_day_of_month, last_day))
        already_paid = bill.last_paid_date and bill.last_paid_date >= this_month_due
        if not already_paid and today <= this_month_due <= horizon_14:
            imminent_obligations += bill.amount

    # 5. Promo debt reserves (balances on credit accounts with promo expiry < 60 days)
    promo_result = await db.execute(
        select(func.sum(func.abs(Account.balance))).where(
            and_(
                Account.household_id == household_id,
                Account.is_active == True,
                Account.type.in_(["credit", "loan"]),
                Account.promo_expires_at != None,
                Account.promo_expires_at <= datetime.combine(horizon_60, datetime.min.time()).replace(
                    tzinfo=timezone.utc
                ),
            )
        )
    )
    promo_payoff_reserves = Decimal(str(promo_result.scalar() or 0))

    safe_to_spend = (
        total_liquid_cash
        - emergency_reserve
        - sinking_funds_total
        - imminent_obligations
        - promo_payoff_reserves
    )

    return {
        "safe_to_spend": float(safe_to_spend),
        "total_liquid_cash": float(total_liquid_cash),
        "emergency_reserve": float(emergency_reserve),
        "sinking_funds_total": float(sinking_funds_total),
        "imminent_obligations": float(imminent_obligations),
        "promo_payoff_reserves": float(promo_payoff_reserves),
        "is_negative": safe_to_spend < 0,
    }


# ── Debt Waterfall ─────────────────────────────────────────────────────────────

async def get_debt_waterfall(
    db: AsyncSession,
    household_id: uuid.UUID,
    method: str = "avalanche",
    extra_monthly_payment: float = 0.0,
) -> dict[str, Any]:
    """
    Calculate debt payoff schedule.
    method: 'avalanche' (highest APR first) or 'snowball' (lowest balance first)
    """
    # Fetch all active debt accounts
    result = await db.execute(
        select(Account).where(
            and_(
                Account.household_id == household_id,
                Account.is_active == True,
                Account.type.in_(["credit", "loan", "mortgage"]),
                Account.balance < 0,
            )
        )
    )
    debt_accounts = result.scalars().all()

    if not debt_accounts:
        return {"debts": [], "total_interest_paid": 0.0, "payoff_date": None, "method": method}

    debts = []
    for acc in debt_accounts:
        balance = abs(float(acc.balance))
        apr = float(acc.apr) if acc.apr else 0.0
        min_payment = float(acc.minimum_payment) if acc.minimum_payment else max(25.0, balance * 0.02)
        debts.append({
            "id": str(acc.id),
            "name": acc.name,
            "balance": balance,
            "apr": apr,
            "monthly_rate": apr / 12,
            "min_payment": min_payment,
        })

    # Sort by method
    if method == "avalanche":
        debts.sort(key=lambda d: d["apr"], reverse=True)
    else:  # snowball
        debts.sort(key=lambda d: d["balance"])

    # Simulate payoff
    balances = {d["id"]: d["balance"] for d in debts}
    total_interest = 0.0
    months = 0
    max_months = 600  # 50 years cap
    schedule = []

    while any(b > 0.01 for b in balances.values()) and months < max_months:
        months += 1
        month_interest = 0.0
        freed_payment = 0.0

        for debt in debts:
            did = debt["id"]
            if balances[did] <= 0:
                freed_payment += debt["min_payment"]
                continue

            interest = balances[did] * debt["monthly_rate"]
            month_interest += interest
            balances[did] += interest

        # Apply payments: min payments to all, extra + freed to priority debt
        available_extra = extra_monthly_payment + freed_payment
        for debt in debts:
            did = debt["id"]
            if balances[did] <= 0:
                continue
            payment = debt["min_payment"] + available_extra
            available_extra = 0.0
            actual_payment = min(payment, balances[did])
            balances[did] -= actual_payment
            if balances[did] < 0.01:
                balances[did] = 0.0

        total_interest += month_interest
        schedule.append({
            "month": months,
            "balances": {k: round(v, 2) for k, v in balances.items()},
            "interest_paid": round(month_interest, 2),
        })

    payoff_date = (date.today().replace(day=1) + timedelta(days=months * 30)).isoformat()

    debt_summaries = []
    for debt in debts:
        # Find when this debt reaches zero
        payoff_month = next(
            (s["month"] for s in schedule if s["balances"].get(debt["id"], 1) < 0.01),
            months,
        )
        debt_summaries.append({
            "id": debt["id"],
            "name": debt["name"],
            "starting_balance": debt["balance"],
            "apr": debt["apr"],
            "min_payment": debt["min_payment"],
            "payoff_months": payoff_month,
        })

    return {
        "method": method,
        "debts": debt_summaries,
        "total_interest_paid": round(total_interest, 2),
        "total_months": months,
        "payoff_date": payoff_date,
        "monthly_schedule": schedule[:24],  # First 2 years detail
    }


# ── Monthly Forecast ───────────────────────────────────────────────────────────

async def get_monthly_forecast(
    db: AsyncSession,
    household_id: uuid.UUID,
) -> dict[str, Any]:
    """30/60/90 day cash projection based on recurring transactions and trends."""
    today = date.today()
    three_months_ago = today - timedelta(days=90)

    # Get average monthly income
    income_result = await db.execute(
        select(func.sum(Transaction.amount)).where(
            and_(
                Transaction.household_id == household_id,
                Transaction.type == "income",
                Transaction.date >= three_months_ago,
                Transaction.date <= today,
            )
        )
    )
    total_income_90d = float(income_result.scalar() or 0)
    avg_monthly_income = total_income_90d / 3

    # Get average monthly expenses
    expense_result = await db.execute(
        select(func.sum(func.abs(Transaction.amount))).where(
            and_(
                Transaction.household_id == household_id,
                Transaction.type == "expense",
                Transaction.date >= three_months_ago,
                Transaction.date <= today,
            )
        )
    )
    total_expense_90d = float(expense_result.scalar() or 0)
    avg_monthly_expense = total_expense_90d / 3

    # Current liquid balance
    liquid_result = await db.execute(
        select(func.sum(Account.balance)).where(
            and_(
                Account.household_id == household_id,
                Account.is_active == True,
                Account.type.in_(["checking", "savings"]),
            )
        )
    )
    current_balance = float(liquid_result.scalar() or 0)

    net_monthly = avg_monthly_income - avg_monthly_expense
    months_runway = (current_balance / abs(avg_monthly_expense)) if avg_monthly_expense > 0 else 999

    projections = []
    for days in [30, 60, 90]:
        months = days / 30
        projected_balance = current_balance + (net_monthly * months)
        projections.append({
            "days": days,
            "projected_balance": round(projected_balance, 2),
            "projected_income": round(avg_monthly_income * months, 2),
            "projected_expenses": round(avg_monthly_expense * months, 2),
            "net_cash_flow": round(net_monthly * months, 2),
        })

    return {
        "current_liquid_balance": round(current_balance, 2),
        "avg_monthly_income": round(avg_monthly_income, 2),
        "avg_monthly_expense": round(avg_monthly_expense, 2),
        "net_monthly_cash_flow": round(net_monthly, 2),
        "months_runway": round(months_runway, 1),
        "projections": projections,
    }


# ── Command Center ─────────────────────────────────────────────────────────────

async def get_command_center_data(
    db: AsyncSession,
    household_id: uuid.UUID,
) -> dict[str, Any]:
    """Returns all widget data for the dashboard command center."""
    today = date.today()
    month_start = today.replace(day=1)
    last_month_start = (month_start - timedelta(days=1)).replace(day=1)

    # Safe to spend
    safe_to_spend = await calculate_safe_to_spend(db, household_id)

    # Net worth
    asset_result = await db.execute(
        select(func.sum(Account.balance)).where(
            and_(
                Account.household_id == household_id,
                Account.is_active == True,
                Account.type.in_(["checking", "savings", "investment"]),
                Account.balance > 0,
            )
        )
    )
    total_assets = float(asset_result.scalar() or 0)

    debt_result = await db.execute(
        select(func.sum(func.abs(Account.balance))).where(
            and_(
                Account.household_id == household_id,
                Account.is_active == True,
                Account.type.in_(["credit", "loan", "mortgage"]),
                Account.balance < 0,
            )
        )
    )
    total_liabilities = float(debt_result.scalar() or 0)
    net_worth = total_assets - total_liabilities

    # This month spending by category (top 5)
    spending_result = await db.execute(
        select(Category.name, func.sum(func.abs(Transaction.amount)).label("total"))
        .join(Transaction, Transaction.category_id == Category.id)
        .where(
            and_(
                Transaction.household_id == household_id,
                Transaction.type == "expense",
                Transaction.date >= month_start,
                Transaction.date <= today,
            )
        )
        .group_by(Category.name)
        .order_by(func.sum(func.abs(Transaction.amount)).desc())
        .limit(5)
    )
    top_categories = [{"category": row[0], "amount": float(row[1])} for row in spending_result]

    # Recent transactions (last 10)
    recent_txn_result = await db.execute(
        select(Transaction)
        .where(
            and_(
                Transaction.household_id == household_id,
            )
        )
        .options(selectinload(Transaction.category))
        .order_by(Transaction.date.desc(), Transaction.created_at.desc())
        .limit(10)
    )
    recent_transactions = recent_txn_result.scalars().all()

    recent_txn_data = [
        {
            "id": str(t.id),
            "date": t.date.isoformat(),
            "description": t.description,
            "merchant": t.merchant_name,
            "amount": float(t.amount),
            "type": t.type,
            "category": t.category.name if t.category else None,
        }
        for t in recent_transactions
    ]

    # Goals summary
    goals_result = await db.execute(
        select(Goal).where(
            and_(Goal.household_id == household_id, Goal.is_active == True)
        ).order_by(Goal.priority)
    )
    goals = goals_result.scalars().all()

    goals_data = [
        {
            "id": str(g.id),
            "name": g.name,
            "type": g.type,
            "current_amount": float(g.current_amount),
            "target_amount": float(g.target_amount),
            "progress_pct": g.progress_pct,
            "target_date": g.target_date.isoformat() if g.target_date else None,
        }
        for g in goals
    ]

    # Monthly income vs expense
    month_income_result = await db.execute(
        select(func.sum(Transaction.amount)).where(
            and_(
                Transaction.household_id == household_id,
                Transaction.type == "income",
                Transaction.date >= month_start,
                Transaction.date <= today,
            )
        )
    )
    month_income = float(month_income_result.scalar() or 0)

    month_expense_result = await db.execute(
        select(func.sum(func.abs(Transaction.amount))).where(
            and_(
                Transaction.household_id == household_id,
                Transaction.type == "expense",
                Transaction.date >= month_start,
                Transaction.date <= today,
            )
        )
    )
    month_expense = float(month_expense_result.scalar() or 0)

    # Forecast
    forecast = await get_monthly_forecast(db, household_id)

    # Upcoming bills for dashboard widget
    bills_q = await db.execute(
        select(Bill).where(
            and_(Bill.household_id == household_id, Bill.is_active == True)
        ).order_by(Bill.due_day_of_month)
    )
    active_bills_list = bills_q.scalars().all()
    upcoming_bills_data = []
    for bill in active_bills_list:
        year, month = today.year, today.month
        last_day = calendar.monthrange(year, month)[1]
        this_month_due = date(year, month, min(bill.due_day_of_month, last_day))
        already_paid = bill.last_paid_date and bill.last_paid_date >= this_month_due
        if already_paid:
            if month == 12:
                ny, nm = year + 1, 1
            else:
                ny, nm = year, month + 1
            nd_last = calendar.monthrange(ny, nm)[1]
            due = date(ny, nm, min(bill.due_day_of_month, nd_last))
            bill_status = "upcoming"
        else:
            due = this_month_due
            if due < today:
                bill_status = "overdue"
            elif due == today:
                bill_status = "due"
            else:
                bill_status = "upcoming"
        upcoming_bills_data.append({
            "id": str(bill.id),
            "name": bill.name,
            "amount": float(bill.amount),
            "due_date": due.isoformat(),
            "status": bill_status,
            "category": bill.category,
            "icon": bill.icon,
            "auto_pay": bill.auto_pay,
            "account_id": str(bill.account_id) if bill.account_id else None,
        })

    # Agent briefing (latest for today or most recent)
    briefing_result = await db.execute(
        select(AgentBriefing)
        .where(AgentBriefing.household_id == household_id)
        .order_by(AgentBriefing.for_date.desc(), AgentBriefing.created_at.desc())
        .limit(1)
    )
    briefing_row = briefing_result.scalar_one_or_none()
    hermes_briefing = briefing_row.body if briefing_row else ""

    # Agent priorities → weekly_priorities format
    priorities_result = await db.execute(
        select(AgentPriority)
        .where(AgentPriority.household_id == household_id)
        .order_by(AgentPriority.position.asc())
        .limit(10)
    )
    severity_to_urgency = {"high": "high", "medium": "medium", "low": "low"}
    severity_to_type = {"high": "action", "medium": "alert", "low": "opportunity"}
    weekly_priorities = [
        {
            "id": str(p.id),
            "title": p.title,
            "description": p.subtitle or "",
            "urgency": severity_to_urgency.get(p.severity, "medium"),
            "type": severity_to_type.get(p.severity, "alert"),
            "amount": float(p.amount) if p.amount is not None else None,
            "deadline": p.deadline.isoformat() if p.deadline else None,
        }
        for p in priorities_result.scalars().all()
    ]

    return {
        "safe_to_spend": safe_to_spend,
        "net_worth": {
            "total": round(net_worth, 2),
            "assets": round(total_assets, 2),
            "liabilities": round(total_liabilities, 2),
        },
        "this_month": {
            "income": round(month_income, 2),
            "expenses": round(month_expense, 2),
            "net": round(month_income - month_expense, 2),
        },
        "top_spending_categories": top_categories,
        "recent_transactions": recent_txn_data,
        "goals": goals_data,
        "upcoming_bills": upcoming_bills_data,
        "forecast": forecast,
        "hermes_briefing": hermes_briefing,
        "weekly_priorities": weekly_priorities,
        "generated_at": datetime.now(tz=timezone.utc).isoformat(),
    }
