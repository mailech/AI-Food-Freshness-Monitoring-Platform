"""distinguish automatic alerts from manual alerts

Revision ID: e5f6a7b8c9d0
Revises: d4e5f6a7b8c9
Create Date: 2026-09-15 19:35:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "e5f6a7b8c9d0"
down_revision: Union[str, Sequence[str], None] = "d4e5f6a7b8c9"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "alerts",
        sa.Column("source", sa.String(length=20), nullable=False, server_default="manual"),
    )
    op.add_column("alerts", sa.Column("condition_key", sa.String(length=150), nullable=True))
    op.create_index(op.f("ix_alerts_condition_key"), "alerts", ["condition_key"], unique=False)
    op.create_index(op.f("ix_alerts_source"), "alerts", ["source"], unique=False)


def downgrade() -> None:
    op.drop_index(op.f("ix_alerts_source"), table_name="alerts")
    op.drop_index(op.f("ix_alerts_condition_key"), table_name="alerts")
    op.drop_column("alerts", "condition_key")
    op.drop_column("alerts", "source")
