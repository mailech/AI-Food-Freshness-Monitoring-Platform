from typing import List, Dict
from ..models.sql_models import InventoryItem

class RecommendationEngine:
    @staticmethod
    def generate_recommendations(item: InventoryItem) -> List[str]:
        """
        Generates actionable storage improvement recommendations based on
        current ambient storage conditions, food category guidelines, and defects.
        """
        recommendations = []
        cat = item.category
        
        # Check temperature thresholds
        if item.storage_temp is not None:
            temp = float(item.storage_temp)
            ideal_min = float(cat.ideal_temp_min)
            ideal_max = float(cat.ideal_temp_max)
            
            if temp > ideal_max:
                recommendations.append(
                    f"Temperature is too high ({temp}°C). The ideal range for {cat.name} is {ideal_min}-{ideal_max}°C. "
                    f"Move item to a cooler location or refrigeration unit immediately."
                )
            elif temp < ideal_min:
                recommendations.append(
                    f"Temperature is too low ({temp}°C). The ideal range for {cat.name} is {ideal_min}-{ideal_max}°C. "
                    f"Risk of freeze damage. Adjust thermostat settings."
                )
                
        # Check humidity thresholds
        if item.storage_humidity is not None:
            humidity = float(item.storage_humidity)
            ideal_min = float(cat.ideal_humidity_min)
            ideal_max = float(cat.ideal_humidity_max)
            
            if humidity < ideal_min:
                recommendations.append(
                    f"Humidity is too low ({humidity}%). Ideal humidity is {ideal_min}-{ideal_max}%. "
                    f"Dry air causes wilting and water loss. Use moisture retention containers or misting."
                )
            elif humidity > ideal_max:
                recommendations.append(
                    f"Humidity is too high ({humidity}%). Ideal humidity is {ideal_min}-{ideal_max}%. "
                    f"Excess moisture triggers mold growth. Increase ventilation or use desiccants."
                )
                
        # Check analysis results
        if item.analysis_results:
            # Sort to get latest result
            latest = sorted(item.analysis_results, key=lambda x: x.analyzed_at, reverse=True)[0]
            
            if latest.mold_detected:
                recommendations.append(
                    "WARNING: Mold spores detected! Spores spread quickly. "
                    "Quarantine and discard this item immediately to prevent contaminating neighboring inventory."
                )
                
            if latest.bruise_detected:
                recommendations.append(
                    "Bruising or physical compression detected. "
                    "Bruised areas rot faster. Prioritize selling, cooking, or processing this item before decay worsens."
                )
                
            if latest.damage_detected:
                recommendations.append(
                    "Physical tissue damage detected. Open flesh attracts insects and bacteria. "
                    "Seal or process immediately."
                )
                
        # Category specific tips
        if cat.name == "Fruits" and item.status == "Fresh":
            recommendations.append("Tip: Keep ethylene-producing fruits (like bananas, apples) separate from ethylene-sensitive items.")
        elif cat.name == "Milk":
            recommendations.append("Tip: Keep milk in the main body of the refrigerator, not the door shelves, to maintain stable cold temperature.")
        elif cat.name == "Seafood":
            recommendations.append("Tip: Store fresh seafood on ice beds inside the freezer/chiller to optimize preservation.")
            
        # Default fallback
        if not recommendations:
            recommendations.append("Storage parameters are nominal. Continue standard storage guidelines.")
            
        return recommendations
