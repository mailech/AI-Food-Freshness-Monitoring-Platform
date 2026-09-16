"""End-to-end workflow tests through the HTTP API."""

from __future__ import annotations

from datetime import date, timedelta

import pytest


# --------------------------------------------------------------- analysis
@pytest.fixture()
def analysis(client, manager_headers, batch, sample_image_bytes):
    """Run one full analysis and return the response body."""
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


def test_analysis_returns_the_full_result_contract(analysis):
    assessment = analysis["assessment"]

    assert 0 <= assessment["freshness_score"] <= 100
    assert assessment["freshness_category"] in {
        "FRESH", "GOOD", "ACCEPTABLE", "NEAR_SPOILAGE", "SPOILED"
    }
    assert 0 <= assessment["confidence"] <= 1
    assert assessment["spoilage_probability"] is not None
    assert assessment["overall_health_score"] is not None
    assert assessment["processing_ms"] >= 0
    assert analysis["shelf_life"] is not None
    assert isinstance(analysis["recommendations"], list)


def test_analysis_stores_all_four_component_scores(analysis):
    components = analysis["assessment"]["components"]
    assert set(components) == {"visual", "storage", "shelf_life", "product_age"}
    for key, value in components.items():
        assert value is not None, key
        assert 0 <= value <= 100


def test_stored_score_equals_the_weighted_recomputation(analysis):
    assessment = analysis["assessment"]
    components = assessment["components"]
    weights = assessment["weights_used"]

    assert weights == {"visual": 0.4, "storage": 0.25, "shelf_life": 0.2, "product_age": 0.15}
    recomputed = sum(components[key] * weights[key] for key in weights)
    assert recomputed == pytest.approx(assessment["freshness_score"], abs=0.05)


def test_analysis_is_labelled_as_a_demo_baseline(analysis):
    assert analysis["assessment"]["model"]["is_demo"] is True
    assert "Demo" in analysis["analysis_label"]
    assert "AI estimate" in analysis["disclaimer"]
    assert "not a laboratory measurement" in analysis["disclaimer"]


def test_analysis_records_the_inputs_it_used(analysis):
    inputs = analysis["assessment"]["inputs"]
    assert inputs["temperature_c"] == pytest.approx(9.5)
    assert inputs["humidity_pct"] == pytest.approx(93.0)
    assert inputs["storage_duration_days"] is not None
    assert inputs["product_age_days"] is not None


def test_analysis_produces_indicators_and_an_explanation(analysis):
    assessment = analysis["assessment"]
    assert len(assessment["indicators"]) >= 5
    assert assessment["detected_indicators"]
    explanation = assessment["explanation"]
    assert explanation["final_category"] == assessment["freshness_category"]
    assert len(explanation["components"]) == 4
    assert explanation["feature_summary"]["color"]["score"] is not None
    assert explanation["pipeline_steps"]


def test_analysis_generates_a_visual_overlay(analysis):
    assert analysis["assessment"]["overlay_url"]
    assert analysis["assessment"]["image_url"]


def test_analysis_updates_the_batch_summary(client, manager_headers, batch, analysis):
    response = client.get(f"/api/v1/batches/{batch['id']}", headers=manager_headers)
    body = response.json()
    assert body["current_freshness_score"] is not None
    assert body["current_freshness_category"] is not None
    assert body["remaining_shelf_life_days"] is not None
    assert body["predicted_expiry_date"] is not None
    assert body["last_assessed_at"] is not None
    assert body["assessment_count"] >= 1


def test_stored_analysis_is_read_back_without_re_running_inference(
    client, manager_headers, analysis
):
    assessment_id = analysis["assessment"]["id"]
    first = client.get(f"/api/v1/analysis/{assessment_id}", headers=manager_headers).json()
    second = client.get(f"/api/v1/analysis/{assessment_id}", headers=manager_headers).json()
    assert first["freshness_score"] == second["freshness_score"] == analysis["assessment"]["freshness_score"]
    assert first["created_at"] == second["created_at"]


