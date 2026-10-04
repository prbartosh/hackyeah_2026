"""pytania do instytucji testujących: innowacja przy zgłoszeniu (zadanie 0039)

Revision ID: 0009
Revises: 0008
Create Date: 2026-10-04
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0009"
down_revision: str | None = "0008"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.add_column("zgloszenia", sa.Column("innowacja_slug", sa.String(length=200), nullable=True))
    op.create_index("ix_zgloszenia_innowacja_slug", "zgloszenia", ["innowacja_slug"])


def downgrade() -> None:
    op.drop_index("ix_zgloszenia_innowacja_slug", table_name="zgloszenia")
    op.drop_column("zgloszenia", "innowacja_slug")
