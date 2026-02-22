from app.schemas.event import EventCreate
from datetime import datetime

data = {
    "title": "Hackathon 2026",
    "description": "A coding competition",
    "category": "Technical",
    "event_type": "GROUP",
    "max_team_size": 4,
    "event_date": "2026-12-12T10:00:00",
    "registration_deadline": "2026-12-10T10:00:00",
    "location": "Lab 1",
    "status": "SCHEDULED",
    "faculty_coordinator_id": "000000000000000000000000",
    "event_coordinator_ids": [],
    "judge_ids": []
}

try:
    event = EventCreate(**data)
    print("Schema Validation Success")
    print(event.dict())
except Exception as e:
    print(f"Schema Validation Failed: {e}")
