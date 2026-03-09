import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv

load_dotenv()

async def cleanup_db():
    mongo_uri = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    client = AsyncIOMotorClient(mongo_uri)
    db = client["festora_db"]
    
    # 1. Check for certificates with null _id
    count = await db["certificates"].count_documents({"_id": None})
    print(f"Found {count} certificates with _id: null")
    
    if count > 0:
        result = await db["certificates"].delete_many({"_id": None})
        print(f"Deleted {result.deleted_count} invalid certificates.")
    
    # 2. Check other collections too just in case
    collections = ["scores", "registrations", "teams", "events", "budgets", "categories", "users"]
    for coll in collections:
        c = await db[coll].count_documents({"_id": None})
        if c > 0:
           print(f"Found {c} documents with _id: null in {coll}. Cleaning up...")
           await db[coll].delete_many({"_id": None})

    print("Cleanup complete.")

if __name__ == "__main__":
    asyncio.run(cleanup_db())
