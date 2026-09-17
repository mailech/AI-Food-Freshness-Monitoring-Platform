"""add configurable storage rules

Revision ID: 0a1b2c3d4e5f
Revises: f6a7b8c9d0e1
"""

from alembic import op
import sqlalchemy as sa


revision = "0a1b2c3d4e5f"
down_revision = "f6a7b8c9d0e1"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # The food_category enum already exists in the database.
    # Use PostgreSQL's existing enum instead of attempting to create it again.
    op.execute("""
        CREATE TABLE storage_rules (
            id INTEGER PRIMARY KEY,
            category food_category NOT NULL UNIQUE,
            temperature_min NUMERIC(6, 2),
            temperature_max NUMERIC(6, 2),
            humidity_min NUMERIC(5, 2),
            humidity_max NUMERIC(5, 2),
            air_circulation_min NUMERIC(8, 2),
            air_circulation_max NUMERIC(8, 2),
            light_level_min NUMERIC(10, 2),
            light_level_max NUMERIC(10, 2)
        )
    """)

    op.create_index(
        op.f("ix_storage_rules_category"),
        "storage_rules",
        ["category"],
        unique=True,
    )


def downgrade() -> None:
    op.drop_index(
        op.f("ix_storage_rules_category"),
        table_name="storage_rules",
    )

    op.drop_table("storage_rules")