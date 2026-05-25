from __future__ import annotations

import uuid
from datetime import date, datetime, timedelta, timezone
from decimal import Decimal
from typing import Any

from sqlalchemy import select
from sqlalchemy.ext.asyncio import AsyncSession

from app.models.account import Account
from app.models.sync import FireflyConfig, SyncJob
from app.models.transaction import Category, Transaction
from app.services.firefly_client import FireflyClient


FIREFLY_ACCOUNT_TYPE_MAP = {
    "Asset account": "checking",
    "Savings account": "savings",
    "Cash account": "checking",
    "Credit card": "credit",
    "Loan": "loan",
    "Mortgage": "mortgage",
    "Debt": "loan",
    "Investment account": "investment",
}

FIREFLY_TXN_TYPE_MAP = {
    "Withdrawal": "expense",
    "Deposit": "income",
    "Transfer": "transfer",
    "Opening balance": "income",
    "Reconciliation": "expense",
}


class FireflySyncService:
    """Handles delta sync between Firefly III and the local database."""

    def __init__(self, client: FireflyClient, db: AsyncSession, household_id: uuid.UUID) -> None:
        self.client = client
        self.db = db
        self.household_id = household_id
        self._records_synced = 0

    async def run_delta_sync(self, lookback_days: int = 90) -> dict[str, Any]:
        """Perform a delta sync of accounts, categories, and transactions."""
        start_date = date.today() - timedelta(days=lookback_days)
        end_date = date.today()

        synced_accounts = await self._sync_accounts()
        synced_categories = await self._sync_categories()
        synced_transactions = await self._sync_transactions(start_date, end_date)

        self._records_synced = synced_accounts + synced_categories + synced_transactions
        return {
            "accounts": synced_accounts,
            "categories": synced_categories,
            "transactions": synced_transactions,
            "total": self._records_synced,
        }

    async def _sync_accounts(self) -> int:
        ff_accounts = await self.client.get_accounts("all")
        count = 0
        for item in ff_accounts:
            attrs = item.get("attributes", {})
            ff_id = str(item.get("id", ""))
            ff_type = attrs.get("type", "")
            local_type = FIREFLY_ACCOUNT_TYPE_MAP.get(ff_type)
            if not local_type:
                continue

            balance_str = attrs.get("current_balance", "0") or "0"
            try:
                balance = Decimal(str(balance_str))
            except Exception:
                balance = Decimal("0")

            result = await self.db.execute(
                select(Account).where(
                    Account.household_id == self.household_id,
                    Account.firefly_id == ff_id,
                )
            )
            existing = result.scalar_one_or_none()

            if existing:
                existing.balance = balance
                existing.name = attrs.get("name", existing.name)
                existing.last_synced_at = datetime.now(tz=timezone.utc)
            else:
                account = Account(
                    household_id=self.household_id,
                    firefly_id=ff_id,
                    name=attrs.get("name", "Unknown"),
                    type=local_type,
                    institution=attrs.get("bank_name") or attrs.get("notes", "")[:200],
                    balance=balance,
                    currency=attrs.get("currency_code", "USD"),
                    is_active=attrs.get("active", True),
                    last_synced_at=datetime.now(tz=timezone.utc),
                )
                self.db.add(account)
                count += 1

        await self.db.flush()
        return count

    async def _sync_categories(self) -> int:
        ff_categories = await self.client.get_categories()
        count = 0
        for item in ff_categories:
            attrs = item.get("attributes", {})
            ff_id = str(item.get("id", ""))

            result = await self.db.execute(
                select(Category).where(
                    Category.household_id == self.household_id,
                    Category.firefly_id == ff_id,
                )
            )
            existing = result.scalar_one_or_none()

            if not existing:
                cat = Category(
                    household_id=self.household_id,
                    firefly_id=ff_id,
                    name=attrs.get("name", "Unknown"),
                    is_system=False,
                )
                self.db.add(cat)
                count += 1

        await self.db.flush()
        return count

    async def _sync_transactions(self, start: date, end: date) -> int:
        ff_transactions = await self.client.get_transactions(start=start, end=end)
        count = 0

        # Build lookup maps
        account_map: dict[str, uuid.UUID] = {}
        acc_result = await self.db.execute(
            select(Account.firefly_id, Account.id).where(
                Account.household_id == self.household_id,
                Account.firefly_id != None,
            )
        )
        for ff_id, local_id in acc_result:
            account_map[ff_id] = local_id

        cat_map: dict[str, uuid.UUID] = {}
        cat_result = await self.db.execute(
            select(Category.firefly_id, Category.id).where(
                Category.household_id == self.household_id,
                Category.firefly_id != None,
            )
        )
        for ff_id, local_id in cat_result:
            cat_map[ff_id] = local_id

        for item in ff_transactions:
            attrs = item.get("attributes", {})
            ff_id = str(item.get("id", ""))
            transactions_list = attrs.get("transactions", [])

            for txn in transactions_list:
                txn_ff_id = f"{ff_id}-{txn.get('transaction_journal_id', ff_id)}"

                result = await self.db.execute(
                    select(Transaction).where(
                        Transaction.household_id == self.household_id,
                        Transaction.firefly_id == txn_ff_id,
                    )
                )
                existing = result.scalar_one_or_none()
                if existing:
                    continue

                ff_src_id = str(txn.get("source_id", "") or "")
                ff_dest_id = str(txn.get("destination_id", "") or "")
                account_id = account_map.get(ff_src_id) or account_map.get(ff_dest_id)
                if not account_id:
                    continue

                ff_type = txn.get("type", "Withdrawal")
                txn_type = FIREFLY_TXN_TYPE_MAP.get(ff_type, "expense")

                amount_str = txn.get("amount", "0") or "0"
                try:
                    amount = Decimal(str(amount_str))
                except Exception:
                    amount = Decimal("0")

                if txn_type == "expense":
                    amount = -abs(amount)

                txn_date_str = txn.get("date", date.today().isoformat())[:10]
                try:
                    txn_date = date.fromisoformat(txn_date_str)
                except Exception:
                    txn_date = date.today()

                ff_cat_id = str(txn.get("category_id", "") or "")
                category_id = cat_map.get(ff_cat_id)

                transaction = Transaction(
                    account_id=account_id,
                    household_id=self.household_id,
                    firefly_id=txn_ff_id,
                    date=txn_date,
                    amount=amount,
                    description=txn.get("description", "")[:500],
                    merchant_name=(txn.get("opposing_name") or "")[:200] or None,
                    category_id=category_id,
                    type=txn_type,
                    status="cleared",
                    notes=txn.get("notes"),
                )
                self.db.add(transaction)
                count += 1

        await self.db.flush()
        return count


