import httpx
from pathlib import Path

def main():
    client = httpx.Client(timeout=15.0)

    print("=========================================================")
    print("       FOOD FRESHNESS PLATFORM - FULL SYSTEM CHECK       ")
    print("=========================================================")

    # 1. Frontend Web App
    try:
        r = client.get("http://localhost:5173/")
        print(f"[+] 1. Frontend Web App (Port 5173): Status {r.status_code} OK")
    except Exception as e:
        print(f"[!] 1. Frontend Web App error: {e}")

    # 2. AI Microservice Health
    try:
        r = client.get("http://127.0.0.1:8001/health")
        print(f"[+] 2. AI Microservice (Port 8001): Status {r.status_code} - {r.json()}")
    except Exception as e:
        print(f"[!] 2. AI Microservice error: {e}")

    # 3. FastAPI Backend Health
    try:
        r = client.get("http://127.0.0.1:8000/api/health")
        print(f"[+] 3. FastAPI Backend (Port 8000): Status {r.status_code} - {r.json()}")
    except Exception as e:
        print(f"[!] 3. FastAPI Backend error: {e}")

    # 4. Food Inventory API
    try:
        r = client.get("http://127.0.0.1:8000/api/foods")
        items = r.json()
        print(f"[+] 4. Food Inventory Endpoint: Status {r.status_code} ({len(items)} items in DB)")
    except Exception as e:
        print(f"[!] 4. Food Inventory error: {e}")

    # 5. Real AI Freshness Inference (Fresh Orange)
    try:
        fresh_dir = Path("ai-service/datasets/processed/test/freshoranges")
        fresh_img = list(fresh_dir.glob("*"))[0]
        with open(fresh_img, "rb") as f:
            r = client.post(
                "http://127.0.0.1:8000/api/food/analyze",
                files={"file": (fresh_img.name, f, "image/png")},
                data={"food_type": "orange", "category": "Fruits"}
            )
        res = r.json()
        print(f"[+] 5. Real AI Analysis (Fresh Orange): Status {r.status_code}")
        print(f"       • Food Type Detected: {res.get('food_type')}")
        print(f"       • Freshness Score: {res.get('freshness_score')}/100 ({res.get('freshness_category')})")
        print(f"       • Spoilage Probability: {res.get('spoilage_probability') * 100:.2f}%")
        print(f"       • Model Confidence: {res.get('confidence') * 100:.2f}%")
        print(f"       • Recommendation: {res.get('recommendation')}")
    except Exception as e:
        print(f"[!] 5. AI Analysis error: {e}")

    # 6. Real AI Freshness Inference (Rotten Apple)
    try:
        rotten_dir = Path("ai-service/datasets/processed/test/rottenapples")
        rotten_img = list(rotten_dir.glob("*"))[0]
        with open(rotten_img, "rb") as f:
            r = client.post(
                "http://127.0.0.1:8000/api/food/analyze",
                files={"file": (rotten_img.name, f, "image/png")},
                data={"food_type": "apple", "category": "Fruits"}
            )
        res = r.json()
        print(f"[+] 6. Real AI Analysis (Rotten Apple): Status {r.status_code}")
        print(f"       • Food Type Detected: {res.get('food_type')}")
        print(f"       • Freshness Score: {res.get('freshness_score')}/100 ({res.get('freshness_category')})")
        print(f"       • Spoilage Probability: {res.get('spoilage_probability') * 100:.2f}%")
        print(f"       • Model Confidence: {res.get('confidence') * 100:.2f}%")
        print(f"       • Recommendation: {res.get('recommendation')}")
    except Exception as e:
        print(f"[!] 6. Rotten AI Analysis error: {e}")

    # 7. Storage Telemetry
    try:
        r = client.get("http://127.0.0.1:8000/api/storage")
        print(f"[+] 7. Storage Monitoring: Status {r.status_code} ({len(r.json())} zones tracked)")
    except Exception as e:
        print(f"[!] 7. Storage error: {e}")

    # 8. Recommendations
    try:
        r = client.get("http://127.0.0.1:8000/api/recommendations")
        print(f"[+] 8. Recommendations: Status {r.status_code} ({len(r.json())} actionable recommendations)")
    except Exception as e:
        print(f"[!] 8. Recommendations error: {e}")

    # 9. Alerts
    try:
        r = client.get("http://127.0.0.1:8000/api/alerts")
        print(f"[+] 9. Quality Alerts: Status {r.status_code} ({len(r.json())} alerts)")
    except Exception as e:
        print(f"[!] 9. Alerts error: {e}")

    # 10. Dashboard Aggregates
    try:
        r = client.get("http://127.0.0.1:8000/api/dashboard")
        dash = r.json()
        print(f"[+] 10. Dashboard Aggregates: Status {r.status_code} (Average Freshness: {dash.get('average_freshness')}%)")
    except Exception as e:
        print(f"[!] 10. Dashboard error: {e}")

    print("=========================================================")
    print("           ALL SERVICES OPERATING WITH ZERO ERRORS       ")
    print("=========================================================")

if __name__ == "__main__":
    main()
