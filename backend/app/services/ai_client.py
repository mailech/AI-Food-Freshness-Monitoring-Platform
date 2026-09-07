"""
AI Service HTTP Client for FastAPI Backend
Communicates with the dedicated AI Microservice (port 8001) for model inference.
"""
import os
import httpx
from typing import Dict, Any, Optional
from dotenv import load_dotenv

load_dotenv()

AI_SERVICE_URL = os.getenv("AI_SERVICE_URL", "http://127.0.0.1:8001")

class AIClient:
    def __init__(self, base_url: str = AI_SERVICE_URL):
        self.base_url = base_url.rstrip("/")
        self.timeout = httpx.Timeout(30.0, connect=10.0)

    async def check_health(self) -> Dict[str, Any]:
        async with httpx.AsyncClient(timeout=self.timeout) as client:
            try:
                res = await client.get(f"{self.base_url}/health")
                if res.status_code == 200:
                    return res.json()
                return {"status": "unhealthy", "code": res.status_code}
            except Exception as e:
                return {"status": "unavailable", "error": str(e)}

    async def predict_freshness(
        self,
        image_bytes: bytes,
        filename: str = "food_image.jpg",
        content_type: str = "image/jpeg",
        food_type: Optional[str] = None,
        category: Optional[str] = None,
        temperature: Optional[float] = None,
        humidity: Optional[float] = None,
        packaging_type: Optional[str] = None,
        storage_duration: Optional[int] = 0
    ) -> Dict[str, Any]:
        """
        Sends multipart/form-data to AI Service /predict endpoint.
        """
        files = {
            "image": (filename, image_bytes, content_type)
        }
        data = {}
        if food_type:
            data["food_type"] = food_type
        if category:
            data["category"] = category
        if temperature is not None:
            data["temperature"] = str(temperature)
        if humidity is not None:
            data["humidity"] = str(humidity)
        if packaging_type:
            data["packaging_type"] = packaging_type
        if storage_duration is not None:
            data["storage_duration"] = str(storage_duration)

        async with httpx.AsyncClient(timeout=self.timeout) as client:
            res = await client.post(
                f"{self.base_url}/predict",
                files=files,
                data=data
            )
            if res.status_code == 200:
                return res.json()
            elif res.status_code == 503:
                raise RuntimeError(f"AI Model is starting up or unavailable: {res.text}")
            else:
                raise ValueError(f"AI Service error ({res.status_code}): {res.text}")

ai_client = AIClient()
