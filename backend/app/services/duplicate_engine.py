import re
import logging
from typing import List, Dict, Any, Optional, Tuple
from sqlalchemy.orm import Session
from sqlalchemy import text

from ..core.config import settings
from ..models.models import Complaint, ComplaintStatus, SystemSetting, DuplicateMatch
from .geospatial_service import haversine_distance_meters

logger = logging.getLogger("urbangrid.duplicate_engine")

def get_active_duplicate_radius(db: Session) -> float:
    """Retrieves current active duplicate radius from settings (Challenge default: 50.0m)"""
    setting = db.query(SystemSetting).filter(SystemSetting.key == "duplicate_radius_meters").first()
    if setting:
        try:
            return float(setting.value)
        except ValueError:
            pass
    return settings.DEFAULT_DUPLICATE_RADIUS_METERS

def calculate_text_similarity(text1: str, text2: str) -> float:
    """Computes normalized Jaccard word-token similarity between two descriptions (0.0 to 100.0)"""
    tokens1 = set(re.findall(r'\b[a-z]{3,}\b', (text1 or '').lower()))
    tokens2 = set(re.findall(r'\b[a-z]{3,}\b', (text2 or '').lower()))
    
    if not tokens1 or not tokens2:
        return 30.0  # neutral baseline if brief
        
    intersection = tokens1.intersection(tokens2)
    union = tokens1.union(tokens2)
    jaccard = len(intersection) / len(union) if union else 0.0
    return round(jaccard * 100.0, 2)

def calculate_visual_similarity(
    category1: str,
    category2: str,
    keywords1: List[str],
    keywords2: List[str]
) -> float:
    """
    Computes visual evidence similarity based on AI multimodal analysis and visual features.
    Score: 0.0 to 100.0
    """
    cat1 = (category1 or "").lower().strip()
    cat2 = (category2 or "").lower().strip()
    
    score = 0.0
    if cat1 == cat2:
        score += 60.0
    elif (("road" in cat1 or "pothole" in cat1) and ("road" in cat2 or "pothole" in cat2)) or \
         (("drain" in cat1 or "sewage" in cat1 or "water" in cat1) and ("drain" in cat2 or "sewage" in cat2 or "water" in cat2)):
        score += 35.0
        
    # Keyword overlap
    k1 = set([k.lower().strip() for k in (keywords1 or [])])
    k2 = set([k.lower().strip() for k in (keywords2 or [])])
    if k1 and k2:
        overlap = len(k1.intersection(k2))
        score += min(40.0, overlap * 15.0)
    else:
        score += 25.0
        
    return min(100.0, score)

class DuplicateCheckResult:
    def __init__(
        self,
        is_duplicate: bool,
        matched_complaint: Optional[Complaint],
        distance_meters: float,
        final_score: float,
        breakdown: Dict[str, float],
        decision: str,
        radius_used: float,
        is_recurring_candidate: bool = False
    ):
        self.is_duplicate = is_duplicate
        self.matched_complaint = matched_complaint
        self.distance_meters = round(distance_meters, 2)
        self.final_score = round(final_score, 1)
        self.breakdown = breakdown
        self.decision = decision
        self.radius_used = radius_used
        self.is_recurring_candidate = is_recurring_candidate

