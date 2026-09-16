# Architecture notes

Decisions worth explaining, and the reasoning behind them.

## Layering

```
routers/       HTTP only: validation, permissions, serialisation
  ↓
<domain>/      business logic (freshness, shelf_life, storage, recommendations, …)
  ↓
repositories/  query construction
  ↓
models/        SQLAlchemy ORM
```

Routers never build queries and services never touch `Request` objects. The
practical benefit: every domain service is unit-testable without HTTP, which is
why the scoring engine has 42 tests that never start a server.

## Why the ML layer is split in two

`backend/app/ml/` contains **inference only**. `ml/` (repo root) contains
**training only**. The API therefore has no dependency on PyTorch, ultralytics,
datasets or notebooks, and the runtime image stays around 975 MB instead of
several gigabytes.

The one deliberate coupling runs the other way: `ml/preprocessing/features.py`
imports the production extractors, so a model trained offline sees exactly the
features it will see when served. Without that, reported metrics would be
meaningless.

## The model registry

Four interfaces (`FreshnessModel`, `SpoilageDetectionModel`,
`FoodClassificationModel`, `ShelfLifeModel`) each have a baseline implementation
and a trained implementation. `ModelRegistry` picks one per role:

- `DEMO_MODE=true` → all baselines, nothing read from disk
- `DEMO_MODE=false` → try each artefact; on failure fall back **and record why**

`describe()` surfaces that state at `GET /api/v1/system/models`, which the UI
renders on the *About the AI models* page. A partially trained deployment is a
first-class state, not an error.

## Category profiles as data

Every category-specific number — temperature band, humidity band, baseline shelf
life, perishability, temperature sensitivity, packaging multipliers, which
spoilage indicators matter — lives in one frozen dataclass per category in
`core/category_rules.py`.

Adding a category is a dict entry. Nothing in the codebase branches on
`if category == "DAIRY"`. Deployments override the numbers per category row in
the database, and `inventory/categories.py::effective_rule` merges code defaults
with those overrides.

## Denormalised read paths

`food_batches` caches `current_freshness_score`, `current_freshness_category`,
`remaining_shelf_life_days`, `predicted_expiry_date` and `last_assessed_at`.

Inference is expensive; dashboards are read-heavy. Writing these on each
assessment means listing 200 batches costs one query and re-runs nothing. The
authoritative history stays in `freshness_assessments`.

## Noisy-OR spoilage aggregation

The first implementation averaged indicator confidences and diluted decisive
findings: a 0.94-confidence bruising detection produced a 0.32 spoilage
probability, and the batch was still classified `FRESH`.

Independent evidence is now combined multiplicatively, weighted by how strongly
each indicator implies actual spoilage (mould 0.95, physical damage 0.28):

```
P(spoiled) = 1 - Π (1 - confidence_i × weight_i)
```

Mould additionally floors the result, because visible mould is decisive
regardless of what else looks fine.

## Confidence is reduced, never inflated

The baseline lowers reported confidence for blurry input (Laplacian variance),
implausible segmentation (food-pixel ratio far from ~0.55) and scores sitting
near a class boundary. A system that says "I am unsure" is more useful than one
that is confidently wrong.

## Storage penalty caps scale with sensitivity

The temperature penalty in the storage score is capped, so one parameter cannot
zero the component on its own. But a fixed cap meant 45 °C seafood still scored
18/100 — indefensible. The cap now scales with the category's
`temp_sensitivity`, so a catastrophic excursion can floor a highly perishable
category while barely moving shelf-stable goods. A test asserts both ends.

## Alert deduplication and auto-resolution

Every alert carries a stable `dedupe_key` (`TYPE:batch_id`). Raising an alert
that already has an open row **updates** it, and only re-surfaces it if the
severity escalated. When the condition clears — temperature back in range, a
better score — the corresponding alert types are auto-resolved with a note.

Without this, polling sensors every few minutes would generate hundreds of
duplicate rows and the alert list would be unusable.

## Cross-dialect SQL

The primary database is PostgreSQL; SQLite exists so the project runs and tests
with zero infrastructure. Two portability traps were hit and fixed:

- `CAST(ts AS DATE)` returns an integer year on SQLite (NUMERIC affinity). All
  day-bucketing goes through `func.date()`.
- SQLite returns naive datetimes even for `DateTime(timezone=True)`. Every
  comparison against "now" goes through `utils/dates.ensure_utc`.

## Configuration parsing

`CORS_ORIGINS` and the upload allow-lists are annotated with pydantic-settings'
`NoDecode`, because the default behaviour JSON-decodes list fields from the
environment *before* any custom validator runs. With `NoDecode` the validator
accepts both a JSON array and a plain comma-separated string — the latter being
far friendlier in Docker and CI env files. This was found by the container
failing to boot, and is covered by a check on all three input forms.

## Frontend state

No Redux. Three contexts (Auth, Meta, Toast) plus a `useAsync` hook cover the
whole application. Server data is fetched per-page with explicit
loading/error/empty states rather than cached globally, which keeps behaviour
obvious at the cost of some refetching — the right trade at this scale.

`MetaContext` loads `/api/v1/meta` once, so dropdown options, category profiles,
scoring weights and thresholds come from the backend. Adding a packaging type
requires no frontend change.

Protected images cannot use a plain `<img src>`, because the image endpoint
requires a bearer token. `ProtectedImage` fetches the blob, creates an object URL
and revokes it on unmount.

## Permissions in two places, trusted in one

`auth/permissions.py` is the authoritative grant table, enforced by the
`require_permissions` dependency on every sensitive route. The frontend mirrors
it to hide unusable UI. Tests assert that a modified client gains nothing: each
role is driven against endpoints it should not reach and must receive 403.

## Reports share one data model

`reports/builders.py` produces a `ReportData` bundle (metadata, filters, summary,
tables, chart series). The PDF and XLSX writers consume the same bundle, so the
two formats cannot drift. Charts are drawn with reportlab's own primitives and
openpyxl's native charts — no headless matplotlib in the API container.

PDF detail tables are capped at 300 rows for readability; XLSX has no cap. The
PDF says so where it truncates.
