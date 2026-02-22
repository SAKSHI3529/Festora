import requests
import sys
import json
import csv
from datetime import datetime
import io

BASE_URL = "http://127.0.0.1:8020"

def login(email, password):
    resp = requests.post(f"{BASE_URL}/auth/login", data={"username": email, "password": password})
    if resp.status_code == 200:
        return resp.json()["access_token"]
    print(f"Login failed for {email}: {resp.text}")
    return None

def test_phase6():
    print("\n--- Starting Phase 6 Verification: Reports & Analytics ---\n")

    # 1. Login
    admin_token = login("admin@festora.com", "Admin@123")
    admin_headers = {"Authorization": f"Bearer {admin_token}"}
    
    fac_token = login("faculty1@festora.com", "Faculty@123")
    fac_headers = {"Authorization": f"Bearer {fac_token}"}
    
    # Using previous event if possible, or creating new one?
    # To test fully, we need an event with registrations/results.
    # We can use the event from Phase 4/5 if server DB is persistent (which it is).
    # Event ID from Phase 5 was: 69974fb2e537680b1a31e581 (Budget Event) - no registrations?
    # Event ID from Phase 4 was: 69974be1c600fe7fd6c41721 (Singing Content) - has results!
    
    # Try fetching dashboard first
    print("Fetching Dashboard Stats...")
    resp = requests.get(f"{BASE_URL}/reports/dashboard", headers=admin_headers)
    if resp.status_code == 200:
        print(f"Dashboard Stats: {json.dumps(resp.json(), indent=2)}")
    else:
        print(f"Dashboard Failed: {resp.status_code} {resp.text}")

    # Use Phase 4 Event ID if known, else we might fail if we don't have one handy.
    # Let's try listing events to find a suitable one.
    resp = requests.get(f"{BASE_URL}/events/", headers=admin_headers)
    events = resp.json()
    target_event_id = None
    for e in events:
        if e["status"] == "COMPLETED" or e["status"] == "ONGOING":
             target_event_id = e["id"]
             break
    
    if target_event_id:
        print(f"\nTesting Analytics for Event: {target_event_id}")
        
        # 2. Event Analytics
        resp = requests.get(f"{BASE_URL}/reports/events/{target_event_id}/analytics", headers=admin_headers)
        if resp.status_code == 200:
            print(f"Event Analytics: {json.dumps(resp.json(), indent=2)}")
        else:
             print(f"Analytics Failed: {resp.status_code} {resp.text}")

        # 3. CSV Export
        print("\nTesting CSV Export...")
        resp = requests.get(f"{BASE_URL}/reports/events/{target_event_id}/participants/export", headers=admin_headers)
        if resp.status_code == 200:
            content = resp.text
            print(f"CSV Content Preview:\n{content[:200]}")
        else:
            print(f"CSV Export Failed: {resp.status_code} {resp.text}")

        # Lock Results if not locked
        print("\nLocking Results for PDF Export...")
        # Need to be Admin to lock. We have admin_headers.
        # Ensure event is COMPLETED first? 
        # Check current status
        evt_details = requests.get(f"{BASE_URL}/events/{target_event_id}", headers=admin_headers).json()
        if evt_details["status"] != "COMPLETED":
             requests.put(f"{BASE_URL}/events/{target_event_id}", json={"status": "COMPLETED"}, headers=admin_headers)
        
        requests.put(f"{BASE_URL}/scores/{target_event_id}/lock", headers=admin_headers)

        # 4. PDF Export
        print("\nTesting PDF Export...")
        resp = requests.get(f"{BASE_URL}/reports/events/{target_event_id}/results/export", headers=admin_headers)
        if resp.status_code == 200:
            print(f"PDF Generated. Size: {len(resp.content)} bytes")
            if len(resp.content) > 100:
                 print("PDF Export Success")
        else:
            print(f"PDF Export Failed: {resp.status_code} {resp.text}")

    else:
        print("\nNo suitable event found for analytics/export testing.")

if __name__ == "__main__":
    test_phase6()
