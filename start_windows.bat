@echo off
cd /d "%~dp0"

echo ==========================================
echo       FoodFresh AI - Starting
echo ==========================================
echo.

cd backend

py -3.13 --version >nul 2>&1
if errorlevel 1 (
    echo ERROR: Python 3.13 is required.
    pause
    exit /b 1
)

if not exist venv\Scripts\python.exe py -3.13 -m venv venv
call venv\Scripts\activate

python -m pip install -r requirements.txt
if errorlevel 1 (
    echo ERROR: Dependency installation failed.
    pause
    exit /b 1
)

if not exist .env (
    echo ERROR: backend\.env is missing.
    echo Copy .env.example to .env and enter your PostgreSQL settings.
    pause
    exit /b 1
)

python setup_db.py
if errorlevel 1 (
    echo ERROR: Database setup failed.
    pause
    exit /b 1
)

python seed.py
if errorlevel 1 (
    echo ERROR: Database seed failed.
    pause
    exit /b 1
)

echo.
echo FoodFresh AI is running at http://127.0.0.1:5000
echo Keep this window open while using the application.
echo.
python app.py
pause
