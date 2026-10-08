import logging
from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker, declarative_base
from .config import settings

logger = logging.getLogger("urbangrid.db")

# Handle Render / cloud PostgreSQL URLs that start with postgres://
db_url = settings.DATABASE_URL
if db_url.startswith("postgres://"):
    db_url = db_url.replace("postgres://", "postgresql+psycopg://", 1)
elif db_url.startswith("postgresql://") and not db_url.startswith("postgresql+psycopg://"):
    db_url = db_url.replace("postgresql://", "postgresql+psycopg://", 1)

engine = create_engine(
    db_url,
    pool_pre_ping=True,
    pool_size=10,
    max_overflow=20,
    connect_args={"client_encoding": "utf8"}
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)
Base = declarative_base()

def get_db():
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initializes tables and PostgreSQL spatial functions"""
    try:
        with engine.connect() as conn:
            # Try enabling postgis if available
            try:
                conn.execute(text("CREATE EXTENSION IF NOT EXISTS postgis;"))
                conn.commit()
                logger.info("PostGIS extension enabled.")
            except Exception as e:
                logger.info(f"PostGIS extension not found ({e}). Initializing native spherical geodesic function.")
                conn.rollback()

            # Always ensure high-precision spherical distance function exists
            conn.execute(text("""
                CREATE OR REPLACE FUNCTION urbangrid_distance_meters(
                    lat1 double precision, lon1 double precision,
                    lat2 double precision, lon2 double precision
                )
                RETURNS double precision AS $$
                DECLARE
                    r double precision := 6371000.0; -- Earth radius in meters
                    phi1 double precision := radians(lat1);
                    phi2 double precision := radians(lat2);
                    delta_phi double precision := radians(lat2 - lat1);
                    delta_lambda double precision := radians(lon2 - lon1);
                    a double precision;
                    c double precision;
                BEGIN
                    a := sin(delta_phi / 2.0)^2 + cos(phi1) * cos(phi2) * sin(delta_lambda / 2.0)^2;
                    c := 2.0 * atan2(sqrt(a), sqrt(GREATEST(0.0, 1.0 - a)));
                    RETURN r * c;
                END;
                $$ LANGUAGE plpgsql IMMUTABLE;
            """))
            conn.commit()
            
            # Create all ORM tables
            Base.metadata.create_all(bind=engine)
            logger.info("Database schema initialized successfully.")
    except Exception as ex:
        logger.error(f"Error initializing database: {ex}")
        raise ex
