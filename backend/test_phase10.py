import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://127.0.0.1:8025"

def login(email, password):
    resp = requests.post(f"{BASE_URL}/auth/login", data={"username": email, "password": password})
    if resp.status_code == 200:
        return resp.json()["access_token"]
    print(f"Login failed for {email}: {resp.text}")
    return None

def test_phase10():
    print("\n--- Starting Phase 10 Verification: Audit Logs ---\n")

    # 1. Login
    admin_token = login("admin@festora.com", "Admin@123")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    # 2. Perform Actions to Trigger Logs
    
    # Create Event (Audit ACTION: CREATE, Module: EVENTS)
    print("Creating Event to trigger log...")
    event_payload = {
        "title": "Audit Test Event",
        "description": "Testing audit",
        "event_date": (datetime.now() + timedelta(days=1)).isoformat(),
        "location": "Audit Hall",
        "faculty_coordinator_id": "699573aecee1520302c66b96", 
        "registration_deadline": (datetime.now() + timedelta(days=1)).isoformat(),
        "event_type": "SOLO",
        "min_participants": 1,
        "max_participants": 10,
        "max_team_size": 1,
        "status": "SCHEDULED",
        "category": "General"
    }
    resp = requests.post(f"{BASE_URL}/events/", json=event_payload, headers=admin_headers)
    if resp.status_code != 201:
        print(f"Event Create Failed: {resp.text}")
        return
    event_id = resp.json()["id"]
    print(f"Event Created: {event_id}")

    # Update Event (Audit ACTION: UPDATE, Module: EVENTS)
    print("Updating Event...")
    requests.put(f"{BASE_URL}/events/{event_id}", json={"description": "Updated Description"}, headers=admin_headers)

    # 3. Verify Audits
    print("Fetching Audit Logs...")
    resp = requests.get(f"{BASE_URL}/audit/", headers=admin_headers)
    logs = resp.json()
    
    # Filter for our event
    event_logs = [l for l in logs if l.get("ref_id") == event_id]
    print(f"Found {len(event_logs)} logs for this event.")
    
    for log in event_logs:
        print(f"Log: {log['action']} - {log['description']} (User: {log['user_id']})")

    # Check for CREATE and UPDATE
    actions = [l["action"] for l in event_logs]
    if "CREATE" in actions and "UPDATE" in actions:
        print("SUCCESS: Both CREATE and UPDATE actions logged.")
    else:
        print(f"FAILURE: Missing logs. Found actions: {actions}")

    # 4. Filter Test
    print("Testing Filter (Module=EVENTS)...")
    resp = requests.get(f"{BASE_URL}/audit/?module=EVENTS", headers=admin_headers)
    filtered_logs = resp.json()
    print(f"Filtered Logs Count: {len(filtered_logs)}")
    
    start_count = len(filtered_logs)
    if start_count > 0:
        if all(l["module"] == "EVENTS" for l in filtered_logs):
             print("Filter SUCCESS: All logs are EVENTS.")
        else:
             print("Filter FAILURE: Found non-EVENTS logs.")
    else:
        print("Warning: No EVENTS logs found in filter (unexpected if we just created one).")

if __name__ == "__main__":
    test_phase10()
