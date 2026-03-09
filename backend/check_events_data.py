import asyncio
from app.core.db import get_database

async def check_events():
    db = await get_database()
    events = await db["events"].find().to_list(None)
    for e in events:
        print(f"Title: {e.get('title')}, Type: {e.get('event_type')}, Max Team Size: {e.get('max_team_size')}")

if __name__ == "__main__":
    asyncio.run(check_events())
