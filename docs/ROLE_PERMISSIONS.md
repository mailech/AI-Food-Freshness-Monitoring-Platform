# FreshLens — Role-Based Access Control (RBAC) & Permissions Matrix

FreshLens supports 5 distinct user roles. Access control is enforced at both the API layer (FastAPI dependencies) and the client layer (Next.js App Router).

---

## Roles Overview

1. **Consumer (`CONSUMER`)**: Read-only access to food item catalogs, diagnostic lookup, and image specimen scanning.
2. **Retail Manager (`RETAIL_MANAGER`)**: Manages retail inventory, registers stock, monitors FEFO dispatch order, and views markdown advisories.
3. **Warehouse Operator (`WAREHOUSE_OPERATOR`)**: Registers bulk supply lots (batches), ingests climate telemetry sensor logs, and tracks storage compliance.
4. **Food Quality Inspector (`FOOD_QUALITY_INSPECTOR`)**: Dedicated quality inspection portal. Conducts 7-factor audits, inspects visual specimens, assigns quality status, and logs official safety decisions.
5. **Administrator (`ADMINISTRATOR` / `ADMIN`)**: Full platform administration, access to system settings, database management, and user role configuration.

---

## Detailed Permissions Matrix

| Feature / Action | Consumer | Retail Manager | Warehouse Operator | Quality Inspector | Administrator |
|---|:---:|:---:|:---:|:---:|:---:|
| **View Inventory Catalog** | Read | Read | Read | Read | Full |
| **Register New Food Items** | ✕ | ✓ | ✓ | ✕ | Full |
| **Edit Food Item Parameters** | ✕ | ✓ | ✓ | ✕ | Full |
| **Delete Food Items** | ✕ | ✓ | ✕ | ✕ | Full |
| **Create Supply Lots (Batches)** | ✕ | ✓ | ✓ | ✕ | Full |
| **Ingest Telemetry Readings** | ✕ | ✓ | ✓ | ✕ | Full |
| **Run Image Scan & CV Analysis** | Read/Scan | Read/Scan | Read/Scan | Full/Audit | Full |
| **Execute Quality Audit** | ✕ | ✕ | ✕ | ✓ | Full |
| **Set Official Inspection Status** | ✕ | ✕ | ✕ | ✓ | Full |
| **View Storage Compliance** | Read | Read | Read | Read | Full |
| **View FEFO Recommendations** | Read | Read | Read | Read | Full |
| **Generate PDF & Excel Reports** | Read | Read | Read | Read | Full |
| **User & Role Administration** | ✕ | ✕ | ✕ | ✕ | Full |
