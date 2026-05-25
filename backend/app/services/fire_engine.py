from __future__ import annotations

import math
import random
from datetime import date, timedelta
from typing import Any

from app.models.fire import RetirementProfile


# ── FIRE Mode Configurations ───────────────────────────────────────────────────

FIRE_MODES = {
    "lean": {
        "withdrawal_rate": 0.035,
        "spending_multiplier": 0.80,
        "description": "Lean FIRE: minimal spending, 3.5% withdrawal rate",
    },
    "regular": {
        "withdrawal_rate": 0.04,
        "spending_multiplier": 1.0,
        "description": "Regular FIRE: 4% rule, standard spending",
    },
    "fat": {
        "withdrawal_rate": 0.03,
        "spending_multiplier": 1.30,
        "description": "Fat FIRE: 3% withdrawal rate, 30% more spending",
    },
    "coast": {
        "withdrawal_rate": 0.04,
        "spending_multiplier": 1.0,
        "description": "Coast FIRE: stop contributing now and coast to retirement",
    },
    "barista": {
        "withdrawal_rate": 0.04,
        "spending_multiplier": 1.0,
        "description": "Barista FIRE: semi-retire with part-time income covering some expenses",
    },
}


# ── Core Calculations ──────────────────────────────────────────────────────────

def calculate_fi_number(
    annual_spending: float,
    withdrawal_rate: float = 0.04,
    mode: str = "regular",
) -> float:
    """Calculate the FI number (portfolio size needed for financial independence)."""
    config = FIRE_MODES.get(mode, FIRE_MODES["regular"])
    effective_spending = annual_spending * config["spending_multiplier"]
    effective_wr = withdrawal_rate or config["withdrawal_rate"]
    if effective_wr <= 0:
        raise ValueError("Withdrawal rate must be positive")
    return effective_spending / effective_wr


def calculate_fi_percentage(current_savings: float, fi_number: float) -> float:
    """Calculate the percentage progress toward FI number."""
    if fi_number <= 0:
        return 0.0
    return min(100.0, current_savings / fi_number * 100)


def estimate_fi_date(
    current_savings: float,
    monthly_contribution: float,
    fi_number: float,
    annual_return_rate: float = 0.07,
    annual_inflation_rate: float = 0.03,
) -> date | None:
    """
    Estimate the date financial independence is reached.
    Uses compound growth formula with monthly contributions.
    Returns None if FI is unreachable within 100 years.
    """
    if current_savings >= fi_number:
        return date.today()

    real_rate = ((1 + annual_return_rate) / (1 + annual_inflation_rate)) - 1
    monthly_rate = (1 + real_rate) ** (1 / 12) - 1

    if monthly_rate <= 0:
        if monthly_contribution <= 0:
            return None
        months_needed = (fi_number - current_savings) / monthly_contribution
    else:
        if monthly_contribution == 0:
            # Pure compound growth
            if annual_return_rate <= 0:
                return None
            months_needed = math.log(fi_number / current_savings) / math.log(1 + monthly_rate)
        else:
            # Future value with contributions: FV = PV*(1+r)^n + PMT*((1+r)^n - 1)/r
            # Solve numerically
            balance = current_savings
            months_needed = 0
            max_months = 100 * 12
            while balance < fi_number and months_needed < max_months:
                balance = balance * (1 + monthly_rate) + monthly_contribution
                months_needed += 1
            if months_needed >= max_months:
                return None

    fi_date = date.today() + timedelta(days=int(months_needed * 30.44))
    return fi_date


def calculate_coast_fi_number(
    annual_spending: float,
    current_age: int,
    retirement_age: int,
    annual_return_rate: float = 0.07,
    withdrawal_rate: float = 0.04,
) -> float:
    """
    Calculate Coast FI number: the amount you need now such that growth alone
    will reach full FI number by retirement age without further contributions.
    """
    fi_number = annual_spending / withdrawal_rate
    years_to_grow = retirement_age - current_age
    if years_to_grow <= 0:
        return fi_number
    coast_fi = fi_number / ((1 + annual_return_rate) ** years_to_grow)
    return coast_fi


def calculate_barista_fi_number(
    annual_spending: float,
    part_time_income: float,
    withdrawal_rate: float = 0.04,
) -> float:
    """
    Barista FI: portfolio only needs to fund spending minus part-time income.
    """
    portfolio_funded_spending = max(0.0, annual_spending - part_time_income)
    return portfolio_funded_spending / withdrawal_rate if withdrawal_rate > 0 else float("inf")


# ── Monte Carlo Simulation ─────────────────────────────────────────────────────

