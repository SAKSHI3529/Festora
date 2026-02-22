import sys
import os
sys.path.append(os.getcwd())

import app
print(f"APP MODULE: {app}")

from fastapi.testclient import TestClient
from app.schemas.event import EventResponse
print(f"EVENT RESPONSE FIELDS: {list(EventResponse.model_fields.keys())}")

from app.main import app as fastapi_app
from app.models.user import User, UserRole

# Mock current user
mock_user_data = {
    "id": "67b049d50549767e51cfac00",
    "full_name": "Test Faculty",
    "email": "faculty@festora.com",
    "role": UserRole.FACULTY,
    "department": "Computer Science",
    "hashed_password": "fakehashedpassword",
    "is_active": True
}

def mock_get_current_user():
    # We return a dict that the User model can parse, or the model itselft
    return User(**mock_user_data)

# Override dependencies
from app.dependencies.rbac import get_current_user
fastapi_app.dependency_overrides[get_current_user] = mock_get_current_user

with TestClient(fastapi_app) as client:
    event_id = "699b37bc0549767e51cfac07"
    print(f"Calling GET /events/{event_id}/participants")
    response = client.get(f"/events/{event_id}/participants")

    print(f"Status: {response.status_code}")
    if response.status_code == 200:
        data = response.json()
        print(f"Success! Found {len(data)} events")
        if data:
            print("First event sample:", data[0])
    else:
        print(f"Response Body: {response.text}")
