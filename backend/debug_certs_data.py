import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from bson import ObjectId

load_dotenv()

async def debug_certs():
    mongo_uri = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    client = AsyncIOMotorClient(mongo_uri)
    db = client["festora_db"]
    
    print("--- Certificates Sample ---")
    certs = await db["certificates"].find().limit(5).to_list(None)
    for c in certs:
        student_id = c.get("student_id")
        student_name_in_db = c.get("student_name")
        
        # Try to find student
        student = await db["users"].find_one({"_id": ObjectId(student_id)}) if student_id else None
        student_full_name = student.get("full_name") if student else "NOT FOUND"
        
        print(f"ID: {c.get('_id')}")
        print(f"  Student ID: {student_id}")
        print(f"  Student Name in DB: {student_name_in_db}")
        print(f"  Student Name from Users coll: {student_full_name}")
        print("-" * 20)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(debug_certs())
