from __future__ import annotations

import uuid
from typing import Any

from fastapi import APIRouter, Depends, HTTPException, status
from pydantic import BaseModel, Field
from sqlalchemy import and_, select
from sqlalchemy.ext.asyncio import AsyncSession
from sqlalchemy.orm import selectinload

from app.database import get_db
from app.deps import get_current_household, get_current_user
from app.auth.models import User
from app.models.household import Household
from app.models.scenario import Scenario, ScenarioRun
from app.services import scenario_engine

router = APIRouter(prefix="/scenarios", tags=["scenarios"])


class ScenarioCreate(BaseModel):
    name: str = Field(max_length=200)
    type: str  # vacation_trip, major_purchase, income_change, extra_debt_payment, tax_refund, refinance
    description: str | None = None
    parameters: dict = Field(default_factory=dict)


class ScenarioRunRequest(BaseModel):
    override_params: dict | None = None


@router.get("/")
async def list_scenarios(
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> list[dict]:
    result = await db.execute(
        select(Scenario)
        .where(Scenario.household_id == household.id, Scenario.is_archived == False)
        .order_by(Scenario.created_at.desc())
    )
    scenarios = result.scalars().all()
    return [_scenario_to_dict(s) for s in scenarios]


@router.post("/", status_code=status.HTTP_201_CREATED)
async def create_scenario(
    body: ScenarioCreate,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> dict:
    if body.type not in scenario_engine.SCENARIO_HANDLERS:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown scenario type: {body.type}. Valid types: {list(scenario_engine.SCENARIO_HANDLERS.keys())}",
        )
    scenario = Scenario(
        household_id=household.id,
        name=body.name,
        type=body.type,
        description=body.description,
        parameters=body.parameters,
    )
    db.add(scenario)
    await db.flush()
    return _scenario_to_dict(scenario)


@router.get("/{scenario_id}")
async def get_scenario(
    scenario_id: uuid.UUID,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(Scenario)
        .where(Scenario.id == scenario_id, Scenario.household_id == household.id)
        .options(selectinload(Scenario.runs))
    )
    scenario = result.scalar_one_or_none()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    data = _scenario_to_dict(scenario)
    data["runs"] = [_run_to_dict(r) for r in sorted(scenario.runs, key=lambda r: r.created_at, reverse=True)]
    return data


@router.post("/{scenario_id}/run", status_code=status.HTTP_201_CREATED)
async def run_scenario(
    scenario_id: uuid.UUID,
    body: ScenarioRunRequest,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> dict:
    result = await db.execute(
        select(Scenario).where(Scenario.id == scenario_id, Scenario.household_id == household.id)
    )
    scenario = result.scalar_one_or_none()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")

    run = await scenario_engine.run_scenario(db, scenario, body.override_params)
    return _run_to_dict(run)


@router.post("/quick-run", status_code=status.HTTP_200_OK)
async def quick_run_scenario(
    body: ScenarioCreate,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> dict:
    """Run a scenario without persisting it."""
    if body.type not in scenario_engine.SCENARIO_HANDLERS:
        raise HTTPException(status_code=400, detail=f"Unknown scenario type: {body.type}")

    handler = scenario_engine.SCENARIO_HANDLERS[body.type]
    result = await handler(db, household.id, body.parameters)
    return result


@router.delete("/{scenario_id}", status_code=status.HTTP_204_NO_CONTENT)
async def archive_scenario(
    scenario_id: uuid.UUID,
    household: Household = Depends(get_current_household),
    db: AsyncSession = Depends(get_db),
) -> None:
    result = await db.execute(
        select(Scenario).where(Scenario.id == scenario_id, Scenario.household_id == household.id)
    )
    scenario = result.scalar_one_or_none()
    if not scenario:
        raise HTTPException(status_code=404, detail="Scenario not found")
    scenario.is_archived = True
    await db.flush()


def _scenario_to_dict(s: Scenario) -> dict:
    return {
        "id": str(s.id),
        "name": s.name,
        "type": s.type,
        "description": s.description,
        "parameters": s.parameters,
        "is_archived": s.is_archived,
        "created_at": s.created_at.isoformat(),
    }


def _run_to_dict(r: ScenarioRun) -> dict:
    return {
        "id": str(r.id),
        "scenario_id": str(r.scenario_id),
        "verdict": r.verdict,
        "cash_impact": float(r.cash_impact) if r.cash_impact else None,
        "emergency_impact": float(r.emergency_impact) if r.emergency_impact else None,
        "debt_timeline_impact": r.debt_timeline_impact,
        "retirement_impact": float(r.retirement_impact) if r.retirement_impact else None,
        "inputs": r.inputs,
        "outputs": r.outputs,
        "logic_trace": r.logic_trace,
        "warnings": r.warnings,
        "created_at": r.created_at.isoformat(),
    }
