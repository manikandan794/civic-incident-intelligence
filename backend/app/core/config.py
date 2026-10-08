import os
from pydantic_settings import BaseSettings
from typing import List

class Settings(BaseSettings):
    PROJECT_NAME: str = "URBANGRID Civic Operations Platform"
    ENVIRONMENT: str = "development"
    PORT: int = 8000
    HOST: str = "0.0.0.0"
    
    # Database
    DATABASE_URL: str = "postgresql+psycopg://postgres@127.0.0.1:5432/urbangrid"
    
    # Security
    JWT_SECRET: str = "urbangrid-super-secret-jwt-key-competition-2026-production"
    JWT_ALGORITHM: str = "HS256"
    ACCESS_TOKEN_EXPIRE_MINUTES: int = 1440  # 24 hours
    
    # Gemini Multimodal AI (Server-side ONLY)
    GEMINI_API_KEY: str = ""
    GEMINI_MODEL: str = "gemini-2.5-flash"
    
    # Challenge default duplicate detection radius (MUST BE 50 METERS)
    DEFAULT_DUPLICATE_RADIUS_METERS: float = 50.0
    
    # Tamil Nadu defaults
    TAMIL_NADU_CENTER_LAT: float = 13.0827
    TAMIL_NADU_CENTER_LNG: float = 80.2707
    
    # CORS & Deployment
    CORS_ORIGINS: str = "*"
    FRONTEND_URL: str = ""
    
    # File uploads
    UPLOAD_DIR: str = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "..", "uploads"))
    MAX_FILE_SIZE_BYTES: int = 50 * 1024 * 1024  # 50MB
    
    class Config:
        env_file = ".env"
        extra = "ignore"

settings = Settings()
os.makedirs(settings.UPLOAD_DIR, exist_ok=True)
