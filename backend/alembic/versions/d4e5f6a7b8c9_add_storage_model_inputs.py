"""persist storage inputs used by shelf-life prediction

Revision ID: d4e5f6a7b8c9
Revises: c3d4e5f6a7b8
Create Date: 2026-09-14 23:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "d4e5f6a7b8c9"
down_revision: Union[str, Sequence[str], None] = "c3d4e5f6a7b8"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("storage_conditions", sa.Column("storage_duration", sa.Integer(), nullable=True))
    op.add_column("storage_conditions", sa.Column("door_opens_count", sa.Integer(), nullable=True))


def downgrade() -> None:
    op.drop_column("storage_conditions", "door_opens_count")
    op.drop_column("storage_conditions", "storage_duration")
