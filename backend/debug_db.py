import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

async def run():
    client = AsyncIOMotorClient('mongodb://localhost:27017')
    db = client['festora']
    
    print("--- ALL EVENTS ---")
    events = await db['events'].find({}).to_list(None)
    for e in events:
        print(f"ID: {str(e['_id'])} | Status: {e['status']} | Locked: {e.get('is_result_locked')} | Title: {e['title']}")
        
    print("\n--- SCORES (SAMPLE) ---")
    scores = await db['scores'].find({}).to_list(10)
    for s in scores:
        print(f"ID: {str(s['_id'])} | EventID: {s.get('event_id')} | Score: {s.get('score')}")
        
    client.close()

if __name__ == "__main__":
    asyncio.run(run())
