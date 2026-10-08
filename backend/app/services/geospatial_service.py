import math
import httpx
import logging
from typing import Tuple, Optional, Dict

logger = logging.getLogger("urbangrid.geospatial")

# Earth radius in meters (WGS-84 mean radius)
EARTH_RADIUS_METERS = 6371000.0

def haversine_distance_meters(lat1: float, lon1: float, lat2: float, lon2: float) -> float:
    """
    Computes exact great-circle distance between two points on Earth in meters.
    Formula:
        dlat = lat2 - lat1
        dlon = lon2 - lon1
        a = sin^2(dlat/2) + cos(lat1) * cos(lat2) * sin^2(dlon/2)
        c = 2 * atan2(sqrt(a), sqrt(1-a))
        d = R * c
    """
    phi1 = math.radians(lat1)
    phi2 = math.radians(lat2)
    delta_phi = math.radians(lat2 - lat1)
    delta_lambda = math.radians(lon2 - lon1)

    a = (math.sin(delta_phi / 2.0) ** 2 +
         math.cos(phi1) * math.cos(phi2) * (math.sin(delta_lambda / 2.0) ** 2))
    
    # Clamp to avoid floating point precision edge cases
    a = min(1.0, max(0.0, a))
    c = 2.0 * math.atan2(math.sqrt(a), math.sqrt(1.0 - a))
    return EARTH_RADIUS_METERS * c

# Realistic Tamil Nadu City and Ward Center points
TAMIL_NADU_WARDS = [
    # Chennai City Wards
    {"ward_number": 12, "city": "Chennai", "name": "Royapuram - Zone 5", "lat": 13.1075, "lng": 80.2934, "officer": "R. Selvakumar", "phone": "+91 94441 23412"},
    {"ward_number": 114, "city": "Chennai", "name": "Anna Nagar - Zone 8", "lat": 13.0850, "lng": 80.2101, "officer": "K. Meenakshi", "phone": "+91 94441 23114"},
    {"ward_number": 124, "city": "Chennai", "name": "Mylapore - Zone 9", "lat": 13.0368, "lng": 80.2676, "officer": "S. Murugan", "phone": "+91 94441 23124"},
    {"ward_number": 130, "city": "Chennai", "name": "T. Nagar - Zone 10", "lat": 13.0418, "lng": 80.2341, "officer": "A. Jayakumar", "phone": "+91 94441 23130"},
    {"ward_number": 155, "city": "Chennai", "name": "Adyar - Zone 13", "lat": 13.0012, "lng": 80.2565, "officer": "T. Sangeetha", "phone": "+91 94441 23155"},
    {"ward_number": 173, "city": "Chennai", "name": "Velachery - Zone 13", "lat": 12.9815, "lng": 80.2180, "officer": "M. Karthikeyan", "phone": "+91 94441 23173"},
    {"ward_number": 180, "city": "Chennai", "name": "Thiruvanmiyur - Zone 14", "lat": 12.9830, "lng": 80.2594, "officer": "V. Soundararajan", "phone": "+91 94441 23180"},
    
    # Tambaram City Corporation
    {"ward_number": 32, "city": "Tambaram", "name": "Tambaram Sanatorium Ward 32", "lat": 12.9345, "lng": 80.1250, "officer": "G. Prabhakaran", "phone": "+91 94442 32032"},
    {"ward_number": 45, "city": "Tambaram", "name": "Chromepet Ward 45", "lat": 12.9516, "lng": 80.1462, "officer": "D. Anitha", "phone": "+91 94442 32045"},
    
    # Ramanathapuram Municipality
    {"ward_number": 7, "city": "Ramanathapuram", "name": "Kenikarai Ward 7", "lat": 9.3639, "lng": 78.8395, "officer": "P. Ramachandran", "phone": "+91 94431 07007"},
    {"ward_number": 15, "city": "Ramanathapuram", "name": "Bazaar Ward 15", "lat": 9.3712, "lng": 78.8308, "officer": "C. Vijayalakshmi", "phone": "+91 94431 07015"},
    
    # Coimbatore City Corporation
    {"ward_number": 22, "city": "Coimbatore", "name": "Gandhipuram Ward 22", "lat": 11.0168, "lng": 76.9680, "officer": "B. Natarajan", "phone": "+91 94432 22022"},
    {"ward_number": 68, "city": "Coimbatore", "name": "RS Puram Ward 68", "lat": 11.0085, "lng": 76.9510, "officer": "E. Subhashini", "phone": "+91 94432 68068"},
]

