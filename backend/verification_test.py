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

def create_event(token, event_type="SOLO"):
    headers = {"Authorization": f"Bearer {token}"}
    data = {
        "title": f"Test Event {event_type} {generate_random_string()}",
        "description": "Test Description",
        "category": "Test",
        "event_type": event_type,
        "max_team_size": 3 if event_type == "GROUP" else 1,
        "event_date": (datetime.utcnow() + timedelta(days=5)).isoformat(),
        "registration_deadline": (datetime.utcnow() + timedelta(days=4)).isoformat(),
        "location": "Test Location",
        "faculty_coordinator_id": "67b4dae8a798565b932c0211", # Using a fake ID or need to fetch one?
        # Faculty ID logic: Admin creates event, needs valid faculty ID.
        # I'll fetch users first to get a faculty ID.
        "event_coordinator_ids": [],
        "judge_ids": []
    }
    
    # Get a valid faculty ID
    users_resp = requests.get(f"{BASE_URL}/users", headers=headers) # Needs Admin
    # Wait, /users isn't a public endpoint usually. 
    # Logic: "validate_event_roles" checks DB.
    # I should use a known ID or fetch one from local DB logic? 
    # For stability test, I'll rely on seed data if possible, or just create a user first.
    # Let's hope seed users exist. 
    # If not, I'll create one.
    
    return requests.post(f"{BASE_URL}/events/", json=data, headers=headers)

def get_faculty_id(admin_token):
    # This might fail if endpoint doesn't exist or returns differently.
    # I'll just hardcode one from seed_users if I can, but I don't know the ID.
    # Valid strategy: Create a faculty user first.
    headers = {"Authorization": f"Bearer {admin_token}"}
    data = {
        "full_name": "Test Faculty",
        "email": f"faculty_{generate_random_string()}@test.com",
        "password": "Password123",
        "role": "faculty"
    }
    resp = requests.post(f"{BASE_URL}/users/", json=data, headers=headers)
    if resp.status_code == 201:
        return resp.json()["id"]
    # If fails (maybe email exists), try login?
    # Actually, let's just use the admin user ID as faculty coordinator? 
    # The validation logic checks role=FACULTY.
    # So I MUST have a faculty user.
    return None

