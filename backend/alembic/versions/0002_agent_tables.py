"""agent tables

Revision ID: 0002
Revises: 0001
Create Date: 2026-05-25

"""
from __future__ import annotations

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

revision = "0002"
down_revision = "0001"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.create_table(
        "agent_briefings",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()")),
        sa.Column("household_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("households.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("body", sa.Text(), nullable=False),
        sa.Column("for_date", sa.Date(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_agent_briefings_household_id", "agent_briefings", ["household_id"])
    op.create_index("ix_agent_briefings_for_date", "agent_briefings", ["for_date"])

    op.create_table(
        "agent_priorities",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()")),
        sa.Column("household_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("households.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("subtitle", sa.Text(), nullable=True),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("deadline", sa.Date(), nullable=True),
        sa.Column("severity", sa.String(20), nullable=False, server_default="medium"),
        sa.Column("position", sa.Integer(), nullable=False, server_default="0"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_agent_priorities_household_id", "agent_priorities", ["household_id"])

    op.create_table(
        "agent_anomalies",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()")),
        sa.Column("household_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("households.id", ondelete="CASCADE"), nullable=False),
        sa.Column("title", sa.String(300), nullable=False),
        sa.Column("description", sa.Text(), nullable=True),
        sa.Column("amount", sa.Numeric(precision=12, scale=2), nullable=True),
        sa.Column("transaction_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("transactions.id", ondelete="SET NULL"), nullable=True),
        sa.Column("severity", sa.String(20), nullable=False, server_default="medium"),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_agent_anomalies_household_id", "agent_anomalies", ["household_id"])

    op.create_table(
        "agent_categorization_log",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()")),
        sa.Column("household_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("households.id", ondelete="CASCADE"), nullable=False),
        sa.Column("transaction_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("transactions.id", ondelete="CASCADE"), nullable=False),
        sa.Column("category_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("categories.id", ondelete="CASCADE"), nullable=False),
        sa.Column("confidence", sa.Float(), nullable=False, server_default="1.0"),
        sa.Column("reasoning", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
    )
    op.create_index("ix_agent_categorization_log_household_id", "agent_categorization_log", ["household_id"])
    op.create_index("ix_agent_categorization_log_transaction_id", "agent_categorization_log", ["transaction_id"])

    op.create_table(
        "agent_jobs",
        sa.Column("id", postgresql.UUID(as_uuid=True), primary_key=True, default=sa.text("gen_random_uuid()")),
        sa.Column("household_id", postgresql.UUID(as_uuid=True), sa.ForeignKey("households.id", ondelete="CASCADE"), nullable=False),
        sa.Column("task", sa.String(200), nullable=False),
        sa.Column("note", sa.Text(), nullable=True),
        sa.Column("status", sa.String(20), nullable=False, server_default="pending"),
        sa.Column("result_summary", sa.Text(), nullable=True),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("completed_at", sa.DateTime(timezone=True), nullable=True),
    )
    op.create_index("ix_agent_jobs_household_id", "agent_jobs", ["household_id"])
    op.create_index("ix_agent_jobs_status", "agent_jobs", ["status"])


def downgrade() -> None:
    op.drop_table("agent_jobs")
    op.drop_table("agent_categorization_log")
    op.drop_table("agent_anomalies")
    op.drop_table("agent_priorities")
    op.drop_table("agent_briefings")
