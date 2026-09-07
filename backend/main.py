from fastapi import FastAPI, Depends, HTTPException
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy import text
from database import get_db, engine, Base
import models
import schemas
from auth import hash_password, verify_password, create_access_token
from dependencies import get_current_user
app = FastAPI(title="Food Freshness Monitoring Platform")
Base.metadata.create_all(bind=engine)
# Allow the React frontend (running on a different port) to call this API
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],  # Vite's default dev port
    allow_methods=["*"],
    allow_headers=["*"],
)

@app.get("/")
def root():
    return {"message": "Food Freshness Monitoring Platform API is running"}

@app.get("/health")
def health_check(db: Session = Depends(get_db)):
    # Actually test the database connection, not just the API
    db.execute(text("SELECT 1"))
    return {"status": "ok", "database": "connected"}
@app.post("/register", response_model=schemas.UserResponse)
def register_user(user: schemas.UserCreate, db: Session = Depends(get_db)):
    existing_user = db.query(models.User).filter(models.User.email == user.email).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Email already registered")

    new_user = models.User(
        email=user.email,
        hashed_password=hash_password(user.password),
        full_name=user.full_name,
        role=user.role
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)
    return new_user
@app.post("/login", response_model=schemas.Token)
def login(credentials: schemas.UserLogin, db: Session = Depends(get_db)):
    user = db.query(models.User).filter(models.User.email == credentials.email).first()

    if not user or not verify_password(credentials.password, user.hashed_password):
        raise HTTPException(status_code=401, detail="Incorrect email or password")

    access_token = create_access_token(data={"sub": user.email, "role": user.role})
    return {"access_token": access_token, "token_type": "bearer"}
@app.get("/me", response_model=schemas.UserResponse)
def read_current_user(current_user: models.User = Depends(get_current_user)):
    return current_user
@app.post("/food-items", response_model=schemas.FoodItemResponse)
def create_food_item(
    item: schemas.FoodItemCreate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    new_item = models.FoodItem(**item.model_dump(), owner_id=current_user.id)
    db.add(new_item)
    db.commit()
    db.refresh(new_item)
    return new_item
@app.get("/food-items", response_model=list[schemas.FoodItemResponse])
def list_food_items(db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    return db.query(models.FoodItem).filter(models.FoodItem.owner_id == current_user.id).order_by(models.FoodItem.created_at.desc()).all()

@app.get("/food-items/{item_id}", response_model=schemas.FoodItemResponse)
def get_food_item(item_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    item = db.query(models.FoodItem).filter(models.FoodItem.id == item_id, models.FoodItem.owner_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Food item not found")
    return item

@app.put("/food-items/{item_id}", response_model=schemas.FoodItemResponse)
def update_food_item(item_id: int, updates: schemas.FoodItemCreate, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    item = db.query(models.FoodItem).filter(models.FoodItem.id == item_id, models.FoodItem.owner_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Food item not found")
    for key, value in updates.model_dump().items():
        setattr(item, key, value)
    db.commit()
    db.refresh(item)
    return item

@app.delete("/food-items/{item_id}")
def delete_food_item(item_id: int, db: Session = Depends(get_db), current_user: models.User = Depends(get_current_user)):
    item = db.query(models.FoodItem).filter(models.FoodItem.id == item_id, models.FoodItem.owner_id == current_user.id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Food item not found")
    db.delete(item)
    db.commit()
    return {"message": "Food item deleted"}