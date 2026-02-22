import requests
import sys
import json
from datetime import datetime, timedelta

BASE_URL = "http://127.0.0.1:8017"

def login(email, password):
    resp = requests.post(f"{BASE_URL}/auth/login", data={"username": email, "password": password})
    if resp.status_code == 200:
        return resp.json()["access_token"]
    print(f"Login failed for {email}: {resp.text}")
    return None

def test_phase5():
    print("\n--- Starting Phase 5 Verification: Budget & Approval ---\n")

    # 1. Login
    admin_token = login("admin@festora.com", "Admin@123")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    fac_token = login("faculty1@festora.com", "Faculty@123")
    fac_headers = {"Authorization": f"Bearer {fac_token}"}
    fac_id = requests.get(f"{BASE_URL}/auth/me", headers=fac_headers).json()["id"]

    # 2. Create SCHEDULED Event (assigned to faculty1)
    print("Creating Event...")
    event_data = {
        "title": "Budget Event",
        "description": "Testing Budgets",
        "category": "Finance",
        "event_type": "SOLO",
        "max_team_size": 1,
        "event_date": (datetime.utcnow() + timedelta(days=10)).isoformat(),
        "registration_deadline": (datetime.utcnow() + timedelta(days=5)).isoformat(),
        "location": "Office",
        "faculty_coordinator_id": fac_id,
        "status": "SCHEDULED"
    }
    resp = requests.post(f"{BASE_URL}/events/", json=event_data, headers=admin_headers)
    if resp.status_code != 201:
        print(f"Event Creation Failed: {resp.text}")
        return
    event_id = resp.json()["id"]
    print(f"Event Created: {event_id}")

    # 3. Faculty Request Budget
    print("Requesting Budget...")
    budget_data = {
        "event_id": event_id,
        "requested_amount": 5000.0,
        "description": "Sound System",
        "justification": "Required for auditorium"
    }
    resp = requests.post(f"{BASE_URL}/budgets/", json=budget_data, headers=fac_headers)
    if resp.status_code != 201:
        print(f"Budget Request Failed: {resp.text}")
        return
    print(f"Budget Response: {resp.json()}")
    budget_id = resp.json().get("id")
    print(f"Budget Requested: {budget_id}")

    # 4. Duplicate Request (Should Fail)
    print("Testing Duplicate Request...")
    resp = requests.post(f"{BASE_URL}/budgets/", json=budget_data, headers=fac_headers)
    if resp.status_code == 400:
        print("Duplicate Prevented (Success)")
    else:
        print(f"Duplicate Failed to Prevent: {resp.status_code} {resp.text}")

    # 5. Admin Approve (Invalid Amount)
    print("Testing Invalid Approval Amount...")
    resp = requests.put(f"{BASE_URL}/budgets/{budget_id}/approve", json={"approved_amount": 6000.0}, headers=admin_headers)
    if resp.status_code == 400:
        print("Excess Amount Prevented (Success)")
    else:
        print(f"Excess Amount Failed to Prevent: {resp.status_code}")

    # 6. Admin Approve (Valid)
    print("Approving Budget...")
    resp = requests.put(f"{BASE_URL}/budgets/{budget_id}/approve", json={"approved_amount": 4500.0}, headers=admin_headers)
    if resp.status_code == 200:
        print("Budget Approved")
        print(resp.json())
    else:
        print(f"Approval Failed: {resp.text}")

    # 7. Get Summary
    print("Fetching Summary...")
    resp = requests.get(f"{BASE_URL}/events/{event_id}/summary", headers=fac_headers) # Wait, endpoint is at /budgets/ or /events/?
    # In router: @router.get("/events/{event_id}/summary") -> so path is /budgets/events/{event_id}/summary
    # Wait, prefix is /budgets. So /budgets/events/{id}/summary.
    # Check plan again. Plan said GET /events/{id}/budget-summary.
    # Router implementation: @router.get("/events/{event_id}/summary") inside budgets router.
    # So URL is /budgets/events/{id}/summary.
    
    resp = requests.get(f"{BASE_URL}/budgets/events/{event_id}/summary", headers=fac_headers)
    if resp.status_code == 200:
        print("Summary Fetched:")
        print(json.dumps(resp.json(), indent=2))
    else:
        print(f"Summary Fetch Failed: {resp.status_code} {resp.text}")

if __name__ == "__main__":
    test_phase5()