def test_analysis_requires_an_image(client, manager_headers, batch):
    response = client.post(
        "/api/v1/analysis/image", headers=manager_headers, data={"batch_id": str(batch["id"])}
    )
    assert response.status_code == 422
    assert response.json()["error"]["code"] in {"IMAGE_REQUIRED", "VALIDATION_ERROR"}


def test_analysis_rejects_a_non_image_file(client, manager_headers, batch):
    response = client.post(
        "/api/v1/analysis/image",
        headers=manager_headers,
        files={"file": ("x.jpg", b"not an image at all", "image/jpeg")},
        data={"batch_id": str(batch["id"])},
    )
    assert response.status_code == 400
    assert response.json()["error"]["code"] == "INVALID_IMAGE"


def test_warehouse_operator_cannot_create_an_analysis(
    client, auth_headers, batch, sample_image_bytes
):
    response = client.post(
        "/api/v1/analysis/image",
        headers=auth_headers["WAREHOUSE_OPERATOR"],
        files={"file": ("x.jpg", sample_image_bytes, "image/jpeg")},
        data={"batch_id": str(batch["id"])},
    )
    assert response.status_code == 403


def test_freshness_endpoint_before_and_after_analysis(
    client, manager_headers, batch, sample_image_bytes
):
    before = client.get(f"/api/v1/freshness/{batch['id']}", headers=manager_headers).json()
    assert before["assessment"] is None
    assert "No freshness assessment yet" in before["message"]

    client.post(
        "/api/v1/analysis/image",
        headers=manager_headers,
        files={"file": ("x.jpg", sample_image_bytes, "image/jpeg")},
        data={"batch_id": str(batch["id"]), "temperature_c": "4"},
    )
    after = client.get(f"/api/v1/freshness/{batch['id']}", headers=manager_headers).json()
    assert after["assessment"] is not None
    assert after["history"]


def test_freshness_trend_tracks_repeated_analyses(
    client, manager_headers, batch, sample_image_bytes, fresh_image_bytes
):
    for payload in (sample_image_bytes, fresh_image_bytes):
        client.post(
            "/api/v1/analysis/image",
            headers=manager_headers,
            files={"file": ("x.jpg", payload, "image/jpeg")},
            data={"batch_id": str(batch["id"]), "temperature_c": "4"},
        )
    trend = client.get(f"/api/v1/freshness/{batch['id']}/trend", headers=manager_headers).json()
    assert trend["assessment_count"] == 2
    assert trend["direction"] in {"improving", "declining", "stable"}
    assert trend["score_change"] is not None


# ------------------------------------------------------------- shelf life
def test_shelf_life_endpoint_computes_on_demand_then_stores(client, manager_headers, batch):
    unstored = client.get(f"/api/v1/shelf-life/{batch['id']}", headers=manager_headers).json()
    assert unstored["stored"] is False
    assert unstored["prediction"]["remaining_days"] >= 0

    refreshed = client.get(
        f"/api/v1/shelf-life/{batch['id']}?refresh=true", headers=manager_headers
    ).json()
    assert refreshed["stored"] is True
    prediction = refreshed["prediction"]
    assert prediction["predicted_expiry_date"]
    assert prediction["risk_level"]
    assert prediction["model"]["label"] == "Baseline prediction"
    assert prediction["explanation"]


# ---------------------------------------------------------------- storage
def test_storage_snapshot_reports_current_required_and_compliance(
    client, manager_headers, batch
):
    response = client.get(f"/api/v1/storage/{batch['id']}", headers=manager_headers)
    assert response.status_code == 200
    body = response.json()

    # The fixture stores fruit at 9.5 C (max 8 C) and 93% RH - non-compliant.
    assert body["compliance_status"] in {"WARNING", "NON_COMPLIANT"}
    assert body["current"]["temperature_c"] == pytest.approx(9.5)
    assert body["required"]["temp_max_c"] == 8.0
    assert body["violations"]
    assert body["recommendation"]
    assert "not medically or legally authoritative" in body["disclaimer"]


