"""add composite freshness score input details

Revision ID: c3d4e5f6a7b8
Revises: a7b8c9d0e1f2
Create Date: 2026-09-14 22:10:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


revision: str = "c3d4e5f6a7b8"
down_revision: Union[str, Sequence[str], None] = "a7b8c9d0e1f2"
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column("freshness_scores", sa.Column("storage_temperature", sa.Numeric(6, 2), nullable=True))
    op.add_column("freshness_scores", sa.Column("storage_humidity", sa.Numeric(5, 2), nullable=True))
    op.add_column("freshness_scores", sa.Column("storage_source", sa.String(100), nullable=True))
    op.add_column("freshness_scores", sa.Column("shelf_life_raw_prediction", sa.Numeric(12, 4), nullable=True))
    op.add_column("freshness_scores", sa.Column("shelf_life_unit_status", sa.String(100), nullable=True))
    op.add_column("freshness_scores", sa.Column("packaging", sa.String(100), nullable=True))
    op.add_column("freshness_scores", sa.Column("spoilage_probability", sa.Numeric(6, 5), nullable=True))


def downgrade() -> None:
    op.drop_column("freshness_scores", "spoilage_probability")
    op.drop_column("freshness_scores", "packaging")
    op.drop_column("freshness_scores", "shelf_life_unit_status")
    op.drop_column("freshness_scores", "shelf_life_raw_prediction")
    op.drop_column("freshness_scores", "storage_source")
    op.drop_column("freshness_scores", "storage_humidity")
    op.drop_column("freshness_scores", "storage_temperature")
