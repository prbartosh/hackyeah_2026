"""kreator pomysłów: fiszki, nabory, wnioski, canvy

Revision ID: 0003
Revises: 0002
Create Date: 2026-10-03
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0003"
down_revision: str | None = "0002"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def _timestamps() -> list[sa.Column]:
    return [
        sa.Column("created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
        sa.Column("updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False),
    ]


def upgrade() -> None:
    # Osobne liczniki dziennego limitu AI: klucz „kreator:RRRR-MM-DD”.
    op.alter_column("uzycie_ai", "dzien", existing_type=sa.String(10), type_=sa.String(32))

    op.create_table(
        "fiszki",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("token", sa.String(64), nullable=False),
        sa.Column("status", sa.String(10), nullable=False),
        sa.Column("opis_wlasny", sa.Text()),
        sa.Column("istota", sa.Text()),
        sa.Column("odbiorca", sa.Text()),
        sa.Column("etap", sa.String(20)),
        sa.Column("obszar", sa.String(100)),
        sa.Column("lokalizacja", sa.String(200)),
        sa.Column("potrzeby", sa.Text()),
        sa.Column("pola_ai", sa.JSON(), nullable=False),
        sa.Column("karta_slug", sa.String(200)),
        sa.Column("token_watku", sa.String(64)),
        sa.Column("syntetyczna", sa.Boolean(), nullable=False),
        *_timestamps(),
    )
    op.create_index("ix_fiszki_token", "fiszki", ["token"], unique=True)
    op.create_index("ix_fiszki_status", "fiszki", ["status"])

    op.create_table(
        "nabory",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("slug", sa.String(100), nullable=False),
        sa.Column("nazwa", sa.String(300), nullable=False),
        sa.Column("organizator", sa.String(300)),
        sa.Column("opis", sa.Text()),
        sa.Column("url_zrodlowy", sa.Text()),
        sa.Column("termin_od", sa.Date(), nullable=False),
        sa.Column("termin_do", sa.Date(), nullable=False),
        sa.Column("pola", sa.JSON(), nullable=False),
        sa.Column("kryteria", sa.JSON(), nullable=False),
        sa.Column("obszary", sa.JSON(), nullable=False),
        sa.Column("odbiorcy", sa.JSON(), nullable=False),
        sa.Column("syntetyczny", sa.Boolean(), nullable=False),
        *_timestamps(),
    )
    op.create_index("ix_nabory_slug", "nabory", ["slug"], unique=True)
    op.create_index("ix_nabory_termin_od", "nabory", ["termin_od"])
    op.create_index("ix_nabory_termin_do", "nabory", ["termin_do"])

    op.create_table(
        "wnioski",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("token", sa.String(64), nullable=False),
        sa.Column("fiszka_id", sa.Integer(), sa.ForeignKey("fiszki.id", ondelete="CASCADE"), nullable=False),
        sa.Column("nabor_id", sa.Integer(), sa.ForeignKey("nabory.id", ondelete="CASCADE"), nullable=False),
        sa.Column("pola", sa.JSON(), nullable=False),
        sa.Column("status", sa.String(10), nullable=False),
        sa.Column("token_watku", sa.String(64)),
        sa.Column("komunikat_ai", sa.Text()),
        *_timestamps(),
    )
    op.create_index("ix_wnioski_token", "wnioski", ["token"], unique=True)

    op.create_table(
        "szablony_canvy",
        sa.Column("slug", sa.String(100), primary_key=True),
        sa.Column("nazwa", sa.String(300), nullable=False),
        sa.Column("opis", sa.Text()),
        sa.Column("url_zrodlowy", sa.Text()),
        sa.Column("sekcje", sa.JSON(), nullable=False),
    )
    op.create_table(
        "canvy",
        sa.Column("id", sa.Integer(), primary_key=True),
        sa.Column("token", sa.String(64), nullable=False),
        sa.Column("szablon_slug", sa.String(100), sa.ForeignKey("szablony_canvy.slug"), nullable=False),
        sa.Column("tytul", sa.String(300), nullable=False),
        sa.Column("fiszka_id", sa.Integer(), sa.ForeignKey("fiszki.id", ondelete="SET NULL")),
        sa.Column("wartosci", sa.JSON(), nullable=False),
        sa.Column("syntetyczna", sa.Boolean(), nullable=False),
        *_timestamps(),
    )
    op.create_index("ix_canvy_token", "canvy", ["token"], unique=True)


def downgrade() -> None:
    op.drop_table("canvy")
    op.drop_table("szablony_canvy")
    op.drop_table("wnioski")
    op.drop_table("nabory")
    op.drop_table("fiszki")
    op.alter_column("uzycie_ai", "dzien", existing_type=sa.String(32), type_=sa.String(10))
