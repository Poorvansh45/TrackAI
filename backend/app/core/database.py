import logging
from motor.motor_asyncio import AsyncIOMotorClient
import certifi
from app.core.config import settings

logger = logging.getLogger("uvicorn.error")

class Database:
    client: AsyncIOMotorClient = None
    db = None

db_client = Database()

async def connect_to_mongo():
    logger.info("Connecting to MongoDB Atlas...")
    
    # Motor/PyMongo on Windows often needs certifi to verify Atlas SSL certificates
    db_client.client = AsyncIOMotorClient(
        settings.MONGODB_URL, 
        tlsCAFile=certifi.where()
    )
    
    try:
        # Actively verify the connection rather than lazily succeeding
        await db_client.client.admin.command('ping')
        db_client.db = db_client.client[settings.DATABASE_NAME]
        logger.info("Connected to MongoDB successfully.")
    except Exception as e:
        logger.error(f"Failed to connect to MongoDB: {e}")
        raise e

async def close_mongo_connection():
    logger.info("Closing connection to MongoDB...")
    if db_client.client:
        db_client.client.close()
        logger.info("MongoDB connection closed.")

def get_database():
    return db_client.db
