from __future__ import annotations

import uuid
from datetime import datetime
from decimal import Decimal

from sqlalchemy import DateTime, ForeignKey, Numeric, String, Text
from sqlalchemy.dialects.postgresql import JSON, UUID
from sqlalchemy.orm import Mapped, mapped_column, relationship

from app.models.base import Base, TimestampMixin, UUIDPrimaryKey


class Scenario(UUIDPrimaryKey, TimestampMixin, Base):
    __tablename__ = "scenarios"

    household_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("households.id", ondelete="CASCADE"), nullable=False, index=True
    )
    name: Mapped[str] = mapped_column(String(200), nullable=False)
    # type: vacation_trip, major_purchase, income_change, extra_debt_payment,
    #        tax_refund, refinance, custom
    type: Mapped[str] = mapped_column(String(50), nullable=False)
    description: Mapped[str | None] = mapped_column(Text)
    parameters: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    is_archived: Mapped[bool] = mapped_column(default=False, nullable=False)

    # Relationships
    household = relationship("Household", back_populates="scenarios")
    runs: Mapped[list["ScenarioRun"]] = relationship(
        "ScenarioRun", back_populates="scenario", cascade="all, delete-orphan"
    )


class ScenarioRun(UUIDPrimaryKey, TimestampMixin, Base):
    __tablename__ = "scenario_runs"

    scenario_id: Mapped[uuid.UUID] = mapped_column(
        UUID(as_uuid=True), ForeignKey("scenarios.id", ondelete="CASCADE"), nullable=False, index=True
    )
    inputs: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    outputs: Mapped[dict] = mapped_column(JSON, nullable=False, default=dict)
    # verdict: DO IT, CAUTION, NOT NOW
    verdict: Mapped[str] = mapped_column(String(20), nullable=False, default="CAUTION")
    cash_impact: Mapped[Decimal | None] = mapped_column(Numeric(precision=15, scale=2))
    emergency_impact: Mapped[Decimal | None] = mapped_column(Numeric(precision=15, scale=2))
    debt_timeline_impact: Mapped[int | None] = mapped_column()  # days change
    retirement_impact: Mapped[Decimal | None] = mapped_column(Numeric(precision=15, scale=2))
    logic_trace: Mapped[list] = mapped_column(JSON, nullable=False, default=list)
    warnings: Mapped[list] = mapped_column(JSON, nullable=False, default=list)

    # Relationships
    scenario: Mapped["Scenario"] = relationship("Scenario", back_populates="runs")