async def run_household_sync(
    db: AsyncSession,
    household_id: uuid.UUID,
    sync_type: str = "delta",
) -> SyncJob:
    """Create and execute a sync job for a household."""
    # Get Firefly config
    config_result = await db.execute(
        select(FireflyConfig).where(
            FireflyConfig.household_id == household_id,
            FireflyConfig.is_active == True,
        )
    )
    config = config_result.scalar_one_or_none()
    if not config:
        raise ValueError(f"No active Firefly config found for household {household_id}")

    job = SyncJob(
        household_id=household_id,
        status="running",
        type=sync_type,
        started_at=datetime.now(tz=timezone.utc),
        triggered_by="user",
    )
    db.add(job)
    await db.flush()

    try:
        async with FireflyClient(base_url=config.base_url, pat=config.pat_token) as client:
            service = FireflySyncService(client, db, household_id)
            results = await service.run_delta_sync(lookback_days=config.lookback_days)

        job.status = "completed"
        job.completed_at = datetime.now(tz=timezone.utc)
        job.records_synced = results["total"]
        config.last_successful_sync = datetime.now(tz=timezone.utc)
    except Exception as exc:
        job.status = "failed"
        job.completed_at = datetime.now(tz=timezone.utc)
        job.error_message = str(exc)[:1000]
        raise

    await db.flush()
    return job
