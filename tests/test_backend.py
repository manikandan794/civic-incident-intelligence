import pytest
from datetime import datetime, timezone
from backend.app.services.geospatial_service import haversine_distance_meters, assign_ward_from_coordinates
from backend.app.services.priority_service import calculate_priority
from backend.app.services.duplicate_engine import (
    evaluate_duplicate_candidates, calculate_text_similarity, calculate_visual_similarity
)
from backend.app.core.database import SessionLocal, init_db
from backend.app.models.models import Complaint, ComplaintStatus, User, UserRole
from backend.app.core.security import create_access_token, decode_access_token, verify_password, get_password_hash

@pytest.fixture(scope="module")
def db_session():
    init_db()
    db = SessionLocal()
    yield db
    db.close()

def test_haversine_accuracy():
    # Identical coordinates must be 0 meters
    assert haversine_distance_meters(13.0827, 80.2707, 13.0827, 80.2707) == 0.0
    
    # 0.0003 deg latitude difference at equator/tropics is ~33.3 meters
    dist = haversine_distance_meters(13.0827, 80.2707, 13.0830, 80.2707)
    assert 30.0 < dist < 36.0

    # > 1 km distance
    dist_far = haversine_distance_meters(13.0827, 80.2707, 13.1000, 80.2707)
    assert dist_far > 1800.0

def test_priority_escalation():
    # Single report retains baseline
    assert calculate_priority("MEDIUM", 1, 0) == "MEDIUM"
    assert calculate_priority("HIGH", 1, 0) == "HIGH"
    
    # 2 reports escalates by +1 level
    assert calculate_priority("MEDIUM", 2, 0) == "HIGH"
    assert calculate_priority("HIGH", 2, 0) == "CRITICAL"
    
    # 5+ reports escalates to CRITICAL
    assert calculate_priority("LOW", 5, 0) == "HIGH"
    assert calculate_priority("MEDIUM", 5, 0) == "CRITICAL"
    
    # Recurring escalates
    assert calculate_priority("MEDIUM", 1, 1) == "HIGH"

def test_text_and_visual_similarity():
    # Text similarity
    s1 = "Large dangerous pothole on main road causing hazard for two-wheelers"
    s2 = "Deep pothole on road causing difficulty for motorcycles"
    sim = calculate_text_similarity(s1, s2)
    assert sim > 20.0  # Common words like pothole, road, causing

    # Visual similarity with matching category and keywords
    v_sim = calculate_visual_similarity(
        category1="Pothole",
        category2="Pothole",
        keywords1=["pothole", "asphalt", "road"],
        keywords2=["pothole", "crater", "road"]
    )
    assert v_sim >= 75.0

    # Unrelated categories
    v_diff = calculate_visual_similarity(
        category1="Broken Streetlight",
        category2="Garbage Overflow",
        keywords1=["lamp", "pole", "light"],
        keywords2=["trash", "waste", "bin"]
    )
    assert v_diff < 40.0

def test_duplicate_engine_same_issue_within_50m(db_session):
    # Anchor ticket UG-1001 is at (13.1075, 80.2934)
    # Test submission 25 meters away with same issue
    lat_near = 13.1077  # ~22 meters away
    lng_near = 80.2934
    
    result = evaluate_duplicate_candidates(
        db=db_session,
        latitude=lat_near,
        longitude=lng_near,
        category="Pothole",
        description="Heavy pothole on road near Royapuram market",
        ai_keywords=["pothole", "road", "vehicle hazard"]
    )
    
    assert result.is_duplicate is True
    assert result.distance_meters <= 50.0
    assert result.final_score >= 60.0
    assert result.matched_complaint.ticket_number == "UG-1001"

def test_duplicate_engine_outside_50m_never_duplicate(db_session):
    # Location 200m away from UG-1001 (0.002 deg away)
    lat_far = 13.1075 + 0.002  # ~222 meters
    lng_far = 80.2934
    
    dist = haversine_distance_meters(13.1075, 80.2934, lat_far, lng_far)
    assert dist > 150.0

    result = evaluate_duplicate_candidates(
        db=db_session,
        latitude=lat_far,
        longitude=lng_far,
        category="Pothole",
        description="Another pothole further down the road",
        ai_keywords=["pothole", "road"]
    )
    
    # HARD RULE: Outside 50m must NOT be duplicate
    assert result.is_duplicate is False

def test_different_issue_within_50m_not_blindly_merged(db_session):
    # 20m from UG-1001, but completely different issue: Garbage Overflow
    lat_near = 13.1076
    lng_near = 80.2934
    
    result = evaluate_duplicate_candidates(
        db=db_session,
        latitude=lat_near,
        longitude=lng_near,
        category="Garbage Overflow",
        description="Littered plastic bottles and trash bin overflow",
        ai_keywords=["garbage", "trash", "sanitation"]
    )
    
    # Must NOT merge pothole with garbage
    assert result.is_duplicate is False

def test_ward_auto_assignment():
    ward_chennai = assign_ward_from_coordinates(13.0827, 80.2707)
    assert ward_chennai["city"] == "Chennai"
    
    ward_ramnad = assign_ward_from_coordinates(9.3639, 78.8395)
    assert ward_ramnad["city"] == "Ramanathapuram"

def test_jwt_and_password_security():
    pwd = "SecurePassword@2026"
    hashed = get_password_hash(pwd)
    assert verify_password(pwd, hashed) is True
    assert verify_password("WrongPassword", hashed) is False
    
    token = create_access_token({"sub": "42", "role": "OFFICER"})
    payload = decode_access_token(token)
    assert payload["sub"] == "42"
    assert payload["role"] == "OFFICER"
