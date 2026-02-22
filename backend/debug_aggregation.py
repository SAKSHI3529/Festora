import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId

async def debug_participants():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["festora_db"]
    
    # Find an approved registration
    reg = await db["registrations"].find_one({"status": "APPROVED"})
    if not reg:
        print("No APPROVED registrations found in database")
        # Try to approve one for testing
        pending = await db["registrations"].find_one({"status": "PENDING"})
        if pending:
            await db["registrations"].update_one({"_id": pending["_id"]}, {"$set": {"status": "APPROVED"}})
            reg = await db["registrations"].find_one({"_id": pending["_id"]})
            print(f"Approving a pending registration for testing: {reg['_id']}")
        else:
            print("No registrations found at all")
            return
    
    event_id = reg["event_id"]
    student_id = reg["student_id"]
    print(f"Testing mark_attendance for event={event_id}, student={student_id}")
    
    # Try the find_one used in mark_attendance
    found = await db["registrations"].find_one({
        "event_id": event_id,
        "student_id": student_id,
        "status": "APPROVED"
    })
    if found:
        print("SUCCESS: Found approved registration!")
    else:
        print("FAILURE: Could not find approved registration with those IDs.")
        # Print types to see why
        print(f"event_id type: {type(event_id)}, value: '{event_id}'")
        print(f"student_id type: {type(student_id)}, value: '{student_id}'")

    match_query = {"event_id": event_id}
    
    pipeline = [
        {"$match": match_query},
        {
            "$lookup": {
                "from": "users",
                "let": {"studentId": {
                    "$convert": {
                        "input": "$student_id",
                        "to": "objectId",
                        "onError": None,
                        "onNull": None
                    }
                }},
                "pipeline": [
                    {"$match": {"$expr": {"$eq": ["$_id", "$$studentId"]}}}
                ],
                "as": "student"
            }
        },
        {"$unwind": {"path": "$student", "preserveNullAndEmptyArrays": True}},
        {
             "$lookup": {
                "from": "teams",
                "let": {"teamId": "$team_id"},
                "pipeline": [
                    {
                        "$match": {
                            "$expr": {
                                "$eq": [
                                    "$_id",
                                    {
                                        "$convert": {
                                            "input": "$$teamId",
                                            "to": "objectId",
                                            "onError": None,
                                            "onNull": None
                                        }
                                    }
                                ]
                            }
                        }
                    }
                ],
                "as": "team"
            }
        },
        {"$unwind": {"path": "$team", "preserveNullAndEmptyArrays": True}},
        {
            "$project": {
                "id": {"$toString": "$_id"}, 
                "student_id": "$student_id",
                "student_name": {"$ifNull": ["$student.full_name", "Unknown"]},
                "registration_number": {"$ifNull": ["$student.registration_number", ""]},
                "department": {"$ifNull": ["$student.department", ""]},
                "team_id": "$team_id",
                "team_name": {"$ifNull": ["$team.team_name", None]},
                "status": "$status"
            }
        }
    ]

    try:
        print("Running aggregation...")
        participants = await db["registrations"].aggregate(pipeline).to_list(None)
        print(f"Success! Found {len(participants)} participants.")
        if participants:
            print("First participant entry:", participants[0])
    except Exception as e:
        print(f"AGGREGATION FAILED: {str(e)}")

if __name__ == "__main__":
    asyncio.run(debug_participants())
