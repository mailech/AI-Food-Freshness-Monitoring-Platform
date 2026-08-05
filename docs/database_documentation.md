# Database Documentation — AI Food Freshness Monitoring Platform

## PostgreSQL Schema

### Entity Relationship Overview

```
users (1) ──────────────── (N) inventory_items
food_categories (1) ─────── (N) inventory_items
food_categories (1) ─────── (N) batches
batches (1) ─────────────── (N) inventory_items
inventory_items (1) ────────(N) storage_logs
inventory_items (1) ────────(N) analysis_results
```

### Table Definitions

#### `users`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK, default uuid_generate_v4() | Unique identifier |
| name | VARCHAR(255) | NOT NULL | Full display name |
| email | VARCHAR(255) | UNIQUE, NOT NULL, INDEX | Login identifier |
| password_hash | VARCHAR(255) | NOT NULL | bcrypt hash |
| role | VARCHAR(50) | CHECK IN (...) | admin / consumer / retail_manager / warehouse_operator / food_inspector |
| is_active | BOOLEAN | DEFAULT TRUE | Account active state |
| created_at | TIMESTAMPTZ | DEFAULT NOW() | Creation time |
| updated_at | TIMESTAMPTZ | AUTO ON UPDATE | Last modification |

#### `food_categories`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| name | VARCHAR(100) | UNIQUE, CHECK IN (10 types) | Category name |
| ideal_temp_min | NUMERIC(5,2) | NOT NULL | Celsius lower bound |
| ideal_temp_max | NUMERIC(5,2) | NOT NULL | Celsius upper bound |
| ideal_humidity_min | NUMERIC(5,2) | NOT NULL | Percentage lower bound |
| ideal_humidity_max | NUMERIC(5,2) | NOT NULL | Percentage upper bound |
| base_shelf_life_days | INTEGER | NOT NULL | Days under ideal conditions |

#### `batches`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| batch_number | VARCHAR(100) | UNIQUE, INDEX | Supplier lot number |
| category_id | UUID | FK → food_categories | Category reference |
| supplier_name | VARCHAR(255) | NOT NULL | Vendor name |
| received_date | TIMESTAMPTZ | DEFAULT NOW() | Arrival date |
| notes | TEXT | NULLABLE | Free-text remarks |

#### `inventory_items`
| Column | Type | Constraints | Description |
|--------|------|-------------|-------------|
| id | UUID | PK | Unique identifier |
| name | VARCHAR(255) | NOT NULL | Item description |
| category_id | UUID | FK → food_categories | Food type |
| user_id | UUID | FK → users (SET NULL) | Owner |
| batch_id | UUID | FK → batches (SET NULL) | Supplier batch |
| quantity | NUMERIC(10,2) | DEFAULT 1.0 | Amount |
| unit | VARCHAR(20) | DEFAULT 'pcs' | Unit of measure |
| expiry_date | TIMESTAMPTZ | NOT NULL | Expected expiry |
| status | VARCHAR(50) | CHECK IN (Fresh/Decaying/Spoiled/Expired) | Current state |
| freshness_score | INTEGER | CHECK 0-100 | Composite score |
| storage_temp | NUMERIC(5,2) | NULLABLE | Current ambient °C |
| storage_humidity | NUMERIC(5,2) | NULLABLE | Current ambient % |

#### `storage_logs`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | Unique identifier |
| inventory_item_id | UUID FK → inventory_items | Parent item |
| temperature | NUMERIC(5,2) | Recorded °C |
| humidity | NUMERIC(5,2) | Recorded % |
| recorded_at | TIMESTAMPTZ | Sensor timestamp |

#### `analysis_results`
| Column | Type | Description |
|--------|------|-------------|
| id | UUID PK | Unique identifier |
| inventory_item_id | UUID FK | Associated item |
| image_url | VARCHAR(500) | Uploaded image path |
| color_score | NUMERIC(5,2) | Color freshness index 0-100 |
| texture_score | NUMERIC(5,2) | Texture softness index 0-100 |
| mold_detected | BOOLEAN | Mold patch presence |
| bruise_detected | BOOLEAN | Bruise compression detected |
| damage_detected | BOOLEAN | Surface damage flag |
| freshness_score | INTEGER | Composite AI freshness 0-100 |
| spoilage_probability | NUMERIC(5,4) | CNN softmax probability 0.0-1.0 |
| remaining_shelf_life_days | NUMERIC(6,2) | Regressor predicted days |
| analyzed_at | TIMESTAMPTZ | Analysis timestamp |

---

## Indexes

```sql
-- Fast user lookups
idx_users_email         ON users(email)
idx_users_role          ON users(role)

-- Batch filtering
idx_batches_number      ON batches(batch_number)

-- Inventory queries
idx_inventory_status    ON inventory_items(status)
idx_inventory_expiry    ON inventory_items(expiry_date)
idx_inventory_user      ON inventory_items(user_id)

-- Time-series sensor queries
idx_storage_logs_item     ON storage_logs(inventory_item_id)
idx_storage_logs_recorded ON storage_logs(recorded_at)

-- Analysis lookups
idx_analysis_item       ON analysis_results(inventory_item_id)
```

---

## Views

### `inventory_summary_view`
Joins `inventory_items` with latest `analysis_results` (using LATERAL subquery), category name, batch details, and owner info. Used for the comprehensive inventory listing endpoint.

---

## Triggers

### `trigger_sync_inventory_status`
Fires `AFTER INSERT ON analysis_results`. Reads the new `freshness_score` and automatically updates the parent `inventory_item.status`:
- Score ≥ 70 → `Fresh`
- Score 40-69 → `Decaying`  
- Score < 40 → `Spoiled`

### `update_*_modtime` triggers
Auto-update `updated_at` timestamp on any row change for `users`, `batches`, `inventory_items`.

---

## Stored Procedures

### `auto_mark_expired_items()`
Can be called periodically (via cron or Celery beat) to mark all items where `expiry_date < NOW()` as `Expired` with `freshness_score = 0`.

---

## MongoDB Collections

### `activity_logs`
```json
{
  "user_id": "uuid-string",
  "action": "USER_REGISTERED | USER_LOGIN | INVENTORY_CREATED | ...",
  "details": "Human-readable description",
  "timestamp": ISODate
}
```
Indexes: `{user_id, timestamp}`, `{action}`

### `api_monitoring`
```json
{
  "endpoint": "/api/predict/upload",
  "method": "POST",
  "status_code": 200,
  "latency_ms": 128.5,
  "timestamp": ISODate
}
```
Indexes: `{timestamp}`, `{endpoint, status_code}`, TTL on timestamp

### `model_performance`
```json
{
  "model_name": "FoodFreshnessCNN",
  "predicted_category": "Fruits",
  "freshness_score": 85,
  "spoilage_probability": 0.05,
  "remaining_shelf_life_days": 8.5,
  "timestamp": ISODate
}
```
Index: `{model_name, timestamp}`

### `notifications`
```json
{
  "user_id": "uuid-string",
  "title": "Freshness Alert: Bananas",
  "message": "Item flagged as Decaying with score 45%",
  "channel": "Spoilage Alert",
  "is_read": false,
  "created_at": ISODate,
  "expires_at": ISODate  // TTL index for auto-cleanup
}
```
Index: `{user_id, is_read, created_at}`, TTL on `expires_at`
