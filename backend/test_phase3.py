import requests
import json
from datetime import datetime, timedelta

BASE_URL = "http://127.0.0.1:8013"

def login(email, password):
    resp = requests.post(f"{BASE_URL}/auth/login", data={"username": email, "password": password})
    if resp.status_code == 200:
        return resp.json()["access_token"]
    print(f"Login failed for {email}: {resp.text}")
    return None

def test_phase3():
    print("--- Starting Phase 3 Verification ---")
    
    # Login Users
    admin_token = login("admin@festora.com", "Admin@123")
    faculty_token = login("faculty1@festora.com", "Faculty@123")
    student1_token = login("student1@festora.com", "Student@123")
    student2_token = login("student2@festora.com", "Student@123")
    
    if not (admin_token and faculty_token and student1_token and student2_token):
        print("Failed to login all required users.")
        return

    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    faculty_headers = {"Authorization": f"Bearer {faculty_token}"}
    student1_headers = {"Authorization": f"Bearer {student1_token}"}
    student2_headers = {"Authorization": f"Bearer {student2_token}"}

    # 1. Create Events (Solo & Group)
    future_date = (datetime.utcnow() + timedelta(days=10)).isoformat()
    
    # Solo Event
    solo_event_data = {
        "title": "Solo Singing 2026",
        "description": "Sing your heart out",
        "category": "Cultural",
        "event_type": "SOLO",
        "max_team_size": 1,
        "event_date": future_date,
        "registration_deadline": future_date,
        "location": "Auditorium",
        "faculty_coordinator_id": "000000000000000000000000", # Will need real ID if validation enabled
        "status": "SCHEDULED"
    }
    # Get faculty ID
    me_resp = requests.get(f"{BASE_URL}/auth/me", headers=faculty_headers)
    faculty_id = me_resp.json()["id"]
    solo_event_data["faculty_coordinator_id"] = faculty_id
    
    # DEBUG STEP
    print("Testing Debug Auth Endpoint...")
    resp = requests.get(f"{BASE_URL}/events/debug-auth", headers=admin_headers)
    print(f"Debug Auth: {resp.status_code} {resp.text}")

    print("Creating Solo Event...")
    resp = requests.post(f"{BASE_URL}/events/", json=solo_event_data, headers=admin_headers)
    if resp.status_code != 201:
        print(f"Failed to create solo event: {resp.text}")
        return
    solo_event_id = resp.json()["id"]
    print(f"Solo Event Created: {solo_event_id}")

    # Group Event
    group_event_data = solo_event_data.copy()
    group_event_data["title"] = "Group Dance 2026"
    group_event_data["event_type"] = "GROUP"
    group_event_data["max_team_size"] = 5
    
    print("Creating Group Event...")
    resp = requests.post(f"{BASE_URL}/events/", json=group_event_data, headers=admin_headers)
    if resp.status_code != 201:
        print(f"Failed to create group event: {resp.text}")
        return
    group_event_id = resp.json()["id"]
    print(f"Group Event Created: {group_event_id}")

    # 2. Student 1 Registers for Solo Event
    print("\nStudent 1 Registering for Solo Event...")
    reg_data = {"event_id": solo_event_id}
    resp = requests.post(f"{BASE_URL}/registrations/", json=reg_data, headers=student1_headers)
    if resp.status_code == 201:
        reg_id = resp.json()["id"]
        print(f"Solo Registration Successful. ID: {reg_id}")
        
        # Faculty Approves
        print("Faculty Approving Registration...")
        resp = requests.put(f"{BASE_URL}/registrations/{reg_id}/approve", headers=faculty_headers)
        print(f"Approval Status: {resp.status_code} {resp.text}")
    else:
        print(f"Solo Registration Failed: {resp.text}")

    # 3. Student 1 Registers for Group Event (as Leader) with Student 2
    # Get Student 2 ID
    s2_resp = requests.get(f"{BASE_URL}/auth/me", headers=student2_headers)
    student2_id = s2_resp.json()["id"]

    print("\nStudent 1 Creating Team for Group Event...")
    team_data = {
        "event_id": group_event_id,
        "team_name": "Dynamic Duo",
        "member_ids": [student2_id]
    }
    resp = requests.post(f"{BASE_URL}/registrations/", json=team_data, headers=student1_headers)
    if resp.status_code == 201:
        team_id = resp.json()["id"] # Response is TeamResponse
        print(f"Team Created Successfully. ID: {team_id}")
        
        # Faculty Approves Team
        print("Faculty Approving Team...")
        resp = requests.put(f"{BASE_URL}/teams/{team_id}/approve", headers=faculty_headers)
        print(f"Team Approval Status: {resp.status_code} {resp.text}")
    else:
        print(f"Team Creation Failed: {resp.text}")

    # 4. Check Participants List
    print("\nChecking Participants List for Group Event...")
    resp = requests.get(f"{BASE_URL}/events/{group_event_id}/participants", headers=faculty_headers)
    if resp.status_code == 200:
        participants = resp.json()
        print(f"Participants Found: {len(participants)}")
        print(json.dumps(participants, indent=2))
    else:
        print(f"Failed to fetch participants: {resp.text}")

    # 5. Mark Attendance
    print("\nMarking Attendance for Student 1 in Solo Event...")
    # Need Student 1 ID
    s1_resp = requests.get(f"{BASE_URL}/auth/me", headers=student1_headers)
    student1_id = s1_resp.json()["id"]
    
    att_data = {
        "student_id": student1_id,
        "status": "PRESENT"
    }
    resp = requests.post(f"{BASE_URL}/events/{solo_event_id}/attendance", json=att_data, headers=faculty_headers)
    print(f"Attendance Status: {resp.status_code} {resp.text}")

    # View Attendance
    resp = requests.get(f"{BASE_URL}/events/{solo_event_id}/attendance", headers=faculty_headers)
    print(f"Attendance Records: {resp.text}")

if __name__ == "__main__":
    test_phase3()