def evaluate_duplicate_candidates(
    db: Session,
    latitude: float,
    longitude: float,
    category: str,
    description: str,
    ai_keywords: List[str] = None
) -> DuplicateCheckResult:
    """
    Core Multi-Signal Spatial & AI Deduplication Engine.
    
    HARD RULE:
    Distance outside the active configured radius (default 50m) CANNOT be treated as duplicate.
    
    Within radius:
      Spatial Proximity: 30%
      Visual Evidence:   40%
      Description Text:  20%
      Category Match:    10%
    """
    active_radius = get_active_duplicate_radius(db)
    ai_keywords = ai_keywords or []
    
    # Query all non-rejected complaints in the vicinity (approx bounding box for speed)
    # 0.01 deg is approx 1.1 km
    lat_delta = (active_radius / 111000.0) * 1.5
    lng_delta = (active_radius / (111000.0 * 0.9)) * 1.5
    
    nearby_complaints = db.query(Complaint).filter(
        Complaint.status != ComplaintStatus.REJECTED.value,
        Complaint.latitude.between(latitude - lat_delta, latitude + lat_delta),
        Complaint.longitude.between(longitude - lng_delta, longitude + lng_delta)
    ).all()
    
    best_match = None
    best_score = 0.0
    best_dist = float("inf")
    best_breakdown = {}
    recurring_candidate = None
    recurring_dist = float("inf")

    for candidate in nearby_complaints:
        dist = haversine_distance_meters(latitude, longitude, candidate.latitude, candidate.longitude)
        
        # Check resolved complaints for recurring/reopened logic
        if candidate.status == ComplaintStatus.RESOLVED.value:
            if dist <= active_radius:
                if dist < recurring_dist:
                    recurring_dist = dist
                    recurring_candidate = candidate
            continue

        # Active complaints duplicate logic
        # HARD RULE: Distance outside active radius => NOT DUPLICATE
        if dist > active_radius:
            continue
            
        # 1. Spatial proximity score (30% weight)
        # Closer to 0m = 100%, near radius = lower
        spatial_score = max(0.0, (1.0 - (dist / active_radius)) * 100.0)
        
        # 2. Visual evidence score (40% weight)
        candidate_keywords = []
        if candidate.ai_analyses:
            candidate_keywords = candidate.ai_analyses[0].keywords or []
        visual_score = calculate_visual_similarity(category, candidate.category, ai_keywords, candidate_keywords)
        
        # 3. Description text score (20% weight)
        text_score = calculate_text_similarity(description, candidate.description)
        
        # 4. Category match score (10% weight)
        if category.lower() == candidate.category.lower():
            category_score = 100.0
        elif (("road" in category.lower() or "pothole" in category.lower()) and 
              ("road" in candidate.category.lower() or "pothole" in candidate.category.lower())):
            category_score = 70.0
        else:
            category_score = 0.0

        # Weighted final duplicate score
        final_score = (
            (spatial_score * 0.30) +
            (visual_score * 0.40) +
            (text_score * 0.20) +
            (category_score * 0.10)
        )
        
        if final_score > best_score:
            best_score = final_score
            best_match = candidate
            best_dist = dist
            best_breakdown = {
                "distance_meters": round(dist, 2),
                "spatial_score": round(spatial_score, 1),
                "visual_score": round(visual_score, 1),
                "text_score": round(text_score, 1),
                "category_score": round(category_score, 1),
                "final_duplicate_score": round(final_score, 1)
            }

    # Threshold: Must be within radius and score >= 55.0%
    if best_match and best_score >= 55.0:
        logger.info(
            f"[DUPLICATE DETECTED] Matched Ticket: {best_match.ticket_number}, "
            f"Dist: {best_dist:.2f}m <= {active_radius}m, Score: {best_score:.1f}%"
        )
        return DuplicateCheckResult(
            is_duplicate=True,
            matched_complaint=best_match,
            distance_meters=best_dist,
            final_score=best_score,
            breakdown=best_breakdown,
            decision="DUPLICATE",
            radius_used=active_radius
        )
    
    # If no active duplicate found, check if past resolved issue is present within 50m
    if recurring_candidate:
        logger.info(
            f"[RECURRING CANDIDATE DETECTED] Resolved Ticket: {recurring_candidate.ticket_number}, "
            f"Dist: {recurring_dist:.2f}m <= {active_radius}m"
        )
        return DuplicateCheckResult(
            is_duplicate=False,
            matched_complaint=recurring_candidate,
            distance_meters=recurring_dist,
            final_score=0.0,
            breakdown={"distance_meters": round(recurring_dist, 2)},
            decision="RECURRING_CANDIDATE",
            radius_used=active_radius,
            is_recurring_candidate=True
        )

    # Distinct complaint
    return DuplicateCheckResult(
        is_duplicate=False,
        matched_complaint=None,
        distance_meters=0.0,
        final_score=0.0,
        breakdown={},
        decision="DISTINCT",
        radius_used=active_radius
    )