def run_test_iteration(iter_num):
    print(f"\n--- Iteration {iter_num} ---")
    
    # 1. Login Admin
    print("Logging in Admin...")
    admin_token = login("admin@festora.com", "Admin@123")
    
    # 2. Get/Create Faculty for Event
    faculty_id = get_faculty_id(admin_token)
    if not faculty_id:
        # Try to find one? 
        # Or just use a dummy logic if validation is disabled? (It's not)
        print("Could not create faculty. Creating one manually...")
        # ...
        # Assume get_faculty_id works or I need to handle it.
        pass

    # 3. Create Solo Event
    print("Creating Solo Event...")
    headers = {"Authorization": f"Bearer {admin_token}"}
    
    # Create Faculty
    faculty_data = {
        "full_name": "Test Faculty",
        "email": f"fac_{generate_random_string()}@test.com",
        "password": "Pass",
        "role": "faculty"
    }
    fac_resp = requests.post(f"{BASE_URL}/users/", json=faculty_data, headers=headers)
    if fac_resp.status_code != 201:
        print(f"Create Faculty Failed: {fac_resp.text}")
        return False
    faculty_id = fac_resp.json()["id"]

    solo_event_data = {
        "title": f"Solo Event {iter_num}",
        "description": "Desc",
        "category": "Cat",
        "event_type": "SOLO",
        "max_team_size": 1,
        "event_date": (datetime.utcnow() + timedelta(days=1)).isoformat(),
        "registration_deadline": (datetime.utcnow() + timedelta(hours=5)).isoformat(),
        "location": "Loc",
        "faculty_coordinator_id": faculty_id
    }
    resp = requests.post(f"{BASE_URL}/events/", json=solo_event_data, headers=headers)
    if resp.status_code != 201:
        print(f"Create Solo Event Failed: {resp.text}")
        return False
    solo_event_id = resp.json()["id"]
    print(f"Solo Event Created: {solo_event_id}")

    # 4. Create Group Event
    print("Creating Group Event...")
    group_event_data = solo_event_data.copy()
    group_event_data["title"] = f"Group Event {iter_num}"
    group_event_data["event_type"] = "GROUP"
    group_event_data["max_team_size"] = 3
    resp = requests.post(f"{BASE_URL}/events/", json=group_event_data, headers=headers)
    if resp.status_code != 201:
        print(f"Create Group Event Failed: {resp.text}")
        return False
    group_event_id = resp.json()["id"]
    print(f"Group Event Created: {group_event_id}")

    # 5. Register Solo
    print("Registering Solo...")
    # Create Student
    student_email = f"student_{generate_random_string()}@test.com"
    student_data = {
        "full_name": "Test Student",
        "email": student_email,
        "password": "Pass",
        "role": "student",
        "registration_number": "123",
        "department": "CSE",
        "year": 3
    }
    # Admin creates student for speed (or register endpoint if public)
    requests.post(f"{BASE_URL}/users/", json=student_data, headers=headers)
    
    student_token = login(student_email, "Pass")
    student_headers = {"Authorization": f"Bearer {student_token}"}
    
    reg_data = {"event_id": solo_event_id}
    resp = requests.post(f"{BASE_URL}/registrations/", json=reg_data, headers=student_headers)
    if resp.status_code != 201:
        print(f"Solo Registration Failed: {resp.text}")
        return False
    reg_id_solo = resp.json()["id"]
    print(f"Solo Registered: {reg_id_solo}")

    # 6. Register Group
    print("Registering Group...")
    # Student 2 (Leader)
    leader_email = f"leader_{generate_random_string()}@test.com"
    leader_data = student_data.copy()
    leader_data["email"] = leader_email
    requests.post(f"{BASE_URL}/users/", json=leader_data, headers=headers)
    leader_token = login(leader_email, "Pass")
    leader_headers = {"Authorization": f"Bearer {leader_token}"}
    
    # Needs another member
    member_email = f"member_{generate_random_string()}@test.com"
    member_data = student_data.copy()
    member_data["email"] = member_email
    mem_resp = requests.post(f"{BASE_URL}/users/", json=member_data, headers=headers)
    member_id = mem_resp.json()["id"]

    group_reg_data = {
        "event_id": group_event_id,
        "team_name": f"Team {generate_random_string()}",
        "member_ids": [member_id]
    }
    resp = requests.post(f"{BASE_URL}/registrations/", json=group_reg_data, headers=leader_headers)
    if resp.status_code != 201:
        print(f"Group Registration Failed: {resp.text}")
        return False
    team_id = resp.json()["id"] # Response is TeamResponse
    print(f"Group Registered (Team): {team_id}")

    # 7. Approve Solo
    print("Approving Solo...")
    # Admin approves
    resp = requests.put(f"{BASE_URL}/registrations/{reg_id_solo}/approve", headers=headers)
    if resp.status_code != 200:
        print(f"Approve Solo Failed: {resp.text}")
        return False
    print("Solo Approved")

    # 8. Approve Group
    print("Approving Group...")
    resp = requests.put(f"{BASE_URL}/teams/{team_id}/approve", headers=headers)
    if resp.status_code != 200:
        print(f"Approve Group Failed: {resp.text}")
        return False
    print("Group Approved")

    # 9. Fetch Participants
    print("Fetching Participants (Solo)...")
    resp = requests.get(f"{BASE_URL}/events/{solo_event_id}/participants", headers=headers)
    if resp.status_code != 200:
        print(f"Fetch Participants Solo Failed: {resp.text}")
        return False
    participants = resp.json()
    print(f"Solo Participants: {len(participants)}")
    
    # Verify participant has team_name = None (or handled safely)
    for p in participants:
         if "team_name" not in p:
             print("WARNING: team_name missing in response")

    print("Fetching Participants (Group)...")
    resp = requests.get(f"{BASE_URL}/events/{group_event_id}/participants", headers=headers)
    if resp.status_code != 200:
        print(f"Fetch Participants Group Failed: {resp.text}")
        return False
    participants = resp.json()
    print(f"Group Participants: {len(participants)}")

    print(f"--- Iteration {iter_num} Logic Passed ---\n")
    return True

if __name__ == "__main__":
    time.sleep(2) # Wait for server
    for i in range(1, 4):
        if not run_test_iteration(i):
            print("TEST FAILED")
            sys.exit(1)
    print("ALL TESTS PASSED")
