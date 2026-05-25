from __future__ import annotations

import asyncio
from datetime import date
from typing import Any

import httpx
from tenacity import (
    retry,
    retry_if_exception_type,
    stop_after_attempt,
    wait_exponential,
)

from app.config import settings


class FireflyAPIError(Exception):
    def __init__(self, status_code: int, detail: str) -> None:
        self.status_code = status_code
        self.detail = detail
        super().__init__(f"Firefly API error {status_code}: {detail}")


class FireflyClient:
    """Async HTTP client for the Firefly III REST API."""

    def __init__(
        self,
        base_url: str | None = None,
        pat: str | None = None,
        timeout: float = 30.0,
    ) -> None:
        self.base_url = (base_url or settings.FIREFLY_BASE_URL).rstrip("/")
        self.pat = pat or settings.FIREFLY_PAT
        self.timeout = timeout
        self._client: httpx.AsyncClient | None = None

    def _get_client(self) -> httpx.AsyncClient:
        if self._client is None or self._client.is_closed:
            self._client = httpx.AsyncClient(
                base_url=f"{self.base_url}/api/v1",
                headers={
                    "Authorization": f"Bearer {self.pat}",
                    "Accept": "application/json",
                    "Content-Type": "application/json",
                },
                timeout=self.timeout,
            )
        return self._client

    async def close(self) -> None:
        if self._client and not self._client.is_closed:
            await self._client.aclose()

    async def __aenter__(self) -> "FireflyClient":
        return self

    async def __aexit__(self, *_: Any) -> None:
        await self.close()

    @retry(
        retry=retry_if_exception_type((httpx.TimeoutException, httpx.NetworkError)),
        wait=wait_exponential(multiplier=1, min=1, max=10),
        stop=stop_after_attempt(3),
        reraise=True,
    )
    async def _get(self, path: str, params: dict | None = None) -> dict:
        client = self._get_client()
        response = await client.get(path, params=params or {})
        if response.status_code >= 400:
            raise FireflyAPIError(response.status_code, response.text[:500])
        return response.json()

    async def _paginate(self, path: str, params: dict | None = None) -> list[dict]:
        """Fetch all pages of a paginated endpoint."""
        results: list[dict] = []
        page = 1
        base_params = dict(params or {})
        while True:
            base_params["page"] = page
            data = await self._get(path, base_params)
            items = data.get("data", [])
            results.extend(items)
            meta = data.get("meta", {}).get("pagination", {})
            total_pages = meta.get("total_pages", 1)
            if page >= total_pages:
                break
            page += 1
        return results

    async def get_about(self) -> dict:
        """Get Firefly instance info."""
        return await self._get("/about")

    async def get_accounts(self, account_type: str = "all") -> list[dict]:
        """
        Retrieve accounts.
        account_type: 'all', 'asset', 'expense', 'revenue', 'liabilities', 'cash'
        """
        params = {"type": account_type}
        return await self._paginate("/accounts", params)

    async def get_account(self, account_id: str) -> dict:
        data = await self._get(f"/accounts/{account_id}")
        return data.get("data", {})

    async def get_transactions(
        self,
        start: date | None = None,
        end: date | None = None,
        page: int = 1,
        limit: int = 50,
        account_id: str | None = None,
    ) -> list[dict]:
        """Retrieve transactions with optional date range and account filter."""
        params: dict[str, Any] = {"limit": limit}
        if start:
            params["start"] = start.isoformat()
        if end:
            params["end"] = end.isoformat()
        if account_id:
            return await self._paginate(f"/accounts/{account_id}/transactions", params)
        return await self._paginate("/transactions", params)

    async def get_budgets(self) -> list[dict]:
        return await self._paginate("/budgets")

    async def get_budget(self, budget_id: str) -> dict:
        data = await self._get(f"/budgets/{budget_id}")
        return data.get("data", {})

    async def get_budget_limits(self, budget_id: str) -> list[dict]:
        return await self._paginate(f"/budgets/{budget_id}/limits")

    async def get_bills(self) -> list[dict]:
        return await self._paginate("/bills")

    async def get_categories(self) -> list[dict]:
        return await self._paginate("/categories")

    async def get_category(self, category_id: str) -> dict:
        data = await self._get(f"/categories/{category_id}")
        return data.get("data", {})

    async def get_tags(self) -> list[dict]:
        return await self._paginate("/tags")

    async def get_summary_basic(self, start: date, end: date) -> dict:
        params = {"start": start.isoformat(), "end": end.isoformat()}
        return await self._get("/summary/basic", params)

    async def get_net_worth(self) -> dict:
        return await self._get("/chart/account/overview")

    async def get_account_transactions(
        self, account_id: str, start: date | None = None, end: date | None = None
    ) -> list[dict]:
        params: dict[str, Any] = {}
        if start:
            params["start"] = start.isoformat()
        if end:
            params["end"] = end.isoformat()
        return await self._paginate(f"/accounts/{account_id}/transactions", params)

    async def get_piggy_banks(self) -> list[dict]:
        return await self._paginate("/piggy-banks")

    async def ping(self) -> bool:
        """Check if the Firefly instance is reachable and PAT is valid."""
        try:
            await self.get_about()
            return True
        except Exception:
            return False
