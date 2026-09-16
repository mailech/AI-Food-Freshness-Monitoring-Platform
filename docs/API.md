# FreshLens — REST API Documentation

This document summarizes the core REST API endpoints available under `/api/v1`.

---

## 1. Authentication (`/api/v1/auth`)

- `POST /api/v1/auth/register`: Register a new user (`email`, `password`, `full_name`, `role`).
- `POST /api/v1/auth/token`: Authenticate user and receive OAuth2 HMAC JWT token (`username`, `password`).
- `GET /api/v1/auth/me`: Fetch profile details for the authenticated user.

---

## 2. Inventory & Batches (`/api/v1/inventory`)

- `GET /api/v1/inventory/batches`: List all registered supply lots.
- `POST /api/v1/inventory/batches`: Register a new supply lot (`batch_number`, `supplier_name`, `received_date`).
- `GET /api/v1/inventory/items`: List registered inventory items with optional filters (`category`, `status`, `search`).
- `POST /api/v1/inventory/items`: Create a new food inventory item (`name`, `category`, `batch_id`, `quantity`, `unit`, `packaging_type`, `expiry_date`, `storage_location`).
- `GET /api/v1/inventory/items/{item_id}`: Retrieve single item details.
- `PUT /api/v1/inventory/items/{item_id}`: Update inventory item parameters.
- `DELETE /api/v1/inventory/items/{item_id}`: Remove item from inventory.

---

## 3. Storage Telemetry (`/api/v1/storage`)

- `POST /api/v1/storage/reading`: Ingest sensor telemetry log (`item_id`, `temperature`, `humidity`, `air_circulation`, `light_exposure`). Returns `StorageComplianceReport`.
- `GET /api/v1/storage/item/{item_id}`: Fetch the latest storage compliance report for an inventory item.
- `GET /api/v1/storage/item/{item_id}/history`: Retrieve telemetry reading logs history for an item.

---

## 4. Computer Vision Image Analysis (`/api/v1/image-analysis`)

- `POST /api/v1/image-analysis/upload`: Upload visual specimen photograph (`file`, `item_id`). Returns computer vision analysis report (`freshness_score`, `color_degradation`, `texture_roughness`, `mold_detected`, `bruising_detected`, `damage_detected`).
- `GET /api/v1/image-analysis/item/{item_id}`: Fetch all historical visual scan reports for an item.

---

## 5. Food Quality Inspection Audit (`/api/v1/inspection`)

- `POST /api/v1/inspection/`: Execute official quality inspection audit (`product_name`, `category`, `packaging_type`, `storage_location`, `storage_temperature`, `humidity`, `air_circulation`, `light_exposure`, `storage_duration_days`, `status_in`, `remarks`, `action_taken`, optional `file`). Restricted to `FOOD_QUALITY_INSPECTOR` and `ADMINISTRATOR`.
- `GET /api/v1/inspection/dashboard`: Fetch inspector summary metrics and recent audit records.
- `GET /api/v1/inspection/list`: List quality inspection records with status filters.
- `GET /api/v1/inspection/{inspection_id}`: Fetch detailed record for a specific audit.

---

## 6. Freshness Scoring & Shelf Life (`/api/v1/scoring`, `/api/v1/shelf-life`)

- `GET /api/v1/scoring/item/{item_id}`: Compute 4-part weighted freshness score breakdown (Visual 40%, Storage 25%, Shelf-Life 20%, Age 15%) and return overall health score and classification.
- `POST /api/v1/shelf-life/predict`: Run the multi-factor prediction pipeline on custom parameters (`category`, `packaging_type`, `temperature`, `humidity`, `air_circulation`, `light_exposure`, `storage_duration_days`, `visual_freshness_score`).

---

## 7. Recommendations Engine (`/api/v1/recommendation`)

- `GET /api/v1/recommendation/item/{item_id}`: Fetch targeted advisories (storage adjustments, consumption urgency, FEFO inventory rotation, waste reduction options, quality improvements).
- `GET /api/v1/recommendation/batch/{batch_id}`: Fetch aggregated recommendation summary for an entire batch lot.

---

## 8. Reports & File Exports (`/api/v1/report`)

- `GET /api/v1/report/preview`: Get JSON preview data for reports (`report_type`: freshness, shelf-life, quality, waste, storage).
- `GET /api/v1/report/export`: Download formatted report exports. Parameters: `report_type` and `format` (`pdf` or `excel`).
