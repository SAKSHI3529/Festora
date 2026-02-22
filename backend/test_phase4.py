import requests
import sys
import json
from datetime import datetime, timedelta

BASE_URL = "http://127.0.0.1:8014"

def login(email, password):
    resp = requests.post(f"{BASE_URL}/auth/login", data={"username": email, "password": password})
    if resp.status_code == 200:
        return resp.json()["access_token"]
    print(f"Login failed for {email}: {resp.text}")
    return None

def test_phase4():
    print("\n--- Starting Phase 4 Verification: Scheduling & Scoring ---\n")

    # 1. Admin Login & Setup
    admin_token = login("admin@festora.com", "Admin@123")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Get Judge ID
    judge_token = login("judge1@festora.com", "Judge@123")
    judge_headers = {"Authorization": f"Bearer {judge_token}"}
    judge_resp = requests.get(f"{BASE_URL}/auth/me", headers=judge_headers)
    judge_id = judge_resp.json()["id"]

    # 2. Create Event with Judge Assigned
    print("Creating Event...")
    event_data = {
        "title": "Singing Contest",
        "description": "Solo Singing",
        "category": "Music",
        "event_type": "SOLO",
        "max_team_size": 1,
        "event_date": (datetime.utcnow() + timedelta(days=1)).isoformat(),
        "registration_deadline": (datetime.utcnow() + timedelta(hours=12)).isoformat(), # Future deadline
        "location": "Auditorium",
        "faculty_coordinator_id": "699573aecee1520302c66b96", # Assuming simplified assumption or fetch real one if needed. 
        # Actually better to fetch real faculty ID to avoid 400.
        "judge_ids": [judge_id],
        "status": "SCHEDULED"
    }
    
    # Fetch valid Faculty ID first
    fac_token = login("faculty1@festora.com", "Faculty@123")
    fac_headers = {"Authorization": f"Bearer {fac_token}"}
    fac_id = requests.get(f"{BASE_URL}/auth/me", headers=fac_headers).json()["id"]
    event_data["faculty_coordinator_id"] = fac_id

    resp = requests.post(f"{BASE_URL}/events/", json=event_data, headers=admin_headers)
    if resp.status_code != 201:
        print(f"Event Creation Failed: {resp.text}")
        return
    event_id = resp.json()["id"]
    print(f"Event Created: {event_id}")

    # 3. Student Registration
    print("Registering Student...")
    student_token = login("student2@festora.com", "Student@123")
    student_headers = {"Authorization": f"Bearer {student_token}"}
    
    reg_data = {"event_id": event_id}
    resp = requests.post(f"{BASE_URL}/registrations/", json=reg_data, headers=student_headers)
    if resp.status_code != 201:
        print(f"Registration Failed: {resp.text}")
        return
    reg_id = resp.json()["id"]
    print(f"Registration Created: {reg_id}")

    # 4. Approve Registration
    print("Approving Registration...")
    resp = requests.put(f"{BASE_URL}/registrations/{reg_id}/approve", headers=fac_headers)
    if resp.status_code != 200:
        print(f"Approval Failed: {resp.text}")
        return
    print("Registration Approved")

    # 5. Move Event to ONGOING
    print("Updating Event to ONGOING...")
    resp = requests.put(f"{BASE_URL}/events/{event_id}", json={"status": "ONGOING"}, headers=admin_headers)
    if resp.status_code != 200:
        print(f"Status Update Failed: {resp.text}")
        return
    print("Event is ONGOING")

    # 6. Submit Score (Judge)
    print("Submitting Score...")
    score_data = {
        "event_id": event_id,
        "registration_id": reg_id,
        "score": 9.5,
        "remarks": "Excellent pitch"
    }
    resp = requests.post(f"{BASE_URL}/scores/", json=score_data, headers=judge_headers)
    if resp.status_code != 201:
        print(f"Score Submission Failed: {resp.text}")
        return
    print("Score Submitted")

    # 7. Move Event to COMPLETED
    print("Updating Event to COMPLETED...")
    resp = requests.put(f"{BASE_URL}/events/{event_id}", json={"status": "COMPLETED"}, headers=admin_headers)
    if resp.status_code != 200:
        print(f"Status Update Failed: {resp.text}")
        return
    print("Event is COMPLETED")

    # 8. Get Results
    print("Fetching Results...")
    resp = requests.get(f"{BASE_URL}/scores/{event_id}/results", headers=admin_headers)
    if resp.status_code != 200:
        print(f"Fetch Results Failed: {resp.text}")
        return
    results = resp.json()
    print(f"Results: {json.dumps(results, indent=2)}")

    # 9. Lock Results
    print("Locking Results...")
    resp = requests.put(f"{BASE_URL}/scores/{event_id}/lock", headers=admin_headers)
    if resp.status_code != 200:
        print(f"Lock Failed: {resp.text}")
        return
    print("Results Locked")

if __name__ == "__main__":
    test_phase4()
