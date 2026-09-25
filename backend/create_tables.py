from app.database import engine, Base
from app import models

print("Creating PostgreSQL tables...")

Base.metadata.create_all(bind=engine)

print("✅ PostgreSQL tables created successfully!")