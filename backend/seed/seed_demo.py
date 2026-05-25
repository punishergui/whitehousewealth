#!/usr/bin/env python3
"""Demo seed data for WHITE HOUSE WEALTH OS — The Johnson Family."""
from __future__ import annotations

import asyncio
import random
import sys
import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from pathlib import Path

sys.path.insert(0, str(Path(__file__).parent.parent))

from passlib.context import CryptContext
from sqlalchemy.ext.asyncio import AsyncSession, async_sessionmaker, create_async_engine

from app.config import settings
from app.auth.models import User
from app.models.account import Account
from app.models.budget import Budget
from app.models.fire import RetirementProfile
from app.models.goal import Goal
from app.models.household import Household, HouseholdMember
from app.models.transaction import Category, Transaction

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")


async def seed() -> None:
    engine = create_async_engine(settings.DATABASE_URL, echo=False)
    async_session = async_sessionmaker(engine, class_=AsyncSession, expire_on_commit=False)

    async with async_session() as session:
        async with session.begin():
            # ── Household ──────────────────────────────────────────────────────
            household = Household(
                name="The Johnson Family",
                slug="johnson-family-" + str(uuid.uuid4())[:8],
                currency="USD",
                timezone="America/Chicago",
            )
            session.add(household)
            await session.flush()

            # ── Users ──────────────────────────────────────────────────────────
            # User model uses first_name / last_name (no top-level role column)
            joshua = User(
                email="joshua@johnson.family",
                hashed_password=pwd_context.hash("demo1234"),
                first_name="Joshua",
                last_name="Johnson",
                is_active=True,
                is_verified=True,
            )
            ashley = User(
                email="ashley@johnson.family",
                hashed_password=pwd_context.hash("demo1234"),
                first_name="Ashley",
                last_name="Johnson",
                is_active=True,
                is_verified=True,
            )
            session.add_all([joshua, ashley])
            await session.flush()

            # ── Household Members ──────────────────────────────────────────────
            session.add_all([
                HouseholdMember(
                    household_id=household.id,
                    user_id=joshua.id,
                    role="owner",
                    is_primary=True,
                    display_name="Joshua Johnson",
                ),
                HouseholdMember(
                    household_id=household.id,
                    user_id=ashley.id,
                    role="member",
                    is_primary=False,
                    display_name="Ashley Johnson",
                ),
            ])

            # ── Categories ─────────────────────────────────────────────────────
            cat_data = [
                ("Groceries", "#10b981", "shopping-cart"),
                ("Dining Out", "#f59e0b", "utensils"),
                ("Gas", "#3b82f6", "fuel"),
                ("Utilities", "#8b5cf6", "zap"),
                ("Entertainment", "#ec4899", "film"),
                ("Amazon", "#f97316", "package"),
                ("Healthcare", "#ef4444", "heart"),
                ("Home Improvement", "#06b6d4", "home"),
                ("Subscriptions", "#6366f1", "refresh-cw"),
                ("Clothing", "#84cc16", "shirt"),
                ("Personal Care", "#a78bfa", "scissors"),
                ("Insurance", "#64748b", "shield"),
                ("Paycheck", "#10b981", "dollar-sign"),
                ("Interest Income", "#10b981", "trending-up"),
                ("Transfer", "#94a3b8", "arrow-right-left"),
                ("Mortgage Payment", "#ef4444", "home"),
                ("Car Payment", "#ef4444", "car"),
                ("Loan Payment", "#ef4444", "credit-card"),
            ]
            cats: dict[str, Category] = {}
            for name, color, icon in cat_data:
                cat = Category(
                    household_id=household.id,
                    name=name,
                    color=color,
                    icon=icon,
                    is_system=False,
                )
                session.add(cat)
                cats[name] = cat
            await session.flush()

            # ── Accounts ───────────────────────────────────────────────────────
            today = date.today()
            promo_expiry = datetime.combine(
                today + timedelta(days=45), datetime.min.time()
            ).replace(tzinfo=timezone.utc)

            accounts: dict[str, Account] = {
                "chase_checking": Account(
                    household_id=household.id,
                    name="Chase Total Checking",
                    type="checking",
                    institution="Chase Bank",
                    balance=Decimal("8400.00"),
                    currency="USD",
                    color="#3b82f6",
                    icon="landmark",
                ),
                "chase_savings": Account(
                    household_id=household.id,
                    name="Chase Savings",
                    type="savings",
                    institution="Chase Bank",
                    balance=Decimal("22000.00"),
                    currency="USD",
                    color="#10b981",
                    icon="piggy-bank",
                ),
                "marcus_hysa": Account(
                    household_id=household.id,
                    name="Marcus HYSA",
                    type="savings",
                    institution="Goldman Sachs Marcus",
                    balance=Decimal("15500.00"),
                    currency="USD",
                    color="#f59e0b",
                    icon="trending-up",
                ),
                "chase_sapphire": Account(
                    household_id=household.id,
                    name="Chase Sapphire Reserve",
                    type="credit",
                    institution="Chase Bank",
                    balance=Decimal("-4200.00"),
                    currency="USD",
                    apr=Decimal("0.2499"),
                    minimum_payment=Decimal("84.00"),
                    color="#ef4444",
                    icon="credit-card",
                ),
                "home_depot": Account(
                    household_id=household.id,
                    name="Home Depot Credit",
                    type="credit",
                    institution="Home Depot / Citi",
                    balance=Decimal("-3847.00"),
                    currency="USD",
                    apr=Decimal("0.0000"),
                    minimum_payment=Decimal("50.00"),
                    promo_expires_at=promo_expiry,
                    color="#f97316",
                    icon="credit-card",
                    notes="0% promo expires in 45 days — PAY IN FULL",
                ),
                "pool_loan": Account(
                    household_id=household.id,
                    name="Pool Financing Loan",
                    type="loan",
                    institution="LightStream",
                    balance=Decimal("-18400.00"),
                    currency="USD",
                    apr=Decimal("0.079"),
                    minimum_payment=Decimal("287.00"),
                    color="#8b5cf6",
                    icon="droplets",
                ),
                "truck_note": Account(
                    household_id=household.id,
                    name="2022 F-150 Truck Note",
                    type="loan",
                    institution="Ford Motor Credit",
                    balance=Decimal("-34200.00"),
                    currency="USD",
                    apr=Decimal("0.059"),
                    minimum_payment=Decimal("641.00"),
                    color="#64748b",
                    icon="truck",
                ),
                "mortgage": Account(
                    household_id=household.id,
                    name="Home Mortgage",
                    type="mortgage",
                    institution="Rocket Mortgage",
                    balance=Decimal("-312000.00"),
                    currency="USD",
                    apr=Decimal("0.061"),
                    minimum_payment=Decimal("1847.00"),
                    color="#ef4444",
                    icon="home",
                ),
                "joshua_401k": Account(
                    household_id=household.id,
                    name="Joshua 401(k) — Fidelity",
                    type="investment",
                    institution="Fidelity",
                    balance=Decimal("187000.00"),
                    currency="USD",
                    color="#10b981",
                    icon="briefcase",
                ),
                "ashley_401k": Account(
                    household_id=household.id,
                    name="Ashley 401(k) — Vanguard",
                    type="investment",
                    institution="Vanguard",
                    balance=Decimal("43000.00"),
                    currency="USD",
                    color="#10b981",
                    icon="briefcase",
                ),
                "roth_ira": Account(
                    household_id=household.id,
                    name="Roth IRA — Fidelity",
                    type="investment",
                    institution="Fidelity",
                    balance=Decimal("28500.00"),
                    currency="USD",
                    color="#10b981",
                    icon="shield",
                ),
                "brokerage": Account(
                    household_id=household.id,
                    name="Taxable Brokerage",
                    type="investment",
                    institution="Fidelity",
                    balance=Decimal("12400.00"),
                    currency="USD",
                    color="#3b82f6",
                    icon="trending-up",
                ),
            }
            for acc in accounts.values():
                session.add(acc)
            await session.flush()

            # ── Goals ──────────────────────────────────────────────────────────
            goals = [
                Goal(
                    household_id=household.id,
                    name="Emergency Fund",
                    type="emergency_fund",
                    current_amount=Decimal("22000"),
                    target_amount=Decimal("30000"),
                    color="#ef4444",
                    icon="shield",
                    priority=1,
                    linked_account_id=accounts["chase_savings"].id,
                ),
                Goal(
                    household_id=household.id,
                    name="Disney World Vacation",
                    type="vacation",
                    current_amount=Decimal("1200"),
                    target_amount=Decimal("5000"),
                    color="#f59e0b",
                    icon="castle",
                    priority=2,
                    target_date=today + timedelta(days=240),
                ),
                Goal(
                    household_id=household.id,
                    name="Christmas Fund",
                    type="sinking_fund",
                    current_amount=Decimal("800"),
                    target_amount=Decimal("2500"),
                    color="#ec4899",
                    icon="gift",
                    priority=3,
                    target_date=date(today.year, 12, 15),
                ),
                Goal(
                    household_id=household.id,
                    name="Property Taxes",
                    type="sinking_fund",
                    current_amount=Decimal("1400"),
                    target_amount=Decimal("4200"),
                    color="#8b5cf6",
                    icon="receipt",
                    priority=4,
                    target_date=date(today.year, 10, 1),
                ),
                Goal(
                    household_id=household.id,
                    name="New Roof Fund",
                    type="custom",
                    current_amount=Decimal("500"),
                    target_amount=Decimal("15000"),
                    color="#06b6d4",
                    icon="home",
                    priority=5,
                ),
                Goal(
                    household_id=household.id,
                    name="Arkansas Vacation",
                    type="vacation",
                    current_amount=Decimal("400"),
                    target_amount=Decimal("1800"),
                    color="#10b981",
                    icon="map",
                    priority=6,
                    target_date=today + timedelta(days=90),
                ),
            ]
            for g in goals:
                session.add(g)

            # ── Budgets ────────────────────────────────────────────────────────
            budgets = [
                Budget(
                    household_id=household.id,
                    name="Groceries",
                    amount=Decimal("1000"),
                    period="monthly",
                    category_id=cats["Groceries"].id,
                ),
                Budget(
                    household_id=household.id,
                    name="Dining Out",
                    amount=Decimal("300"),
                    period="monthly",
                    category_id=cats["Dining Out"].id,
                ),
                Budget(
                    household_id=household.id,
                    name="Gas",
                    amount=Decimal("200"),
                    period="monthly",
                    category_id=cats["Gas"].id,
                ),
                Budget(
                    household_id=household.id,
                    name="Entertainment",
                    amount=Decimal("150"),
                    period="monthly",
                    category_id=cats["Entertainment"].id,
                ),
                Budget(
                    household_id=household.id,
                    name="Amazon",
                    amount=Decimal("200"),
                    period="monthly",
                    category_id=cats["Amazon"].id,
                ),
                Budget(
                    household_id=household.id,
                    name="Personal Care",
                    amount=Decimal("100"),
                    period="monthly",
                    category_id=cats["Personal Care"].id,
                ),
                Budget(
                    household_id=household.id,
                    name="Healthcare",
                    amount=Decimal("200"),
                    period="monthly",
                    category_id=cats["Healthcare"].id,
                ),
            ]
            for b in budgets:
                session.add(b)

            # ── Retirement Profile ─────────────────────────────────────────────
            # total retirement savings: 187k + 43k + 28.5k = 258.5k
            retirement = RetirementProfile(
                household_id=household.id,
                name="Primary Profile",
                current_age=38,
                retirement_age_target=55,
                current_savings=Decimal("258500"),
                monthly_contribution=Decimal("2200"),
                expected_return_rate=Decimal("0.07"),
                inflation_rate=Decimal("0.03"),
                target_annual_spending=Decimal("96000"),
                fire_mode="fat",
                withdrawal_rate=Decimal("0.03"),
                is_primary=True,
            )
            session.add(retirement)

            # ── Transactions (90 days) ─────────────────────────────────────────
            await session.flush()
            txn_count = 0
            random.seed(42)  # Reproducible results

            for days_ago in range(90, -1, -1):
                txn_date = today - timedelta(days=days_ago)
                dow = txn_date.weekday()  # 0=Mon, 6=Sun

                # Joshua paycheck — every other Friday (~$91k/yr net)
                if dow == 4 and (days_ago // 7) % 2 == 0:
                    session.add(Transaction(
                        household_id=household.id,
                        account_id=accounts["chase_checking"].id,
                        date=txn_date,
                        amount=Decimal("3812.50"),
                        description="DIRECT DEPOSIT ACME CORP",
                        merchant_name="Acme Corp",
                        category_id=cats["Paycheck"].id,
                        type="income",
                        status="cleared",
                        is_recurring=True,
                    ))
                    txn_count += 1

                # Ashley paycheck — 1st and 15th (~$65k/yr net)
                if txn_date.day in (1, 15):
                    session.add(Transaction(
                        household_id=household.id,
                        account_id=accounts["chase_checking"].id,
                        date=txn_date,
                        amount=Decimal("2708.33"),
                        description="DIRECT DEPOSIT RIVERSIDE SCHOOL",
                        merchant_name="Riverside Elementary",
                        category_id=cats["Paycheck"].id,
                        type="income",
                        status="cleared",
                        is_recurring=True,
                    ))
                    txn_count += 1

                # Monthly fixed bills on the 1st
                if txn_date.day == 1:
                    session.add(Transaction(
                        household_id=household.id,
                        account_id=accounts["chase_checking"].id,
                        date=txn_date,
                        amount=Decimal("-1847.00"),
                        description="ROCKET MORTGAGE PAYMENT",
                        merchant_name="Rocket Mortgage",
                        category_id=cats["Mortgage Payment"].id,
                        type="expense",
                        status="cleared",
                        is_recurring=True,
                    ))
                    session.add(Transaction(
                        household_id=household.id,
                        account_id=accounts["chase_checking"].id,
                        date=txn_date,
                        amount=Decimal("-641.00"),
                        description="FORD MOTOR CREDIT",
                        merchant_name="Ford Motor Credit",
                        category_id=cats["Car Payment"].id,
                        type="expense",
                        status="cleared",
                        is_recurring=True,
                    ))
                    session.add(Transaction(
                        household_id=household.id,
                        account_id=accounts["chase_checking"].id,
                        date=txn_date,
                        amount=Decimal("-287.00"),
                        description="LIGHTSTREAM LOAN PAYMENT",
                        merchant_name="LightStream",
                        category_id=cats["Loan Payment"].id,
                        type="expense",
                        status="cleared",
                        is_recurring=True,
                    ))
                    txn_count += 3

                # Utilities on the 15th
                if txn_date.day == 15:
                    electric = Decimal(f"{random.uniform(145, 195):.2f}")
                    internet = Decimal(f"{random.uniform(55, 85):.2f}")
                    session.add(Transaction(
                        household_id=household.id,
                        account_id=accounts["chase_sapphire"].id,
                        date=txn_date,
                        amount=-electric,
                        description="EVERGY ELECTRIC",
                        merchant_name="Evergy",
                        category_id=cats["Utilities"].id,
                        type="expense",
                        status="cleared",
                        is_recurring=True,
                    ))
                    session.add(Transaction(
                        household_id=household.id,
                        account_id=accounts["chase_sapphire"].id,
                        date=txn_date,
                        amount=-internet,
                        description="AT&T FIBER INTERNET",
                        merchant_name="AT&T",
                        category_id=cats["Subscriptions"].id,
                        type="expense",
                        status="cleared",
                        is_recurring=True,
                    ))
                    txn_count += 2

                # Grocery shopping — Mon, Thu, Sat (with some randomness)
                if dow in (0, 3, 5) and random.random() > 0.3:
                    store = random.choice([
                        "WALMART SUPERCENTER", "ALDI",
                        "PRICE CHOPPER", "HY-VEE",
                    ])
                    amount = Decimal(f"{random.uniform(65, 220):.2f}")
                    session.add(Transaction(
                        household_id=household.id,
                        account_id=accounts["chase_sapphire"].id,
                        date=txn_date,
                        amount=-amount,
                        description=f"{store} GROCERY",
                        merchant_name=store.title(),
                        category_id=cats["Groceries"].id,
                        type="expense",
                        status="cleared",
                    ))
                    txn_count += 1

                # Dining out — weekends + random weekdays
                if dow in (5, 6) or random.random() > 0.85:
                    restaurant = random.choice([
                        "CHICK-FIL-A", "CHIPOTLE", "OLIVE GARDEN",
                        "BUFFALO WILD WINGS", "PANERA BREAD",
                        "MCDONALD'S", "STARBUCKS",
                    ])
                    amount = Decimal(f"{random.uniform(12, 87):.2f}")
                    session.add(Transaction(
                        household_id=household.id,
                        account_id=accounts["chase_sapphire"].id,
                        date=txn_date,
                        amount=-amount,
                        description=f"{restaurant} #1234",
                        merchant_name=restaurant.title(),
                        category_id=cats["Dining Out"].id,
                        type="expense",
                        status="cleared",
                    ))
                    txn_count += 1

                # Gas — roughly Wednesday, not every week
                if dow == 2 and random.random() > 0.4:
                    amount = Decimal(f"{random.uniform(45, 85):.2f}")
                    session.add(Transaction(
                        household_id=household.id,
                        account_id=accounts["chase_sapphire"].id,
                        date=txn_date,
                        amount=-amount,
                        description="PHILLIPS 66 GAS STATION",
                        merchant_name="Phillips 66",
                        category_id=cats["Gas"].id,
                        type="expense",
                        status="cleared",
                    ))
                    txn_count += 1

                # Amazon orders — random ~15% chance per day
                if random.random() > 0.85:
                    amount = Decimal(f"{random.uniform(15, 180):.2f}")
                    session.add(Transaction(
                        household_id=household.id,
                        account_id=accounts["chase_sapphire"].id,
                        date=txn_date,
                        amount=-amount,
                        description="AMZN MKTP US",
                        merchant_name="Amazon",
                        category_id=cats["Amazon"].id,
                        type="expense",
                        status="cleared",
                    ))
                    txn_count += 1

                # Netflix subscription — 3rd of each month
                if txn_date.day == 3:
                    session.add(Transaction(
                        household_id=household.id,
                        account_id=accounts["chase_sapphire"].id,
                        date=txn_date,
                        amount=Decimal("-22.99"),
                        description="NETFLIX STREAMING",
                        merchant_name="Netflix",
                        category_id=cats["Subscriptions"].id,
                        type="expense",
                        status="cleared",
                        is_recurring=True,
                    ))
                    txn_count += 1

                # Spotify family plan — 7th of each month
                if txn_date.day == 7:
                    session.add(Transaction(
                        household_id=household.id,
                        account_id=accounts["chase_sapphire"].id,
                        date=txn_date,
                        amount=Decimal("-16.99"),
                        description="SPOTIFY FAMILY PLAN",
                        merchant_name="Spotify",
                        category_id=cats["Subscriptions"].id,
                        type="expense",
                        status="cleared",
                        is_recurring=True,
                    ))
                    txn_count += 1

            print(f"Created {txn_count} transactions over 90 days.")

    await engine.dispose()

    print("")
    print("Demo seed complete!")
    print("")
    print("Household : The Johnson Family")
    print("")
    print("Login credentials:")
    print("  Joshua (Owner) : joshua@johnson.family / demo1234")
    print("  Ashley (Member): ashley@johnson.family / demo1234")
    print("")
    print("Accounts seeded:")
    print("  Checking, Savings, HYSA, Chase Sapphire, Home Depot (0% promo),")
    print("  Pool Loan, Truck Note, Mortgage, 401k x2, Roth IRA, Brokerage")
    print("")
    print("Goals seeded  : Emergency Fund, Disney World, Christmas Fund,")
    print("                Property Taxes, New Roof Fund, Arkansas Vacation")
    print("Budgets seeded: Groceries, Dining Out, Gas, Entertainment,")
    print("                Amazon, Personal Care, Healthcare")
    print("Retirement    : Fat FIRE profile, target age 55")


if __name__ == "__main__":
    asyncio.run(seed())
