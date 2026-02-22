import requests
import os

BASE_URL = "http://localhost:8000"
ADMIN_EMAIL = "admin@festora.com"
ADMIN_PASSWORD = "Admin@123"

def login(email, password):
    response = requests.post(f"{BASE_URL}/auth/login", data={"username": email, "password": password})
    if response.status_code == 200:
        return response.json()["access_token"]
    else:
        print(f"Login failed: {response.text}")
        return None

def create_dummy_pdf():
    with open("dummy.pdf", "wb") as f:
        f.write(b"%PDF-1.4\n1 0 obj\n<<\n/Type /Catalog\n/Pages 2 0 R\n>>\nendobj\n2 0 obj\n<<\n/Type /Pages\n/Kids [3 0 R]\n/Count 1\n>>\nendobj\n3 0 obj\n<<\n/Type /Page\n/Parent 2 0 R\n/MediaBox [0 0 612 792]\n/Resources << >>\n>>\nendobj\nxref\n0 4\n0000000000 65535 f \n0000000010 00000 n \n0000000060 00000 n \n0000000111 00000 n \ntrailer\n<<\n/Size 4\n/Root 1 0 R\n>>\nstartxref\n190\n%%EOF")
    return "dummy.pdf"

def  test_lifecycle():
    token = login(ADMIN_EMAIL, ADMIN_PASSWORD)
    if not token:
        return

    headers = {"Authorization": f"Bearer {token}"}

    # 0. Test Router
    resp = requests.get(f"{BASE_URL}/events/test", headers=headers)
    print(f"Test Endpoint: {resp.status_code} {resp.text}")

    # 1. Create Event
    event_data = {
        "title": "Hackathon 2026",
        "description": "A coding competition",
        "category": "Technical",
        "event_type": "GROUP",
        "max_team_size": 4,
        "event_date": "2026-12-12T10:00:00",
        "registration_deadline": "2026-12-10T10:00:00",
        "location": "Lab 1",
        "faculty_coordinator_id": "000000000000000000000000", # Using fake ID, might fail validation if I don't fetch real one
        "event_coordinator_ids": [],
        "judge_ids": []
    }
    
    # Need real Faculty ID
    # For now, let's just assume we need to fetch users first or relax validation for test?
    # Validating roles is part of requirements. Let's fetch a faculty user.
    # But I don't have a Get Users endpoint for Admin implemented in this phase (it was module 1 but I only did Create/Auth).
    # Actually, seed data created specific emails. I can login as faculty to get my own ID? 
    # Or I can just check the seed script logic - I can't easily get IDs without an endpoint or direct DB access.
    # WAIT, `GET /auth/me` returns ID.
    
    # Login as Faculty 1 to get ID
    fac_token = login("faculty1@festora.com", "Faculty@123")
    fac_resp = requests.get(f"{BASE_URL}/auth/me", headers={"Authorization": f"Bearer {fac_token}"})
    faculty_id = fac_resp.json()["id"]
    
    event_data["faculty_coordinator_id"] = faculty_id
    
    print(f"Creating event with Faculty ID: {faculty_id}")
    resp = requests.post(f"{BASE_URL}/events/v2", json=event_data, headers=headers)
    if resp.status_code == 201:
        print("Event created successfully")
        event_id = resp.json()["id"]
    else:
        print(f"Event creation failed: {resp.text}")
        return

    # 2. Upload Rulebook
    pdf_path = create_dummy_pdf()
    files = {'file': ('rulebook.pdf', open(pdf_path, 'rb'), 'application/pdf')}
    resp = requests.post(f"{BASE_URL}/events/{event_id}/upload-rulebook", files=files, headers=headers)
    if resp.status_code == 200:
        print("Rulebook uploaded successfully")
        print(f"URL: {resp.json()['rulebook_url']}")
    else:
        print(f"Rulebook upload failed: {resp.text}")

    # 3. Get Event
    resp = requests.get(f"{BASE_URL}/events/{event_id}", headers=headers)
    if resp.status_code == 200:
        print("Required fields check:", resp.json().get("rulebook_url"))
    
    # Clean up
    if os.path.exists(pdf_path):
        os.remove(pdf_path)

if __name__ == "__main__":
    try:
        test_lifecycle()
    except Exception as e:
        print(f"Test failed: {e}")
