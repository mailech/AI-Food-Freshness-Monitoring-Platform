import os
import sys
import datetime
import jwt
import random
from flask import Flask, request, jsonify
from flask_cors import CORS
from flask_bcrypt import Bcrypt
from auth_middleware import token_required
from models import db, FoodItem


# ==========================================
# Flask App Setup & Configurations
# ==========================================

app = Flask(__name__)

CORS(app, resources={r"/*": {"origins": "*"}})

app.config['SECRET_KEY'] = 'freshcheck-secret-key-12345'

# PostgreSQL database running through Docker
app.config['SQLALCHEMY_DATABASE_URI'] = (
    'postgresql+psycopg2://freshcheck:freshcheck123@database:5432/freshcheck'
)

app.config['SQLALCHEMY_TRACK_MODIFICATIONS'] = False

db.init_app(app)

bcrypt = Bcrypt(app)

otp_store = {}


# ==========================================
# User Model
# ==========================================

class User(db.Model):
    __tablename__ = 'user'

    id = db.Column(db.Integer, primary_key=True)
    fullname = db.Column(db.String(150), nullable=False)
    email = db.Column(db.String(150), unique=True, nullable=False)
    password = db.Column(db.String(255), nullable=False)
    role = db.Column(db.String(50), nullable=False, default="Consumer")
    created_at = db.Column(db.DateTime, default=datetime.datetime.utcnow)


# ==========================================
# Create Database Tables
# ==========================================

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
        lower_name = raw_name.lower()
        lower_path = image_path.lower()

        if any(keyword in lower_name or keyword in lower_path for keyword in ["rotten", "spoiled", "bad", "stale"]):
            status = "Spoiled"
            shelf_life = 0
            confidence = 0.95
        else:
            status = "Fresh"
            shelf_life = 5
            confidence = 0.95

        return {
            "food_name": raw_name,
            "category": "General",
            "status": status,
            "confidence": confidence,
            "ai_confidence": int(confidence * 100),
            "shelf_life_days": shelf_life
        }


# ==========================================
# Upload Folder
# ==========================================

UPLOAD_FOLDER = os.path.join(os.path.dirname(os.path.abspath(__file__)), "uploads")
os.makedirs(UPLOAD_FOLDER, exist_ok=True)


# ==========================================
# Helper Functions
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
    elif days_left <= 2 and default_status != "Spoiled":
        return "Expiring Soon"
    else:
        return default_status


def calculate_freshness_assessment(visual_score, storage_score, shelf_life_score, age_score, status_hint="Fresh"):
    is_spoiled = status_hint.lower() in ["spoiled", "rotten", "bad", "stale"]
    
    if is_spoiled:
        freshness_score = round(100.0 - float(visual_score), 2)
    else:
        freshness_score = (
            (float(visual_score) * 0.40) +
            (float(storage_score) * 0.25) +
            (float(shelf_life_score) * 0.20) +
            (float(age_score) * 0.15)
        )
        freshness_score = round(max(0, min(100, freshness_score)), 2)

    if freshness_score >= 90:
        freshness_category = "Fresh"
        risk_level = "Low"
    elif freshness_score >= 75:
        freshness_category = "Good"
        risk_level = "Low"
    elif freshness_score >= 60:
        freshness_category = "Acceptable"
        risk_level = "Medium"
    elif freshness_score >= 40:
        freshness_category = "Near Spoilage"
        risk_level = "High"
    else:
        freshness_category = "Spoiled"
        risk_level = "Critical"

    return {
        "visual_score": round(float(visual_score), 2),
        "storage_score": round(float(storage_score), 2),
        "shelf_life_score": round(float(shelf_life_score), 2),
        "age_score": round(float(age_score), 2),
        "freshness_score": freshness_score,
        "freshness_category": freshness_category,
        "risk_level": risk_level
    }


