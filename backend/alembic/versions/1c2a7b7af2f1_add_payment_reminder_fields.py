"""add payment reminder fields

Revision ID: 1c2a7b7af2f1
Revises: 836d6937303c
Create Date: 2025-12-04 12:53:00

"""
from alembic import op
import sqlalchemy as sa


# revision identifiers, used by Alembic.
revision = '1c2a7b7af2f1'
down_revision = '836d6937303c'
branch_labels = None
depends_on = None


def upgrade() -> None:
    op.add_column('payments', sa.Column('reminder_count', sa.Integer(), nullable=True, server_default='0'))
    op.add_column('payments', sa.Column('last_reminder_at', sa.DateTime(timezone=True), nullable=True))


def downgrade() -> None:
    op.drop_column('payments', 'last_reminder_at')
    op.drop_column('payments', 'reminder_count')

