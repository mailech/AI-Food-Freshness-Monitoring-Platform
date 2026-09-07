"""
Deterministic Recommendation Engine
Generates actionable advice across 4 operational domains:
1. Storage condition optimization
2. Consumption & culinary timeline
3. Inventory rotation (FIFO vs FEFO)
4. Waste reduction & diversion
"""
from typing import Dict, Any, List

class RecommendationEngine:
    def generate_recommendations(
        self,
        food_type: str,
        category: str,
        freshness_score: int,
        freshness_category: str,
        spoilage_prob: float,
        shelf_life_days: int,
        storage_score: float,
        storage_temp: float = None,
        humidity: float = None
    ) -> Dict[str, str]:
        normalized_food = food_type.strip().lower() if food_type else "produce"
        
        # 1. Storage Recommendation
        if storage_score < 70 and storage_temp is not None:
            storage_rec = f"Adjust ambient storage immediately. Target optimal 2.0°C - 4.0°C with 85% RH to arrest microbial activity."
        elif freshness_score > 80:
            storage_rec = f"Maintain stable refrigeration between 2°C and 4°C with controlled relative humidity (80-90%)."
        elif freshness_score > 50:
            storage_rec = f"Keep in high-humidity crisper drawer separated from high-ethylene items to prevent premature softening."
        else:
            storage_rec = f"Quarantine from active cold storage vaults to avoid cross-contamination of adjacent batches."

        # 2. Consumption Recommendation
        if freshness_score >= 80:
            consumption_rec = f"Optimal for fresh table service, retail display, or raw consumption within {shelf_life_days} days."
        elif freshness_score >= 60:
            consumption_rec = f"Suitable for standard dining service; prioritize consumption within {shelf_life_days} day{'s' if shelf_life_days != 1 else ''}."
        elif freshness_score >= 35:
            consumption_rec = f"Recommend same-day thermal processing, baking, sauce reduction, or immediate kitchen consumption."
        else:
            consumption_rec = "Do NOT consume. Morphological degradation and microbial threshold indicate safety hazard."

        # 3. Waste Reduction Recommendation
        if freshness_score >= 80:
            waste_rec = "Standard FIFO (First-In, First-Out) inventory rotation protocol recommended."
        elif freshness_score >= 50:
            waste_rec = "Apply FEFO (First-Expired, First-Out) priority. Repackage or discount for accelerated stock clearance."
        elif freshness_score >= 35:
            waste_rec = "Divert immediately to prepared kitchen recipes (juicing, purees, soups) before total spoilage occurs."
        else:
            waste_rec = "Divert spoiled batch to industrial compost or biomass digestion; log loss in spoilage audit registry."

        # 4. Overall Primary Action Text
        if freshness_score >= 80:
            primary_rec = "Store in a cool refrigerated environment with high humidity."
        elif freshness_score >= 55:
            primary_rec = "Monitor closely and accelerate inventory rotation."
        elif freshness_score >= 35:
            primary_rec = "Prioritize for immediate culinary use or commercial processing."
        else:
            primary_rec = "Quarantine batch immediately to prevent fungal spore propagation."

        return {
            "recommendation": primary_rec,
            "storage_recommendation": storage_rec,
            "consumption_recommendation": consumption_rec,
            "waste_reduction_recommendation": waste_rec
        }

recommendation_engine = RecommendationEngine()
