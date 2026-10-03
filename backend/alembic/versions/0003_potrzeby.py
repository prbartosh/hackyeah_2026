"""potrzeby z czatu (zadanie 0004)

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-03
"""

from collections.abc import Sequence

import sqlalchemy as sa
from sqlalchemy.dialects import postgresql

from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None

SLUG_LISTS = ("grupy_docelowe", "problemy", "miejsca", "skale", "zasoby", "proby", "innowacje")


def upgrade() -> None:
    op.create_table(
        "potrzeby",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("rola", sa.String(length=20), nullable=True),
        *(sa.Column(name, postgresql.ARRAY(sa.Text()), nullable=False) for name in SLUG_LISTS),
        sa.Column("brak_dopasowania", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_potrzeby_created_at", "potrzeby", ["created_at"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_potrzeby_created_at", table_name="potrzeby")
    op.drop_table("potrzeby")
