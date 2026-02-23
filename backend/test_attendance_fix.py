import sys
import os
import asyncio
from unittest.mock import AsyncMock, MagicMock

# Set dummy env vars for Pydantic Settings before importing app
os.environ["MONGO_URI"] = "mongodb://localhost:27017"
os.environ["DATABASE_NAME"] = "festora_test"
os.environ["SECRET_KEY"] = "test_secret_key"

# Add current directory to path so we can import app
sys.path.append(os.getcwd())
sys.path.append(os.path.join(os.getcwd(), "backend"))

from fastapi.testclient import TestClient
from app.main import app as fastapi_app
from app.dependencies.rbac import get_current_user
from app.core.db import get_database
from app.models.user import User, UserRole

# 1. Mock Data
mock_user = User(
    id="67b049d50549767e51cfac00",
    full_name="Test Faculty",
    email="faculty@festora.com",
    role=UserRole.FACULTY,
    department="Computer Science",
    hashed_password="fakehashedpassword",
    is_active=True
)

mock_event_id = "699b37bc0549767e51cfac07"
mock_student_id = "67b049d50549767e51cfac11"

# 2. Mock Database
mock_db = MagicMock()

# Mock registrations.find_one
mock_db["registrations"].find_one = AsyncMock(return_value={
    "event_id": mock_event_id,
    "student_id": mock_student_id,
    "status": "APPROVED"
})

# Mock attendance.update_one
mock_db["attendance"].update_one = AsyncMock(return_value=MagicMock(upserted_id="some_id"))

# Mock attendance.find_one
mock_db["attendance"].find_one = AsyncMock(return_value={
    "_id": "67b049d50549767e51cfac99",
    "event_id": mock_event_id,
    "student_id": mock_student_id,
    "status": "PRESENT",
    "marked_by": str(mock_user.id),
    "marked_at": "2026-02-23T00:00:00"
})

# 3. Dependency Overrides
async def override_get_db():
    return mock_db

async def override_get_current_user():
    return mock_user

fastapi_app.dependency_overrides[get_database] = override_get_db
fastapi_app.dependency_overrides[get_current_user] = override_get_current_user

# 4. Run Test
try:
    with TestClient(fastapi_app) as client:
        print(f"Testing POST /events/{mock_event_id}/attendance...")
        payload = {
            "student_id": mock_student_id,
            "status": "PRESENT"
        }
        response = client.post(f"/events/{mock_event_id}/attendance", json=payload)
        
        print(f"Status: {response.status_code}")
        print(f"Response Body: {response.text}")
        
        if response.status_code == 200:
            data = response.json()
            if "id" in data:
                print(f"SUCCESS: 'id' field present: {data['id']}")
            else:
                print("FAILURE: 'id' field missing")
                sys.exit(1)
        else:
            print("FAILURE: Endpoint returned error status")
            sys.exit(1)
except Exception as e:
    print(f"ERROR running test: {str(e)}")
    sys.exit(1)
finally:
    # Cleanup overrides
    fastapi_app.dependency_overrides.clear()
