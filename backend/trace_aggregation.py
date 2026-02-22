import asyncio
from motor.motor_asyncio import AsyncIOMotorClient
from bson import ObjectId
import json

async def debug_participants():
    client = AsyncIOMotorClient("mongodb://localhost:27017")
    db = client["festora_db"]
    
    # Use the event ID from user's logs
    event_id = "699b37bc0549767e51cfac07"
    print(f"Testing for event: {event_id}")

    match_query = {"event_id": event_id}
    
    # Stage-by-stage execution to isolate failure
    pipeline = [
        {"$match": match_query},
    ]
    
    stages = [
        # Stage 1: Lookup Student
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
        # Stage 2: Unwind Student
        {"$unwind": {"path": "$student", "preserveNullAndEmptyArrays": True}},
        # Stage 3: Lookup Team
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
        # Stage 4: Unwind Team
        {"$unwind": {"path": "$team", "preserveNullAndEmptyArrays": True}},
        # Stage 5: Project
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

    current_pipeline = pipeline.copy()
    for i, stage in enumerate(stages):
        current_pipeline.append(stage)
        print(f"Testing stage {i+1}...")
        try:
            res = await db["registrations"].aggregate(current_pipeline).to_list(None)
            print(f"Stage {i+1} success. Found {len(res)} docs.")
        except Exception as e:
            print(f"STAGE {i+1} FAILED: {str(e)}")
            return

    print("ALL STAGES SUCCESSFUL")
    if res:
        print("Sample data:", res[0])

if __name__ == "__main__":
    asyncio.run(debug_participants())
