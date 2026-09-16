"""End-to-end smoke check against the in-process app.

    python scripts/e2e_smoke.py

Walks the complete user journey from the specification: register, log in, create a
product and batch, upload an image, run the AI analysis, read the freshness score,
spoilage indicators, shelf life, recommendations and alerts, view analytics and
generate + download PDF and XLSX reports. Also asserts the RBAC negatives.

Exits non-zero if any expectation fails.
"""

from __future__ import annotations

import logging
import sys
from pathlib import Path

BACKEND = Path(__file__).resolve().parents[1]
if str(BACKEND) not in sys.path:
    sys.path.insert(0, str(BACKEND))

logging.disable(logging.CRITICAL)  # keep the smoke output readable

from fastapi.testclient import TestClient  # noqa: E402

from app.main import app  # noqa: E402
from app.sample_images import generate_sample_image  # noqa: E402

PASSED: list[str] = []
FAILED: list[str] = []


def check(name: str, condition: bool, detail: str = "") -> bool:
    if condition:
        PASSED.append(name)
        print(f"  PASS  {name}" + (f"  -> {detail}" if detail else ""))
    else:
        FAILED.append(name)
        print(f"  FAIL  {name}" + (f"  -> {detail}" if detail else ""))
    return condition


def expect(name: str, response, *codes: int) -> bool:
    ok = response.status_code in codes
    return check(
        name,
        ok,
        f"{response.status_code}" + ("" if ok else f" body={response.text[:200]}"),
    )


def section(title: str) -> None:
    print(f"\n--- {title} " + "-" * max(0, 62 - len(title)))


