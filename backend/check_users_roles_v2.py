import asyncio
from app.core.db import db
from app.core.config import settings

async def check_users():
    db.connect()
    database = db.get_database()
    users = await database["users"].find().to_list(None)
    print(f"Total Users: {len(users)}")
    for u in users:
        print(f"Name: {u.get('full_name')}, Email: {u.get('email')}, Role: {u.get('role')}, ID: {str(u.get('_id'))}")
    db.close()

if __name__ == "__main__":
    asyncio.run(check_users())