def monte_carlo_simulation(
    current_savings: float,
    monthly_contribution: float,
    fi_number: float,
    years_to_retirement: int,
    expected_return: float = 0.07,
    return_std_dev: float = 0.15,
    inflation_rate: float = 0.03,
    annual_spending: float = 60000.0,
    runs: int = 1000,
) -> dict[str, Any]:
    """
    Run Monte Carlo simulation to estimate FI success probability.
    Uses randomized annual returns with given mean and standard deviation.
    """
    successes = 0
    final_balances: list[float] = []
    months_total = years_to_retirement * 12
    real_annual_return = ((1 + expected_return) / (1 + inflation_rate)) - 1

    for _ in range(runs):
        balance = current_savings
        success = False

        for month in range(months_total):
            # Randomize monthly return (log-normal distribution)
            annual_r = random.gauss(real_annual_return, return_std_dev)
            monthly_r = (1 + annual_r) ** (1 / 12) - 1
            balance = balance * (1 + monthly_r) + monthly_contribution
            if balance < 0:
                balance = 0.0

        final_balances.append(balance)
        if balance >= fi_number:
            success = True
            successes += 1

    final_balances.sort()
    success_rate = successes / runs

    # Sustainable withdrawal check (simplified: can last 30 years)
    p25 = final_balances[int(runs * 0.25)]
    p50 = final_balances[int(runs * 0.50)]
    p75 = final_balances[int(runs * 0.75)]

    return {
        "runs": runs,
        "success_rate": round(success_rate, 4),
        "success_rate_pct": round(success_rate * 100, 1),
        "percentile_10": round(final_balances[int(runs * 0.10)], 2),
        "percentile_25": round(p25, 2),
        "percentile_50": round(p50, 2),
        "percentile_75": round(p75, 2),
        "percentile_90": round(final_balances[int(runs * 0.90)], 2),
        "mean_final_balance": round(sum(final_balances) / runs, 2),
        "expected_return": expected_return,
        "return_std_dev": return_std_dev,
        "years_simulated": years_to_retirement,
    }


# ── Full Profile Analysis ──────────────────────────────────────────────────────

def analyze_retirement_profile(profile: RetirementProfile) -> dict[str, Any]:
    """Compute all FIRE metrics for a retirement profile."""
    annual_spending = float(profile.target_annual_spending)
    current_savings = float(profile.current_savings)
    monthly_contribution = float(profile.monthly_contribution)
    return_rate = float(profile.expected_return_rate)
    inflation = float(profile.inflation_rate)
    withdrawal_rate = float(profile.withdrawal_rate)
    mode = profile.fire_mode
    current_age = profile.current_age
    retirement_age = profile.retirement_age_target

    config = FIRE_MODES.get(mode, FIRE_MODES["regular"])
    net_spending = annual_spending * config["spending_multiplier"]

    # Adjust for barista income and social security
    income_offsets = float(profile.barista_income) * 12 + float(profile.social_security_estimate) + float(profile.other_income)
    net_spending_after_income = max(0.0, net_spending - income_offsets)

    if mode == "barista":
        fi_number = calculate_barista_fi_number(net_spending, float(profile.barista_income) * 12, withdrawal_rate)
    elif mode == "coast":
        fi_number = calculate_coast_fi_number(
            annual_spending, current_age, retirement_age, return_rate, withdrawal_rate
        )
    else:
        fi_number = calculate_fi_number(annual_spending, withdrawal_rate, mode)

    fi_percentage = calculate_fi_percentage(current_savings, fi_number)

    fi_date = estimate_fi_date(
        current_savings, monthly_contribution, fi_number, return_rate, inflation
    )

    years_to_retirement = max(0, retirement_age - current_age)
    mc_results = monte_carlo_simulation(
        current_savings=current_savings,
        monthly_contribution=monthly_contribution,
        fi_number=fi_number,
        years_to_retirement=years_to_retirement,
        expected_return=return_rate,
        inflation_rate=inflation,
        annual_spending=net_spending,
        runs=1000,
    )

    # Years until FI from today
    if fi_date:
        years_to_fi = (fi_date - date.today()).days / 365.25
    else:
        years_to_fi = None

    # Sensitivity analysis
    scenarios = {}
    for extra_monthly in [100, 250, 500, 1000]:
        d = estimate_fi_date(
            current_savings, monthly_contribution + extra_monthly, fi_number, return_rate, inflation
        )
        if d:
            diff_months = round(((d - fi_date).days / 30.44) if fi_date else 0)
            scenarios[f"extra_{extra_monthly}_per_month"] = {
                "fi_date": d.isoformat() if d else None,
                "months_sooner": abs(diff_months),
            }

    return {
        "mode": mode,
        "mode_description": config["description"],
        "fi_number": round(fi_number, 2),
        "current_savings": current_savings,
        "fi_percentage": round(fi_percentage, 2),
        "fi_date_estimate": fi_date.isoformat() if fi_date else None,
        "years_to_fi": round(years_to_fi, 1) if years_to_fi is not None else None,
        "annual_spending_target": annual_spending,
        "net_spending_in_retirement": round(net_spending_after_income, 2),
        "monthly_contribution": monthly_contribution,
        "withdrawal_rate_pct": withdrawal_rate * 100,
        "monte_carlo": mc_results,
        "contribution_scenarios": scenarios,
        "all_modes": {
            m: {
                "fi_number": round(calculate_fi_number(annual_spending, config["withdrawal_rate"], m), 2),
                "fi_percentage": round(
                    calculate_fi_percentage(current_savings, calculate_fi_number(annual_spending, config["withdrawal_rate"], m)), 2
                ),
                "description": config["description"],
            }
            for m, config in FIRE_MODES.items()
            if m not in ("coast", "barista")
        },
    }