def main() -> int:
    client = TestClient(app)

    # ------------------------------------------------------------ system
    section("System")
    response = client.get("/health")
    expect("GET /health", response, 200)
    health = response.json()
    check(
        "health reports API, database and model status",
        {"status", "database", "model"} <= set(health),
        f"{health.get('status')} / {health.get('database')} / model={health.get('model')}",
    )
    expect("GET /api/v1/meta", client.get("/api/v1/meta"), 200)
    expect("GET /api/v1/system/models", client.get("/api/v1/system/models"), 200)
    expect("GET /docs", client.get("/docs"), 200)
    expect("GET /redoc", client.get("/redoc"), 200)
    expect("GET /openapi.json", client.get("/openapi.json"), 200)

    # -------------------------------------------------------------- auth
    section("Authentication and RBAC")
    email = "e2e.smoke@example.com"
    response = client.post(
        "/api/v1/auth/register",
        json={
            "email": email,
            "password": "Test@1234",
            "full_name": "E2E Smoke",
            "role": "RETAIL_MANAGER",
        },
    )
    if response.status_code == 409:  # already registered from a previous run
        response = client.post(
            "/api/v1/auth/login", json={"username": email, "password": "Test@1234"}
        )
    expect("register or login manager", response, 200, 201)
    payload = response.json()
    manager = {"Authorization": f"Bearer {payload['tokens']['access_token']}"}
    refresh_token = payload["tokens"]["refresh_token"]
    check(
        "JWT grants the expected role and permissions",
        payload["user"]["role"]["name"] == "RETAIL_MANAGER"
        and "report:generate" in payload["user"]["permissions"],
        f"{payload['user']['role']['name']}, {len(payload['user']['permissions'])} permissions",
    )

    expect(
        "login rejects a wrong password",
        client.post("/api/v1/auth/login", json={"username": email, "password": "nope"}),
        401,
    )
    expect("protected route rejects a missing token", client.get("/api/v1/users/me"), 401)
    expect(
        "protected route rejects a malformed token",
        client.get("/api/v1/users/me", headers={"Authorization": "Bearer not.a.jwt"}),
        401,
    )
    expect("GET /users/me", client.get("/api/v1/users/me", headers=manager), 200)
    expect(
        "POST /auth/refresh rotates the token",
        client.post("/api/v1/auth/refresh", json={"refresh_token": refresh_token}),
        200,
    )
    expect(
        "public registration cannot self-assign ADMIN",
        client.post(
            "/api/v1/auth/register",
            json={
                "email": "escalate@example.com",
                "password": "Test@1234",
                "full_name": "Escalation Attempt",
                "role": "ADMIN",
            },
        ),
        403,
    )
    expect(
        "weak password is rejected",
        client.post(
            "/api/v1/auth/register",
            json={"email": "weak@example.com", "password": "abc", "full_name": "Weak Pass"},
        ),
        422,
    )

    response = client.post(
        "/api/v1/auth/login",
        json={"username": "consumer@freshness.example.com", "password": "Demo@1234"},
    )
    expect("login seeded consumer", response, 200)
    consumer = {"Authorization": f"Bearer {response.json()['tokens']['access_token']}"}
    expect(
        "RBAC: consumer cannot generate reports",
        client.post("/api/v1/reports/freshness", json={"report_format": "PDF"}, headers=consumer),
        403,
    )
    expect(
        "RBAC: consumer cannot list users",
        client.get("/api/v1/admin/users", headers=consumer),
        403,
    )
    expect(
        "RBAC: manager cannot access admin user management",
        client.get("/api/v1/admin/users", headers=manager),
        403,
    )

    # --------------------------------------------------------- catalogue
    section("Catalogue, batch and inventory CRUD")
    response = client.get("/api/v1/categories", headers=manager)
    expect("GET /categories", response, 200)
    check("all 8 food categories present", len(response.json()) == 8, f"{len(response.json())}")

    response = client.post(
        "/api/v1/products",
        json={
            "name": "E2E Smoke Mango",
            "category_slug": "FRUITS",
            "brand": "Smoke Farms",
            "default_unit": "kg",
            "shelf_life_days": 6,
        },
        headers=manager,
    )
    if response.status_code == 409:
        found = client.get("/api/v1/products?q=E2E Smoke Mango", headers=manager).json()
        product_id = found["items"][0]["id"]
        check("product already exists (reused)", True, f"id={product_id}")
    else:
        expect("POST /products", response, 201)
        product_id = response.json()["id"]

    expect("GET /products (search)", client.get("/api/v1/products?q=mango", headers=manager), 200)
    expect(
        "PUT /products",
        client.put(f"/api/v1/products/{product_id}", json={"brand": "Smoke Farms Ltd"}, headers=manager),
        200,
    )

    response = client.post(
        "/api/v1/batches",
        json={
            "product_id": product_id,
            "quantity": 24.0,
            "temperature_c": 9.4,
            "humidity_pct": 93,
            "packaging_type": "LOOSE",
            "air_circulation": "POOR",
            "light_exposure": "MODERATE",
            "storage_location": "Cold Room A",
            "cost_per_unit": 3.2,
        },
        headers=manager,
    )
    expect("POST /batches", response, 201)
    batch = response.json()
    batch_id = batch["id"]
    check(
        "batch number and provisional expiry auto-generated",
        bool(batch["batch_number"]) and bool(batch["expected_expiry_date"]),
        f"{batch['batch_number']} exp {batch['expected_expiry_date']}",
    )
    expect(
        "PATCH /batches/{id}/quantity",
        client.patch(
            f"/api/v1/batches/{batch_id}/quantity",
            json={"delta": -4, "reason": "smoke test sale"},
            headers=manager,
        ),
        200,
    )
    expect(
        "quantity guard rejects over-removal",
        client.patch(
            f"/api/v1/batches/{batch_id}/quantity", json={"delta": -9999}, headers=manager
        ),
        409,
    )
    expect(
        "GET /batches (filters + sort + paging)",
        client.get(
            "/api/v1/batches?q=mango&page=1&page_size=5&sort_by=expected_expiry_date&sort_dir=asc",
            headers=manager,
        ),
        200,
    )
    expect("GET /inventory", client.get("/api/v1/inventory?page_size=5", headers=manager), 200)
    expect("GET /inventory/summary", client.get("/api/v1/inventory/summary", headers=manager), 200)
    expect(
        "GET /batches/rotation (FEFO)",
        client.get("/api/v1/batches/rotation?strategy=FEFO&limit=5", headers=manager),
        200,
    )
    expect(
        "GET /batches/rotation (FIFO)",
        client.get("/api/v1/batches/rotation?strategy=FIFO&limit=5", headers=manager),
        200,
    )

    # ------------------------------------------------- upload validation
    section("Image upload validation")
    image_bytes = generate_sample_image("mouldy_bread")
    response = client.post(
        "/api/v1/images",
        headers=manager,
        files={"file": ("mould.jpg", image_bytes, "image/jpeg")},
        data={"batch_id": str(batch_id)},
    )
    expect("POST /images (valid JPEG)", response, 201)
    image_id = response.json()["image"]["id"]

    expect(
        "rejects a .txt upload",
        client.post(
            "/api/v1/images",
            headers=manager,
            files={"file": ("notes.txt", b"hello", "text/plain")},
        ),
        400,
    )
    expect(
        "rejects an executable renamed to .jpg",
        client.post(
            "/api/v1/images",
            headers=manager,
            files={"file": ("evil.jpg", b"MZ\x90\x00\x03 fake pe header", "image/jpeg")},
        ),
        400,
    )
    expect(
        "rejects an empty file",
        client.post(
            "/api/v1/images", headers=manager, files={"file": ("empty.jpg", b"", "image/jpeg")}
        ),
        400,
    )
    expect(
        "serves the stored image file",
        client.get(f"/api/v1/images/{image_id}", headers=manager),
        200,
    )

    # ------------------------------------------------------- ai analysis
    section("AI analysis pipeline")
    response = client.post(
        "/api/v1/analysis/image",
        headers=manager,
        files={"file": ("mould.jpg", image_bytes, "image/jpeg")},
        data={
            "batch_id": str(batch_id),
            "temperature_c": "9.4",
            "humidity_pct": "93",
            "packaging_type": "LOOSE",
            "air_circulation": "POOR",
            "storage_duration_days": "3",
        },
    )
    expect("POST /analysis/image", response, 201)
    result = response.json()
    assessment = result["assessment"]

    check(
        "freshness score in range with a category",
        0 <= assessment["freshness_score"] <= 100 and assessment["freshness_category"],
        f"{assessment['freshness_score']} {assessment['freshness_category']}",
    )
    components = assessment["components"]
    check(
        "all four weighted components stored",
        all(components.get(k) is not None for k in ("visual", "storage", "shelf_life", "product_age")),
        str({k: round(v, 1) for k, v in components.items() if v is not None}),
    )
    weights = assessment["weights_used"] or {}
    check(
        "weights are the specification's 40/25/20/15",
        abs(weights.get("visual", 0) - 0.40) < 1e-6
        and abs(weights.get("storage", 0) - 0.25) < 1e-6
        and abs(weights.get("shelf_life", 0) - 0.20) < 1e-6
        and abs(weights.get("product_age", 0) - 0.15) < 1e-6,
        str(weights),
    )
    recomputed = sum(components[k] * weights[k] for k in weights)
    check(
        "stored score equals the weighted recomputation",
        abs(recomputed - assessment["freshness_score"]) < 0.05,
        f"recomputed {recomputed:.2f} vs stored {assessment['freshness_score']}",
    )
    check(
        "confidence reported",
        0 <= assessment["confidence"] <= 1,
        f"{assessment['confidence']:.2f}",
    )
    check(
        "demo/baseline output is labelled honestly",
        assessment["model"]["is_demo"] is True and "Demo" in result["analysis_label"],
        f"{assessment['model']['label']} | {result['analysis_label']}",
    )
    check(
        "no accuracy metrics are fabricated for the baseline",
        "accuracy" not in str(assessment["model"]).lower(),
        "model block carries no accuracy claim",
    )
    detected = [i["indicator_type"] for i in assessment["indicators"] if i["detected"]]
    check("spoilage indicators evaluated", len(assessment["indicators"]) >= 5, f"{len(assessment['indicators'])} checked, detected={detected}")
    check("spoilage probability produced", assessment["spoilage_probability"] is not None, f"{assessment['spoilage_probability']}")
    check("explanation payload present", bool(assessment.get("explanation")), "explainable-AI block returned")
    check("visual overlay generated", bool(assessment.get("overlay_url")), str(assessment.get("overlay_url")))

    shelf = result["shelf_life"] or {}
    check(
        "shelf life predicted with expiry, risk and confidence",
        shelf.get("remaining_shelf_life_days") is not None
        and shelf.get("predicted_expiry_date")
        and shelf.get("risk_level"),
        f"{shelf.get('remaining_shelf_life_days')} days, expiry {shelf.get('predicted_expiry_date')}, "
        f"risk {shelf.get('risk_level')}, conf {shelf.get('confidence')}",
    )
    check(
        "shelf-life baseline labelled as a baseline",
        (shelf.get("model") or {}).get("label") == "Baseline prediction",
        str((shelf.get("model") or {}).get("label")),
    )
    check(
        "recommendations generated with rule ids",
        len(result["recommendations"]) > 0
        and all(r.get("rule_id") for r in result["recommendations"]),
        f"{len(result['recommendations'])}: {[r['rule_id'] for r in result['recommendations']][:4]}",
    )
    check(
        "alerts raised for the risky batch",
        len(result["alerts_raised"]) > 0,
        str([a["alert_type"] for a in result["alerts_raised"]]),
    )

    assessment_id = assessment["id"]
    expect("GET /analysis/{id}", client.get(f"/api/v1/analysis/{assessment_id}", headers=manager), 200)
    expect("GET /freshness/{batch_id}", client.get(f"/api/v1/freshness/{batch_id}", headers=manager), 200)
    expect(
        "GET /freshness/{batch_id}/trend",
        client.get(f"/api/v1/freshness/{batch_id}/trend", headers=manager),
        200,
    )
    expect("GET /shelf-life/{batch_id}", client.get(f"/api/v1/shelf-life/{batch_id}", headers=manager), 200)
    expect(
        "GET /recommendations/{batch_id}",
        client.get(f"/api/v1/recommendations/{batch_id}", headers=manager),
        200,
    )

    response = client.get(f"/api/v1/batches/{batch_id}", headers=manager)
    expect("GET /batches/{id} detail", response, 200)
    detail = response.json()
    check(
        "batch summary updated by the analysis",
        detail["current_freshness_score"] is not None
        and detail["remaining_shelf_life_days"] is not None
        and detail["status"] is not None,
        f"score={detail['current_freshness_score']} status={detail['status']} "
        f"days={detail['remaining_shelf_life_days']}",
    )

    # ---------------------------------------------------------- storage
    section("Storage monitoring")
    expect(
        "POST /storage/readings",
        client.post(
            "/api/v1/storage/readings",
            json={"batch_id": batch_id, "temperature_c": 3.0, "humidity_pct": 88,
                  "location_name": "Cold Room A"},
            headers=manager,
        ),
        201,
    )
    response = client.get(f"/api/v1/storage/{batch_id}", headers=manager)
    expect("GET /storage/{batch_id}", response, 200)
    snapshot = response.json()
    check(
        "compliance snapshot has current, required, status and recommendation",
        all(k in snapshot for k in ("current", "required", "compliance_status", "recommendation")),
        f"{snapshot['compliance_status']} / risk {snapshot['risk_level']} / "
        f"score {snapshot['storage_score']}",
    )
    expect("GET /storage/overview", client.get("/api/v1/storage/overview", headers=manager), 200)
    expect("GET /storage/trends", client.get("/api/v1/storage/trends?days=14", headers=manager), 200)
    expect("GET /storage/readings", client.get("/api/v1/storage/readings?days=14", headers=manager), 200)
    response = client.get("/api/v1/storage/sensors/provider", headers=manager)
    expect("GET /storage/sensors/provider", response, 200)
    check(
        "works without IoT hardware (mock provider)",
        response.json()["provider"] == "mock" and response.json()["available"] is True,
        str(response.json()["provider"]),
    )
    expect("GET /storage/sensors/read", client.get("/api/v1/storage/sensors/read", headers=manager), 200)
    expect("POST /storage/sensors/ingest", client.post("/api/v1/storage/sensors/ingest", headers=manager), 200)

    # -------------------------------------------- alerts & notifications
    section("Alerts and notifications")
    expect("GET /alerts", client.get("/api/v1/alerts?page_size=5", headers=manager), 200)
    response = client.get("/api/v1/alerts/summary", headers=manager)
    expect("GET /alerts/summary", response, 200)
    check("alert counters populated", response.json()["total"] > 0, f"total={response.json()['total']}")

    alerts = client.get(f"/api/v1/alerts?batch_id={batch_id}&page_size=1", headers=manager).json()
    if alerts["items"]:
        alert_id = alerts["items"][0]["id"]
        response = client.patch(
            f"/api/v1/alerts/{alert_id}",
            json={"is_read": True, "resolved": True, "resolution_note": "smoke test"},
            headers=manager,
        )
        expect("PATCH /alerts/{id}", response, 200)
        check(
            "alert marked read and resolved",
            response.json()["is_read"] and response.json()["resolved"],
            "read+resolved",
        )
    expect("POST /alerts/scan", client.post("/api/v1/alerts/scan", headers=manager), 200)
    response = client.get("/api/v1/notifications?page_size=5", headers=manager)
    expect("GET /notifications", response, 200)
    expect("GET /notifications/unread-count", client.get("/api/v1/notifications/unread-count", headers=manager), 200)
    if response.json()["items"]:
        nid = response.json()["items"][0]["id"]
        expect(
            "PATCH /notifications/{id}/read",
            client.patch(f"/api/v1/notifications/{nid}/read", headers=manager),
            200,
        )

    # -------------------------------------------------------- analytics
    section("Analytics")
    response = client.get("/api/v1/analytics/dashboard", headers=manager)
    expect("GET /analytics/dashboard", response, 200)
    dashboard = response.json()
    check(
        "retail dashboard contains its role-specific blocks",
        all(dashboard.get(k) is not None for k in ("spoilage", "waste_risk", "category_quality", "freshness_trend")),
        f"role={dashboard['role']}",
    )
    for endpoint in (
        "", "freshness-distribution", "freshness-trend", "spoilage", "shelf-life-distribution",
        "inventory-health", "category-quality", "waste-risk", "storage-compliance",
        "environment-trends", "alert-trends", "indicators", "inspection-queue",
    ):
        expect(f"GET /analytics/{endpoint or '(full)'}", client.get(f"/api/v1/analytics/{endpoint}", headers=manager), 200)

    # ---------------------------------------------------------- reports
    section("Reports (PDF and XLSX)")
    for path, fmt, magic in (
        ("freshness", "PDF", b"%PDF"),
        ("freshness", "XLSX", b"PK"),
        ("shelf-life", "PDF", b"%PDF"),
        ("shelf-life", "XLSX", b"PK"),
        ("inventory", "PDF", b"%PDF"),
        ("inventory", "XLSX", b"PK"),
        ("waste-reduction", "PDF", b"%PDF"),
        ("waste-reduction", "XLSX", b"PK"),
        ("storage-compliance", "PDF", b"%PDF"),
        ("storage-compliance", "XLSX", b"PK"),
    ):
        response = client.post(
            f"/api/v1/reports/{path}", json={"report_format": fmt, "limit": 100}, headers=manager
        )
        if not expect(f"POST /reports/{path} ({fmt})", response, 201):
            continue
        report = response.json()
        download = client.get(f"/api/v1/reports/{report['id']}/download", headers=manager)
        check(
            f"download {path} {fmt}",
            download.status_code == 200
            and download.content.startswith(magic)
            and len(download.content) > 1000,
            f"{len(download.content)} bytes, {download.headers.get('content-type')}",
        )
    expect("GET /reports", client.get("/api/v1/reports?page_size=5", headers=manager), 200)

    # ------------------------------------------------------------ admin
    section("Administration and audit")
    response = client.post(
        "/api/v1/auth/login",
        json={"username": "admin@freshness.example.com", "password": "Demo@1234"},
    )
    expect("login seeded admin", response, 200)
    admin = {"Authorization": f"Bearer {response.json()['tokens']['access_token']}"}

    for endpoint in (
        "roles", "users", "audit-logs", "audit-logs/actions", "system/settings",
        "system/health", "system/errors", "system/role-matrix",
    ):
        expect(f"GET /admin/{endpoint}", client.get(f"/api/v1/admin/{endpoint}", headers=admin), 200)

    response = client.get("/api/v1/admin/audit-logs?page_size=50", headers=admin)
    actions = {row["action"] for row in response.json()["items"]}
    check(
        "audit trail records key operations",
        bool({"LOGIN", "CREATE", "IMAGE_ANALYSIS", "REPORT_GENERATE"} & actions),
        f"recorded: {sorted(actions)[:8]}",
    )
    expect(
        "POST /admin/system/reload-models",
        client.post("/api/v1/admin/system/reload-models", headers=admin),
        200,
    )
    response = client.get("/api/v1/analytics/platform", headers=admin)
    expect("GET /analytics/platform", response, 200)
    check(
        "platform stats include users by role and ML provenance",
        "by_role" in response.json()["users"] and "roles" in response.json()["ml"],
        f"{response.json()['users']['total']} users, "
        f"{response.json()['analysis']['assessments']} assessments",
    )

    # ------------------------------------------------------------ cleanup
    section("Cleanup")
    expect(
        "DELETE /batches/{id} (archive)",
        client.delete(f"/api/v1/batches/{batch_id}", headers=manager),
        200,
    )

    # ------------------------------------------------------------ summary
    print("\n" + "=" * 74)
    print(f" E2E SMOKE: {len(PASSED)} passed, {len(FAILED)} failed")
    if FAILED:
        print(" Failures:")
        for name in FAILED:
            print(f"   - {name}")
    print("=" * 74)
    return 1 if FAILED else 0


if __name__ == "__main__":
    sys.exit(main())
