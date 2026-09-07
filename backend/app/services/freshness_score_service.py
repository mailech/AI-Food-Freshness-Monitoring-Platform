"""
Freshness Score Service
Computes composite multi-factor freshness score following the system specification:
Freshness Score = (Visual Score * 40%) + (Storage Score * 25%) + (Shelf-Life Score * 20%) + (Product Age Score * 15%)
"""
from typing import Dict, Any, Tuple

class FreshnessScoreService:
    def calculate_composite_score(
        self,
        visual_score: float,        # 0 - 100 based on model fresh_probability
        storage_score: float,       # 0 - 100 based on storage condition deviation
        shelf_life_days: int,       # remaining days
        base_shelf_life: int,       # expected baseline days under optimal storage
        storage_duration_days: int  # days currently stored
    ) -> Tuple[int, str, str]:
        """
        Calculates composite 0-100 score and maps to standard freshness category and risk level.
        Returns: (freshness_score_int, freshness_category, risk_level)
        """
        # 1. Visual Condition (40%)
        v_comp = max(0.0, min(100.0, visual_score))

        # 2. Storage Condition (25%)
        s_comp = max(0.0, min(100.0, storage_score))

        # 3. Shelf-Life Score (20%)
        # Ratio of remaining days relative to base shelf life
        if base_shelf_life > 0:
            sl_ratio = max(0.0, min(1.0, shelf_life_days / base_shelf_life))
            sl_comp = sl_ratio * 100.0
        else:
            sl_comp = 50.0

        # 4. Product Age Score (15%)
        # Decreases as duration approaches or exceeds shelf life
        if base_shelf_life > 0:
            age_factor = max(0.0, 1.0 - (storage_duration_days / (base_shelf_life * 1.5)))
            age_comp = age_factor * 100.0
        else:
            age_comp = 80.0

        # Weighted sum
        composite = (v_comp * 0.40) + (s_comp * 0.25) + (sl_comp * 0.20) + (age_comp * 0.15)
        final_score = int(round(max(0.0, min(100.0, composite))))

        # Freshness Category Mapping
        if final_score >= 85:
            category = "Fresh"
            risk_level = "Low"
        elif final_score >= 70:
            category = "Good"
            risk_level = "Low"
        elif final_score >= 55:
            category = "Acceptable"
            risk_level = "Medium"
        elif final_score >= 35:
            category = "Near Spoilage"
            risk_level = "High"
        else:
            category = "Spoiled"
            risk_level = "Critical"

        return final_score, category, risk_level

freshness_score_service = FreshnessScoreService()
