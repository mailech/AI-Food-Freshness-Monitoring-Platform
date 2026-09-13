from typing import Dict, Any, Optional

CATEGORY_STORAGE_STANDARDS = {
    'Fruits': {'temp_min': 1.0, 'temp_max': 5.0, 'humidity_min': 85.0, 'humidity_max': 95.0, 'base_shelf_life': 14.0},
    'Vegetables': {'temp_min': 2.0, 'temp_max': 6.0, 'humidity_min': 90.0, 'humidity_max': 98.0, 'base_shelf_life': 10.0},
    'Dairy Products': {'temp_min': 0.0, 'temp_max': 4.0, 'humidity_min': 60.0, 'humidity_max': 80.0, 'base_shelf_life': 18.0},
    'Meat & Poultry': {'temp_min': -1.0, 'temp_max': 2.0, 'humidity_min': 75.0, 'humidity_max': 85.0, 'base_shelf_life': 5.0},
    'Seafood': {'temp_min': -2.0, 'temp_max': 1.0, 'humidity_min': 80.0, 'humidity_max': 90.0, 'base_shelf_life': 3.0},
    'Bakery Products': {'temp_min': 15.0, 'temp_max': 22.0, 'humidity_min': 40.0, 'humidity_max': 60.0, 'base_shelf_life': 6.0},
    'Packaged Foods': {'temp_min': 10.0, 'temp_max': 22.0, 'humidity_min': 30.0, 'humidity_max': 65.0, 'base_shelf_life': 90.0},
    'Beverages': {'temp_min': 2.0, 'temp_max': 8.0, 'humidity_min': 40.0, 'humidity_max': 70.0, 'base_shelf_life': 30.0},
}

class FreshnessScoringEngine:
    @staticmethod
    def calculate_storage_score(category: str, temperature: Optional[float], humidity: Optional[float]) -> float:
        standards = CATEGORY_STORAGE_STANDARDS.get(category, CATEGORY_STORAGE_STANDARDS['Fruits'])
        if temperature is None or humidity is None:
            return 90.0
            
        t_min, t_max = standards['temp_min'], standards['temp_max']
        h_min, h_max = standards['humidity_min'], standards['humidity_max']
        
        temp_penalty = 0.0
        if temperature < t_min:
            temp_penalty = abs(t_min - temperature) * 6.0
        elif temperature > t_max:
            temp_penalty = abs(temperature - t_max) * 8.0
            
        humidity_penalty = 0.0
        if humidity < h_min:
            humidity_penalty = abs(h_min - humidity) * 1.5
        elif humidity > h_max:
            humidity_penalty = abs(humidity - h_max) * 2.0
            
        storage_score = max(0.0, min(100.0, 100.0 - (temp_penalty + humidity_penalty)))
        return round(storage_score, 1)

    @staticmethod
    def calculate_shelf_life_score(remaining_days: float, base_shelf_life: float) -> float:
        if base_shelf_life <= 0:
            return 50.0
        ratio = max(0.0, remaining_days / base_shelf_life)
        score = min(100.0, ratio * 100.0)
        return round(score, 1)

    @staticmethod
    def calculate_age_score(days_stored: int, base_shelf_life: float) -> float:
        if base_shelf_life <= 0:
            return 50.0
        ratio = min(1.5, max(0.0, days_stored / base_shelf_life))
        score = max(0.0, 100.0 - (ratio * 100.0))
        return round(score, 1)

    @classmethod
    def compute_weighted_freshness_score(
        cls,
        visual_score: float,
        category: str,
        temperature: Optional[float] = None,
        humidity: Optional[float] = None,
        remaining_shelf_life_days: Optional[float] = None,
        days_stored: int = 0
    ) -> Dict[str, Any]:
        standards = CATEGORY_STORAGE_STANDARDS.get(category, CATEGORY_STORAGE_STANDARDS['Fruits'])
        base_shelf_life = standards['base_shelf_life']
        
        if remaining_shelf_life_days is None:
            remaining_shelf_life_days = max(1.0, base_shelf_life - days_stored)
            
        # 1. Visual Condition Analysis (40%)
        visual_component = max(0.0, min(100.0, visual_score))
        
        # 2. Storage Conditions (25%)
        storage_component = cls.calculate_storage_score(category, temperature, humidity)
        
        # 3. Shelf-Life Prediction (20%)
        shelf_life_component = cls.calculate_shelf_life_score(remaining_shelf_life_days, base_shelf_life)
        
        # 4. Product Age (15%)
        age_component = cls.calculate_age_score(days_stored, base_shelf_life)
        
        # Weighted Composite
        freshness_score = (
            (0.40 * visual_component) +
            (0.25 * storage_component) +
            (0.20 * shelf_life_component) +
            (0.15 * age_component)
        )
        freshness_score = round(max(0.0, min(100.0, freshness_score)), 1)
        
        # Category Mapping
        if freshness_score >= 85.0:
            category_name = 'Fresh'
        elif freshness_score >= 70.0:
            category_name = 'Good'
        elif freshness_score >= 50.0:
            category_name = 'Acceptable'
        elif freshness_score >= 25.0:
            category_name = 'Near Spoilage'
        else:
            category_name = 'Spoiled'
            
        return {
            'visual_condition_score': round(visual_component, 1),
            'visual_weight': 0.40,
            'storage_condition_score': round(storage_component, 1),
            'storage_weight': 0.25,
            'shelf_life_prediction_score': round(shelf_life_component, 1),
            'shelf_life_weight': 0.20,
            'product_age_score': round(age_component, 1),
            'product_age_weight': 0.15,
            'final_freshness_score': freshness_score,
            'freshness_category': category_name
        }
