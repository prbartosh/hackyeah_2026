"""rozmowy partnerskie: dwustronna korespondencja w Giełdzie partnerstw (zadanie 0042)

Wymaga zmergowania migracji 0009 (mentorzy) i 0010 (pytania do ROPS).

Revision ID: 0011
Revises: 0010
Create Date: 2026-10-04
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0011"
down_revision: str | None = "0010"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _timestamps() -> list[sa.Column]:
    return [
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
    ]


def upgrade() -> None:
    op.create_table(
        "rozmowy_partnerskie",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("ogloszenie_id", sa.Integer(), nullable=False),
        sa.Column("nadawca_nazwa", sa.String(length=200), nullable=False),
        sa.Column("nadawca_email", sa.String(length=320), nullable=False),
        sa.Column("token_nadawcy", sa.String(length=64), nullable=False),
        sa.Column("token_autora", sa.String(length=64), nullable=False),
        sa.Column("status", sa.String(length=10), nullable=False),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["ogloszenie_id"], ["ogloszenia_partnerskie.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
        sa.UniqueConstraint("token_nadawcy"),
        sa.UniqueConstraint("token_autora"),
    )
    op.create_index(
        "ix_rozmowy_partnerskie_ogloszenie_id", "rozmowy_partnerskie", ["ogloszenie_id"]
    )
    op.create_table(
        "wiadomosci_rozmow",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("rozmowa_id", sa.Integer(), nullable=False),
        sa.Column("strona", sa.String(length=10), nullable=False),
        sa.Column("tresc", sa.Text(), nullable=False),
        *_timestamps(),
        sa.ForeignKeyConstraint(["rozmowa_id"], ["rozmowy_partnerskie.id"], ondelete="CASCADE"),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_wiadomosci_rozmow_rozmowa_id", "wiadomosci_rozmow", ["rozmowa_id"])


def downgrade() -> None:
    op.drop_index("ix_wiadomosci_rozmow_rozmowa_id", table_name="wiadomosci_rozmow")
    op.drop_table("wiadomosci_rozmow")
    op.drop_index("ix_rozmowy_partnerskie_ogloszenie_id", table_name="rozmowy_partnerskie")
    op.drop_table("rozmowy_partnerskie")