def test_compliant_storage_reports_no_violations(client, manager_headers, product):
    created = client.post(
        "/api/v1/batches",
        json={
            "product_id": product["id"],
            "quantity": 5,
            "temperature_c": 5.0,   # inside FRUITS 2-8 C
            "humidity_pct": 90.0,   # inside 85-95%
            "air_circulation": "GOOD",
        },
        headers=manager_headers,
    ).json()

    body = client.get(f"/api/v1/storage/{created['id']}", headers=manager_headers).json()
    assert body["compliance_status"] == "COMPLIANT"
    assert body["storage_score"] == 100.0
    assert body["violations"] == []


def test_recording_a_reading_updates_compliance(client, manager_headers, batch):
    response = client.post(
        "/api/v1/storage/readings",
        json={"batch_id": batch["id"], "temperature_c": 4.0, "humidity_pct": 90.0},
        headers=manager_headers,
    )
    assert response.status_code == 201
    assert response.json()["is_violation"] is False

    snapshot = client.get(f"/api/v1/storage/{batch['id']}", headers=manager_headers).json()
    # Temperature and humidity are now in range, so those violations are gone.
    parameters = {violation["parameter"] for violation in snapshot["violations"]}
    assert "temperature" not in parameters
    assert "humidity" not in parameters
    # The fixture's POOR air circulation is a separate, still-valid warning.
    assert parameters == {"air_circulation"}
    assert snapshot["compliance_status"] == "WARNING"

    # Fixing circulation too must clear it entirely.
    client.put(
        f"/api/v1/storage/{batch['id']}",
        json={"temperature_c": 4.0, "humidity_pct": 90.0, "air_circulation": "GOOD"},
        headers=manager_headers,
    )
    fixed = client.get(f"/api/v1/storage/{batch['id']}", headers=manager_headers).json()
    assert fixed["compliance_status"] == "COMPLIANT"
    assert fixed["violations"] == []
    assert fixed["storage_score"] == 100.0


def test_reading_history_and_trends(client, manager_headers, batch):
    for temperature in (3.0, 4.5, 6.0):
        client.post(
            "/api/v1/storage/readings",
            json={"batch_id": batch["id"], "temperature_c": temperature, "humidity_pct": 88},
            headers=manager_headers,
        )
    readings = client.get(
        f"/api/v1/storage/readings?batch_id={batch['id']}", headers=manager_headers
    ).json()
    assert len(readings) >= 3

    trends = client.get(
        f"/api/v1/storage/trends?batch_id={batch['id']}&days=7", headers=manager_headers
    ).json()
    assert trends["reading_count"] >= 3
    assert trends["points"]
    assert trends["points"][0]["temperature"]["avg"] is not None


def test_mock_sensor_provider_works_without_hardware(client, manager_headers):
    provider = client.get("/api/v1/storage/sensors/provider", headers=manager_headers).json()
    assert provider["provider"] == "mock"
    assert provider["available"] is True
    assert provider["requires_hardware"] is False

    readings = client.get("/api/v1/storage/sensors/read", headers=manager_headers).json()
    assert len(readings) >= 5
    assert all(reading["temperature_c"] is not None for reading in readings)


def test_sensor_ingestion_persists_readings(client, manager_headers, batch):
    response = client.post("/api/v1/storage/sensors/ingest", headers=manager_headers)
    assert response.status_code == 200
    assert "Ingested" in response.json()["message"]
    assert client.get("/api/v1/storage/locations", headers=manager_headers).json()


def test_consumer_cannot_write_storage_for_another_users_batch(client, auth_headers, batch):
    response = client.post(
        "/api/v1/storage/readings",
        json={"batch_id": batch["id"], "temperature_c": 4.0},
        headers=auth_headers["CONSUMER"],
    )
    assert response.status_code == 403


# ----------------------------------------------------------------- alerts
def test_analysis_raises_storage_alerts_for_a_warm_batch(client, manager_headers, analysis):
    alerts = client.get("/api/v1/alerts?resolved=false", headers=manager_headers).json()
    types = {alert["alert_type"] for alert in alerts["items"]}
    assert "TEMPERATURE_VIOLATION" in types or "STORAGE_NON_COMPLIANCE" in types


