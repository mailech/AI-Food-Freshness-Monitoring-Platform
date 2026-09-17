import functools
from flask import request, jsonify
import jwt
import os

# Make sure this matches the SECRET_KEY used in your app.py / config
SECRET_KEY = os.getenv("SECRET_KEY", "freshcheck-secret-key-12345")
def token_required(allowed_roles=None):
    """
    Decorator to verify JWT tokens and check user roles.
    Usage:
      @token_required() -> requires any valid login token
      @token_required(allowed_roles=['Administrator', 'FoodQualityInspector']) -> requires specific role
    """
    def decorator(f):
        @functools.wraps(f)
        def decorated(*args, **kwargs):
            token = None

            if "Authorization" in request.headers:
                auth_header = request.headers["Authorization"]
                if auth_header.startswith("Bearer "):
                    token = auth_header.split(" ")[1]

            if not token:
                return jsonify({"message": "Token is missing!"}), 401

            try:
                data = jwt.decode(token, SECRET_KEY, algorithms=["HS256"])
                # Assumes your payload stores user ID as 'id' or 'user_id'
                user_id = data.get("id") or data.get("user_id")

                from __main__ import User
                current_user = User.query.get(user_id)
                
                if not current_user:
                    return jsonify({"message": "User not found!"}), 401

                # Role Authorization Check
                if allowed_roles:
                    if current_user.role not in allowed_roles:
                        return jsonify({
                            "message": f"Access denied. Role '{current_user.role}' is not authorized."
                        }), 403

            except jwt.ExpiredSignatureError:
                return jsonify({"message": "Token has expired!"}), 401
            except jwt.InvalidTokenError:
                return jsonify({"message": "Invalid token!"}), 401

            # Passes current_user to the decorated route function
            return f(current_user, *args, **kwargs)

        return decorated
    return decorator