def assign_ward_from_coordinates(lat: float, lng: float) -> Dict:
    """
    Finds closest municipal ward for coordinates.
    Returns ward details including city and ward_number.
    """
    closest_ward = None
    min_dist = float("inf")
    
    for ward in TAMIL_NADU_WARDS:
        dist = haversine_distance_meters(lat, lng, ward["lat"], ward["lng"])
        if dist < min_dist:
            min_dist = dist
            closest_ward = ward
            
    if closest_ward and min_dist < 35000:  # within 35 km
        return closest_ward
        
    # Default fallback: determine based on general latitude
    if lat > 12.5:
        # Greater Chennai / Tambaram region
        ward_num = ((int(abs(lat * 1000)) % 150) + 1)
        return {
            "ward_number": ward_num,
            "city": "Chennai",
            "name": f"Greater Chennai Corporation - Ward {ward_num}",
            "officer": "Corporation Officer",
            "phone": "+91 94440 00000"
        }
    elif lat < 10.0:
        # Southern TN (Ramanathapuram / Madurai region)
        ward_num = ((int(abs(lng * 1000)) % 30) + 1)
        return {
            "ward_number": ward_num,
            "city": "Ramanathapuram",
            "name": f"Ramanathapuram Municipality - Ward {ward_num}",
            "officer": "Municipal Officer",
            "phone": "+91 94430 00000"
        }
    else:
        ward_num = ((int(abs(lat * 1000)) % 100) + 1)
        return {
            "ward_number": ward_num,
            "city": "Tamil Nadu Municipal Corporation",
            "name": f"Municipal Zone - Ward {ward_num}",
            "officer": "Zonal Officer",
            "phone": "+91 94420 00000"
        }

async def reverse_geocode_location(lat: float, lng: float) -> str:
    """
    Reverse geocodes coordinates to a human-readable Tamil Nadu address.
    Uses Nominatim OpenStreetMap with timeout + local fallback.
    """
    # Quick check for known landmarks
    for ward in TAMIL_NADU_WARDS:
        if haversine_distance_meters(lat, lng, ward["lat"], ward["lng"]) < 200:
            return f"Near {ward['name']}, {ward['city']}, Tamil Nadu"
            
    try:
        url = f"https://nominatim.openstreetmap.org/reverse?format=jsonv2&lat={lat}&lon={lng}"
        headers = {"User-Agent": "UrbanGrid-CivicOperations/1.0"}
        async with httpx.AsyncClient(timeout=2.5) as client:
            resp = await client.get(url, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                display_name = data.get("display_name")
                if display_name:
                    # Keep concise: take first 3 segments
                    parts = [p.strip() for p in display_name.split(",")]
                    return ", ".join(parts[:4])
    except Exception as e:
        logger.debug(f"Reverse geocode external request skipped: {e}")
        
    ward_info = assign_ward_from_coordinates(lat, lng)
    return f"Coordinates ({lat:.4f}, {lng:.4f}), {ward_info['name']}, {ward_info['city']}, Tamil Nadu"

async def search_places_geocoding(query: str):
    """
    Real geocoding search using Nominatim OpenStreetMap with fallback to Tamil Nadu landmarks.
    Enables citizens to search any location across Tamil Nadu e.g. "Ramanathapuram Bus Stand".
    """
    results = []
    q = (query or "").strip()
    if not q or len(q) < 2:
        return results

    try:
        search_query = q if ("tamil nadu" in q.lower() or "chennai" in q.lower()) else f"{q}, Tamil Nadu, India"
        url = "https://nominatim.openstreetmap.org/search"
        params = {
            "q": search_query,
            "format": "jsonv2",
            "limit": 6,
            "addressdetails": 1
        }
        headers = {"User-Agent": "UrbanGrid-CivicOperations/1.0"}
        async with httpx.AsyncClient(timeout=3.0) as client:
            resp = await client.get(url, params=params, headers=headers)
            if resp.status_code == 200:
                data = resp.json()
                for item in data:
                    lt = float(item["lat"])
                    ln = float(item["lon"])
                    disp = item.get("display_name", q)
                    results.append({
                        "name": disp,
                        "display_name": disp,
                        "lat": lt,
                        "lng": ln,
                        "latitude": lt,
                        "longitude": ln,
                        "type": item.get("type", "locality")
                    })
    except Exception as e:
        logger.debug(f"Nominatim geocoding search failed: {e}")

    # Fallback to local Tamil Nadu municipal landmarks
    if not results:
        q_lower = q.lower()
        for w in TAMIL_NADU_WARDS:
            if (q_lower in w["name"].lower() or 
                q_lower in w["city"].lower() or 
                q_lower in w.get("zone_name", "").lower()):
                disp = f"{w['name']}, {w['city']}, Tamil Nadu"
                results.append({
                    "name": disp,
                    "display_name": disp,
                    "lat": w["lat"],
                    "lng": w["lng"],
                    "latitude": w["lat"],
                    "longitude": w["lng"],
                    "type": "ward"
                })

    return results