def test_alert_carries_severity_message_and_batch(client, manager_headers, analysis):
    alerts = client.get("/api/v1/alerts", headers=manager_headers).json()["items"]
    assert alerts
    alert = alerts[0]
    assert alert["severity"] in {"INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"}
    assert alert["title"] and alert["message"]
    assert alert["created_at"]
    assert alert["is_read"] is False
    assert alert["resolved"] is False


def test_alert_can_be_read_and_resolved(client, manager_headers, analysis):
    alert = client.get("/api/v1/alerts", headers=manager_headers).json()["items"][0]
    response = client.patch(
        f"/api/v1/alerts/{alert['id']}",
        json={"is_read": True, "resolved": True, "resolution_note": "moved to the chiller"},
        headers=manager_headers,
    )
    assert response.status_code == 200
    body = response.json()
    assert body["is_read"] is True
    assert body["resolved"] is True
    assert body["resolved_at"] is not None
    assert body["resolution_note"] == "moved to the chiller"


def test_alerts_are_deduplicated_not_duplicated(
    client, manager_headers, batch, sample_image_bytes
):
    """Re-analysing the same warm batch must not multiply the same open alert."""
    def analyse():
        client.post(
            "/api/v1/analysis/image",
            headers=manager_headers,
            files={"file": ("x.jpg", sample_image_bytes, "image/jpeg")},
            data={"batch_id": str(batch["id"]), "temperature_c": "12", "humidity_pct": "95"},
        )

    analyse()
    first = client.get(
        f"/api/v1/alerts?batch_id={batch['id']}&alert_type=TEMPERATURE_VIOLATION",
        headers=manager_headers,
    ).json()["meta"]["total"]
    analyse()
    second = client.get(
        f"/api/v1/alerts?batch_id={batch['id']}&alert_type=TEMPERATURE_VIOLATION",
        headers=manager_headers,
    ).json()["meta"]["total"]
    assert second == first == 1


def test_storage_alert_auto_resolves_when_conditions_are_fixed(
    client, manager_headers, batch, analysis
):
    open_before = client.get(
        f"/api/v1/alerts?batch_id={batch['id']}&resolved=false", headers=manager_headers
    ).json()["meta"]["total"]
    assert open_before > 0

    # Move it into the recommended range.
    client.post(
        "/api/v1/storage/readings",
        json={"batch_id": batch["id"], "temperature_c": 4.0, "humidity_pct": 90.0},
        headers=manager_headers,
    )
    temperature_alerts = client.get(
        f"/api/v1/alerts?batch_id={batch['id']}&alert_type=TEMPERATURE_VIOLATION&resolved=false",
        headers=manager_headers,
    ).json()["meta"]["total"]
    assert temperature_alerts == 0


def test_expiry_alert_is_raised_for_an_expired_batch(client, manager_headers, product):
    expired = client.post(
        "/api/v1/batches",
        json={
            "product_id": product["id"],
            "quantity": 2,
            "purchase_date": (date.today() - timedelta(days=20)).isoformat(),
            "expected_expiry_date": (date.today() - timedelta(days=3)).isoformat(),
        },
        headers=manager_headers,
    ).json()

    client.post("/api/v1/alerts/scan", headers=manager_headers)
    alerts = client.get(
        f"/api/v1/alerts?batch_id={expired['id']}", headers=manager_headers
    ).json()["items"]
    types = {alert["alert_type"] for alert in alerts}
    assert "EXPIRY_APPROACHING" in types
    expiry_alert = next(a for a in alerts if a["alert_type"] == "EXPIRY_APPROACHING")
    assert expiry_alert["severity"] == "CRITICAL"


def test_alert_summary_counts(client, manager_headers, analysis):
    summary = client.get("/api/v1/alerts/summary", headers=manager_headers).json()
    assert summary["total"] > 0
    assert summary["open"] > 0
    assert set(summary["by_severity"]) >= {"INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"}


def test_notifications_are_created_for_alerts(client, manager_headers, analysis):
    notifications = client.get("/api/v1/notifications", headers=manager_headers).json()
    assert notifications["total"] > 0
    assert notifications["unread"] > 0

    first = notifications["items"][0]
    read = client.patch(f"/api/v1/notifications/{first['id']}/read", headers=manager_headers)
    assert read.status_code == 200
    assert read.json()["is_read"] is True

    count = client.get("/api/v1/notifications/unread-count", headers=manager_headers).json()
    assert count["unread"] == notifications["unread"] - 1


