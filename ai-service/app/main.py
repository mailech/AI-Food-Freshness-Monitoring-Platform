from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware
from contextlib import asynccontextmanager
import time

from app.api.predict import router as predict_router
from app.inference.predictor import predictor_pipeline

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Startup: Load ML models once
    print("[*] Initializing AI Service & Loading ML Models into memory...")
    try:
        predictor_pipeline.initialize()
    except Exception as e:
        print(f"[!] Warning: Model loading deferred or failed on startup: {e}")
    yield
    # Shutdown
    print("[*] Shutting down AI Service...")

app = FastAPI(
    title="Food Freshness AI Microservice",
    description="Dedicated Deep Learning Inference Microservice for Food Freshness Classification using EfficientNetB0.",
    version="1.0.0",
    lifespan=lifespan
)

app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(predict_router)

@app.get("/health")
def health_check():
    is_model_ready = predictor_pipeline.freshness_classifier.is_loaded
    return {
        "status": "healthy",
        "service": "food-freshness-ai-service",
        "model_loaded": is_model_ready,
        "model_name": "EfficientNetB0-Freshness",
        "timestamp": time.time()
    }

@app.get("/model-info")
def model_info():
    clf = predictor_pipeline.freshness_classifier
    return {
        "model_architecture": "EfficientNetB0 Transfer Learning",
        "input_resolution": "224x224x3",
        "classes": clf.class_names,
        "is_loaded": clf.is_loaded,
        "model_path": clf.model_path,
        "framework": "TensorFlow / Keras 3.x"
    }

if __name__ == "__main__":
    import uvicorn
    uvicorn.run("app.main:app", host="0.0.0.0", port=8001, reload=False)
