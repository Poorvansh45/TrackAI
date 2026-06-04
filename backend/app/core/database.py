import logging
from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

logger = logging.getLogger("uvicorn.error")

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_client = Database()

async def connect_to_mongo():
    logger.info("Connecting to MongoDB...")
    db_client.client = AsyncIOMotorClient(settings.MONGODB_URL)
    db_client.db = db_client.client[settings.DATABASE_NAME]
    logger.info("Connected to MongoDB successfully.")

async def close_mongo_connection():
    logger.info("Closing connection to MongoDB...")
    if db_client.client:
        db_client.client.close()
        logger.info("MongoDB connection closed.")

def get_database():
    return db_client.db
