# FreshAI Backend

FastAPI backend for the Food Freshness Monitoring Platform.

## Included modules

- Authentication with JWT and five project roles
- Food inventory CRUD
- Image upload and computer-vision freshness baseline
- Shelf-life prediction baseline
- Storage monitoring
- Recommendations
- Dashboard summary
- Freshness/expiry alerts
- CSV inventory export
- SQLite database for easy development

The project requirements call for PostgreSQL as the primary production database and MongoDB as a secondary database. This starter backend intentionally uses SQLite so a beginner can run it without installing a database server. Migrate to PostgreSQL before production deployment.

## Run on Windows

Open Command Prompt in this `backend` folder:

```cmd
python -m venv venv
venv\Scripts\activate
pip install -r requirements.txt
uvicorn app.main:app --reload
```

Open:

http://127.0.0.1:8000/docs

## Important

The image analysis in `app/services/freshness.py` is a lightweight OpenCV baseline for the internship demo. It is not a trained CNN/YOLO freshness model. A real trained model should replace it after a labeled freshness dataset is prepared.

For production:
- set a strong `SECRET_KEY`
- restrict CORS to the frontend domain
- use PostgreSQL
- store uploads in object storage
- add HTTPS
- add proper role/ownership authorization
- replace baseline image analysis and shelf-life rules with validated ML models
- add automated tests and monitoring
