from flask import Flask, jsonify, request
from flask_cors import CORS

app = Flask(__name__)
CORS(app)


# -------------------------
# HOME
# -------------------------

@app.route("/")
def home():
    return jsonify({
        "message": "AI Food Freshness Backend is running!"
    })


# -------------------------
# TEST API
# -------------------------

@app.route("/api/test")
def test():
    return jsonify({
        "success": True,
        "message": "Backend API is working!"
    })


# -------------------------
# CREATE INVENTORY ITEM
# -------------------------

@app.route("/api/inventory", methods=["POST"])
def create_inventory():

    data = request.get_json()

    food = {
        "id": 1,
        "name": data.get("name", "Unknown Food"),
        "category": data.get("category", "Other"),
        "quantity": data.get("quantity", 1),
        "expiry_date": data.get("expiry_date")
    }

    return jsonify(food), 201


# -------------------------
# ANALYZE FOOD IMAGE
# -------------------------

@app.route("/api/analyze/<int:food_id>", methods=["POST"])
def analyze_food(food_id):

    image = request.files.get("image")

    if image is None:
        return jsonify({
            "error": "No image uploaded"
        }), 400

    # Temporary demo analysis
    # Later we can connect an actual AI/ML model here.

    result = {
        "freshnessScore": 85,
        "status": "Fresh",
        "shelfLife": 5,
        "recommendation": "The food appears fresh. Store it properly and consume within the recommended period."
    }

    return jsonify(result)


# -------------------------
# SHELF LIFE PREDICTION
# -------------------------

@app.route("/api/shelf-life/predict", methods=["POST"])
def predict_shelf_life():

    data = request.get_json()

    food_name = data.get("foodName")
    storage_type = data.get("storageType")
    food_condition = data.get("foodCondition")

    # Temporary rule-based prediction
    # We can replace this with an ML model later.

    days = 3

    if food_condition == "Fresh":
    days = 7
    elif food_condition == "Good":
    days = 5
    elif food_condition == "Near Expiry":
    days = 1

    return jsonify({
        "remainingDays": days,
        "message": f"{food_name} is expected to remain usable for approximately {days} days when stored in {storage_type}."
    })


# -------------------------
# START SERVER
# -------------------------

if __name__ == "__main__":
    app.run(debug=True, port=5000)