import logging
from typing import List, Optional
from motor.motor_asyncio import AsyncIOMotorClient

from app.mentor.memory.stores.base import SessionStore
from app.mentor.schemas.memory import Session

logger = logging.getLogger("mentor.memory.stores.mongodb")

class MongoDBStore(SessionStore):
    """
    Production-grade MongoDB store for Chat Sessions.
    Uses async motor client.
    """

    def __init__(self, collection_name: str = "mentor_sessions") -> None:
        self.collection_name = collection_name
        logger.info(f"Initialized MongoDB store | collection={collection_name}")

    @property
    def collection(self):
        from app.core.database import get_database
        db = get_database()
        if db is None:
            raise RuntimeError("MongoDB connection not initialized")
        return db[self.collection_name]

    @property
    def client(self):
        from app.core.database import db_client
        return db_client.client


    async def setup(self) -> None:
        """Create compound indexes for fast session lookups."""
        try:
            logger.info("Setting up MongoDB indexes.")
            # Index on user_id + session_id
            await self.collection.create_index(
                [("user_id", 1), ("session_id", 1)],
                unique=True,
                name="user_session_idx"
            )
            # General query index for listing
            await self.collection.create_index("user_id", name="user_idx")
            logger.info("MongoDB index setup complete.")
        except Exception as e:
            logger.error(f"Failed to set up MongoDB indexes: {e}")

    async def load(self, user_id: str, session_id: str) -> Optional[Session]:
        try:
            doc = await self.collection.find_one({"user_id": user_id, "session_id": session_id})
            if doc:
                logger.debug(f"MongoDB load succeeded for user_id={user_id}, session_id={session_id}")
                return Session.from_mongo_dict(doc)
            logger.debug(f"MongoDB session not found for user_id={user_id}, session_id={session_id}")
            return None
        except Exception as e:
            logger.error(f"MongoDB load failed: {e}")
            raise

    async def save(self, session: Session) -> None:
        try:
            doc = session.to_mongo_dict()
            # Perform upsert based on compound query
            await self.collection.update_one(
                {"user_id": session.user_id, "session_id": session.session_id},
                {"$set": doc},
                upsert=True
            )
            logger.debug(f"MongoDB save succeeded for user_id={session.user_id}, session_id={session.session_id}")
        except Exception as e:
            logger.error(f"MongoDB save failed: {e}")
            raise

    async def delete(self, user_id: str, session_id: str) -> None:
        try:
            result = await self.collection.delete_one({"user_id": user_id, "session_id": session_id})
            if result.deleted_count:
                logger.info(f"MongoDB delete succeeded for user_id={user_id}, session_id={session_id}")
            else:
                logger.warning(f"MongoDB delete target not found for user_id={user_id}, session_id={session_id}")
        except Exception as e:
            logger.error(f"MongoDB delete failed: {e}")
            raise

    async def list_sessions(self, user_id: str) -> List[Session]:
        try:
            sessions = []
            cursor = self.collection.find({"user_id": user_id})
            async for doc in cursor:
                sessions.append(Session.from_mongo_dict(doc))
            logger.info(f"MongoDB list succeeded. Found {len(sessions)} sessions for user={user_id}")
            return sessions
        except Exception as e:
            logger.error(f"MongoDB list failed: {e}")
            raise
