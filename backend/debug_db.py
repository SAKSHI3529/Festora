import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import json
from datetime import datetime

async def debug():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["festora_db"]
    
    event_id = "699b37bc0549767e51cfac07"
    print(f"--- Debugging Event: {event_id} ---")
    
    # 1. Check Registrations
    regs = await db["registrations"].find({"event_id": event_id}).to_list(None)
    print(f"Found {len(regs)} registrations")
    for r in regs:
        print(f"Reg: student_id={r.get('student_id')} (type={type(r.get('student_id'))}), status={r.get('status')}")
        
    # 2. Check Attendance
    atts = await db["attendance"].find({"event_id": event_id}).to_list(None)
    print(f"\nFound {len(atts)} attendance records")
    for a in atts:
        print(f"Att: student_id={a.get('student_id')} (type={type(a.get('student_id'))}), status={a.get('status')}")

if __name__ == "__main__":
    asyncio.run(debug())
