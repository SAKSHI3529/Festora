import asyncio
from app.core.db import get_database

async def check_users():
    db = await get_database()
    users = await db["users"].find().to_list(None)
    for u in users:
        print(f"Name: {u.get('full_name')}, Email: {u.get('email')}, Role: {u.get('role')}")

if __name__ == "__main__":
    asyncio.run(check_users())
