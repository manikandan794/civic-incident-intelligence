from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from datetime import timedelta

from sqlalchemy import or_
from ..core.database import get_db
from ..core.security import get_password_hash, verify_password, create_access_token, get_current_user
from ..core.config import settings
from ..models.models import User, UserRole, Worker
from ..schemas.schemas import UserCreate, UserLogin, UserOut, Token

router = APIRouter(prefix="/api/auth", tags=["Authentication"])

@router.post("/register", response_model=Token)
def register(user_in: UserCreate, db: Session = Depends(get_db)):
    existing = db.query(User).filter(User.email == user_in.email).first()
    if existing:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="A user with this email already exists"
        )
    
    role = user_in.role.upper() if user_in.role else "CITIZEN"
    if role not in [r.value for r in UserRole]:
        role = "CITIZEN"
        
    user = User(
        email=user_in.email,
        full_name=user_in.full_name,
        phone=user_in.phone,
        password_hash=get_password_hash(user_in.password),
        role=role,
        is_active=True
    )
    db.add(user)
    db.commit()
    db.refresh(user)
    
    token = create_access_token({"sub": str(user.id), "role": user.role, "email": user.email})
    return Token(access_token=token, user=UserOut.model_validate(user))

@router.post("/login", response_model=Token)
def login(user_in: UserLogin, db: Session = Depends(get_db)):
    search_ident = (user_in.username or user_in.email or user_in.email_or_username or "").strip().lower()
    user = db.query(User).filter(
        or_(
            User.email.ilike(search_ident),
            User.email.ilike(f"{search_ident}@worker.urbangrid.gov.in"),
            User.email.ilike(f"{search_ident}@urbangrid.gov.in")
        )
    ).first()
    if not user:
        worker = db.query(Worker).filter(Worker.username.ilike(search_ident)).first()
        if worker and worker.user:
            user = worker.user

    if not user or not verify_password(user_in.password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect email or password",
            headers={"WWW-Authenticate": "Bearer"},
        )
    if not user.is_active:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Account has been disabled"
        )
        
    token = create_access_token({"sub": str(user.id), "role": user.role, "email": user.email})
    return Token(access_token=token, user=UserOut.model_validate(user))

@router.get("/me", response_model=UserOut)
def get_me(current_user: User = Depends(get_current_user)):
    return UserOut.model_validate(current_user)
