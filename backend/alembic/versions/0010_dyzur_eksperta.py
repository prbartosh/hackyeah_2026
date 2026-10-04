"""dyżur eksperta: prośba w wątku, przypisany ekspert, podpis wiadomości (zadanie 0040)

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
    op.add_column(
        "zgloszenia",
        sa.Column("prosba_o_eksperta", sa.Boolean(), server_default=sa.false(), nullable=False),
    )
    op.add_column("zgloszenia", sa.Column("ekspert", sa.String(length=150), nullable=True))
    op.add_column("wiadomosci_watku", sa.Column("podpis", sa.String(length=150), nullable=True))


def downgrade() -> None:
    op.drop_column("wiadomosci_watku", "podpis")
    op.drop_column("zgloszenia", "ekspert")
    op.drop_column("zgloszenia", "prosba_o_eksperta")
