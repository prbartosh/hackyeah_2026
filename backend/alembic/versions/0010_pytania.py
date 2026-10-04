"""pytania do ROPS i publiczne FAQ (zadanie 0041)

Revision ID: 0010
Revises: 0009
Create Date: 2026-10-04
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0010"
down_revision: str | None = "0009"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "pytania",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("tresc", sa.Text(), nullable=False),
        sa.Column("kategoria", sa.String(length=100), nullable=True),
        sa.Column("autor_nazwa", sa.String(length=200), nullable=True),
        sa.Column("autor_email", sa.String(length=320), nullable=True),
        sa.Column("zgoda_na_publikacje", sa.Boolean(), nullable=False),
        sa.Column("odpowiedz", sa.Text(), nullable=True),
        sa.Column("odpowiedziano", sa.DateTime(timezone=True), nullable=True),
        sa.Column("status", sa.String(length=15), nullable=False),
        sa.Column("syntetyczne", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_pytania_status", "pytania", ["status"])


def downgrade() -> None:
    op.drop_index("ix_pytania_status", table_name="pytania")
    op.drop_table("pytania")
