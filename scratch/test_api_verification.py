import json
import urllib.request
import urllib.parse
from datetime import datetime, timezone

BASE_API = "http://localhost:8000"

def post_json(endpoint, data, token=None):
    req = urllib.request.Request(
        f"{BASE_API}{endpoint}",
        data=json.dumps(data).encode("utf-8"),
        headers={
            "Content-Type": "application/json",
            **({"Authorization": f"Bearer {token}"} if token else {})
        }
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

def get_json(endpoint, token=None):
    req = urllib.request.Request(
        f"{BASE_API}{endpoint}",
        headers={
            "Content-Type": "application/json",
            **({"Authorization": f"Bearer {token}"} if token else {})
        }
    )
    with urllib.request.urlopen(req) as resp:
        return json.loads(resp.read().decode())

print("=== 1. Testing Login for consumer@freshos.com ===")
login_resp = post_json("/auth/login", {
    "email": "consumer@freshos.com",
    "password": "Password123!",
    "remember_me": True
})
token = login_resp["access_token"]
user = login_resp["user"]
print(f"Login success! User: {user['email']}, Role: {user['role']}, Name: {user['full_name']}")

# Check token expiry by decoding JWT payload
import base64
payload_b64 = token.split(".")[1] + "=="
payload = json.loads(base64.urlsafe_b64decode(payload_b64.encode()).decode())
exp_dt = datetime.fromtimestamp(payload["exp"], timezone.utc)
now_dt = datetime.now(timezone.utc)
days_valid = (exp_dt - now_dt).total_seconds() / 86400
print(f"Token exp timestamp: {exp_dt.isoformat()}, Valid for: {days_valid:.1f} days (Expected ~30 days)")
assert days_valid >= 29, f"Token lifetime too short: {days_valid} days"

print("\n=== 2. Testing /auth/me ===")
me_resp = get_json("/auth/me", token)
print(f"/auth/me returned user: {me_resp['email']}, id={me_resp['id']}")
assert me_resp["email"] == "consumer@freshos.com"

print("\n=== 3. Testing Personal Storage Retrieval ===")
personal_data = get_json("/inventory/storage", token)
personal_items = personal_data["items"]
print(f"Found {len(personal_items)} personal storage items (Total: {personal_data['total']}):")
for item in personal_items:
    print(f" - [{item['batch_id']}] {item['name']}: {item['freshness_status']} (Score: {item['freshness_score']}%), Shelf Life: {item['estimated_expiry_days']} days, Created: {item['created_at']}")

print("\n=== 4. Testing Consumer Dashboard Summary ===")
dash_summary = get_json("/dashboard/summary", token)
print(f"Dashboard total_inventory_count: {dash_summary['total_inventory_count']}")
print(f"Dashboard avg_freshness_score: {dash_summary['avg_freshness_score']}%")
print(f"Dashboard recent_items count: {len(dash_summary['recent_items'])}")
for r in dash_summary['recent_items']:
    print(f" - Recent: {r['name']} ({r['freshness_status']}, {r['estimated_expiry_days']} days)")

print("\n=== 5. Testing Adding an Item to Personal Storage ===")
new_item_payload = {
    "name": "Avocado Hass",
    "batch_id": f"AVO-{int(datetime.now().timestamp())}",
    "category": "Produce",
    "quantity": 3.0,
    "unit": "pieces",
    "freshness_status": "Fresh",
    "freshness_score": 96.0,
    "storage_temperature": 5.0,
    "humidity": 80.0
}
added_item = post_json("/inventory/storage", new_item_payload, token)
print(f"Added item ID: {added_item['id']}, Name: {added_item['name']}, is_personal={added_item['is_personal']}")

# Fetch personal items again
updated_data = get_json("/inventory/storage", token)
updated_items = updated_data["items"]
assert any(i["id"] == added_item["id"] for i in updated_items), "Newly added item not found in personal storage!"
print(f"Verified! Newly added item {added_item['name']} is safely stored in personal storage (Total items: {len(updated_items)})")

print("\n=== 6. Testing Login for custom user bvc@gmail.com ===")
bvc_login = post_json("/auth/login", {
    "email": "bvc@gmail.com",
    "password": "Password123!",
    "remember_me": True
})
bvc_token = bvc_login["access_token"]
bvc_user = bvc_login["user"]
print(f"Login success! User: {bvc_user['email']}, Role: {bvc_user['role']}")

bvc_data = get_json("/inventory/storage", bvc_token)
bvc_items = bvc_data["items"]
print(f"bvc@gmail.com personal storage count: {len(bvc_items)}")
for it in bvc_items:
    print(f" - {it['name']} ({it['freshness_status']}, {it['estimated_expiry_days']} days left)")

print("\nALL API VERIFICATION CHECKS PASSED SUCCESSFULLY!")
