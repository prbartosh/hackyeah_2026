"""obserwuj potrzebę: powiadomienie o nowej pasującej karcie (zadanie 0045)

Revision ID: 0013
Revises: 0012
Create Date: 2026-10-04
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0013"
down_revision: str | None = "0012"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column(
        "zgloszenia",
        sa.Column("obserwuje", sa.Boolean(), server_default=sa.false(), nullable=False),
    )
    op.add_column("zgloszenia", sa.Column("powiadomiono_o", sa.JSON(), nullable=True))


def downgrade() -> None:
    op.drop_column("zgloszenia", "powiadomiono_o")
    op.drop_column("zgloszenia", "obserwuje")
