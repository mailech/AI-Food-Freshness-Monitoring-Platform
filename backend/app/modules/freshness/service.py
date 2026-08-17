import uuid
from datetime import datetime, timezone
from typing import Any, Dict, List, Optional
from sqlalchemy.ext.asyncio import AsyncSession

from app.modules.inventory.models import InventoryItem
from app.modules.image_analysis.models import ImageAnalysis

def get_quality_classification(score: float) -> str:
    if score >= 85.0:
        return "Fresh"
    elif score >= 70.0:
        return "Good"
    elif score >= 50.0:
        return "Acceptable"
    elif score >= 30.0:
        return "Near Spoilage"
    else:
        return "Spoiled"

def calculate_decay_factor(entry_date: datetime, expiry_date: datetime, target_date: datetime) -> float:
    # Handle timezones safely
    if expiry_date.tzinfo is not None and target_date.tzinfo is None:
        target_date = target_date.replace(tzinfo=timezone.utc)
    elif expiry_date.tzinfo is None and target_date.tzinfo is not None:
        target_date = target_date.replace(tzinfo=None)

    if entry_date.tzinfo is not None and target_date.tzinfo is None:
        target_date = target_date.replace(tzinfo=timezone.utc)
    elif entry_date.tzinfo is None and target_date.tzinfo is not None:
        target_date = target_date.replace(tzinfo=None)

    total_duration = (expiry_date - entry_date).total_seconds()
    if total_duration <= 0:
        return 0.0
        
    remaining_duration = (expiry_date - target_date).total_seconds()
    factor = (remaining_duration / total_duration) * 100.0
    return max(0.0, min(100.0, factor))

async def calculate_item_freshness(db: AsyncSession, item: InventoryItem) -> Dict[str, Any]:
    """
    Calculate the blended freshness index of a food item.
    Fuses visual analysis and time decay factors.
    """
    now = datetime.now(timezone.utc)
    decay_factor = calculate_decay_factor(item.entry_date, item.expiry_date, now)

    # Fetch latest MongoDB image analysis
    latest_analysis = await ImageAnalysis.find(
        ImageAnalysis.item_id == str(item.id)
    ).sort(-ImageAnalysis.analyzed_at).first()

    if latest_analysis:
        M = 1.0 if latest_analysis.mold_detected else 0.0
        VS = latest_analysis.freshness_score
        B = latest_analysis.color_degradation
        R = latest_analysis.texture_roughness
        Br = 1.0 if latest_analysis.bruising_detected else 0.0
        D = 1.0 if latest_analysis.damage_detected else 0.0

        # Scoring formula
        score = (1.0 - M) * (
            0.4 * VS + 0.6 * decay_factor - B * 20.0 - R * 15.0 - Br * 10.0 - D * 10.0
        )
        score = max(0.0, min(100.0, score))
    else:
        # Fallback to decay factor if no image is uploaded
        score = decay_factor

    quality_tier = get_quality_classification(score)
    spoilage_prob = 100.0 - score

    return {
        "item_id": str(item.id),
        "freshness_score": round(score, 1),
        "quality_classification": quality_tier,
        "spoilage_probability": round(spoilage_prob, 1),
        "decay_factor": round(decay_factor, 1),
        "has_image_analysis": latest_analysis is not None,
        "analyzed_at": latest_analysis.analyzed_at if latest_analysis else None
    }

async def get_item_freshness_trend(db: AsyncSession, item: InventoryItem) -> List[Dict[str, Any]]:
    """
    Calculate and gather chronological freshness scores over time.
    """
    # Fetch all MongoDB image reports
    analyses = await ImageAnalysis.find(
        ImageAnalysis.item_id == str(item.id)
    ).sort(ImageAnalysis.analyzed_at).to_list()

    trend = []

    for analysis in analyses:
        decay = calculate_decay_factor(item.entry_date, item.expiry_date, analysis.analyzed_at)
        
        M = 1.0 if analysis.mold_detected else 0.0
        VS = analysis.freshness_score
        B = analysis.color_degradation
        R = analysis.texture_roughness
        Br = 1.0 if analysis.bruising_detected else 0.0
        D = 1.0 if analysis.damage_detected else 0.0

        score = (1.0 - M) * (
            0.4 * VS + 0.6 * decay - B * 20.0 - R * 15.0 - Br * 10.0 - D * 10.0
        )
        score = max(0.0, min(100.0, score))
        
        trend.append({
            "timestamp": analysis.analyzed_at,
            "freshness_score": round(score, 1),
            "quality_classification": get_quality_classification(score)
        })

    # If no analysis, return a default decay trend to show a graceful curve
    if not trend:
        now = datetime.now(timezone.utc)
        if item.expiry_date.tzinfo is None:
            now = datetime.now()
        intervals = 4
        total_seconds = (item.expiry_date - item.entry_date).total_seconds()
        
        # Determine times to plot
        for i in range(intervals + 1):
            time_step = item.entry_date + (item.expiry_date - item.entry_date) * (i / intervals)
            # Stop if interval goes past current time
            if time_step > now:
                time_step = now
                decay = calculate_decay_factor(item.entry_date, item.expiry_date, time_step)
                trend.append({
                    "timestamp": time_step,
                    "freshness_score": round(decay, 1),
                    "quality_classification": get_quality_classification(decay)
                })
                break
                
            decay = calculate_decay_factor(item.entry_date, item.expiry_date, time_step)
            trend.append({
                "timestamp": time_step,
                "freshness_score": round(decay, 1),
                "quality_classification": get_quality_classification(decay)
            })
            
            if time_step == now:
                break
                
    return trend
