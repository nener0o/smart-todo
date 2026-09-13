import os

os.environ["SMART_TODO_DATABASE_URL"] = "sqlite://"
os.environ["SMART_TODO_SECRET_KEY"] = "test-secret-key-that-is-long-enough-for-hs256-0123"

import pytest  # noqa: E402
from fastapi.testclient import TestClient  # noqa: E402
from sqlalchemy import create_engine  # noqa: E402
from sqlalchemy.orm import sessionmaker  # noqa: E402
from sqlalchemy.pool import StaticPool  # noqa: E402

from app import database  # noqa: E402
from app.main import app  # noqa: E402

engine = create_engine("sqlite://", connect_args={"check_same_thread": False}, poolclass=StaticPool)
TestingSession = sessionmaker(bind=engine, autoflush=False, autocommit=False)


def _override_get_db():
    db = TestingSession()
    try:
        yield db
    finally:
        db.close()


app.dependency_overrides[database.get_db] = _override_get_db


@pytest.fixture(autouse=True)
def _fresh_schema():
    database.Base.metadata.drop_all(bind=engine)
    database.Base.metadata.create_all(bind=engine)
    yield


@pytest.fixture
def client():
    with TestClient(app) as c:
        yield c


@pytest.fixture
def auth_client(client):
    resp = client.post(
        "/api/auth/register",
        json={"email": "student@example.com", "name": "Студент", "password": "secret123"},
    )
    assert resp.status_code == 201, resp.text
    token = resp.json()["access_token"]
    client.headers.update({"Authorization": f"Bearer {token}"})
    return client
