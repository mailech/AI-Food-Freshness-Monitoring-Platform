# FoodFresh AI — Fixed Full-Stack Project

## Included roles
- Consumer
- Retail Manager
- Food Quality Inspector
- Administrator
- Warehouse Operator

## Authentication
There is one login page for every role. Registration also lets the user select a role. The Administrator additionally has a Users page for creating/editing accounts and roles.

## Fixed functionality
- JWT authentication compatible with PyJWT 2.10+
- PostgreSQL persistence
- Inventory create/edit
- Storage readings create + history
- AI freshness analysis create + history
- Quality inspection create + saved AI score + history
- Inventory freshness/status updated after analysis or inspection
- AI Analysis navigation for operational roles
- Role-based backend permissions

## Demo accounts
All use password `Password@123`:

| Role | Email |
|---|---|
| Consumer | consumer@foodfresh.local |
| Retail Manager | manager@foodfresh.local |
| Food Quality Inspector | inspector@foodfresh.local |
| Administrator | admin@foodfresh.local |
| Warehouse Operator | warehouse@foodfresh.local |

## Windows setup
1. Create `backend/.env` from `backend/.env.example` and set your PostgreSQL password and a long JWT secret.
2. From the project root run:

```powershell
.\start_windows.bat
```

3. Open `http://127.0.0.1:5000`.

If PowerShell is currently inside `backend`, first run:

```powershell
cd ..
.\start_windows.bat
```

## Database
`start_windows.bat` runs `setup_db.py` and `seed.py`. The schema creates the `analysis_history` table in addition to inventory, storage, inspections, alerts and users.

## Final reporting and alert data
- Reports now include KPI cards, freshness-status bars, category bars, storage-condition trend graphs, inspection-score trend graphs, and plain-language management summaries.
- Seed data now populates inventory, storage readings, quality inspections, AI analysis history, and role-specific alerts so the dashboards are not empty on first run.
- Warehouse Operator now also has Reports access.
- Run `python seed.py` after `python setup_db.py` to add the sample operational data. The seed is safe to rerun and avoids duplicating the seeded records.

### Alert recovery for existing databases
If the database was created with an older version of the project, opening an Alerts page now automatically ensures the role-specific demo alerts exist. You can also run `python seed.py` from `backend` to populate missing demo records.

### Important environment note
The backend uses the single `DATABASE_URL` variable. Do not replace it with separate `DB_HOST` / `DB_PASSWORD` variables unless you also change `backend/db.py`.
