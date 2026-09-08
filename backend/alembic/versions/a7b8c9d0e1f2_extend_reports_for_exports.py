"""extend reports for exports

Revision ID: a7b8c9d0e1f2
Revises: f1c2d3e4a5b6
Create Date: 2026-09-06 19:00:00.000000
"""

from typing import Sequence, Union

from alembic import op
import sqlalchemy as sa
from sqlalchemy.dialects import postgresql


# revision identifiers, used by Alembic.
revision: str = "a7b8c9d0e1f2"
down_revision: Union[str, Sequence[str], None] = "f1c2d3e4a5b6"
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None


def upgrade() -> None:
    """Extend the existing reports table without replacing it or its records."""
    op.alter_column("reports", "date_from", existing_type=sa.Date(), nullable=True)
    op.alter_column("reports", "date_to", existing_type=sa.Date(), nullable=True)
    op.add_column("reports", sa.Column("report_data", postgresql.JSONB(astext_type=sa.Text()), nullable=True))
    op.add_column("reports", sa.Column("status", sa.String(length=50), server_default="pending", nullable=False))
    op.add_column("reports", sa.Column("pdf_file_reference", sa.String(length=500), nullable=True))
    op.add_column("reports", sa.Column("excel_file_reference", sa.String(length=500), nullable=True))


def downgrade() -> None:
    """Remove only report export fields and restore the prior date requirements."""
    op.drop_column("reports", "excel_file_reference")
    op.drop_column("reports", "pdf_file_reference")
    op.drop_column("reports", "status")
    op.drop_column("reports", "report_data")
    op.alter_column("reports", "date_to", existing_type=sa.Date(), nullable=False)
    op.alter_column("reports", "date_from", existing_type=sa.Date(), nullable=False)
