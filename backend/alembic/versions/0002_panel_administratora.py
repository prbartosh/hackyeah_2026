"""panel administratora: karty, zgłoszenia, wątki, powiadomienia, importy

Revision ID: 0002
Revises: 0001
Create Date: 2026-10-03
"""
from collections.abc import Sequence

import sqlalchemy as sa

from alembic import op

revision: str = "0002"
down_revision: str | None = "0001"
branch_labels: str | Sequence[str] | None = None
depends_on: str | Sequence[str] | None = None


def upgrade() -> None:
    op.create_table('importy_dokumentow',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('nazwa_pliku', sa.String(length=300), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('tekst', sa.Text(), nullable=False),
    sa.Column('pola', sa.JSON(), nullable=False),
    sa.Column('ekstrakcja_zrodlo', sa.String(length=10), nullable=False),
    sa.Column('komunikat', sa.Text(), nullable=True),
    sa.Column('karta_slug', sa.String(length=200), nullable=True),
    sa.Column(
        'created_at',
        sa.DateTime(timezone=True),
        server_default=sa.func.now(),
        nullable=False,
    ),
    sa.Column(
        'updated_at',
        sa.DateTime(timezone=True),
        server_default=sa.func.now(),
        nullable=False,
    ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('innowacje',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('slug', sa.String(length=200), nullable=False),
    sa.Column('nazwa', sa.String(length=500), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('zrodlo', sa.String(length=20), nullable=False),
    sa.Column('kategorie', sa.JSON(), nullable=False),
    sa.Column('wybrana_do_upowszechniania', sa.Boolean(), nullable=False),
    sa.Column('opis', sa.Text(), nullable=True),
    sa.Column('problem', sa.Text(), nullable=True),
    sa.Column('grupa_docelowa', sa.Text(), nullable=True),
    sa.Column('kto_moze_skorzystac', sa.Text(), nullable=True),
    sa.Column('czy_dziala', sa.Text(), nullable=True),
    sa.Column('poziom_dowodu', sa.String(length=20), nullable=True),
    sa.Column('organizacja', sa.Text(), nullable=True),
    sa.Column('url_zrodlowy', sa.Text(), nullable=True),
    sa.Column('pdf_url', sa.Text(), nullable=True),
    sa.Column('youtube_url', sa.Text(), nullable=True),
    sa.Column('materialy_url', sa.Text(), nullable=True),
    sa.Column('obraz_url', sa.Text(), nullable=True),
    sa.Column('licencja', sa.Text(), nullable=True),
    sa.Column('pobrano_dnia', sa.String(length=20), nullable=True),
    sa.Column('nakladka', sa.JSON(), nullable=True),
    sa.Column('wdrozenie', sa.JSON(), nullable=True),
    sa.Column('embedding', sa.JSON(), nullable=True),
    sa.Column('embedding_model', sa.String(length=80), nullable=True),
    sa.Column(
        'created_at',
        sa.DateTime(timezone=True),
        server_default=sa.func.now(),
        nullable=False,
    ),
    sa.Column(
        'updated_at',
        sa.DateTime(timezone=True),
        server_default=sa.func.now(),
        nullable=False,
    ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('nazwy_klastrow',
    sa.Column('klucz', sa.String(length=64), nullable=False),
    sa.Column('nazwa', sa.String(length=200), nullable=False),
    sa.PrimaryKeyConstraint('klucz')
    )
    op.create_table('notatki_rops',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('tytul', sa.String(length=300), nullable=False),
    sa.Column('tresc', sa.Text(), nullable=False),
    sa.Column('zgloszenia_ids', sa.JSON(), nullable=False),
    sa.Column('wykonana', sa.Boolean(), nullable=False),
    sa.Column(
        'created_at',
        sa.DateTime(timezone=True),
        server_default=sa.func.now(),
        nullable=False,
    ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('ustawienia',
    sa.Column('klucz', sa.String(length=50), nullable=False),
    sa.Column('wartosc', sa.Float(), nullable=False),
    sa.PrimaryKeyConstraint('klucz')
    )
    op.create_table('uzycie_ai',
    sa.Column('dzien', sa.String(length=10), nullable=False),
    sa.Column('wywolania', sa.Integer(), nullable=False),
    sa.PrimaryKeyConstraint('dzien')
    )
    op.create_table('wiadomosci_watku',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('token_watku', sa.String(length=64), nullable=False),
    sa.Column('autor_rola', sa.String(length=10), nullable=False),
    sa.Column('tresc', sa.Text(), nullable=False),
    sa.Column('zrodla', sa.JSON(), nullable=True),
    sa.Column(
        'created_at',
        sa.DateTime(timezone=True),
        server_default=sa.func.now(),
        nullable=False,
    ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('zgloszenia',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('tresc', sa.Text(), nullable=False),
    sa.Column('autor_nazwa', sa.String(length=200), nullable=True),
    sa.Column('autor_email', sa.String(length=320), nullable=True),
    sa.Column('syntetyczne', sa.Boolean(), nullable=False),
    sa.Column('token_watku', sa.String(length=64), nullable=False),
    sa.Column('status', sa.String(length=20), nullable=False),
    sa.Column('odpowiedziano', sa.DateTime(timezone=True), nullable=True),
    sa.Column('kategoria', sa.String(length=100), nullable=True),
    sa.Column('pilnosc', sa.String(length=10), nullable=True),
    sa.Column('pilnosc_uzasadnienie', sa.Text(), nullable=True),
    sa.Column('duplikaty', sa.JSON(), nullable=True),
    sa.Column('proponowane_karty', sa.JSON(), nullable=True),
    sa.Column('szkic_odpowiedzi', sa.Text(), nullable=True),
    sa.Column('triaz_zrodlo', sa.String(length=10), nullable=True),
    sa.Column('triaz_komunikat', sa.Text(), nullable=True),
    sa.Column('najlepsze_dopasowanie', sa.Float(), nullable=True),
    sa.Column('embedding', sa.JSON(), nullable=True),
    sa.Column('embedding_model', sa.String(length=80), nullable=True),
    sa.Column(
        'created_at',
        sa.DateTime(timezone=True),
        server_default=sa.func.now(),
        nullable=False,
    ),
    sa.Column(
        'updated_at',
        sa.DateTime(timezone=True),
        server_default=sa.func.now(),
        nullable=False,
    ),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_table('powiadomienia',
    sa.Column('id', sa.Integer(), nullable=False),
    sa.Column('tekst', sa.String(length=500), nullable=False),
    sa.Column('zgloszenie_id', sa.Integer(), nullable=True),
    sa.Column('przeczytane', sa.Boolean(), nullable=False),
    sa.Column(
        'created_at',
        sa.DateTime(timezone=True),
        server_default=sa.func.now(),
        nullable=False,
    ),
    sa.ForeignKeyConstraint(['zgloszenie_id'], ['zgloszenia.id'], ondelete='CASCADE'),
    sa.PrimaryKeyConstraint('id')
    )
    op.create_index("ix_innowacje_slug", "innowacje", ["slug"], unique=True)
    op.create_index("ix_innowacje_status", "innowacje", ["status"], unique=False)
    op.create_index("ix_zgloszenia_token_watku", "zgloszenia", ["token_watku"], unique=True)
    op.create_index("ix_zgloszenia_status", "zgloszenia", ["status"], unique=False)
    op.create_index("ix_zgloszenia_kategoria", "zgloszenia", ["kategoria"], unique=False)
    op.create_index(
        "ix_wiadomosci_watku_token_watku", "wiadomosci_watku", ["token_watku"], unique=False
    )
    op.create_index("ix_powiadomienia_przeczytane", "powiadomienia", ["przeczytane"], unique=False)
    op.create_index("ix_importy_dokumentow_status", "importy_dokumentow", ["status"], unique=False)


def downgrade() -> None:
    op.drop_table("powiadomienia")
    op.drop_table("zgloszenia")
    op.drop_table("wiadomosci_watku")
    op.drop_table("uzycie_ai")
    op.drop_table("ustawienia")
    op.drop_table("notatki_rops")
    op.drop_table("nazwy_klastrow")
    op.drop_table("innowacje")
    op.drop_table("importy_dokumentow")
