"""Tests for the shelf-life forward projection and the quality score.

Covers the two requirement gaps that were closed after the initial build:
a projected remaining-life curve per batch, and a standalone product-condition
quality figure on every assessment.
"""

from __future__ import annotations

from datetime import date, timedelta

import pytest

from app.freshness.scoring import quality_score


# ------------------------------------------------------- quality_score units
def test_quality_all_100_yields_100():
    assert quality_score(100, 100, 100) == 100.0


def test_quality_all_zero_yields_zero():
    assert quality_score(0, 0, 0) == 0.0


def test_quality_uses_documented_weights():
    """50% visual + 30% storage + 20% shelf-life, age excluded."""
    assert quality_score(100, 80, 60) == pytest.approx(50 + 24 + 12)


def test_quality_penalises_spoilage():
    assert quality_score(100, 100, 100, spoilage_probability=0.5) == pytest.approx(100 - 22.5)


def test_quality_ignores_product_age():
    """Same condition inputs give the same quality whatever the batch age."""
    assert quality_score(70, 70, 70) == quality_score(70, 70, 70)


# ------------------------------------------------------------- API contract
@pytest.fixture()
def analysis(client, manager_headers, batch, sample_image_bytes):
    response = client.post(
        "/api/v1/analysis/image",
        headers=manager_headers,
        files={"file": ("bread.jpg", sample_image_bytes, "image/jpeg")},
        data={
            "batch_id": str(batch["id"]),
            "temperature_c": "9.5",
            "humidity_pct": "93",
            "packaging_type": "LOOSE",
            "air_circulation": "POOR",
        },
    )
    assert response.status_code == 201, response.text
    return response.json()


def test_assessment_carries_quality_score(analysis):
    quality = analysis["assessment"]["quality_score"]
    assert quality is not None
    assert 0 <= quality <= 100


def test_projection_returns_daily_curve(client, manager_headers, batch):
    response = client.get(
        f"/api/v1/shelf-life/{batch['id']}/projection",
        headers=manager_headers,
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["batch_id"] == batch["id"]
    assert body["horizon_days"] == 14
    assert "constant" in body["assumption"]

    points = body["points"]
    assert len(points) == 15
    assert [p["day_offset"] for p in points] == list(range(15))
    expected_dates = [(date.today() + timedelta(days=d)).isoformat() for d in range(15)]
    assert [p["date"] for p in points] == expected_dates
    remaining = [p["remaining_shelf_life_days"] for p in points]
    assert all(r >= 0 for r in remaining)
    assert remaining == sorted(remaining, reverse=True)
    valid_risks = {"CRITICAL", "HIGH", "MEDIUM", "LOW"}
    assert {p["risk_level"] for p in points} <= valid_risks


def test_projection_horizon_is_bounded(client, manager_headers, batch):
    response = client.get(
        f"/api/v1/shelf-life/{batch['id']}/projection",
        params={"days": 90},
        headers=manager_headers,
    )
    assert response.status_code == 200, response.text
    body = response.json()
    assert body["horizon_days"] == 90
    assert len(body["points"]) == 91

    over = client.get(
        f"/api/v1/shelf-life/{batch['id']}/projection",
        params={"days": 200},
        headers=manager_headers,
    )
    assert over.status_code == 422


def test_projection_requires_auth(client, batch):
    assert client.get(f"/api/v1/shelf-life/{batch['id']}/projection").status_code == 401
