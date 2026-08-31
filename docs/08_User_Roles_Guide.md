# User Roles & Usage Guide

How each type of user interacts with the AI Food Freshness Monitoring Platform.

The platform defines five roles (`backend/app/models/user.py:10`). Role is chosen at
registration and drives what each user sees and can do (RBAC — SRS FR-02).

---

## 1. Consumer

**Who:** Household users who want to keep track of food at home and reduce waste.

**What they do day to day:**
- Register an account (email/password or Google sign-in).
- Add food items to their inventory (name, category, packaging).
- Upload a photo of the food; the CNN model classifies it
  (fresh / mildly spoiled / spoiled, per `backend/ml/class_names.json`).
- Check freshness score and predicted shelf life for each item.
- Read storage recommendations (best temperature, humidity, light exposure,
  air circulation for that item).
- Receive notifications when items approach expiry.
- Record manual storage readings from home fridges/pantries, or let IoT
  sensors push readings automatically over MQTT.
- View their personal dashboard: items at risk, expiry timeline, waste avoided.

**Typical session:**
1. Log in → Consumer dashboard.
2. "Add item" → snap a photo → get freshness verdict + shelf-life estimate.
3. Follow storage tips; act on expiry alerts before food spoils.

---

## 2. Retail Manager

**Who:** Supermarket/grocery managers responsible for stock quality on shelves.

**What they do day to day:**
- Everything a Consumer can do, plus:
- Monitor quality of the full store inventory across categories.
- Track batches with quantities, expiry dates, and storage locations.
- Get shelf-life alerts for products nearing spoilage (discount or pull early).
- Review waste-reduction insights: which categories spoil fastest,
  where losses concentrate.
- Use analytics dashboards to plan ordering and markdowns.

**Typical session:**
1. Log in → Retail dashboard.
2. Scan the "at-risk" list → mark down or rotate affected batches.
3. Review weekly waste trends and adjust purchase orders.

---

## 3. Warehouse Operator

**Who:** Staff running cold storage/warehouses where food is held in bulk.

**What they do day to day:**
- Monitor storage conditions across zones (temperature, humidity, light,
  air circulation) against required ranges — compliance monitoring.
- Deploy/manage IoT sensors that publish readings to
  `ffp/items/{id}/readings` over MQTT; the ingest worker stores them
  automatically (readings appear with `source="mqtt"`).
- Run batch freshness reports before dispatch.
- View environmental analytics: condition excursions, zone comparisons,
  time-out-of-range.
- React to alerts when a cold room drifts out of spec.

**Typical session:**
1. Log in → Warehouse dashboard.
2. Check compliance board → investigate any zone flagged non-compliant.
3. Pull batch freshness reports for outgoing shipments.
4. Fix sensor gaps or HVAC issues behind environmental alerts.

---

## 4. Food Quality Inspector
*(the "food safety department" role)*

**Who:** Inspectors/quality officers verifying food safety claims.

**What they do day to day:**
- Verify spoilage: upload inspection photos and confirm/correct AI
  classifications with their expert judgment.
- Validate quality classification consistency across batches and locations.
- Perform compliance validation: check that stored items meet safety and
  storage requirements before approval/release.
- Access reports as audit evidence for the department.

**Typical session:**
1. Log in → Inspection view.
2. Open flagged items → compare AI assessment vs. own inspection → confirm
   or reclassify.
3. Sign off compliance checks; export reports for records.

---

## 5. Administrator

**Who:** Platform operators/owners.

**What they do day to day:**
- Full access to everything above, plus:
- User management: review accounts, activate/deactivate users, change roles.
- Platform analytics: usage, assessment volumes, model performance.
- System monitoring: service health (API, DBs, MQTT ingest), alert logs.
- Report management: generate/curate platform-wide reports
  (daily/weekly/monthly via `app/ml/reports.py`).

**Typical session:**
1. Log in → Admin dashboard.
2. Handle new sign-ups/role requests; deactivate stale accounts.
3. Review system health and overnight alert digest.
4. Generate scheduled reports for stakeholders.

---

## Permission Matrix (summary)

| Capability | Consumer | Retail Mgr | Warehouse Op | Quality Inspector | Admin |
|---|:-:|:-:|:-:|:-:|:-:|
| Register/login (JWT + refresh, revocable) | ✅ | ✅ | ✅ | ✅ | ✅ |
| Manage own food items | ✅ | ✅ | ✅ | ✅ | ✅ |
| Upload images / AI freshness assessment | ✅ | ✅ | ✅ | ✅ | ✅ |
| Shelf-life estimates & recommendations | ✅ | ✅ | ✅ | ✅ | ✅ |
| Notifications & alerts | ✅ | ✅ | ✅ | ✅ | ✅ |
| Store-wide inventory quality monitoring | — | ✅ | — | ✅ | ✅ |
| Batch management & expiry tracking | — | ✅ | ✅ | ✅ | ✅ |
| Storage compliance monitoring (incl. MQTT sensors) | — | — | ✅ | ✅ | ✅ |
| Environmental analytics | — | — | ✅ | ✅ | ✅ |
| Spoilage verification / reclassification | — | — | — | ✅ | ✅ |
| Compliance sign-off | — | — | — | ✅ | ✅ |
| User management | — | — | — | — | ✅ |
| Platform analytics & report management | — | — | — | — | ✅ |

---

## How roles map to the running stack

```
Browser (any role)
   │  http(s)://<host>  ← nginx :80/:443 (rate limits auth endpoints, TLS)
   ▼
Frontend (Next.js, role-based dashboards)  ──►  FastAPI API (RBAC checks)
                                                    │
                              ┌─────────────────────┼──────────────────┐
                              ▼                     ▼                  ▼
                        PostgreSQL            MongoDB            MQTT broker
                     (users, items,        (images/logs)      (:1883, sensors)
                      readings, alerts)                         │
                                                                ▼
                                                     Ingest worker → readings
```

- **Sensors** (deployed by Warehouse Operators/Admins) bypass the browser path:
  they publish JSON to `ffp/items/{id}/readings` on the MQTT broker and the
  ingest worker persists them.
- **Rate limiting:** all users share the edge limits — 10 req/min per IP on
  auth endpoints (nginx) and in-app limiter on the API itself.
- **Token security:** logging out bumps the user's token version, instantly
  invalidating stolen/old access and refresh tokens across every device.
