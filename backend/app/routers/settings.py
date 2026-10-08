from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from ..core.database import get_db
from ..core.security import require_officer_or_admin, get_optional_user
from ..models.models import SystemSetting, User
from ..schemas.schemas import SettingOut, SettingUpdate

router = APIRouter(prefix="/api/settings", tags=["System Settings"])

@router.get("", response_model=list[SettingOut])
def get_settings(db: Session = Depends(get_db)):
    settings_list = db.query(SystemSetting).all()
    # Ensure duplicate_radius_meters exists
    radius_setting = db.query(SystemSetting).filter(SystemSetting.key == "duplicate_radius_meters").first()
    if not radius_setting:
        radius_setting = SystemSetting(
            key="duplicate_radius_meters",
            value="50.0",
            description="Challenge Default Active Spatial Deduplication Radius (50m default)"
        )
        db.add(radius_setting)
        db.commit()
        db.refresh(radius_setting)
        settings_list = db.query(SystemSetting).all()
    return settings_list

@router.patch("/duplicate-radius", response_model=SettingOut)
def update_duplicate_radius(
    req: SettingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(require_officer_or_admin)
):
    try:
        val = float(req.value)
        if val <= 0 or val > 50000:
            raise ValueError("Radius must be between 1 and 50000 meters")
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
        
    setting = db.query(SystemSetting).filter(SystemSetting.key == "duplicate_radius_meters").first()
    if not setting:
        setting = SystemSetting(
            key="duplicate_radius_meters",
            value=str(val),
            description="Challenge Default Active Spatial Deduplication Radius (50m default)"
        )
        db.add(setting)
    else:
        setting.value = str(val)
        
    db.commit()
    db.refresh(setting)
    return setting