# -------------------------------------------------------- recommendations
def test_recommendations_are_generated_with_rule_ids(analysis):
    recommendations = analysis["recommendations"]
    assert recommendations
    for recommendation in recommendations:
        assert recommendation["rule_id"]
        assert recommendation["title"] and recommendation["message"]
        assert recommendation["rationale"]
        assert recommendation["recommendation_type"] in {
            "STORAGE", "CONSUMPTION", "INVENTORY_ROTATION", "WASTE_REDUCTION", "QUALITY_IMPROVEMENT"
        }
        assert recommendation["priority"] in {"LOW", "MEDIUM", "HIGH", "URGENT"}


def test_warm_storage_produces_a_relocation_recommendation(analysis):
    rules = {r["rule_id"] for r in analysis["recommendations"]}
    assert "STORAGE_TEMP_ABOVE_MAX" in rules
    relocation = next(
        r for r in analysis["recommendations"] if r["rule_id"] == "STORAGE_TEMP_ABOVE_MAX"
    )
    assert "cooler" in relocation["message"].lower()
    assert relocation["evidence"]


def test_unassessed_batch_is_told_to_run_an_analysis(client, manager_headers, batch):
    recommendations = client.get(
        f"/api/v1/recommendations/{batch['id']}?refresh=true", headers=manager_headers
    ).json()
    assert any(r["rule_id"] == "QUALITY_RUN_ASSESSMENT" for r in recommendations)


def test_recommendation_can_be_acknowledged(client, manager_headers, analysis):
    recommendation = analysis["recommendations"][0]
    response = client.post(
        f"/api/v1/recommendations/{recommendation['id']}/acknowledge", headers=manager_headers
    )
    assert response.status_code == 200
    assert response.json()["acknowledged"] is True


def test_recommendation_engine_reports_its_rule_count(client, manager_headers):
    info = client.get("/api/v1/recommendations/rules", headers=manager_headers).json()
    assert info["engine"] == "rule-based"
    assert info["registered_rules"] >= 10
    assert len(info["categories"]) == 5


# ---------------------------------------------------------------- rotation
def test_fefo_ranks_the_soonest_expiry_first(client, manager_headers, product):
    for days in (30, 1, 10):
        client.post(
            "/api/v1/batches",
            json={
                "product_id": product["id"],
                "quantity": 5,
                "expected_expiry_date": (date.today() + timedelta(days=days)).isoformat(),
            },
            headers=manager_headers,
        )

    plan = client.get("/api/v1/batches/rotation?strategy=FEFO", headers=manager_headers).json()
    assert plan["strategy"] == "FEFO"
    assert plan["items"]
    priorities = [item["rotation_priority"] for item in plan["items"]]
    assert priorities == sorted(priorities, reverse=True)

    top = plan["items"][0]
    assert top["rank"] == 1
    assert "FEFO" in top["reason"]
    # The batch expiring in 1 day must outrank the one expiring in 30.
    days_left = [item["days_until_expiry"] for item in plan["items"] if item["days_until_expiry"] is not None]
    assert days_left[0] <= min(days_left)


def test_fifo_ranks_the_oldest_stock_first(client, manager_headers, product):
    for age in (1, 20, 8):
        client.post(
            "/api/v1/batches",
            json={
                "product_id": product["id"],
                "quantity": 5,
                "purchase_date": (date.today() - timedelta(days=age)).isoformat(),
            },
            headers=manager_headers,
        )

    plan = client.get("/api/v1/batches/rotation?strategy=FIFO", headers=manager_headers).json()
    assert plan["strategy"] == "FIFO"
    assert "FIFO" in plan["items"][0]["reason"]
    priorities = [item["rotation_priority"] for item in plan["items"]]
    assert priorities == sorted(priorities, reverse=True)


def test_rotation_priority_is_persisted_on_inventory_items(client, manager_headers, analysis):
    items = client.get("/api/v1/inventory", headers=manager_headers).json()["items"]
    assert any(item["rotation_priority"] is not None for item in items)


