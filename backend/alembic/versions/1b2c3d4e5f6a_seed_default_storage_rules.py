"""seed documented prototype storage rules

Revision ID: 1b2c3d4e5f6a
Revises: 0a1b2c3d4e5f
"""

from alembic import op


revision = "1b2c3d4e5f6a"
down_revision = "0a1b2c3d4e5f"
branch_labels = None
depends_on = None


def upgrade() -> None:
    # The existing food_category PostgreSQL enum is deliberately referenced,
    # never created. The fruit values reproduce the project's documented
    # prototype policy: <= 50°F (10°C) and 60–95% humidity. No project
    # thresholds exist for the remaining categories or for air/light.
    # The preceding table migration used INTEGER PRIMARY KEY rather than a
    # serial/identity column. Supply the missing PostgreSQL default here so
    # both these seed rows and future administrator-created rules receive IDs.
    op.execute("CREATE SEQUENCE IF NOT EXISTS storage_rules_id_seq")
    op.execute("""
        SELECT setval(
            'storage_rules_id_seq',
            COALESCE((SELECT MAX(id) FROM storage_rules), 0) + 1,
            false
        )
    """)
    op.execute("ALTER TABLE storage_rules ALTER COLUMN id SET DEFAULT nextval('storage_rules_id_seq')")
    op.execute("ALTER SEQUENCE storage_rules_id_seq OWNED BY storage_rules.id")
    op.execute("""
        INSERT INTO storage_rules (
            category, temperature_min, temperature_max, humidity_min, humidity_max,
            air_circulation_min, air_circulation_max, light_level_min, light_level_max
        ) VALUES
            ('Fruits'::food_category, NULL, 10.00, 60.00, 95.00, NULL, NULL, NULL, NULL),
            ('Vegetables'::food_category, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
            ('Dairy'::food_category, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
            ('Meat & Poultry'::food_category, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
            ('Seafood'::food_category, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
            ('Bakery'::food_category, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
            ('Packaged Foods'::food_category, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL),
            ('Beverages'::food_category, NULL, NULL, NULL, NULL, NULL, NULL, NULL, NULL)
        ON CONFLICT (category) DO NOTHING
    """)


def downgrade() -> None:
    op.execute("""
        DELETE FROM storage_rules
        WHERE category IN (
            'Fruits'::food_category, 'Vegetables'::food_category, 'Dairy'::food_category,
            'Meat & Poultry'::food_category, 'Seafood'::food_category, 'Bakery'::food_category,
            'Packaged Foods'::food_category, 'Beverages'::food_category
        )
    """)
    op.execute("ALTER TABLE storage_rules ALTER COLUMN id DROP DEFAULT")
    op.execute("DROP SEQUENCE IF EXISTS storage_rules_id_seq")
