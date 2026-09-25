from app.database import engine

try:
    with engine.connect() as connection:
        print("✅ PostgreSQL connection successful!")
except Exception as e:
    print("❌ PostgreSQL connection failed:")
    print(e)