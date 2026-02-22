from motor.motor_asyncio import AsyncIOMotorClient
from app.core.config import settings

class Database:
    client: AsyncIOMotorClient = None

    def connect(self):
        self.client = AsyncIOMotorClient(settings.MONGO_URI)

    def close(self):
        self.client.close()

    def get_database(self):
        return self.client[settings.DATABASE_NAME]

db = Database()

async def get_database():
    return db.get_database()
