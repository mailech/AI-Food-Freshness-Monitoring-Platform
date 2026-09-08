"""add freshness scores

Revision ID: f1c2d3e4a5b6
Revises: b92fd8490f37
Create Date: 2026-09-06 18:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision: str = "f1c2d3e4a5b6"
down_revision: Union[str, Sequence[str], None] = "b92fd8490f37"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Create the dedicated persistence table for composite scoring evaluations."""
    op.create_table(
        "freshness_scores",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("food_batch_id", sa.Integer(), nullable=False),
        sa.Column("visual_freshness_score", sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column("storage_condition_score", sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column("shelf_life_score", sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column("product_age_score", sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column("freshness_score", sa.Numeric(precision=5, scale=2), nullable=True),
        sa.Column("visual_weight", sa.Numeric(precision=3, scale=2), server_default="0.40", nullable=False),
        sa.Column("storage_weight", sa.Numeric(precision=3, scale=2), server_default="0.25", nullable=False),
        sa.Column("shelf_life_weight", sa.Numeric(precision=3, scale=2), server_default="0.20", nullable=False),
        sa.Column("product_age_weight", sa.Numeric(precision=3, scale=2), server_default="0.15", nullable=False),
        sa.Column("status", sa.String(length=100), server_default="pending_model_integration", nullable=False),
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.text("now()"), nullable=False),
        sa.ForeignKeyConstraint(["food_batch_id"], ["food_batches.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(op.f("ix_freshness_scores_created_at"), "freshness_scores", ["created_at"], unique=False)
    op.create_index(op.f("ix_freshness_scores_food_batch_id"), "freshness_scores", ["food_batch_id"], unique=False)


def downgrade() -> None:
    """Remove only the dedicated freshness scoring table and its indexes."""
    op.drop_index(op.f("ix_freshness_scores_food_batch_id"), table_name="freshness_scores")
    op.drop_index(op.f("ix_freshness_scores_created_at"), table_name="freshness_scores")
    op.drop_table("freshness_scores")
