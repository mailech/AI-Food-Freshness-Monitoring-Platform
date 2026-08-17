from datetime import datetime, timezone
from typing import Any, Dict, List

from app.modules.inventory.models import InventoryItem
from app.modules.storage.models import StorageReading
from app.modules.storage.schemas import StorageComplianceReport
from app.modules.shelf_life.service import FOOD_CATEGORY_CONSTANTS

def evaluate_storage_compliance(item: InventoryItem, reading: StorageReading) -> StorageComplianceReport:
    """
    Compare storage telemetry logs against category optimal guidelines.
    Generates compliance statuses and actionable recommendations list.
    """
    const = FOOD_CATEGORY_CONSTANTS.get(item.category, FOOD_CATEGORY_CONSTANTS["Fruits"])
    ideal_temp = const["ideal_temp"]
    ideal_humidity = const["ideal_humidity"]

    temp_diff = reading.temperature - ideal_temp
    hum_diff = reading.humidity - ideal_humidity

    status = "COMPLIANT"
    recommendations: List[str] = []

    # 1. Temperature deviations checks
    if abs(temp_diff) > 5.0:
        status = "CRITICAL"
        if temp_diff > 0:
            recommendations.append(
                f"Critical Heat Abuse: Temperature is {temp_diff:.1f}°C above ideal ({ideal_temp}°C). "
                "Cooling system check is required immediately to prevent spoilage."
            )
        else:
            recommendations.append(
                f"Critical Cold Abuse: Temperature is {abs(temp_diff):.1f}°C below ideal ({ideal_temp}°C). "
                "Storage might be freezing, potentially causing cell structure wall rupture."
            )
    elif abs(temp_diff) > 2.0:
        status = "WARNING"
        if temp_diff > 0:
            recommendations.append(
                f"Temperature is {temp_diff:.1f}°C above ideal. Increase refrigeration cooling output."
            )
        else:
            recommendations.append(
                f"Temperature is {abs(temp_diff):.1f}°C below ideal. Adjust temperature up to avoid chill injury."
            )

    # 2. Humidity deviations checks
    if abs(hum_diff) > 20.0:
        status = "CRITICAL"
        if hum_diff > 0:
            recommendations.append(
                f"Critical Humidity Alert: Relative humidity is {hum_diff:.1f}% above ideal ({ideal_humidity}%). "
                "High water activity risks immediate mold growth. Activate exhaust fans/dehumidifiers."
            )
        else:
            recommendations.append(
                f"Critical Humidity Alert: Relative humidity is {abs(hum_diff):.1f}% below ideal ({ideal_humidity}%). "
                "Extreme desiccation risk. Activate humifiers immediately."
            )
    elif abs(hum_diff) > 10.0:
        if status != "CRITICAL":
            status = "WARNING"
        if hum_diff > 0:
            recommendations.append(
                f"Humidity is {hum_diff:.1f}% above ideal. Open ventilation dampers."
            )
        else:
            recommendations.append(
                f"Humidity is {abs(hum_diff):.1f}% below ideal. Increase moisture levels to prevent shrinkage."
            )

    # 3. Air Circulation checks
    if item.category in ("Fruits", "Vegetables") and reading.air_circulation == "Low":
        if status == "COMPLIANT":
            status = "WARNING"
        recommendations.append(
            "Low Air Circulation: Ethylene gases (ripening hormones) may accumulate. Increase ventilation dampers."
        )

    # 4. Light Exposure checks
    if item.category in ("Fruits", "Vegetables", "Dairy Products", "Meat & Poultry", "Seafood") and reading.light_exposure in ("Medium", "High"):
        if status == "COMPLIANT":
            status = "WARNING"
        recommendations.append(
            f"Excessive Light ({reading.light_exposure}): Photo-oxidation danger. Cover shelves or dim storage lights."
        )

    if not recommendations:
        recommendations.append("All storage parameters are within compliance guidelines.")

    return StorageComplianceReport(
        item_id=str(item.id),
        warehouse_zone=reading.warehouse_zone,
        compliance_status=status,
        temperature=reading.temperature,
        humidity=reading.humidity,
        air_circulation=reading.air_circulation,
        light_exposure=reading.light_exposure,
        temperature_deviation=round(temp_diff, 1),
        humidity_deviation=round(hum_diff, 1),
        recorded_at=reading.recorded_at,
        recommendations=recommendations
    )
