import requests
import sys
import json
from datetime import datetime, timedelta

BASE_URL = "http://127.0.0.1:8024"

def login(email, password):
    resp = requests.post(f"{BASE_URL}/auth/login", data={"username": email, "password": password})
    if resp.status_code == 200:
        return resp.json()["access_token"]
    print(f"Login failed for {email}: {resp.text}")
    return None

def test_phase9():
    print("\n--- Starting Phase 9 Verification: Certificates ---\n")

    # 1. Login
    admin_token = login("admin@festora.com", "Admin@123")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    fac_token = login("faculty1@festora.com", "Faculty@123")
    fac_headers = {"Authorization": f"Bearer {fac_token}"}
    
    student_token = login("student1@festora.com", "Student@123")
    student_headers = {"Authorization": f"Bearer {student_token}"}
    
    # 2. Create Event
    print("Creating Event...")
    event_payload = {
        "title": "Certificate Validation Event",
        "description": "Testing certificates",
        "event_date": (datetime.now() + timedelta(days=1)).isoformat(),
        "location": "Main Hall",
        "faculty_coordinator_id": "699573aecee1520302c66b96", # User ID from seed
        "registration_deadline": (datetime.now() + timedelta(days=1)).isoformat(),
        "event_type": "SOLO",
        "min_participants": 1,
        "max_participants": 10,
        "max_team_size": 1,
        "status": "SCHEDULED",
        "category": "Technical"
    }
    
    # Need to get actual Faculty ID. 
    # Let's fetch /auth/me for faculty
    fac_me = requests.get(f"{BASE_URL}/auth/me", headers=fac_headers).json()
    event_payload["faculty_coordinator_id"] = fac_me["id"]
    
    resp = requests.post(f"{BASE_URL}/events/", json=event_payload, headers=admin_headers)
    if resp.status_code != 201:
        print(f"Event Creation Failed: {resp.text}")
        return
    event_id = resp.json()["id"]
    print(f"Event Created: {event_id}")

    # 3. Register Student
    print("Registering Student...")
    reg_payload = {"event_id": event_id}
    resp = requests.post(f"{BASE_URL}/registrations/", json=reg_payload, headers=student_headers)
    if resp.status_code != 201:
        print(f"Registration Failed: {resp.text}")
        # Proceed only if already registered?
    
    # 4. Approve Registration
    print("Approving Registration...")
    # Get reg ID
    regs = requests.get(f"{BASE_URL}/registrations/events/{event_id}", headers=fac_headers).json()
    if regs:
        reg_id = regs[0]["id"]
        requests.put(f"{BASE_URL}/registrations/{reg_id}/approve", headers=fac_headers)
    
    # 5. Mark Attendance
    print("Marking Attendance...")
    stud_me = requests.get(f"{BASE_URL}/auth/me", headers=student_headers).json()
    student_id = stud_me["id"]
    
    att_payload = {
        "student_id": student_id,
        "status": "PRESENT"
    }
    resp = requests.post(f"{BASE_URL}/events/{event_id}/attendance", json=att_payload, headers=fac_headers)
    print(f"Attendance Status: {resp.status_code}")
    if resp.status_code not in [200, 201]: 
        print(f"Attendance Failed: {resp.text}")

    # 6. Submit Score (Win)
    print("Submitting Score...")
    # Update event to ONGOING (Scoring requires ONGOING)
    requests.put(f"{BASE_URL}/events/{event_id}", json={"status": "ONGOING"}, headers=admin_headers)

    score_payload = {
        "event_id": event_id,
        "criteria": {"Creativity": 10},
        "score": 100,
        "registration_id": reg_id
    }
    resp = requests.post(f"{BASE_URL}/scores/", json=score_payload, headers=admin_headers)
    print(f"Score Submit Status: {resp.status_code}")
    if resp.status_code != 201:
        print(f"Score Failed: {resp.text}")

    # 7. Complete Event
    print("Completing Event...")
    requests.put(f"{BASE_URL}/events/{event_id}", json={"status": "COMPLETED"}, headers=admin_headers)

    # 8. Lock Results
    print("Locking Results...")
    requests.put(f"{BASE_URL}/scores/{event_id}/lock", headers=admin_headers)

    # 9. Generate Certificates
    print("Generating Certificates...")
    resp = requests.post(f"{BASE_URL}/certificates/events/{event_id}/generate", headers=admin_headers)
    print(f"Generate Response: {resp.json()}")
    if resp.status_code != 201:
        print(f"Generation Failed: {resp.text}")
        return

    # 10. Verify Certificates
    print("Verifying Student Certificates...")
    resp = requests.get(f"{BASE_URL}/certificates/my", headers=student_headers)
    certs = resp.json()
    print(f"My Certificates: {json.dumps(certs, indent=2)}")
    
    found = False
    for c in certs:
        if c["event_id"] == event_id:
            found = True
            print(f"Certificate Found: Type={c['certificate_type']}, Rank={c.get('rank')}")
            break
    
    if not found:
        print("Certificate NOT found for student!")

    # 11. Verify Admin View
    print("Verifying Admin View...")
    resp = requests.get(f"{BASE_URL}/certificates/events/{event_id}", headers=admin_headers)
    all_certs = resp.json()
    print(f"Total Certificates for Event: {len(all_certs)}")

if __name__ == "__main__":
    test_phase9()
