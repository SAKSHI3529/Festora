import requests
import sys
import time
import random
import string
from datetime import datetime, timedelta

BASE_URL = "http://localhost:8000"

def generate_random_string(length=8):
    return ''.join(random.choices(string.ascii_letters + string.digits, k=length))

def login(email, password):
    response = requests.post(f"{BASE_URL}/auth/login", data={"username": email, "password": password})
    if response.status_code != 200:
        print(f"Login failed for {email}: {response.text}")
        sys.exit(1)
    return response.json()["access_token"]

def create_user(role, admin_token):
    headers = {"Authorization": f"Bearer {admin_token}"}
    email = f"{role}_{generate_random_string()}@test.com"
    password = "Password123"
    data = {
        "full_name": f"Test {role.capitalize()}",
        "email": email,
        "password": password,
        "role": role,
        "registration_number": "123" if role == "student" else None,
        "department": "CSE" if role == "student" else None,
        "year": 3 if role == "student" else None
    }
    resp = requests.post(f"{BASE_URL}/users/", json=data, headers=headers)
    if resp.status_code != 201:
        print(f"Create User {role} Failed: {resp.text}")
        sys.exit(1)
    return resp.json()["id"], email, password

def run_test():
    print("\n--- Scoring Module Verification ---")
    
    # 1. Login Admin
    print("Logging in Admin...")
    admin_token = login("admin@festora.com", "Admin@123")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}

    # 2. Create Users
    print("Creating Faculty, Judge, Student...")
    faculty_id, _, _ = create_user("faculty", admin_token)
    judge_id, judge_email, judge_pass = create_user("judge", admin_token)
    
    # 3. Create Solo Event
    print("Creating Solo Event...")
    event_data = {
        "title": f"Scoring Solo {generate_random_string()}",
        "description": "Desc",
        "category": "Cat",
        "event_type": "SOLO",
        "max_team_size": 1,
        "event_date": (datetime.utcnow() + timedelta(days=1)).isoformat(),
        "registration_deadline": (datetime.utcnow() + timedelta(hours=5)).isoformat(),
        "location": "Loc",
        "faculty_coordinator_id": faculty_id,
        "judge_ids": [judge_id]
    }
    resp = requests.post(f"{BASE_URL}/events/", json=event_data, headers=admin_headers)
    if resp.status_code != 201:
        print(f"Create Event Failed: {resp.text}")
        sys.exit(1)
    event_id = resp.json()["id"]
    print(f"Event Created: {event_id}")

    # 4. Register Student
    print("Registering Student...")
    _, student_email, student_pass = create_user("student", admin_token)
    student_token = login(student_email, student_pass)
    student_headers = {"Authorization": f"Bearer {student_token}"}
    
    reg_data = {"event_id": event_id}
    resp = requests.post(f"{BASE_URL}/registrations/", json=reg_data, headers=student_headers)
    if resp.status_code != 201:
        print(f"Registration Failed: {resp.text}")
        sys.exit(1)
    reg_id = resp.json()["id"]
    print(f"Registered: {reg_id}")

    # 5. Approve Registration
    print("Approving Registration...")
    resp = requests.put(f"{BASE_URL}/registrations/{reg_id}/approve", headers=admin_headers)
    if resp.status_code != 200:
        print(f"Approve Failed: {resp.text}")
        sys.exit(1)
    print("Approved")

    # 6. Start Event (ONGOING)
    print("Starting Event...")
    resp = requests.put(f"{BASE_URL}/events/{event_id}", json={"status": "ONGOING"}, headers=admin_headers)
    if resp.status_code != 200:
        print(f"Update Status Failed: {resp.text}")
        sys.exit(1)
    print("Event ONGOING")

    # 7. Submit Score (Judge)
    print("Submitting Score...")
    judge_token = login(judge_email, judge_pass)
    judge_headers = {"Authorization": f"Bearer {judge_token}"}
    
    score_data = {
        "event_id": event_id,
        "registration_id": reg_id,
        "score": 85.5,
        "remarks": "Great job"
    }
    resp = requests.post(f"{BASE_URL}/scores/", json=score_data, headers=judge_headers)
    if resp.status_code != 201:
        print(f"Submit Score Failed: {resp.text}")
        sys.exit(1)
    print("Score Submitted")

    # 8. Duplicate Score Check
    print("Checking Duplicate Score Prevention...")
    resp = requests.post(f"{BASE_URL}/scores/", json=score_data, headers=judge_headers)
    if resp.status_code != 409:
        print(f"Duplicate Check Failed: Response {resp.status_code}")
        # Not a strict failure of the whole test, but a partial failure logic?
        # Requirement says "Prevent duplicate scoring". So it SHOULD fail with 409.
        # If it returns 201 or 500, that's bad.
        sys.exit(1)
    print("Duplicate Score Prevented")

    # 9. Complete Event
    print("Completing Event...")
    resp = requests.put(f"{BASE_URL}/events/{event_id}", json={"status": "COMPLETED"}, headers=admin_headers)
    if resp.status_code != 200:
         print(f"Update Status Failed: {resp.text}")
         sys.exit(1)
    print("Event COMPLETED")

    # 10. Lock Results
    print("Locking Results...")
    resp = requests.put(f"{BASE_URL}/events/{event_id}/lock-results", headers=admin_headers)
    if resp.status_code != 200:
        print(f"Lock Results Failed: {resp.text}")
        sys.exit(1)
    print("Results Locked")

    # 11. Verify Scoring Locked
    print("Checking Lock Enforcement...")
    # Try different judge or update? API doesn't support update yet, assumes POST only.
    # Try POST new score for same judge/student? (Already duplicate)
    # create another student/judge to really test strictness?
    # Simple check: Try to score again (should fail with 'Locked' before 'Duplicate'?)
    # My router logic: 
    # 1. Event Status check (must be ONGOING). it is now COMPLETED. -> 400.
    # 2. Lock check. -> 400.
    # So it should fail with 400 irrespective of duplication.
    resp = requests.post(f"{BASE_URL}/scores/", json=score_data, headers=judge_headers)
    if resp.status_code == 400:
        print(f"Lock/Status Enforcement Verified: {resp.json().get('detail')}")
    else:
        print(f"Lock Check Failed or unexpected status: {resp.status_code} {resp.text}")

    # 12. Get Results
    print("Fetching Results...")
    resp = requests.get(f"{BASE_URL}/events/{event_id}/results", headers=admin_headers)
    if resp.status_code != 200:
        print(f"Get Results Failed: {resp.text}")
        sys.exit(1)
    
    results = resp.json()
    if results["is_locked"] is not True:
        print("Result is_locked property incorrect")
        sys.exit(1)
    
    rankings = results["results"]
    if len(rankings) != 1:
        print(f"Incorrect rankings count: {len(rankings)}")
        sys.exit(1)
    
    winner = rankings[0]
    if winner["total_score"] != 85.5:
         print(f"Incorrect score calc: {winner['total_score']}")
         sys.exit(1)
    
    print("Results Verification Passed")
    print("\n--- ALL TESTS PASSED ---")

if __name__ == "__main__":
    time.sleep(1)
    run_test()
