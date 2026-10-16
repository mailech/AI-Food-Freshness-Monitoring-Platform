FRESH.OS — Food Freshness Monitoring Platform

A role-based platform for monitoring food freshness across the supply chain, built as an Infosys Springboard internship milestone. It combines a CNN-based fresh/rotten classifier with a FastAPI backend and a web frontend.

Features
Freshness classification: CNN model trained on the Fruits Fresh and Rotten for Classification dataset (Kaggle: sriramr/fruits-fresh-and-rotten-for-classification)
Authentication: JWT-based login and registration with bcrypt password hashing
Role-based access control (RBAC): enforced server-side via JWT role claims
Five user roles:
Consumer
Retail Manager
Warehouse Operator
Food Quality Inspector
Administrator
Frontend: static HTML/Tailwind site with role-based views
Tech Stack
Layer	Technology
Backend	FastAPI (Python)
Database	PostgreSQL
Auth	JWT, bcrypt
ML	CNN (TensorFlow/Keras), trained on Kaggle
Frontend	HTML, Tailwind CSS
Testing	pytest
Project Structure
.
├── app/
│   ├── auth/
│   │   ├── security.py        # password hashing, JWT creation/verification
│   │   └── dependencies.py    # current-user and require_roles dependencies
│   ├── routers/
│   │   └── auth.py            # register / login endpoints
│   └── main.py                # FastAPI app entry point
├── tests/                     # pytest suite
├── requirements.txt
├── .env.example
└── README.md

Adjust this tree if your folders differ.

Getting Started
Prerequisites
Python 3.10+
PostgreSQL
Setup
bash
# clone
git clone https://github.com/devi-tebro/<repo-name>.git
cd <repo-name>

# virtual environment
python -m venv venv
source venv/bin/activate        # Windows: venv\Scripts\activate

# dependencies
pip install -r requirements.txt
Configuration

Copy .env.example to .env and fill in your values:

DATABASE_URL=postgresql://<user>:<password>@localhost:5432/<db_name>
SECRET_KEY=<a-long-random-string>
ALGORITHM=HS256
ACCESS_TOKEN_EXPIRE_MINUTES=30

Never commit .env.

Run the server
bash
uvicorn app.main:app --reload

Interactive API docs: http://127.0.0.1:8000/docs

Run the tests
bash
pytest
Roles and Access

Access control is enforced on the server using the require_roles dependency, which checks the role claim inside the JWT. Role values accepted by the API match the frontend dropdown (with alias normalization).
