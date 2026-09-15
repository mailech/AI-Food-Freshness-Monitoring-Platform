"""distinguish automatic recommendations from manual recommendations

Revision ID: f6a7b8c9d0e1
Revises: e5f6a7b8c9d0
Create Date: 2026-09-15 20:15:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "f6a7b8c9d0e1"
down_revision: Union[str, Sequence[str], None] = "e5f6a7b8c9d0"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column(
        "recommendations",
        sa.Column("source", sa.String(length=20), nullable=False, server_default="manual"),
    )
    op.add_column(
        "recommendations",
        sa.Column("condition_key", sa.String(length=150), nullable=True),
    )
    op.create_index(op.f("ix_recommendations_source"), "recommendations", ["source"], unique=False)
    op.create_index(
        op.f("ix_recommendations_condition_key"),
        "recommendations",
        ["condition_key"],
        unique=False,
    )


def downgrade() -> None:
    op.drop_index(op.f("ix_recommendations_condition_key"), table_name="recommendations")
    op.drop_index(op.f("ix_recommendations_source"), table_name="recommendations")
    op.drop_column("recommendations", "condition_key")
    op.drop_column("recommendations", "source")
