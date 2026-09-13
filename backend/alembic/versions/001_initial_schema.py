""initial_schema

Revision ID: 001_initial
Revises: 
Create Date: 2026-09-13

""
from typing import Sequence, Union
from alembic import op
import sqlalchemy as sa

revision: str = '001_initial'
down_revision: Union[str, None] = None
branch_labels: Union[str, Sequence[str], None] = None
depends_on: Union[str, Sequence[str], None] = None

def upgrade() -> None:
    # Schema is managed via SQLAlchemy declarative metadata Base.metadata.create_all
    pass

def downgrade() -> None:
    pass
