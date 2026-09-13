from datetime import datetime, timedelta
from typing import Dict, Any, Optional
from app.ml.scoring_engine import CATEGORY_STORAGE_STANDARDS

PACKAGING_MULTIPLIERS = {
    'Unpackaged': 1.0,
    'Paper Bag': 1.08,
    'Plastic Wrap': 1.25,
    'Sealed Container': 1.45,
    'Vacuum Sealed': 1.90,
    'Modified Atmosphere': 2.20
}

class KineticShelfLifeEngine:
    @classmethod
    def predict_shelf_life(
        cls,
        category: str,
        current_freshness_score: float,
        storage_temperature: float,
        storage_humidity: float,
        packaging_type: str = 'Unpackaged',
        days_stored: int = 0
    ) -> Dict[str, Any]:
        standards = CATEGORY_STORAGE_STANDARDS.get(category, CATEGORY_STORAGE_STANDARDS['Fruits'])
        base_shelf_life = standards['base_shelf_life']
        ideal_temp = (standards['temp_min'] + standards['temp_max']) / 2.0
        
        # 1. Temperature Acceleration Factor (Arrhenius Q10 = 2.1)
        temp_delta = storage_temperature - ideal_temp
        if temp_delta > 0:
            temp_factor = 1.0 / (2.1 ** (temp_delta / 10.0))
        else:
            temp_factor = min(1.35, 1.0 + (abs(temp_delta) * 0.04))
            
        # 2. Humidity Impact Factor
        h_min, h_max = standards['humidity_min'], standards['humidity_max']
        if h_min <= storage_humidity <= h_max:
            humidity_factor = 1.0
        elif storage_humidity < h_min:
            humidity_factor = max(0.55, 1.0 - ((h_min - storage_humidity) * 0.018))
        else:
            humidity_factor = max(0.60, 1.0 - ((storage_humidity - h_max) * 0.025))
            
        # 3. Packaging Type Multiplier
        pkg_factor = PACKAGING_MULTIPLIERS.get(packaging_type, 1.0)
        
        # 4. Freshness Multiplier
        freshness_ratio = max(0.05, current_freshness_score / 100.0)
        
        # Calculate Remaining Shelf Life
        unadjusted_remaining = max(0.5, base_shelf_life - days_stored)
        adjusted_remaining = unadjusted_remaining * temp_factor * humidity_factor * (pkg_factor ** 0.6) * (freshness_ratio ** 1.1)
        adjusted_remaining_days = round(max(0.1, adjusted_remaining), 1)
        
        predicted_expiry = datetime.utcnow() + timedelta(days=adjusted_remaining_days)
        
        # Risk Level Assessment
        if current_freshness_score < 30.0 or adjusted_remaining_days <= 1.0:
            risk_level = 'Critical'
        elif current_freshness_score < 55.0 or adjusted_remaining_days <= 3.0:
            risk_level = 'High'
        elif current_freshness_score < 75.0 or adjusted_remaining_days <= 6.0:
            risk_level = 'Medium'
        else:
            risk_level = 'Low'
            
        # Storage Optimization Tip
        t_min = standards['temp_min']
        t_max = standards['temp_max']
        tips = []
        if storage_temperature > t_max:
            gained = round(adjusted_remaining_days * 0.45, 1)
            tips.append(f'Lower temperature to {t_min}°C–{t_max}°C to extend freshness by +{gained} days.')
        if storage_humidity < h_min:
            tips.append(f'Increase relative humidity to {h_min}% to prevent moisture loss.')
        elif storage_humidity > h_max:
            tips.append(f'Improve ventilation to keep humidity below {h_max}% to deter mold.')
        if packaging_type == 'Unpackaged':
            tips.append('Consider using Sealed Containers or Vacuum Packing to increase shelf life by up to 45%.')
            
        optimization_tip = ' | '.join(tips) if tips else 'Storage conditions are within optimal parameters.'
        
        return {
            'base_shelf_life_days': base_shelf_life,
            'adjusted_shelf_life_days': adjusted_remaining_days,
            'temperature_impact_factor': round(temp_factor, 2),
            'humidity_impact_factor': round(humidity_factor, 2),
            'packaging_benefit_factor': round(pkg_factor, 2),
            'predicted_expiry_date': predicted_expiry,
            'risk_level': risk_level,
            'storage_optimization_tip': optimization_tip
        }
