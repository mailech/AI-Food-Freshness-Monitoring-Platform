# AI Food Freshness Monitoring Platform — API Reference

Version: `1.0.0`

Generated from the application's OpenAPI schema (`GET /openapi.json`).
Interactive docs are served at `/docs` (Swagger UI) and `/redoc`.
To regenerate this file: `python scripts/generate_api_docs.py`

All versioned endpoints live under `/api/v1`. JWT bearer auth is
required except for `/health`, `/auth/register`, `/auth/login`,
`/auth/google` and `/auth/oauth/config`.

## Contents

- [Administration](#administration)
- [Alerts](#alerts)
- [Analysis](#analysis)
- [Analytics](#analytics)
- [Authentication](#authentication)
- [Batches](#batches)
- [Catalogue](#catalogue)
- [Images](#images)
- [Inventory](#inventory)
- [Notifications](#notifications)
- [Recommendations](#recommendations)
- [Reports](#reports)
- [Storage Monitoring](#storage-monitoring)
- [System](#system)
- [Users](#users)

## Administration

### `GET /api/v1/admin/audit-logs`

*Audit trail*

Append-only record of logins, data changes, analyses, report generation and administrative actions.


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `user_id` | query | no |  |
| `action` | query | no |  |
| `entity_type` | query | no |  |
| `page` | query | no | 1-based page number (default: `1`) |
| `page_size` | query | no | Items per page (default: `20`) |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `GET /api/v1/admin/audit-logs/actions`

*Audit action types*


**Responses:**
- `200` — Successful Response

### `GET /api/v1/admin/roles`

*Roles and their permissions*


**Responses:**
- `200` — Successful Response

### `GET /api/v1/admin/system/errors`

*Recent failed operations*

Derived from the audit trail (entries with success=false).


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `limit` | query | no | (default: `25`) |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `GET /api/v1/admin/system/health`

*Detailed system health (admin)*


**Responses:**
- `200` — Successful Response

### `POST /api/v1/admin/system/reload-models`

*Reload ML artefacts*

Re-scans MODEL_PATH so a newly trained artefact can be picked up without restarting the service.


**Responses:**
- `200` — Successful Response

### `GET /api/v1/admin/system/role-matrix`

*Role / permission matrix*

The authoritative backend grant table. The frontend mirrors it for UI convenience only.


**Responses:**
- `200` — Successful Response

### `GET /api/v1/admin/system/settings`

*Effective system settings*

Non-secret configuration. Secrets are never returned.


**Responses:**
- `200` — Successful Response

### `GET /api/v1/admin/users`

*List users*


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `q` | query | no | Search email, username or name |
| `role` | query | no |  |
| `is_active` | query | no |  |
| `sort_by` | query | no | (default: `created_at`) |
| `sort_dir` | query | no | (default: `desc`) |
| `page` | query | no | 1-based page number (default: `1`) |
| `page_size` | query | no | Items per page (default: `20`) |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `POST /api/v1/admin/users`

*Create a user (any role, including ADMIN)*


**Responses:**
- `201` — Successful Response
- `422` — Validation Error

### `DELETE /api/v1/admin/users/{user_id}`

*Deactivate a user*


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `user_id` | path | yes |  |
| `hard` | query | no | Permanently delete instead of deactivating (default: `False`) |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `GET /api/v1/admin/users/{user_id}`

*Get a user*


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `user_id` | path | yes |  |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `PUT /api/v1/admin/users/{user_id}`

*Update a user*


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `user_id` | path | yes |  |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `POST /api/v1/admin/users/{user_id}/password`

*Reset a user's password*


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `user_id` | path | yes |  |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

## Alerts

### `GET /api/v1/alerts`

*List alerts*

Filter by type, severity, read/resolved state and batch.


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `alert_type` | query | no |  |
| `severity` | query | no |  |
| `is_read` | query | no |  |
| `resolved` | query | no |  |
| `batch_id` | query | no |  |
| `sort_dir` | query | no | (default: `desc`) |
| `page` | query | no | 1-based page number (default: `1`) |
| `page_size` | query | no | Items per page (default: `20`) |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `POST /api/v1/alerts/read-all`

*Mark all alerts read*


**Responses:**
- `200` — Successful Response

### `POST /api/v1/alerts/scan`

*Re-scan all batches for alert conditions*

Sweeps every active batch and refreshes expiry, shelf-life and storage alerts. In production this would run on a schedule.


**Responses:**
- `200` — Successful Response

### `GET /api/v1/alerts/summary`

*Alert counters*


**Responses:**
- `200` — Successful Response

### `GET /api/v1/alerts/types`

*Alert type catalogue*


**Responses:**
- `200` — Successful Response

### `GET /api/v1/alerts/{alert_id}`

*Get an alert*


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `alert_id` | path | yes |  |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `PATCH /api/v1/alerts/{alert_id}`

*Mark an alert read and/or resolved*


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `alert_id` | path | yes |  |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

## Analysis

### `GET /api/v1/analysis`

*Recent analyses*


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `limit` | query | no | (default: `20`) |
| `batch_id` | query | no |  |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `POST /api/v1/analysis/image`

*Upload an image and run the full freshness analysis*

One-shot endpoint for the analysis workflow: uploads the image, runs the vision pipeline (colour, texture, spoilage detection), computes the weighted freshness score, predicts remaining shelf life, generates recommendations and raises any alerts.  In DEMO_MODE the vision components are transparent OpenCV baselines - the response is labelled accordingly via `analysis_label` and `assessment.model`.


**Responses:**
- `201` — Successful Response
- `422` — Validation Error

### `POST /api/v1/analysis/run`

*Run analysis on an already-uploaded image (JSON body)*


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `GET /api/v1/analysis/{assessment_id}`

*Retrieve a stored analysis*

Reads the persisted result - inference is never re-run.


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `assessment_id` | path | yes |  |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `GET /api/v1/freshness/{batch_id}`

*Latest freshness assessment for a batch*


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `batch_id` | path | yes |  |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `GET /api/v1/freshness/{batch_id}/trend`

*Freshness trend for a batch*


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `batch_id` | path | yes |  |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `GET /api/v1/shelf-life/{batch_id}`

*Shelf-life prediction for a batch*

Returns the stored prediction plus its factor breakdown. Baseline predictions are clearly labelled as such.


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `batch_id` | path | yes |  |
| `refresh` | query | no | Recompute from the current storage state. (default: `False`) |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `GET /api/v1/shelf-life/{batch_id}/projection`

*Shelf-life forward projection for a batch*

Projects remaining shelf life day by day over the requested horizon by re-running the active shelf-life model with advancing storage duration and product age. Storage conditions are held constant at the latest recorded state.


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `batch_id` | path | yes |  |
| `days` | query | no | Projection horizon in days. (default: `14`) |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

## Analytics

### `GET /api/v1/analytics`

*Full analytics payload*


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `days` | query | no | (default: `30`) |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `GET /api/v1/analytics/alert-trends`

*Alert trends*


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `days` | query | no | (default: `30`) |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `GET /api/v1/analytics/category-quality`

*Category-level quality*


**Responses:**
- `200` — Successful Response

### `GET /api/v1/analytics/dashboard`

*Role-aware dashboard payload*

Returns exactly the blocks the caller's dashboard needs:  * CONSUMER - inventory overview, upcoming expiries, recommendations, rotation * RETAIL_MANAGER - freshness distribution, trends, waste risk, category quality * WAREHOUSE_OPERATOR - storage compliance, environment trends, locations * QUALITY_INSPECTOR - inspection queue, indicator summary, spoilage metrics * ADMIN - platform stats, users by role, system/ML status


**Responses:**
- `200` — Successful Response

### `GET /api/v1/analytics/environment-trends`

*Temperature and humidity trends*


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `days` | query | no | (default: `14`) |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `GET /api/v1/analytics/freshness-distribution`

*Freshness distribution*


**Responses:**
- `200` — Successful Response

### `GET /api/v1/analytics/freshness-trend`

*Average freshness over time*


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `days` | query | no | (default: `30`) |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `GET /api/v1/analytics/indicators`

*Spoilage indicator frequency*


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `days` | query | no | (default: `30`) |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `GET /api/v1/analytics/inspection-queue`

*Batches needing inspection*


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `limit` | query | no | (default: `20`) |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `GET /api/v1/analytics/inventory-health`

*Inventory health*


**Responses:**
- `200` — Successful Response

### `GET /api/v1/analytics/platform`

*Platform statistics (admin)*


**Responses:**
- `200` — Successful Response

### `GET /api/v1/analytics/shelf-life-distribution`

*Shelf-life distribution*


**Responses:**
- `200` — Successful Response

### `GET /api/v1/analytics/spoilage`

*Spoilage metrics*


**Responses:**
- `200` — Successful Response

### `GET /api/v1/analytics/storage-compliance`

*Storage compliance summary*


**Responses:**
- `200` — Successful Response

### `GET /api/v1/analytics/waste-risk`

*Waste risk and value at risk*


**Responses:**
- `200` — Successful Response

## Authentication

### `POST /api/v1/auth/change-password`

*Change your password*


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `POST /api/v1/auth/google`

*Sign in with Google (Consumer)*

Verifies a Google Identity Services ID token, then gets-or-creates the linked CONSUMER account and returns a standard token pair. New accounts created this way are assigned the CONSUMER role.


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `POST /api/v1/auth/login`

*Log in with email/username and password*


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `POST /api/v1/auth/logout`

*Revoke refresh token(s)*


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `GET /api/v1/auth/me`

*Current authenticated user*


**Responses:**
- `200` — Successful Response

### `GET /api/v1/auth/oauth/config`

*OAuth2 availability for this deployment*


**Responses:**
- `200` — Successful Response

### `POST /api/v1/auth/refresh`

*Rotate an expired access token*


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `POST /api/v1/auth/register`

*Register a new account*

Creates a user with one of the self-service roles (CONSUMER, RETAIL_MANAGER, WAREHOUSE_OPERATOR, QUALITY_INSPECTOR) and returns a ready-to-use token pair. ADMIN accounts can only be created by an existing administrator via `POST /admin/users`.


**Responses:**
- `201` — Successful Response
- `422` — Validation Error

### `POST /api/v1/auth/token`

*OAuth2 password-flow token endpoint*

Form-encoded endpoint used by the Swagger 'Authorize' button.


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

## Batches

### `GET /api/v1/batches`

*List / search batches*

Full search surface: free text, category, status, freshness band, storage location, batch number, expiry window and purchase-date range, with sorting and pagination. Consumers only ever see their own batches.


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `q` | query | no | Free-text search |
| `product_id` | query | no |  |
| `category_slug` | query | no |  |
| `status` | query | no |  |
| `freshness_category` | query | no |  |
| `storage_location` | query | no |  |
| `batch_number` | query | no |  |
| `expiring_within_days` | query | no |  |
| `expired` | query | no |  |
| `purchased_from` | query | no |  |
| `purchased_to` | query | no |  |
| `min_freshness` | query | no |  |
| `max_freshness` | query | no |  |
| `include_archived` | query | no | (default: `False`) |
| `sort_by` | query | no | (default: `created_at`) |
| `sort_dir` | query | no | (default: `desc`) |
| `page` | query | no | 1-based page number (default: `1`) |
| `page_size` | query | no | Items per page (default: `20`) |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `POST /api/v1/batches`

*Create a batch*

Auto-generates a batch number and a provisional expiry date when they are not supplied, and can add the batch to your inventory in one step.


**Responses:**
- `201` — Successful Response
- `422` — Validation Error

### `GET /api/v1/batches/rotation`

*FIFO / FEFO rotation plan*

Ranked pick list. Higher rotation priority means the batch should be used or sold sooner.


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `strategy` | query | no | (default: `FEFO`) |
| `storage_location` | query | no |  |
| `category_slug` | query | no |  |
| `limit` | query | no | (default: `50`) |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `DELETE /api/v1/batches/{batch_id}`

*Archive (or permanently delete) a batch*


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `batch_id` | path | yes |  |
| `hard` | query | no | Admins only: permanently delete instead of archiving. (default: `False`) |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `GET /api/v1/batches/{batch_id}`

*Batch detail with latest analysis and recommendations*


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `batch_id` | path | yes |  |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `PUT /api/v1/batches/{batch_id}`

*Update a batch*


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `batch_id` | path | yes |  |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `GET /api/v1/batches/{batch_id}/assessments`

*Freshness assessment history for a batch*


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `batch_id` | path | yes |  |
| `limit` | query | no | (default: `30`) |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `PATCH /api/v1/batches/{batch_id}/quantity`

*Adjust batch quantity*


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `batch_id` | path | yes |  |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

## Catalogue

### `GET /api/v1/categories`

*List food categories*

Returns every category with its effective storage envelope (code defaults merged with any deployment override).


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `include_inactive` | query | no | (default: `False`) |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `POST /api/v1/categories`

*Create a category (admin)*


**Responses:**
- `201` — Successful Response
- `422` — Validation Error

### `GET /api/v1/categories/{slug}`

*Get one category*


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `slug` | path | yes |  |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `PUT /api/v1/categories/{slug}`

*Update a category's thresholds (admin)*


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `slug` | path | yes |  |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `GET /api/v1/products`

*List / search products*

Supports free-text search, category filter, sorting and pagination.


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `q` | query | no | Free-text search |
| `category_id` | query | no |  |
| `category_slug` | query | no |  |
| `brand` | query | no |  |
| `is_active` | query | no | (default: `True`) |
| `sort_by` | query | no | (default: `name`) |
| `sort_dir` | query | no | (default: `asc`) |
| `page` | query | no | 1-based page number (default: `1`) |
| `page_size` | query | no | Items per page (default: `20`) |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `POST /api/v1/products`

*Create a product*


**Responses:**
- `201` — Successful Response
- `422` — Validation Error

### `DELETE /api/v1/products/{product_id}`

*Delete a product*

Products with existing batches are deactivated instead of deleted so that analysis history is preserved.


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `product_id` | path | yes |  |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `GET /api/v1/products/{product_id}`

*Get a product*


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `product_id` | path | yes |  |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `PUT /api/v1/products/{product_id}`

*Update a product*


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `product_id` | path | yes |  |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

## Images

### `GET /api/v1/images`

*List images*


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `batch_id` | query | no |  |
| `analyzed` | query | no |  |
| `mine` | query | no | Only images I uploaded (default: `False`) |
| `page` | query | no | 1-based page number (default: `1`) |
| `page_size` | query | no | Items per page (default: `20`) |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `POST /api/v1/images`

*Upload a food image*

Accepts JPG/JPEG/PNG only. Validation checks the declared MIME type, the file extension **and** the actual magic bytes, so a renamed executable is rejected. Filenames are sanitised and the stored key is generated server-side.


**Responses:**
- `201` — Successful Response
- `422` — Validation Error

### `GET /api/v1/images/config`

*Upload constraints for this deployment*


**Responses:**
- `200` — Successful Response

### `GET /api/v1/images/file/{storage_key}`

*Download an image file*

Serves the stored bytes. Requires authentication so uploads are not publicly enumerable.


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `storage_key` | path | yes |  |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `DELETE /api/v1/images/{image_id}`

*Delete an image*


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `image_id` | path | yes |  |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `GET /api/v1/images/{image_id}`

*Get image metadata*


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `image_id` | path | yes |  |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

## Inventory

### `GET /api/v1/inventory`

*List my inventory*

Search, category/status/location filters, expiry window, sorting and pagination. Privileged roles may pass `owner_id` to inspect another user's holdings.


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `q` | query | no |  |
| `status` | query | no |  |
| `category_slug` | query | no |  |
| `storage_location` | query | no |  |
| `expiring_within_days` | query | no |  |
| `include_consumed` | query | no | (default: `False`) |
| `include_discarded` | query | no | (default: `False`) |
| `owner_id` | query | no | Privileged roles only |
| `sort_by` | query | no | (default: `expected_expiry_date`) |
| `sort_dir` | query | no | (default: `asc`) |
| `page` | query | no | 1-based page number (default: `1`) |
| `page_size` | query | no | Items per page (default: `20`) |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `POST /api/v1/inventory`

*Add a batch to my inventory*


**Responses:**
- `201` — Successful Response
- `422` — Validation Error

### `GET /api/v1/inventory/locations`

*Distinct storage locations*


**Responses:**
- `200` — Successful Response

### `GET /api/v1/inventory/summary`

*Inventory status counts and health index*


**Responses:**
- `200` — Successful Response

### `DELETE /api/v1/inventory/{item_id}`

*Remove an inventory item*


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `item_id` | path | yes |  |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `GET /api/v1/inventory/{item_id}`

*Get an inventory item*


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `item_id` | path | yes |  |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `PUT /api/v1/inventory/{item_id}`

*Update an inventory item*


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `item_id` | path | yes |  |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `POST /api/v1/inventory/{item_id}/consume`

*Mark an item consumed (fully or partially)*


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `item_id` | path | yes |  |
| `quantity` | query | no | Omit to consume everything |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `POST /api/v1/inventory/{item_id}/discard`

*Mark an item discarded (waste tracking)*


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `item_id` | path | yes |  |
| `reason` | query | no |  |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

## Notifications

### `GET /api/v1/notifications`

*My notification centre*


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `unread_only` | query | no | (default: `False`) |
| `notification_type` | query | no |  |
| `page` | query | no | 1-based page number (default: `1`) |
| `page_size` | query | no | Items per page (default: `20`) |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `POST /api/v1/notifications/broadcast`

*Broadcast a system notification (admin)*


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `POST /api/v1/notifications/read-all`

*Mark all read*


**Responses:**
- `200` — Successful Response

### `GET /api/v1/notifications/types`

*Notification types*


**Responses:**
- `200` — Successful Response

### `GET /api/v1/notifications/unread-count`

*Unread notification count*


**Responses:**
- `200` — Successful Response

### `DELETE /api/v1/notifications/{notification_id}`

*Delete a notification*


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `notification_id` | path | yes |  |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `PATCH /api/v1/notifications/{notification_id}/read`

*Mark one read*


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `notification_id` | path | yes |  |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

## Recommendations

### `GET /api/v1/recommendations/rules`

*Recommendation engine information*


**Responses:**
- `200` — Successful Response

### `GET /api/v1/recommendations/{batch_id}`

*Recommendations for a batch*


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `batch_id` | path | yes |  |
| `refresh` | query | no | Re-run the rule engine first (default: `False`) |
| `recommendation_type` | query | no |  |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `POST /api/v1/recommendations/{recommendation_id}/acknowledge`

*Acknowledge a recommendation*


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `recommendation_id` | path | yes |  |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

## Reports

### `GET /api/v1/reports`

*List generated reports*


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `report_type` | query | no |  |
| `mine` | query | no | Only reports I generated (default: `False`) |
| `page` | query | no | 1-based page number (default: `1`) |
| `page_size` | query | no | Items per page (default: `20`) |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `POST /api/v1/reports/freshness`

*Generate a Freshness Report (PDF or XLSX)*


**Responses:**
- `201` — Successful Response
- `422` — Validation Error

### `POST /api/v1/reports/inventory`

*Generate an Inventory Quality Report*


**Responses:**
- `201` — Successful Response
- `422` — Validation Error

### `POST /api/v1/reports/shelf-life`

*Generate a Shelf-Life Report*


**Responses:**
- `201` — Successful Response
- `422` — Validation Error

### `POST /api/v1/reports/storage-compliance`

*Generate a Storage Compliance Report*


**Responses:**
- `201` — Successful Response
- `422` — Validation Error

### `GET /api/v1/reports/types`

*Available report types*


**Responses:**
- `200` — Successful Response

### `POST /api/v1/reports/waste-reduction`

*Generate a Waste Reduction Report*


**Responses:**
- `201` — Successful Response
- `422` — Validation Error

### `DELETE /api/v1/reports/{report_id}`

*Delete a report*


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `report_id` | path | yes |  |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `GET /api/v1/reports/{report_id}`

*Get report metadata*


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `report_id` | path | yes |  |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `GET /api/v1/reports/{report_id}/download`

*Download a generated report*


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `report_id` | path | yes |  |


**Responses:**
- `200` — The report file.
- `422` — Validation Error

## Storage Monitoring

### `GET /api/v1/storage/locations`

*Storage locations*


**Responses:**
- `200` — Successful Response

### `GET /api/v1/storage/overview`

*Storage compliance overview*

Compliance roll-up across every active batch, with the batches that need attention first.


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `location_name` | query | no |  |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `GET /api/v1/storage/readings`

*Environmental reading history*


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `batch_id` | query | no |  |
| `location_name` | query | no |  |
| `days` | query | no | (default: `14`) |
| `limit` | query | no | (default: `200`) |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `POST /api/v1/storage/readings`

*Record a storage reading (manual entry)*

Evaluates the reading against the batch's required envelope and raises or resolves storage alerts automatically.


**Responses:**
- `201` — Successful Response
- `422` — Validation Error

### `POST /api/v1/storage/sensors/ingest`

*Poll sensors and persist the readings*

Pulls every sensor from the active provider and stores the values, matching batches by storage location.


**Responses:**
- `200` — Successful Response

### `GET /api/v1/storage/sensors/provider`

*Active sensor provider*

The platform runs fully without IoT hardware using MockSensorProvider. Set SENSOR_PROVIDER=mqtt and provide a broker to switch.


**Responses:**
- `200` — Successful Response

### `GET /api/v1/storage/sensors/read`

*Poll all sensors*


**Responses:**
- `200` — Successful Response

### `GET /api/v1/storage/trends`

*Temperature / humidity trends*


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `batch_id` | query | no |  |
| `location_name` | query | no |  |
| `days` | query | no | (default: `14`) |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `GET /api/v1/storage/{batch_id}`

*Storage condition and compliance for a batch*

Current condition, the required range, compliance status, risk level and a recommendation.


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `batch_id` | path | yes |  |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `PUT /api/v1/storage/{batch_id}`

*Update a batch's storage condition*


| Name | In | Required | Description |
| --- | --- | --- | --- |
| `batch_id` | path | yes |  |


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

## System

### `GET /api/v1/meta`

*Platform metadata for the UI*

Everything the frontend needs to render enums and honesty labels.


**Responses:**
- `200` — Successful Response

### `GET /api/v1/system/models`

*ML model inventory*

Which inference components are trained artefacts and which are transparent baselines. Used by the UI to label demo analyses honestly.


**Responses:**
- `200` — Successful Response

### `GET /health`

*Service health*

Reports API, database and ML model status. Returns 503 when a critical dependency is unavailable.


**Responses:**
- `200` — Successful Response

### `GET /health/live`

*Liveness probe*


**Responses:**
- `200` — Successful Response

### `GET /health/ready`

*Readiness probe*


**Responses:**
- `200` — Successful Response

## Users

### `GET /api/v1/users/me`

*Get my account and permissions*


**Responses:**
- `200` — Successful Response

### `PUT /api/v1/users/me`

*Update my account and profile*


**Responses:**
- `200` — Successful Response
- `422` — Validation Error

### `GET /api/v1/users/me/permissions`

*Permissions granted to my role*

Returned for UI convenience only - the backend always re-checks.


**Responses:**
- `200` — Successful Response
