from pymongo import MongoClient
from .config import settings
import logging

logger = logging.getLogger(__name__)

class MongoDBConnection:
    def __init__(self):
        self.client = None
        self.db = None
        
    def connect(self):
        try:
            self.client = MongoClient(settings.MONGO_URL, serverSelectionTimeoutMS=5000)
            # Ping database to verify connection
            self.client.admin.command('ping')
            self.db = self.client[settings.MONGO_DB]
            logger.info("Successfully connected to MongoDB.")
        except Exception as e:
            logger.error(f"Failed to connect to MongoDB: {e}. Logging to fallback console.")
            # Fallback client pointing to default local
            self.client = None
            self.db = None

    def get_collection(self, collection_name: str):
        if self.db is not None:
            return self.db[collection_name]
        return None

# Singleton connection instance
mongo_conn = MongoDBConnection()
mongo_conn.connect()

def get_mongo_db():
    return mongo_conn.db
