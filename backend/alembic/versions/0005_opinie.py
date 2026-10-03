"""opinie: Tester innowacji (zadanie 0019)

Revision ID: 0005
Revises: 0004
Create Date: 2026-10-03
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0005"
down_revision: str | None = "0004"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table(
        "opinie",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("slug", sa.String(length=200), nullable=False),
        sa.Column("rodzaj", sa.String(length=10), nullable=False),
        sa.Column("status", sa.String(length=15), nullable=False),
        sa.Column("ocena", sa.SmallInteger(), nullable=True),
        sa.Column("instytucja", sa.String(length=200), nullable=True),
        sa.Column("tresc", sa.Text(), nullable=False),
        sa.Column("usprawnienie", sa.Text(), nullable=True),
        sa.Column("token_watku", sa.String(length=64), nullable=True),
        sa.Column("syntetyczna", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_opinie_slug", "opinie", ["slug"], unique=False)
    op.create_index("ix_opinie_status", "opinie", ["status"], unique=False)


def downgrade() -> None:
    op.drop_index("ix_opinie_status", table_name="opinie")
    op.drop_index("ix_opinie_slug", table_name="opinie")
    op.drop_table("opinie")
