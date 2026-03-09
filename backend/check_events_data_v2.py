import asyncio
from app.core.db import db
from app.core.config import settings

async def check_events():
    db.connect()
    database = db.get_database()
    events = await database["events"].find().to_list(None)
    print(f"Total Events: {len(events)}")
    for e in events:
        print(f"Title: {e.get('title')}, Type: {e.get('event_type')}, Max Team Size: {e.get('max_team_size')}")
    db.close()

if __name__ == "__main__":
    asyncio.run(check_events())
