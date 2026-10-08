from ..models.models import PriorityLevel, SeverityLevel

SEVERITY_ORDER = ["LOW", "MEDIUM", "HIGH", "CRITICAL"]

def calculate_priority(base_severity: str, report_count: int, recurrence_count: int = 0) -> str:
    """
    Computes aggregated civic priority.
    Multiple citizen reports for the same physical issue escalate municipal urgency.
    """
    severity_upper = (base_severity or "MEDIUM").upper()
    if severity_upper not in SEVERITY_ORDER:
        severity_upper = "MEDIUM"
        
    idx = SEVERITY_ORDER.index(severity_upper)
    
    # Escalation steps based on citizen report density
    if report_count >= 5:
        idx += 2
    elif report_count >= 2:
        idx += 1
        
    # Escalation if recurring issue
    if recurrence_count > 0:
        idx += 1
        
    # Clamp to maximum CRITICAL
    final_idx = min(len(SEVERITY_ORDER) - 1, idx)
    return SEVERITY_ORDER[final_idx]