# ---------------------------------------------------------------- reports
@pytest.mark.parametrize(
    "path,report_type",
    [
        ("freshness", "FRESHNESS"),
        ("shelf-life", "SHELF_LIFE"),
        ("inventory", "INVENTORY_QUALITY"),
        ("waste-reduction", "WASTE_REDUCTION"),
        ("storage-compliance", "STORAGE_COMPLIANCE"),
    ],
)
@pytest.mark.parametrize("fmt,magic", [("PDF", b"%PDF"), ("XLSX", b"PK")])
def test_every_report_type_generates_and_downloads(
    client, manager_headers, analysis, path, report_type, fmt, magic
):
    created = client.post(
        f"/api/v1/reports/{path}", json={"report_format": fmt, "limit": 50}, headers=manager_headers
    )
    assert created.status_code == 201, created.text
    report = created.json()
    assert report["report_type"] == report_type
    assert report["report_format"] == fmt
    assert report["status"] == "COMPLETED"
    assert report["size_bytes"] > 1000
    assert report["summary"]
    assert report["download_url"]

    download = client.get(f"/api/v1/reports/{report['id']}/download", headers=manager_headers)
    assert download.status_code == 200
    assert download.content.startswith(magic)
    assert len(download.content) == report["size_bytes"]
    assert "attachment" in download.headers["content-disposition"]


def test_report_records_its_filters_for_traceability(client, manager_headers, analysis):
    created = client.post(
        "/api/v1/reports/freshness",
        json={"report_format": "PDF", "category_slug": "FRUITS", "limit": 25},
        headers=manager_headers,
    ).json()
    assert created["filters"]["category_slug"] == "FRUITS"
    assert created["filters"]["limit"] == 25


def test_report_with_no_matching_rows_still_succeeds(client, manager_headers, analysis):
    created = client.post(
        "/api/v1/reports/freshness",
        json={"report_format": "PDF", "category_slug": "SEAFOOD"},
        headers=manager_headers,
    )
    assert created.status_code == 201
    assert created.json()["status"] == "COMPLETED"


def test_consumer_cannot_generate_reports(client, consumer_headers):
    response = client.post(
        "/api/v1/reports/freshness", json={"report_format": "PDF"}, headers=consumer_headers
    )
    assert response.status_code == 403


def test_report_can_be_deleted(client, manager_headers, analysis):
    created = client.post(
        "/api/v1/reports/inventory", json={"report_format": "XLSX"}, headers=manager_headers
    ).json()
    assert client.delete(f"/api/v1/reports/{created['id']}", headers=manager_headers).status_code == 200
    assert client.get(f"/api/v1/reports/{created['id']}", headers=manager_headers).status_code == 404


# --------------------------------------------------------------- analytics
def test_role_dashboards_return_their_specific_blocks(client, auth_headers, analysis):
    expectations = {
        "CONSUMER": ("my_recommendations", "rotation"),
        "RETAIL_MANAGER": ("spoilage", "waste_risk", "category_quality"),
        "WAREHOUSE_OPERATOR": ("storage_compliance", "environment_trends", "locations"),
        "QUALITY_INSPECTOR": ("inspection_queue", "indicator_summary"),
        "ADMIN": ("platform",),
    }
    for role, keys in expectations.items():
        body = client.get("/api/v1/analytics/dashboard", headers=auth_headers[role]).json()
        assert body["role"] == role
        assert body["inventory_health"] is not None
        assert body["freshness_distribution"] is not None
        for key in keys:
            assert body[key] is not None, f"{role} dashboard missing {key}"


def test_freshness_distribution_covers_all_five_bands(client, manager_headers, analysis):
    body = client.get("/api/v1/analytics/freshness-distribution", headers=manager_headers).json()
    assert set(body["distribution"]) == {
        "FRESH", "GOOD", "ACCEPTABLE", "NEAR_SPOILAGE", "SPOILED"
    }
    assert body["total_assessed"] >= 1
    assert sum(item["count"] for item in body["items"]) == body["total_assessed"]


