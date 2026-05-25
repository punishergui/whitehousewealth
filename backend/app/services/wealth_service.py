from __future__ import annotations

import uuid
from datetime import date, timedelta
from decimal import Decimal
from typing import Any

from sqlalchemy import and_, func, select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account, Asset


# ── Net Worth Calculation ──────────────────────────────────────────────────────

async def get_net_worth_breakdown(
    db: AsyncSession,
    household_id: uuid.UUID,
) -> dict[str, Any]:
    """Full net worth breakdown by asset type."""
    result = await db.execute(
        select(Account).where(
            and_(
                Account.household_id == household_id,
                Account.is_active == True,
                Account.is_hidden == False,
            )
        )
    )
    accounts = result.scalars().all()

    # Physical assets
    asset_result = await db.execute(
        select(Asset).where(
            and_(Asset.household_id == household_id, Asset.is_active == True)
        )
    )
    physical_assets = asset_result.scalars().all()

    categories = {
        "liquid": {"label": "Liquid Cash", "types": ["checking", "savings"], "total": 0.0, "accounts": []},
        "investment": {"label": "Investments", "types": ["investment"], "total": 0.0, "accounts": []},
        "real_estate": {"label": "Real Estate", "types": [], "total": 0.0, "accounts": []},
        "credit_debt": {"label": "Credit Card Debt", "types": ["credit"], "total": 0.0, "accounts": []},
        "loans": {"label": "Loans & Mortgage", "types": ["loan", "mortgage"], "total": 0.0, "accounts": []},
    }

    for acc in accounts:
        bal = float(acc.balance)
        acc_data = {
            "id": str(acc.id),
            "name": acc.name,
            "institution": acc.institution,
            "balance": bal,
            "type": acc.type,
        }

        if acc.type in ("checking", "savings"):
            categories["liquid"]["total"] += bal
            categories["liquid"]["accounts"].append(acc_data)
        elif acc.type == "investment":
            categories["investment"]["total"] += bal
            categories["investment"]["accounts"].append(acc_data)
        elif acc.type in ("credit",):
            categories["credit_debt"]["total"] += bal
            categories["credit_debt"]["accounts"].append(acc_data)
        elif acc.type in ("loan", "mortgage"):
            categories["loans"]["total"] += bal
            categories["loans"]["accounts"].append(acc_data)

    # Physical assets as real estate / assets
    physical_assets_total = sum(float(a.estimated_value) for a in physical_assets)
    for a in physical_assets:
        categories["real_estate"]["accounts"].append({
            "id": str(a.id),
            "name": a.name,
            "type": a.type,
            "balance": float(a.estimated_value),
        })
    categories["real_estate"]["total"] = physical_assets_total

    total_assets = (
        categories["liquid"]["total"]
        + categories["investment"]["total"]
        + categories["real_estate"]["total"]
    )
    total_liabilities = abs(categories["credit_debt"]["total"]) + abs(categories["loans"]["total"])
    net_worth = total_assets - total_liabilities

    return {
        "net_worth": round(net_worth, 2),
        "total_assets": round(total_assets, 2),
        "total_liabilities": round(total_liabilities, 2),
        "breakdown": {k: {**v, "total": round(v["total"], 2)} for k, v in categories.items()},
        "allocation": _compute_allocation(
            categories["liquid"]["total"],
            categories["investment"]["total"],
            physical_assets_total,
        ),
    }


def _compute_allocation(liquid: float, investments: float, real_estate: float) -> dict:
    total = liquid + investments + real_estate
    if total == 0:
        return {"liquid_pct": 0, "investment_pct": 0, "real_estate_pct": 0}
    return {
        "liquid_pct": round(liquid / total * 100, 1),
        "investment_pct": round(investments / total * 100, 1),
        "real_estate_pct": round(real_estate / total * 100, 1),
    }


async def get_net_worth_history(
    db: AsyncSession,
    household_id: uuid.UUID,
    months: int = 12,
) -> list[dict]:
    """
    Returns simulated net worth history based on current balance projections.
    In production this would pull from a snapshot table.
    """
    # Get current net worth
    breakdown = await get_net_worth_breakdown(db, household_id)
    current_nw = breakdown["net_worth"]

    # Simulate monthly progression (estimate: 1% monthly growth for now)
    history = []
    today = date.today()
    for i in range(months, 0, -1):
        point_date = (today.replace(day=1) - timedelta(days=i * 30)).replace(day=1)
        # Rough back-projection
        estimated_nw = current_nw * (0.99 ** i)
        history.append({
            "date": point_date.isoformat(),
            "net_worth": round(estimated_nw, 2),
        })
    history.append({"date": today.isoformat(), "net_worth": round(current_nw, 2)})
    return history


async def get_investment_allocation(
    db: AsyncSession,
    household_id: uuid.UUID,
) -> dict[str, Any]:
    """Get investment account breakdown and allocation percentages."""
    result = await db.execute(
        select(Account).where(
            and_(
                Account.household_id == household_id,
                Account.is_active == True,
                Account.type == "investment",
                Account.balance > 0,
            )
        )
    )
    accounts = result.scalars().all()

    total = sum(float(a.balance) for a in accounts)
    items = [
        {
            "id": str(a.id),
            "name": a.name,
            "institution": a.institution,
            "balance": float(a.balance),
            "pct": round(float(a.balance) / total * 100, 1) if total > 0 else 0,
        }
        for a in accounts
    ]

    return {
        "total_invested": round(total, 2),
        "accounts": items,
        "account_count": len(items),
    }
