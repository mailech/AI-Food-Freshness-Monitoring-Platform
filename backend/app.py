import os
import sys
import datetime
import random
import jwt
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_bcrypt import Bcrypt

# Import unified database instance and model from models.py
from models import db, FoodItem

# ==========================================
# Flask App Setup & Configurations
# ==========================================

app = Flask(__name__)
CORS(app, resources={r"/*": {"origins": "*"}})

app.config['SECRET_KEY'] = 'freshcheck-secret-key-12345'
app.config['SQLALCHEMY_DATABASE_URI'] = 'postgresql+psycopg2://freshcheck:freshcheck123@database:5432/freshcheck'
app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)
bcrypt = Bcrypt(app)

otp_store = {}

# ==========================================
# Database Models
# ==========================================

class User(db.Model):
    id = db.Column(db.Integer, primary_key=True)
    fullname = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)

with app.app_context():
    db.create_all()

# ==========================================
# ML Import & Setup
# ==========================================

BASE_DIR = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
ML_DIR = os.path.join(BASE_DIR, "ml")
if ML_DIR not in sys.path:
    sys.path.insert(0, ML_DIR)

try:
    from predict import predict_image
except ImportError:
    def predict_image(image_path, item_hint=None):
        raw_name = item_hint.strip() if item_hint and item_hint.strip() else "Scanned Item"
        return {
            "food_name": raw_name,
            "category": "General",
            "status": "Fresh",
            "confidence": 0.95,
            "ai_confidence": 95,
            "shelf_life_days": 5
        }

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)

# ==========================================
# Helpers
# ==========================================

def parse_date_string(date_str, default_date=None):
    if not date_str or not str(date_str).strip():
        return default_date or datetime.date.today()
    
    clean_str = str(date_str).strip()
    for fmt in ("%Y-%m-%d", "%m/%d/%Y", "%d/%m/%Y", "%Y/%m/%d"):
        try:
            return datetime.datetime.strptime(clean_str, fmt).date()
        except ValueError:
            pass
    return default_date or datetime.date.today()

def calculate_status(scanned_date, expiry_date, default_status="Fresh"):
    today = datetime.date.today()
    if not expiry_date:
        return default_status
    
    days_left = (expiry_date - today).days
    if days_left <= 0:
        return "Spoiled"
    elif days_left <= 2:
        return "Expiring Soon"
    else:
        return "Fresh"

# ==========================================
# Routes: Base & Auth
# ==========================================

@app.route("/")
def home():
    return jsonify({"message": "FreshCheck Backend is running"})

@app.route("/api/auth/register", methods=["POST"])
def register():
    data = request.get_json() or {}
    fullname = data.get("fullname")
    email = data.get("email")
    password = data.get("password")

    if not email or not password or not fullname:
        return jsonify({"message": "All fields are required"}), 400

    existing_user = User.query.filter_by(email=email).first()
    if existing_user:
        return jsonify({"message": "Email address already registered"}), 400

    hashed_password = bcrypt.generate_password_hash(password).decode('utf-8')
    new_user = User(fullname=fullname, email=email, password=hashed_password)
    
    db.session.add(new_user)
    db.session.commit()

    return jsonify({
        "message": "Account created successfully",
        "user": {
            "id": new_user.id,
            "fullname": new_user.fullname,
            "email": new_user.email
        }
    }), 201

@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")

    user = User.query.filter_by(email=email).first()

    if user and bcrypt.check_password_hash(user.password, password):
        token = jwt.encode({
            'user_id': user.id,
            'exp': datetime.datetime.utcnow() + datetime.timedelta(hours=24)
        }, app.config['SECRET_KEY'], algorithm="HS256")

        return jsonify({
            "token": token,
            "user": {
                "id": user.id,
                "fullname": user.fullname,
                "email": user.email
            }
        }), 200

    return jsonify({"message": "Invalid email or password"}), 401

# ==========================================
# Routes: Food Inventory Management
# ==========================================

@app.route('/api/food', methods=['GET'])
@app.route('/foods', methods=['GET'])
def get_food():
    items = FoodItem.query.order_by(FoodItem.id.desc()).all()
    return jsonify([item.to_dict() for item in items]), 200

