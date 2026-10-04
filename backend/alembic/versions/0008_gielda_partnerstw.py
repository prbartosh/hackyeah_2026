"""giełda partnerstw: ogłoszenia i wiadomości (zadanie 0036)

Revision ID: 0008
Revises: 0007
Create Date: 2026-10-04
"""

from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0008"
down_revision: str | None = "0007"
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
        "ogloszenia_partnerskie",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("typ", sa.String(length=20), nullable=False),
        sa.Column("sektor", sa.String(length=15), nullable=False),
        sa.Column("instytucja", sa.String(length=200), nullable=False),
        sa.Column("tytul", sa.String(length=200), nullable=False),
        sa.Column("opis", sa.Text(), nullable=False),
        sa.Column("powiat", sa.String(length=50), nullable=False),
        sa.Column("innowacja_slug", sa.String(length=200), nullable=True),
        sa.Column("kontakt_email", sa.String(length=320), nullable=False),
        sa.Column("status", sa.String(length=15), nullable=False),
        sa.Column("syntetyczne", sa.Boolean(), nullable=False),
        *_timestamps(),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_ogloszenia_partnerskie_typ", "ogloszenia_partnerskie", ["typ"])
    op.create_index("ix_ogloszenia_partnerskie_status", "ogloszenia_partnerskie", ["status"])
    op.create_table(
        "wiadomosci_partnerskie",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("ogloszenie_id", sa.Integer(), nullable=False),
        sa.Column("nadawca_nazwa", sa.String(length=200), nullable=False),
        sa.Column("nadawca_email", sa.String(length=320), nullable=False),
        sa.Column("tresc", sa.Text(), nullable=False),
        *_timestamps(),
        sa.ForeignKeyConstraint(
            ["ogloszenie_id"], ["ogloszenia_partnerskie.id"], ondelete="CASCADE"
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index(
        "ix_wiadomosci_partnerskie_ogloszenie_id", "wiadomosci_partnerskie", ["ogloszenie_id"]
    )


def downgrade() -> None:
    op.drop_index("ix_wiadomosci_partnerskie_ogloszenie_id", table_name="wiadomosci_partnerskie")
    op.drop_table("wiadomosci_partnerskie")
    op.drop_index("ix_ogloszenia_partnerskie_status", table_name="ogloszenia_partnerskie")
    op.drop_index("ix_ogloszenia_partnerskie_typ", table_name="ogloszenia_partnerskie")
    op.drop_table("ogloszenia_partnerskie")
