"""usunięcie licznika dziennego limitu wywołań AI

Revision ID: 0006
Revises: 0005
Create Date: 2026-10-04
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0006"
down_revision: str | None = "0005"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.drop_table("uzycie_ai")


def downgrade() -> None:
    op.create_table(
        "uzycie_ai",
        sa.Column("dzien", sa.String(length=32), nullable=False),
        sa.Column("wywolania", sa.Integer(), nullable=False),
        sa.PrimaryKeyConstraint("dzien"),
    )