@app.route('/api/food/clear', methods=['DELETE'])
def clear_food():
    try:
        FoodItem.query.delete()
        db.session.commit()
        return jsonify({"message": "All food data cleared successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500

@app.route('/api/food', methods=['POST'])
def add_food():
    try:
        data = request.get_json() or {}
        food_name = data.get('food_name') or data.get('name')
        if not food_name or not str(food_name).strip():
            return jsonify({'error': 'Food name is required'}), 400

        food_name = str(food_name).strip()
        category = data.get('category') or 'General'
        
        try:
            shelf_life_days = int(data.get('shelf_life_days', 5))
        except (ValueError, TypeError):
            shelf_life_days = 5

        raw_conf = data.get('ai_confidence') if data.get('ai_confidence') is not None else data.get('confidence')
        try:
            ai_confidence = float(raw_conf) if raw_conf is not None else 0.95
            if ai_confidence > 1.0:
                ai_confidence = ai_confidence / 100.0
        except (ValueError, TypeError):
            ai_confidence = 0.95

        scanned_date = parse_date_string(data.get('scanned_date') or data.get('purchase_date'))
        
        expiry_date_str = data.get('expiry_date')
        if expiry_date_str and str(expiry_date_str).strip():
            expiry_date = parse_date_string(expiry_date_str)
        else:
            expiry_date = scanned_date + datetime.timedelta(days=shelf_life_days)

        status = calculate_status(scanned_date, expiry_date, default_status=data.get('status', 'Fresh'))

        new_item = FoodItem(
            food_name=food_name,
            category=category,
            scanned_date=scanned_date,
            expiry_date=expiry_date,
            shelf_life_days=shelf_life_days,
            ai_confidence=ai_confidence,
            status=status
        )
        
        db.session.add(new_item)
        db.session.commit()

        return jsonify({
            'success': True,
            'message': 'Food item saved successfully',
            'food': new_item.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        print("Database save error:", str(e))
        return jsonify({'error': f'Failed to save food record: {str(e)}'}), 500
@app.route('/api/dashboard', methods=['GET'])
def get_dashboard():
    try:
       
        items = FoodItem.query.order_by(FoodItem.id.desc()).all()
        
        items_list = [item.to_dict() for item in items]
        fresh_count = sum(1 for item in items if item.status and item.status.lower() == 'fresh')
        expiring_count = sum(1 for item in items if item.status and 'expir' in item.status.lower())
        spoiled_count = sum(1 for item in items if item.status and item.status.lower() == 'spoiled')

        return jsonify({
            "fresh_count": fresh_count,
            "expiring_count": expiring_count,
            "spoiled_count": spoiled_count,
            "items": items_list
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500

@app.route('/api/reports', methods=['GET'])
def get_reports():
    try:
       
        all_foods = FoodItem.query.all()
        total = len(all_foods)

        if total == 0:
            return jsonify({
                "total_generated": 0,
                "waste_incidents": 0,
                "freshness_rate": "0%",
                "spoilage_rate": "0%",
                "reports": []
            }), 200

        fresh_count = sum(1 for f in all_foods if f.status and f.status.lower() == 'fresh')
        spoiled_count = sum(1 for f in all_foods if f.status and f.status.lower() == 'spoiled')

        freshness_rate = round((fresh_count / total) * 100, 1)
        spoilage_rate = round((spoiled_count / total) * 100, 1)

        return jsonify({
            "total_generated": total,
            "waste_incidents": spoiled_count,
            "freshness_rate": f"{freshness_rate}%",
            "spoilage_rate": f"{spoilage_rate}%",
            "reports": [
                {
                    "name": "Monthly Food Waste Analysis",
                    "category": "Waste Log",
                    "generated_on": datetime.date.today().strftime("%Y-%m-%d"),
                    "file_size": "1.2 MB",
                    "download_url": "#"
                }
            ]
        }), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500
# ==========================================
# Route: Prediction Model Inference
# ==========================================

@app.route('/predict', methods=['POST'])
@app.route('/api/predict', methods=['POST'])
def predict():
    if 'image' not in request.files:
        return jsonify({'error': 'No image uploaded'}), 400

    file = request.files['image']
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)

    food_name_hint = request.form.get('food_name') or request.form.get('name')

    try:
        result = predict_image(file_path, item_hint=food_name_hint)

        food_name = food_name_hint or result.get('food_name') or 'Scanned Item'
        category = request.form.get('category') or result.get('category') or 'General'
        status = result.get('status') or 'Fresh'
        
        raw_conf = result.get('confidence') if result.get('confidence') is not None else 0.95
        confidence = float(raw_conf)
        if confidence > 1.0:
            confidence = confidence / 100.0

        shelf_life_days = int(result.get('shelf_life_days', 5))
        formatted_conf_pct = round(confidence * 100)

        return jsonify({
            'food_name': food_name,
            'category': category,
            'status': status,
            'confidence': confidence,
            'ai_confidence': formatted_conf_pct,
            'shelf_life_days': shelf_life_days
        }), 200

    except Exception as e:
        return jsonify({'error': f'Prediction failed: {str(e)}'}), 500

# ==========================================
# Server Runner
# ==========================================

if __name__ == '__main__':
       app.run(host='0.0.0.0', port=5000, debug=True)