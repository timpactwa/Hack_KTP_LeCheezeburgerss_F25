"""Integration tests for auth + routing flows using the fallback logic."""

from __future__ import annotations

import os
import tempfile

import pytest

# Ensure each test run gets its own SQLite DB before importing app modules
TEMP_DB = tempfile.NamedTemporaryFile(delete=False)
os.environ.setdefault("DATABASE_URL", f"sqlite:///{TEMP_DB.name}")
os.environ.setdefault("JWT_SECRET_KEY", "test-secret")

from backend.app import create_app  # noqa: E402


@pytest.fixture(scope="module")
def client():
    app = create_app()
    app.config.update(TESTING=True)
    with app.test_client() as test_client:
        yield test_client


def test_register_and_login(client):
    register_resp = client.post(
        "/register",
        json={"email": "tester@example.com", "password": "StrongPass123", "phone": "+15555550000"},
    )
    assert register_resp.status_code == 200
    data = register_resp.get_json()
    assert "token" in data

    login_resp = client.post("/login", json={"email": "tester@example.com", "password": "StrongPass123"})
    assert login_resp.status_code == 200
    login_data = login_resp.get_json()
    assert login_data["user"]["email"] == "tester@example.com"


def test_safe_route_fallback(client):
    payload = {
        "start": {"lat": 40.73, "lng": -74.0},
        "end": {"lat": 40.71, "lng": -73.99},
    }
    resp = client.post("/safe-route", json=payload)
    assert resp.status_code == 200
    data = resp.get_json()
    assert data["shortest"]["geometry"]["type"] == "LineString"
    assert data["safest"]["geometry"]["type"] == "LineString"


def test_panic_alert_requires_auth(client):
    login_resp = client.post("/login", json={"email": "tester@example.com", "password": "StrongPass123"})
    token = login_resp.get_json()["token"]
    panic_resp = client.post(
        "/panic-alert",
        json={"lat": 40.73, "lng": -74.0},
        headers={"Authorization": f"Bearer {token}"},
    )
    assert panic_resp.status_code == 200
    assert panic_resp.get_json()["status"] in {"sent", "simulated"}