def test_platform_stats_report_ml_provenance(client, admin_headers, analysis):
    body = client.get("/api/v1/analytics/platform", headers=admin_headers).json()
    assert body["users"]["total"] >= 5
    assert body["analysis"]["assessments"] >= 1
    assert body["ml"]["mode"] == "demo"
    assert all(info["is_demo"] for info in body["ml"]["roles"].values())


# ------------------------------------------------------------------- audit
def test_audit_trail_records_the_key_operations(client, admin_headers, analysis):
    body = client.get("/api/v1/admin/audit-logs?page_size=100", headers=admin_headers).json()
    actions = {entry["action"] for entry in body["items"]}
    assert {"LOGIN", "CREATE", "IMAGE_ANALYSIS"} <= actions

    analysis_entry = next(e for e in body["items"] if e["action"] == "IMAGE_ANALYSIS")
    assert analysis_entry["entity_type"] == "freshness_assessment"
    assert analysis_entry["actor_email"]
    assert analysis_entry["success"] is True


def test_failed_login_is_audited(client, seeded, admin_headers):
    client.post(
        "/api/v1/auth/login",
        json={"username": "consumer@test.example.com", "password": "definitely-wrong"},
    )
    body = client.get(
        "/api/v1/admin/audit-logs?action=LOGIN_FAILED", headers=admin_headers
    ).json()
    assert body["meta"]["total"] >= 1
    assert body["items"][0]["success"] is False


def test_audit_metadata_never_contains_credentials(client, admin_headers, analysis):
    body = client.get("/api/v1/admin/audit-logs?page_size=100", headers=admin_headers).json()
    serialised = str(body).lower()
    assert "test@1234" not in serialised
    assert "hashed_password" not in serialised
    assert "$2b$" not in serialised


# ------------------------------------------------------------------ health
def test_health_reports_api_database_and_model_status(client):
    response = client.get("/health")
    assert response.status_code == 200
    body = response.json()
    assert body["status"] == "healthy"
    assert body["database"] == "connected"
    assert body["model"] == "demo"
    assert body["demo_mode"] is True
    names = {component["name"] for component in body["components"]}
    assert {"api", "database", "ml_models", "storage"} <= names


def test_liveness_and_readiness_probes(client):
    assert client.get("/health/live").json()["status"] == "alive"
    assert client.get("/health/ready").json()["status"] == "ready"


def test_meta_endpoint_exposes_enums_and_the_disclaimer(client):
    body = client.get("/api/v1/meta").json()
    assert len(body["categories"]) == 8
    assert body["scoring"]["weights"]["visual"] == 0.4
    assert len(body["enums"]["freshness_categories"]) == 5
    assert len(body["enums"]["roles"]) == 5
    assert "AI estimates" in body["disclaimer"]
    assert body["demo_mode"] is True


def test_openapi_and_docs_are_available(client):
    assert client.get("/docs").status_code == 200
    assert client.get("/redoc").status_code == 200
    schema = client.get("/openapi.json").json()
    assert len(schema["paths"]) > 80
    # Spot-check that the specification's example endpoints exist.
    for path in (
        "/api/v1/auth/register",
        "/api/v1/auth/login",
        "/api/v1/users/me",
        "/api/v1/products",
        "/api/v1/batches",
        "/api/v1/analysis/image",
        "/api/v1/storage/readings",
        "/api/v1/alerts",
        "/api/v1/analytics/dashboard",
        "/api/v1/reports/freshness",
    ):
        assert path in schema["paths"], path


def test_error_envelope_shape_is_consistent(client):
    response = client.get("/api/v1/batches/999999", headers={"Authorization": "Bearer nope"})
    body = response.json()
    assert body["success"] is False
    assert "code" in body["error"]
    assert "message" in body["error"]


def test_request_id_header_is_returned(client):
    response = client.get("/health")
    assert response.headers.get("X-Request-ID")
    assert response.headers.get("X-Response-Time-ms")


def test_security_headers_are_present(client):
    response = client.get("/health")
    assert response.headers["x-content-type-options"] == "nosniff"
    assert response.headers["x-frame-options"] == "DENY"
