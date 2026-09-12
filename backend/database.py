import sqlite3
from datetime import datetime
from app import app, db, FoodItem

sqlite_conn = sqlite3.connect("/app/backend/instance/freshcheck.db")
sqlite_conn.row_factory = sqlite3.Row

rows = sqlite_conn.execute("""
    SELECT food_name, category, scanned_date, expiry_date,
           shelf_life_days, ai_confidence, status, created_at
    FROM food_item
""").fetchall()

with app.app_context():
    for row in rows:
        item = FoodItem(
            food_name=row["food_name"],
            category=row["category"],
            scanned_date=row["scanned_date"],
            expiry_date=row["expiry_date"],
            shelf_life_days=row["shelf_life_days"],
            ai_confidence=row["ai_confidence"],
            status=row["status"],
            created_at=datetime.fromisoformat(row["created_at"]) if row["created_at"] else None
        )
        db.session.add(item)

    db.session.commit()
    print(f"Migrated {len(rows)} SQLite records to PostgreSQL.")

sqlite_conn.close()