def calculate_shelf_life_score(scanned_date, expiry_date, shelf_life_days):
    today = datetime.date.today()
    if shelf_life_days <= 0:
        return 0.0

    days_left = (expiry_date - today).days
    if days_left <= 0:
        return 0.0

    score = (days_left / shelf_life_days) * 100
    return round(max(0, min(100, score)), 2)


def calculate_age_score(scanned_date, shelf_life_days):
    today = datetime.date.today()
    age_days = (today - scanned_date).days
    if age_days <= 0:
        return 100.0
    if shelf_life_days <= 0:
        return 0.0

    score = (1 - (age_days / shelf_life_days)) * 100
    return round(max(0, min(100, score)), 2)


# ==========================================
# Routes & Endpoints
# ==========================================
# ==========================================
# Real Dynamic Reports API Endpoint
# ==========================================
@app.route('/api/reports/data', methods=['GET'])
@token_required()
def get_reports_data(current_user):
    try:
        food_items = FoodItem.query.filter_by(user_id=current_user.id).all()
        today = datetime.date.today()

        total_items = len(food_items)
        if total_items == 0:
            return jsonify({
                "message": "No data available",
                "total_items": 0,
                "categories": {},
                "predictions": [],
                "audit": {
                    "fresh_items": 0,
                    "rotten_items": 0,
                    "expired_items": 0,
                    "freshness_rate": "0%",
                    "spoilage_rate": "0%"
                },
                "inventory": []
            }), 200

        fresh_count = 0
        rotten_count = 0
        expired_count = 0
        category_counts = {}
        predictions_list = []
        inventory_list = []
        total_confidence = 0.0

        for item in food_items:
            status = item.status or "Fresh"
            is_spoiled = status.lower() in ["spoiled", "rotten", "bad", "stale"]

            # Expiry checks
            if item.expiry_date and item.expiry_date < today:
                expired_count += 1
                status = "Spoiled"
                is_spoiled = True

            if is_spoiled or status.lower() == "spoiled":
                rotten_count += 1
            else:
                fresh_count += 1

            # Category counting
            cat = item.category or "General"
            category_counts[cat] = category_counts.get(cat, 0) + 1

            # Confidence formatting
            raw_conf=item.ai_confidence
            conf = float(item.ai_confidence or 0.95)
            if raw_conf is not None:
                conf=float(raw_conf)
                if conf>1.0:
                  conf = conf / 100.0
            else:
                conf=0.95 
            total_confidence += conf
            conf_pct = round(conf * 100, 2)

            # Predictions log
            predictions_list.append({
                "food_name": item.food_name,
                "predicted_class": cat,
                "status": status,
                "confidence": f"{conf_pct}%",
                "prediction_date": str(item.created_at.date() if item.created_at else item.scanned_date)
            })

            # Inventory summary
            days_left = (item.expiry_date - today).days if item.expiry_date else 0
            inventory_list.append({
                "food_name": item.food_name,
                "category": cat,
                "scanned_date": str(item.scanned_date),
                "expiry_date": str(item.expiry_date) if item.expiry_date else "N/A",
                "shelf_life": f"{item.shelf_life_days} Days",
                "remaining_shelf_life": f"{max(0, days_left)} Days",
                "status": status,
                "ai_confidence": f"{conf_pct}%"
            })

        freshness_rate = round((fresh_count / total_items) * 100, 2)
        spoilage_rate = round((rotten_count / total_items) * 100, 2)
        avg_confidence = round((total_confidence / total_items) * 100, 2)

        return jsonify({
            "total_items": total_items,
            "average_ai_confidence": f"{avg_confidence}%",
            "categories": category_counts,
            "audit": {
                "fresh_items": fresh_count,
                "rotten_items": rotten_count,
                "expired_items": expired_count,
                "freshness_rate": f"{freshness_rate}%",
                "spoilage_rate": f"{spoilage_rate}%"
            },
            "predictions": predictions_list,
            "inventory": inventory_list
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
@app.route("/")
def home():
    return jsonify({"message": "FreshCheck Backend is running"})


# Authentication Endpoints
@app.route("/api/auth/register", methods=["POST"])
def register():
    try:
        data = request.get_json() or {}
        fullname = data.get("fullname")
        email = data.get("email")
        password = data.get("password")
        role = data.get("role", "Consumer")

        if not email or not password or not fullname:
            return jsonify({"message": "All fields are required"}), 400

        if User.query.filter_by(email=email).first():
            return jsonify({"message": "Email address already registered"}), 400

        hashed_password = bcrypt.generate_password_hash(password).decode("utf-8")
        new_user = User(fullname=fullname, email=email, password=hashed_password, role=role)

        db.session.add(new_user)
        db.session.commit()

        return jsonify({
            "message": "Account created successfully",
            "user": {
                "id": new_user.id,
                "fullname": new_user.fullname,
                "email": new_user.email,
                "role": new_user.role
            }
        }), 201
    except Exception as e:
        db.session.rollback()
        return jsonify({"message": str(e)}), 500


@app.route("/api/auth/login", methods=["POST"])
def login():
    data = request.get_json() or {}
    email = data.get("email")
    password = data.get("password")

    user = User.query.filter_by(email=email).first()
    if user and bcrypt.check_password_hash(user.password, password):
        token = jwt.encode(
            {
                "id": user.id,
                "user_id": user.id,
                "role": user.role,
                "exp": datetime.datetime.utcnow() + datetime.timedelta(hours=24)
            },
            app.config["SECRET_KEY"],
            algorithm="HS256"
        )
        return jsonify({
            "token": token,
            "user": {
                "id": user.id,
                "fullname": user.fullname,
                "email": user.email,
                "role": user.role
            }
        }), 200

    return jsonify({"message": "Invalid email or password"}), 401


# Dynamic AI Prediction Endpoint
@app.route("/predict", methods=["POST"])
@app.route("/api/predict", methods=["POST"])
@token_required()
def predict(current_user):
    if "image" not in request.files:
        return jsonify({"error": "No image uploaded"}), 400

    file = request.files["image"]
    file_path = os.path.join(UPLOAD_FOLDER, file.filename)
    file.save(file_path)

    food_name_hint = request.form.get("food_name") or request.form.get("name")

    try:
        result = predict_image(file_path, item_hint=food_name_hint)

        food_name = food_name_hint or result.get("food_name") or "Scanned Item"
        category = request.form.get("category") or result.get("category") or "General"
        status = result.get("status") or "Fresh"

        raw_conf = result.get("confidence") if result.get("confidence") is not None else 0.95
        confidence = float(raw_conf)
        if confidence > 1.0:
            confidence = confidence / 100.0

        confidence = max(0.0, min(1.0, confidence))
        conf_pct = round(confidence * 100, 2)

        # Fix Freshness vs Spoilage Score logic based on Status
        if status.lower() in ["spoiled", "rotten", "bad", "stale"]:
            spoilage_score = conf_pct
            freshness_score = round(100.0 - conf_pct, 2)
            shelf_life_days = 0
        else:
            freshness_score = conf_pct
            spoilage_score = round(100.0 - conf_pct, 2)
            shelf_life_days = int(result.get("shelf_life_days", 5))

        return jsonify({
            "food_name": food_name,
            "category": category,
            "status": status,
            "confidence": confidence,
            "ai_confidence": round(conf_pct),
            "freshness_score": freshness_score,
            "spoilage_score": spoilage_score,
            "shelf_life_days": shelf_life_days,
            "recommended_temp": "1°C – 5°C" if status == "Fresh" else "N/A",
            "storage_advice": "Refrigerate in an airtight container." if status == "Fresh" else "Dispose of safely."
        }), 200

    except Exception as e:
        return jsonify({"error": f"Prediction failed: {str(e)}"}), 500


# Save Scanned Item to Database
@app.route("/api/food", methods=["POST"])
@token_required(allowed_roles=["Consumer", "RetailManager", "WarehouseOperator", "FoodQualityInspector", "Administrator"])
def add_food(current_user):
    try:
        data = request.get_json() or {}
        food_name = data.get("food_name") or data.get("name")

        if not food_name or not str(food_name).strip():
            return jsonify({"error": "Food name is required"}), 400

        food_name = str(food_name).strip()
        category = data.get("category") or "General"
        input_status = data.get("status") or "Fresh"

        is_spoiled = input_status.lower() in ["spoiled", "rotten", "bad", "stale"]

        try:
            shelf_life_days = 0 if is_spoiled else int(data.get("shelf_life_days", 5))
        except (ValueError, TypeError):
            shelf_life_days = 0 if is_spoiled else 5

        raw_conf = data.get("ai_confidence") if data.get("ai_confidence") is not None else data.get("confidence")
        try:
            ai_confidence = float(raw_conf) if raw_conf is not None else 0.95
            if ai_confidence > 1.0:
                ai_confidence = ai_confidence / 100.0
        except (ValueError, TypeError):
            ai_confidence = 0.95

        ai_confidence = max(0.0, min(1.0, ai_confidence))

        scanned_date = parse_date_string(data.get("scanned_date") or data.get("purchase_date"))
        expiry_date_str = data.get("expiry_date")

        if expiry_date_str and str(expiry_date_str).strip():
            expiry_date = parse_date_string(expiry_date_str)
        else:
            expiry_date = scanned_date + datetime.timedelta(days=shelf_life_days)

        final_status = calculate_status(scanned_date, expiry_date, default_status=input_status)

        visual_score = ai_confidence * 100.0
        storage_score = float(data.get("storage_score", 100.0))
        shelf_life_score = calculate_shelf_life_score(scanned_date, expiry_date, shelf_life_days)
        age_score = calculate_age_score(scanned_date, shelf_life_days)

        assessment = calculate_freshness_assessment(
            visual_score=visual_score,
            storage_score=storage_score,
            shelf_life_score=shelf_life_score,
            age_score=age_score,
            status_hint=final_status
        )

        new_item = FoodItem(
            user_id=current_user.id,
            food_name=food_name,
            category=category,
            scanned_date=scanned_date,
            expiry_date=expiry_date,
            shelf_life_days=shelf_life_days,
            ai_confidence=ai_confidence,
            status=final_status,
            visual_score=assessment["visual_score"],
            storage_score=assessment["storage_score"],
            shelf_life_score=assessment["shelf_life_score"],
            age_score=assessment["age_score"],
            freshness_score=assessment["freshness_score"],
            risk_level=assessment["risk_level"],
            freshness_category=assessment["freshness_category"]
        )

        db.session.add(new_item)
        db.session.commit()

        return jsonify({
            "success": True,
            "message": "Food item saved successfully",
            "food": new_item.to_dict()
        }), 201

    except Exception as e:
        db.session.rollback()
        return jsonify({"error": f"Failed to save food record: {str(e)}"}), 500


# Get User Food Items
@app.route("/api/food", methods=["GET"])
@app.route("/foods", methods=["GET"])
@token_required()
def get_food(current_user):
    try:
        items = FoodItem.query.filter_by(user_id=current_user.id).order_by(FoodItem.id.desc()).all()
        return jsonify([item.to_dict() for item in items]), 200
    except Exception as e:
        return jsonify({"error": str(e)}), 500



# Real-time Dashboard API
@app.route('/api/dashboard', methods=['GET'])
@token_required()
def get_dashboard_data(current_user):
    try:
        food_items = FoodItem.query.filter_by(user_id=current_user.id).order_by(FoodItem.id.desc()).all()
        today = datetime.date.today()

        items_list = []
        for item in food_items:
            real_status = item.status or "Fresh"
            is_spoiled = real_status.lower() in ["spoiled", "rotten", "bad", "stale"]

          
            if is_spoiled:
                display_expiry = str(item.scanned_date) if item.scanned_date else str(today)
                real_status = "Spoiled"
            else:
                display_expiry = str(item.expiry_date) if item.expiry_date else "N/A"
                if item.expiry_date:
                    days_left = (item.expiry_date - today).days
                    if days_left <= 0:
                        real_status = "Spoiled"
                        display_expiry = str(today)
                    elif days_left <= 2:
                        real_status = "Expiring Soon"

            # 2. Dynamic AI Confidence Format Fix
            raw_conf = item.ai_confidence if item.ai_confidence is not None else 0.95
            conf_val = float(raw_conf)
            if conf_val > 1.0:
                conf_val = conf_val / 100.0
            
           
            display_conf = int(round(conf_val * 100))

            items_list.append({
                "id": item.id,
                "food_name": item.food_name,
                "category": item.category,
                "scanned_date": str(item.scanned_date),
                "expiry_date": display_expiry,
                "ai_confidence": display_conf,
                "shelf_life_days": 0 if is_spoiled else item.shelf_life_days,
                "status": real_status,
                "freshness_score": item.freshness_score or (0 if is_spoiled else display_conf)
            })

        return jsonify({
            "items": items_list,
            "total_items": len(items_list),
            "fresh_count": sum(1 for i in items_list if i['status'] == 'Fresh'),
            "expiring_soon_count": sum(1 for i in items_list if i['status'] == 'Expiring Soon'),
            "spoiled_count": sum(1 for i in items_list if i['status'] == 'Spoiled')
        }), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500
# Smart Recommendations API
@app.route("/api/recommendations", methods=["GET"])
@token_required()
def get_recommendations(current_user):
    try:
        items = FoodItem.query.filter_by(user_id=current_user.id).all()
        recommendations = []

        for item in items:
            status = (item.status or "Fresh").lower()
            name = item.food_name or "Food item"
            freshness_score = item.freshness_score if item.freshness_score is not None else 100

            if any(k in status for k in ["rotten", "stale", "spoiled", "near spoilage", "high risk"]) or freshness_score < 40:
                rec_tag = "Attention"
                description = "Expires immediately. Highly degraded freshness detected."
                action = "Dispose of properly or segregate from fresh produce."
                badge_color = "border-amber-500 text-amber-600 bg-amber-50"
            elif "warning" in status or freshness_score < 70:
                rec_tag = "Analysis Required"
                description = "Freshness dropping. Quality check recommended."
                action = "Consume soon or keep refrigerated."
                badge_color = "border-blue-500 text-blue-600 bg-blue-50"
            else:
                rec_tag = "Storage"
                description = "Optimal freshness recorded. Store in cool environment."
                action = "Store in a cool place or refrigerator."
                badge_color = "border-emerald-500 text-emerald-600 bg-emerald-50"

            recommendations.append({
                "title": f"{name.capitalize()} is {status.capitalize()}",
                "tag": rec_tag,
                "description": description,
                "action": action,
                "status": status,
                "badge_color": badge_color
            })

        return jsonify({"recommendations": recommendations}), 200

    except Exception as e:
        return jsonify({"error": str(e)}), 500


# Delete Food Item
@app.route("/api/food/<int:id>", methods=["DELETE"])
@token_required(allowed_roles=["RetailManager", "Administrator", "Consumer"])
def delete_food(current_user, id):
    try:
        item = FoodItem.query.filter_by(id=id, user_id=current_user.id).first()
        if not item:
            return jsonify({"error": "Food item not found"}), 404

        db.session.delete(item)
        db.session.commit()
        return jsonify({"message": "Food item deleted successfully"}), 200
    except Exception as e:
        db.session.rollback()
        return jsonify({"error": str(e)}), 500


# Server Runner
if __name__ == "__main__":
    app.run(host="0.0.0.0", port=5000, debug=True)