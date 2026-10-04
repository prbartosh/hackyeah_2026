"""mentorzy: tabela mentorów, mentor i prośba o mentora na zgłoszeniu (zadanie 0040)

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
    op.create_table(
        "mentorzy",
        sa.Column("id", sa.Integer(), nullable=False),
        sa.Column("nazwa", sa.String(length=200), nullable=False),
        sa.Column("instytucja", sa.String(length=200), nullable=False),
        sa.Column("sektor", sa.String(length=15), nullable=False),
        sa.Column("obszary", sa.JSON(), nullable=False),
        sa.Column("powiat", sa.String(length=50), nullable=False),
        sa.Column("opis", sa.Text(), nullable=False),
        sa.Column("email", sa.String(length=320), nullable=False),
        sa.Column("aktywny", sa.Boolean(), nullable=False),
        sa.Column("token_mentora", sa.String(length=64), nullable=False),
        sa.Column("syntetyczny", sa.Boolean(), nullable=False),
        sa.Column(
            "created_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.Column(
            "updated_at", sa.DateTime(timezone=True), server_default=sa.func.now(), nullable=False
        ),
        sa.PrimaryKeyConstraint("id"),
    )
    op.create_index("ix_mentorzy_aktywny", "mentorzy", ["aktywny"])
    op.create_index("ix_mentorzy_token_mentora", "mentorzy", ["token_mentora"], unique=True)
    op.add_column("zgloszenia", sa.Column("mentor_id", sa.Integer(), nullable=True))
    op.add_column(
        "zgloszenia",
        sa.Column("mentor_prosba", sa.Boolean(), nullable=False, server_default=sa.false()),
    )
    op.create_foreign_key(
        "fk_zgloszenia_mentor_id", "zgloszenia", "mentorzy", ["mentor_id"], ["id"],
        ondelete="SET NULL",
    )  # fmt: skip


def downgrade() -> None:
    op.drop_constraint("fk_zgloszenia_mentor_id", "zgloszenia", type_="foreignkey")
    op.drop_column("zgloszenia", "mentor_prosba")
    op.drop_column("zgloszenia", "mentor_id")
    op.drop_index("ix_mentorzy_token_mentora", table_name="mentorzy")
    op.drop_index("ix_mentorzy_aktywny", table_name="mentorzy")
    op.drop_table("mentorzy")
