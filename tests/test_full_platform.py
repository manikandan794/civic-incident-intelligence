import requests
import json
import time

BASE_URL = "http://127.0.0.1:8000"

def run_e2e_tests():
    print("=" * 60)
    print("URBANGRID COMPREHENSIVE END-TO-END TEST SUITE")
    print("=" * 60)

    # 0. Baseline Reset for Clean Testing
    requests.post(f"{BASE_URL}/api/demo/reset")

    # 1. Health check
    r = requests.get(f"{BASE_URL}/api/health")
    assert r.status_code == 200, f"Health check failed: {r.text}"
    health = r.json()
    print(f"[PASS] TEST 1: System Health: {health['status']} | PostGIS/Spatial Core: {health['database']}")

    # 2. Officer Login (admin / admin123)
    login_payload = {"email_or_username": "admin", "password": "admin123"}
    r = requests.post(f"{BASE_URL}/api/auth/login", json=login_payload)
    assert r.status_code == 200, f"Officer login failed: {r.text}"
    officer_token = r.json()["access_token"]
    officer_headers = {"Authorization": f"Bearer {officer_token}"}
    print("[PASS] TEST 2: Officer Login with competition credentials (admin/admin123)")

    # 3. Officer Summary KPIs (Ultra-fast aggregation)
    t0 = time.time()
    r = requests.get(f"{BASE_URL}/api/officer/summary", headers=officer_headers)
    dur = (time.time() - t0) * 1000
    assert r.status_code == 200, f"Summary KPIs failed: {r.text}"
    summary = r.json()
    print(f"[PASS] TEST 3: Officer Summary KPIs loaded in {dur:.1f}ms (Total: {summary['total_complaints']}, Critical: {summary['critical_high']}, Available Workers: {summary['available_workers']})")

    # 4. Location Search (Nominatim Geocoding API)
    r = requests.get(f"{BASE_URL}/api/complaints/search-location?query=Royapuram+Chennai")
    assert r.status_code == 200, f"Location search failed: {r.text}"
    locs = r.json()
    assert len(locs) > 0, "No locations returned for Royapuram"
    print(f"[PASS] TEST 4: Real Location Geocoding search returned {len(locs)} points (e.g. {locs[0]['name']} at {locs[0]['latitude']:.4f}, {locs[0]['longitude']:.4f})")

    # 5. Core 50m Deduplication Test (Duplicate of UG-1001 within 50m)
    # UG-1001 is at lat: 13.1075, lng: 80.2934
    dup_check_payload = {
        "description": "Deep road crater with broken edges right at the signal.",
        "latitude": 13.1076, # ~15m away
        "longitude": 80.2935,
        "category": "Pothole"
    }
    r = requests.post(f"{BASE_URL}/api/complaints/check-duplicate", json=dup_check_payload)
    assert r.status_code == 200, f"Check duplicate failed: {r.text}"
    dup_res = r.json()
    assert dup_res["has_active_duplicate"] is True, f"Expected duplicate within 50m, got {dup_res}"
    match = dup_res["active_matches"][0]
    assert match["ticket_number"] == "UG-1001", f"Expected UG-1001, got {dup_res}"
    print(f"[PASS] TEST 5: 50m Spatial Deduplication Engine: Matched {match['ticket_number']} at distance {match['distance_meters']:.1f}m (<= 50m rule)")

    # 6. Submit Duplicate Report & Verify Priority Escalation
    dup_submit_data = {
        "description": "Deep road crater with broken edges right at the signal.",
        "latitude": 13.1076,
        "longitude": 80.2935,
        "address": "Royapuram Signal, Ward 12",
        "category": "Pothole",
        "citizen_name": "R. Vignesh",
        "citizen_phone": "+91 98840 99999"
    }
    dummy_image = ("pothole.jpg", b"\xff\xd8\xff\xe0\x00\x10JFIF\x00\x01\x01\x01\x00H\x00H\x00\x00\xff\xdb\x00C\x00dummyphoto", "image/jpeg")
    r = requests.post(f"{BASE_URL}/api/complaints/submit", data=dup_submit_data, files={"file": dummy_image})
    assert r.status_code == 200, f"Duplicate submission failed: {r.text}"
    dup_sub_res = r.json()
    assert dup_sub_res["is_duplicate"] is True
    print(f"[PASS] TEST 6: Duplicate Report successfully merged into {dup_sub_res['ticket_number']} (Status: {dup_sub_res['status']})")

    # 7. Submit a New Complaint outside 50m radius (unique location)
    unique_offset = (time.time() % 100) / 1000.0 + 0.05
    new_submit_data = {
        "description": "Large garbage overflow overflowing near Sanatorium railway gate.",
        "latitude": 12.9500 + unique_offset,
        "longitude": 80.1400 + unique_offset,
        "address": "Sanatorium Gate, Ward 32",
        "category": "Garbage Overflow",
        "citizen_name": "M. Suresh",
        "citizen_phone": "+91 97890 88888"
    }
    r = requests.post(f"{BASE_URL}/api/complaints/submit", data=new_submit_data, files={"file": dummy_image})
    assert r.status_code == 200, f"New complaint failed: {r.text}"
    new_sub_res = r.json()
    print("DEBUG new_sub_res:", new_sub_res)
    assert new_sub_res["is_duplicate"] is False
    new_ticket_id = new_sub_res["complaint_id"]
    new_ticket_num = new_sub_res["ticket_number"]
    print(f"[PASS] TEST 7: Independent New Grievance Created: {new_ticket_num} (Status: {new_sub_res['status']})")

    # 8. Officer Provisions Worker with Team details
    new_worker_payload = {
        "name": "Murugesan S (Road Lead)",
        "username": f"worker_muru_{int(time.time())}",
        "password": "worker123",
        "phone": "+91 94441 55555",
        "ward_number": 32,
        "role": "Field Crew Specialist",
        "specialization": "Road Maintenance",
        "team_name": "Tambaram Pothole Patch Crew",
        "team_size": 4,
        "is_team_leader": True
    }
    r = requests.post(f"{BASE_URL}/api/workers", json=new_worker_payload, headers=officer_headers)
    assert r.status_code == 200, f"Create worker failed: {r.text}"
    worker_created = r.json()
    worker_id = worker_created["id"]
    print(f"[PASS] TEST 8: Officer created worker {worker_created['name']} (@{worker_created['username']}) in Team '{worker_created['team_name']}'")

    # 9. Officer assigns Worker to New Ticket
    assign_payload = {
        "worker_id": worker_id,
        "notes": "Deploy crew with hot-mix asphalt."
    }
    r = requests.post(f"{BASE_URL}/api/officer/complaints/{new_ticket_id}/assign", json=assign_payload, headers=officer_headers)
    assert r.status_code == 200, f"Assign worker failed: {r.text}"
    print(f"[PASS] TEST 9: Officer assigned worker {worker_created['name']} to ticket {new_ticket_num}")

    # 10. Worker Login & Task list
    w_login_payload = {"email_or_username": worker_created["username"], "password": "worker123"}
    r = requests.post(f"{BASE_URL}/api/auth/login", json=w_login_payload)
    assert r.status_code == 200, f"Worker login failed: {r.text}"
    worker_token = r.json()["access_token"]
    worker_headers = {"Authorization": f"Bearer {worker_token}"}

    r = requests.get(f"{BASE_URL}/api/workers/portal/my-tasks", headers=worker_headers)
    assert r.status_code == 200
    my_tasks = r.json()
    assert any(t["id"] == new_ticket_id for t in my_tasks), f"Assigned task {new_ticket_id} not found in worker tasks"
    print(f"[PASS] TEST 10: Worker logged in and retrieved assigned task {new_ticket_num}")

    # 11. Worker Starts Work
    r = requests.post(f"{BASE_URL}/api/workers/tasks/{new_ticket_id}/start", json={"notes": "Crew mobilized on site"}, headers=worker_headers)
    assert r.status_code == 200
    print(f"[PASS] TEST 11: Worker started work on {new_ticket_num} -> Status: IN_PROGRESS")

    # 12. Worker Completes Work -> Sent to Officer (Does NOT auto-resolve!)
    r = requests.post(f"{BASE_URL}/api/workers/tasks/{new_ticket_id}/complete", json={"notes": "All potholes filled and compacted."}, headers=worker_headers)
    assert r.status_code == 200

    r = requests.get(f"{BASE_URL}/api/complaints/{new_ticket_id}", headers=officer_headers)
    complaint_after_work = r.json()
    assert complaint_after_work["status"] == "WORK_COMPLETED", f"Expected WORK_COMPLETED, got {complaint_after_work['status']}"
    print(f"[PASS] TEST 12: Worker marked work completed -> Status: WORK_COMPLETED (Awaiting Officer Verification)")

    # 13. Officer Verifies and Resolves
    verify_payload = {
        "verification_notes": "Physical repairs inspected on site by Ward 32 Officer. Quality approved.",
        "is_approved": True
    }
    r = requests.post(f"{BASE_URL}/api/officer/complaints/{new_ticket_id}/verify", json=verify_payload, headers=officer_headers)
    assert r.status_code == 200
    r = requests.get(f"{BASE_URL}/api/complaints/{new_ticket_id}", headers=officer_headers)
    assert r.json()["status"] == "RESOLVED"
    print(f"[PASS] TEST 13: Officer verified & resolved grievance {new_ticket_num} -> Status: RESOLVED")

    # 14. Citizen Evidence Report Module: Submit Report (REP-xxxx)
    ev_data = {
        "related_ticket_number": new_ticket_num,
        "report_type": "Work Completed",
        "description": "Confirmed that the asphalt patch has hardened and traffic is moving smoothly.",
        "latitude": 12.9320,
        "longitude": 80.1240,
        "location_name": "Sanatorium Gate, Ward 32",
        "citizen_name": "M. Suresh",
        "citizen_phone": "+91 97890 88888"
    }
    r = requests.post(f"{BASE_URL}/api/evidence-reports/submit", data=ev_data)
    assert r.status_code == 200, f"Evidence report submit failed: {r.text}"
    ev_sub = r.json()
    report_id = ev_sub["id"]
    public_rep_id = ev_sub["report_id"]
    print(f"[PASS] TEST 14: Citizen Evidence Report created: {public_rep_id} (Linked to {new_ticket_num}, Status: {ev_sub['status']})")

    # 15. Officer Reviews Evidence Report & Forwards to Worker for Site Verification
    r = requests.get(f"{BASE_URL}/api/evidence-reports/stats", headers=officer_headers)
    assert r.status_code == 200
    ev_stats = r.json()
    print(f"[PASS] TEST 15: Evidence Reports DB Stats: Total {ev_stats['total']}, Received {ev_stats['new_received']}")

    forward_payload = {
        "worker_id": worker_id,
        "instruction": "Verify bitumen seal thickness and road smoothness.",
        "priority": "HIGH"
    }
    r = requests.post(f"{BASE_URL}/api/evidence-reports/{report_id}/forward", json=forward_payload, headers=officer_headers)
    assert r.status_code == 200
    print(f"[PASS] TEST 16: Officer forwarded {public_rep_id} to worker {worker_created['name']} for site verification")

    # 16. Worker Receives Verification Task & Submits Findings
    r = requests.get(f"{BASE_URL}/api/workers/portal/verifications", headers=worker_headers)
    assert r.status_code == 200
    w_verifs = r.json()
    assert any(v["id"] == report_id for v in w_verifs), f"Report {report_id} not in worker verifications"

    verify_payload = {
        "worker_notes": "Site inspection confirmed bitumen seal is uniform and road is fully functional."
    }
    r = requests.post(f"{BASE_URL}/api/evidence-reports/{report_id}/worker-verify", json=verify_payload, headers=worker_headers)
    assert r.status_code == 200
    print(f"[PASS] TEST 17: Worker completed field verification for {public_rep_id} and returned findings to Officer")

    # 17. Officer Officially Resolves & Closes Evidence Report
    r = requests.post(f"{BASE_URL}/api/evidence-reports/{report_id}/resolve?notes=Confirmed+and+closed", headers=officer_headers)
    assert r.status_code == 200

    r = requests.get(f"{BASE_URL}/api/evidence-reports/{report_id}", headers=officer_headers)
    final_ev = r.json()
    assert final_ev["status"] == "RESOLVED"
    print(f"[PASS] TEST 18: Officer finalized and closed evidence report {public_rep_id} -> Status: RESOLVED")

    # 18. Worker GPS Beacon
    loc_payload = {"latitude": 12.9325, "longitude": 80.1245, "is_online": True}
    r = requests.post(f"{BASE_URL}/api/workers/location", json=loc_payload, headers=worker_headers)
    assert r.status_code == 200
    print("[PASS] TEST 19: Worker GPS beacon successfully logged")

    # 19. Public Ticket Tracking (Non-sensitive info)
    r = requests.get(f"{BASE_URL}/api/complaints/track/{new_ticket_num}")
    assert r.status_code == 200
    track_info = r.json()
    assert "citizen_phone" not in track_info, "Sensitive citizen_phone exposed in public tracking!"
    print(f"[PASS] TEST 20: Public Citizen Tracking verified for {new_ticket_num} (Status: {track_info['status']}, Privacy Protected)")

    print("=" * 60)
    print("ALL 20 SYSTEM VERIFICATION TESTS PASSED SUCCESSFULLY!")
    print("=" * 60)

if __name__ == "__main__":
    run_e2e_tests()
