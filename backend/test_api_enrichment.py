import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
import os
from dotenv import load_dotenv
from bson import ObjectId

load_dotenv()

async def test_api_logic():
    mongo_uri = os.getenv("MONGODB_URL", "mongodb://localhost:27017")
    client = AsyncIOMotorClient(mongo_uri)
    db = client["festora_db"]
    
    # Pick an event that has certificates
    cert = await db["certificates"].find_one()
    if not cert:
        print("No certificates found to test.")
        return
    
    event_id = cert["event_id"]
    print(f"Testing for Event ID: {event_id}")
    
    # Simulate get_event_certificates logic
    certs = await db["certificates"].find({"event_id": event_id}).to_list(None)
    results = []
    for c in certs:
        c_dict = dict(c)
        c_dict["id"] = str(c["_id"])
        
        # Enrich Student Name
        try:
            student = await db["users"].find_one({"_id": ObjectId(c["student_id"])})
            c_dict["student_name"] = student.get("full_name") if student else "Unknown Student"
        except Exception as e:
            c_dict["student_name"] = f"Error: {str(e)}"
            
        results.append({
            "id": c_dict["id"],
            "student_id": c_dict["student_id"],
            "student_name": c_dict["student_name"]
        })
    
    print("API Logic Results:")
    for r in results:
        print(r)
    
    client.close()

if __name__ == "__main__":
    asyncio.run(test_api_logic())
