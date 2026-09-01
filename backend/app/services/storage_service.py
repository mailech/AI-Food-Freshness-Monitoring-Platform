from typing import List, Dict, Any
from app.services.db import db
from datetime import datetime

class StorageService:
    def get_all_zones(self) -> List[Dict[str, Any]]:
        return db.storage_zones

    def get_history_trends(self) -> List[Dict[str, Any]]:
        # Mock 24-hour sensor timeline readings
        trends = []
        base_temp = 3.4
        base_humidity = 86.5
        for hour in range(0, 24, 2):
            time_str = f"{hour:02d}:00"
            temp_variation = ((hour % 5) - 2) * 0.2
            humidity_variation = ((hour % 4) - 1.5) * 0.8
            trends.append({
                "time": time_str,
                "temperature": round(base_temp + temp_variation, 2),
                "humidity": round(base_humidity + humidity_variation, 1),
                "target_temp": 4.0,
                "target_humidity": 85.0
            })
        return trends

storage_service = StorageService()
