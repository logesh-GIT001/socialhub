import pytest
from sqlalchemy import create_engine
from sqlalchemy.orm import sessionmaker
from sqlalchemy.pool import StaticPool
from fastapi.testclient import TestClient

from app.core.database import Base, get_db
import app.core.database as db_module
import app.tasks.publish_task as publish_task
import app.main as main_module
from app.models.all import User  # This registers all models with Base.metadata
from app.core.seed import seed_database
from app.main import app

# Create in-memory SQLite database engine for testing with StaticPool (retains data across connections)
SQLALCHEMY_DATABASE_URL = "sqlite:///:memory:"
test_engine = create_engine(
    SQLALCHEMY_DATABASE_URL,
    connect_args={"check_same_thread": False},
    poolclass=StaticPool,
)
TestingSessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=test_engine)

# Override references in all modules
db_module.SessionLocal = TestingSessionLocal
db_module.engine = test_engine
publish_task.SessionLocal = TestingSessionLocal
main_module.SessionLocal = TestingSessionLocal


@pytest.fixture(scope="function")
def db():
    """Provides a clean database session per test, running migrations and seeds."""
    Base.metadata.create_all(bind=test_engine)
    session = TestingSessionLocal()
    try:
        seed_database(session)
        yield session
    finally:
        session.close()
        Base.metadata.drop_all(bind=test_engine)


@pytest.fixture(scope="function")
def client(db):
    """Provides a FastAPI test client with database overrides."""
    def override_get_db():
        try:
            yield db
        finally:
            pass
            
    app.dependency_overrides[get_db] = override_get_db
    with TestClient(app) as test_client:
        yield test_client
    app.dependency_overrides.clear()
