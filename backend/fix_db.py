import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

async def migrate_db():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["festora_db"]
    
    print("Starting migration of 'registrations' collection...")
    
    # 1. Rename user_id to student_id where user_id exists
    result = await db["registrations"].update_many(
        {"user_id": {"$exists": True}},
        {"$rename": {"user_id": "student_id"}}
    )
    print(f"Renamed user_id to student_id in {result.modified_count} documents.")
    
    # 2. Ensure IDs are strings
    cursor = db["registrations"].find({})
    async for reg in cursor:
        updates = {}
        reg_id = reg["_id"]
        
        for field in ["event_id", "student_id", "team_id"]:
            val = reg.get(field)
            if isinstance(val, ObjectId):
                updates[field] = str(val)
        
        if updates:
            await db["registrations"].update_one({"_id": reg_id}, {"$set": updates})
            print(f"Updated types for registration {reg_id}")

    print("Starting migration of 'attendance' collection...")
    # Rename user_id to student_id in attendance if any exist
    await db["attendance"].update_many({"user_id": {"$exists": True}}, {"$rename": {"user_id": "student_id"}})
    
    # Ensure IDs are strings in attendance
    cursor = db["attendance"].find({})
    async for att in cursor:
        updates = {}
        att_id = att["_id"]
        for field in ["event_id", "student_id"]:
            val = att.get(field)
            if isinstance(val, ObjectId):
                updates[field] = str(val)
        if updates:
            await db["attendance"].update_one({"_id": att_id}, {"$set": updates})

    print("Migration complete!")

if __name__ == "__main__":
    asyncio.run(migrate_db())
