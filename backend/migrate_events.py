import asyncio
from motor.motor_asyncio import AsyncIOMotorClient

async def run():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['festora']
    
    # Initialize is_result_locked to False for events missing it
    result = await db['events'].update_many(
        {"is_result_locked": {"$exists": False}},
        {"$set": {"is_result_locked": False}}
    )
    print(f"Updated {result.modified_count} events to is_result_locked=False")
    
    # Optional: ensure status is correctly formatted (lowercase vs uppercase check if needed)
    # But current models use uppercase.
    
    client.close()

if __name__ == "__main__":
    asyncio.run(run())
