import math
from typing import Dict, Tuple

USDA_FOODKEEPER_BASELINES: Dict[str, int] = {
    'dairy': 7,
    'milk': 7,
    'cheese': 14,
    'leafy greens': 7,
    'spinach': 7,
    'kale': 7,
    'lettuce': 7,
    'produce': 7,
    'berries': 5,
    'citrus fruits': 14,
    'root vegetables': 14,
    'carrots': 14,
    'raw meat': 4,
    'meat': 4,
    'beef': 4,
    'pork': 4,
    'raw poultry': 2,
    'poultry': 2,
    'chicken': 2,
    'turkey': 2,
    'baked goods': 14,
    'bread': 14,
    'seafood': 2,
    'fish': 2,
}

IDEAL_HUMIDITY_RANGES: Dict[str, Tuple[float, float]] = {
    'produce': (85.0, 95.0),
    'leafy greens': (85.0, 95.0),
    'berries': (85.0, 95.0),
    'citrus fruits': (85.0, 95.0),
    'root vegetables': (85.0, 95.0),
    'dairy': (65.0, 85.0),
    'baked goods': (65.0, 85.0),
    'raw meat': (70.0, 85.0),
    'meat': (70.0, 85.0),
    'raw poultry': (70.0, 85.0),
    'poultry': (70.0, 85.0),
    'seafood': (70.0, 85.0),
}

def get_baseline_shelf_life(category: str) -> int:
    cat_lower = (category or '').strip().lower()
    for key, days in USDA_FOODKEEPER_BASELINES.items():
        if key in cat_lower:
            return days
    return 7

def calculate_shelf_life_days(category: str, temp: float = 4.0, humidity: float = 85.0) -> int:
    baseline_days = get_baseline_shelf_life(category)
    actual_temp = temp if temp is not None else 4.0
    actual_hum = humidity if humidity is not None else 85.0
    exponent = -(actual_temp - 4.0) / 10.0
    adjusted_days = baseline_days * math.pow(2.0, exponent)
    cat_lower = (category or '').strip().lower()
    ideal_range = (70.0, 90.0)
    for key, rng in IDEAL_HUMIDITY_RANGES.items():
        if key in cat_lower:
            ideal_range = rng
            break
    if actual_hum < ideal_range[0] or actual_hum > ideal_range[1]:
        adjusted_days *= 0.88
    return max(0, round(adjusted_days))
