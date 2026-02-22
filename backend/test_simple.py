import requests
import sys

BASE_URL = "http://127.0.0.1:8012"

def login(email, password):
    try:
        resp = requests.post(f"{BASE_URL}/auth/login", data={"username": email, "password": password}, timeout=5)
        if resp.status_code == 200:
            print(f"Login success: {email}")
            return resp.json()["access_token"]
        print(f"Login failed for {email}: {resp.status_code} {resp.text}")
        return None
    except Exception as e:
        print(f"Login Exception for {email}: {e}")
        return None

try:
    print("Testing Root...")
    resp = requests.get(f"{BASE_URL}/", timeout=5)
    print(f"Root: {resp.status_code} {resp.text}")
except Exception as e:
    print(f"Root Exception: {e}")

token = login("admin@festora.com", "Admin@123")

if token:
    headers = {"Authorization": f"Bearer {token}"}
    try:
        # Get Faculty ID
        print("Getting Faculty ID...")
        fac_token = login("faculty1@festora.com", "Faculty@123")
        if fac_token:
            fac_headers = {"Authorization": f"Bearer {fac_token}"}
            me_resp = requests.get(f"{BASE_URL}/auth/me", headers=fac_headers, timeout=5)
            faculty_id = me_resp.json()["id"]
            
            # Create Event
            print(f"Creating Event with Faculty ID: {faculty_id}")
            event_data = {
                "title": "Debug Event",
                "description": "Debugging 500",
                "category": "Debug",
                "event_type": "SOLO",
                "max_team_size": 1,
                "event_date": "2026-12-12T10:00:00",
                "registration_deadline": "2026-12-10T10:00:00",
                "location": "Debug Lab",
                "faculty_coordinator_id": faculty_id,
                "status": "SCHEDULED"
            }
            resp = requests.post(f"{BASE_URL}/events/", json=event_data, headers=headers, timeout=5)
            print(f"Create Event: {resp.status_code} {resp.text}")
    except Exception as e:
        print(f"Event Creation Exception: {e}")
        fac_token = login("faculty1@festora.com", "Faculty@123")
        if fac_token:
            fac_headers = {"Authorization": f"Bearer {fac_token}"}
            me_resp = requests.get(f"{BASE_URL}/auth/me", headers=fac_headers, timeout=5)
            faculty_id = me_resp.json()["id"]
            
            # Create Event
            print(f"Creating Event with Faculty ID: {faculty_id}")
            event_data = {
                "title": "Debug Event",
                "description": "Debugging 500",
                "category": "Debug",
                "event_type": "SOLO",
                "max_team_size": 1,
                "event_date": "2026-12-12T10:00:00",
                "registration_deadline": "2026-12-10T10:00:00",
                "location": "Debug Lab",
                "faculty_coordinator_id": faculty_id,
                "status": "SCHEDULED"
            }
            
            # Debug Schema
            print("Testing Debug Schema...")
            resp = requests.post(f"{BASE_URL}/events/debug-schema", json=event_data, headers=headers, timeout=5)
            print(f"Debug Schema: {resp.status_code} {resp.text}")

            print(f"Creating Event with Faculty ID: {faculty_id}")
            resp = requests.post(f"{BASE_URL}/events/", json=event_data, headers=headers, timeout=5)
            print(f"Create Event: {resp.status_code} {resp.text}")
    except Exception as e:
        print(f"Event Creation Exception: {e}")
