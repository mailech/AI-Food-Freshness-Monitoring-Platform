"""
Freshness scoring engine.

This is a placeholder, not a trained model. Right now it estimates a score
from storage temperature/humidity plus a bit of randomness standing in for
the "visual condition analysis" piece (that's the part that needs a real
CNN/YOLO model on the food images later, per the weighted scoring model:
visual 40%, storage 25%, shelf-life 20%, product age 15%).

Swap `estimate_freshness` for a real inference call once the CV model
(image_analysis_service in the architecture doc) is ready - keep the same
return shape so the rest of the app doesn't need to change.
"""

import random
from .models import FreshnessLabel

# rough "ideal" storage ranges per category - used only to nudge the score,
# not meant to be authoritative food-safety data
IDEAL_RANGES = {
    "fruits": (4, 10, 85, 95),
    "vegetables": (1, 4, 90, 98),
    "dairy": (1, 4, 80, 90),
    "meat_poultry": (-2, 2, 80, 90),
    "seafood": (-2, 0, 85, 95),
    "bakery": (18, 24, 40, 60),
    "packaged": (10, 22, 30, 60),
    "beverages": (2, 8, 30, 60),
}


def _storage_score(category: str, temp_c, humidity_pct) -> float:
    """0-100: how close storage conditions are to the ideal range."""
    lo_t, hi_t, lo_h, hi_h = IDEAL_RANGES.get(category, (0, 10, 40, 90))

    score = 100.0
    if temp_c is not None:
        if temp_c < lo_t:
            score -= min((lo_t - temp_c) * 6, 40)
        elif temp_c > hi_t:
            score -= min((temp_c - hi_t) * 6, 40)

    if humidity_pct is not None:
        if humidity_pct < lo_h:
            score -= min((lo_h - humidity_pct) * 1.5, 30)
        elif humidity_pct > hi_h:
            score -= min((humidity_pct - hi_h) * 1.5, 30)

    return max(0.0, min(100.0, score))


def _label_from_score(score: float) -> FreshnessLabel:
    if score >= 85:
        return FreshnessLabel.fresh
    if score >= 70:
        return FreshnessLabel.good
    if score >= 50:
        return FreshnessLabel.acceptable
    if score >= 30:
        return FreshnessLabel.near_spoilage
    return FreshnessLabel.spoiled


def estimate_freshness(category: str, temp_c=None, humidity_pct=None, has_image: bool = False):
    """
    Returns (freshness_score, freshness_label, predicted_shelf_life_days).

    visual_score is simulated for now (random, weighted higher if an image
    was actually uploaded, since that's a signal the item was inspected).
    """
    visual_score = random.uniform(55, 95) if has_image else random.uniform(40, 80)
    storage_score = _storage_score(category, temp_c, humidity_pct)

    # weights from the spec: visual 40%, storage 25%, shelf-life 20%, age 15%
    # shelf-life + age folded together here since we don't track purchase age yet
    remaining_score = random.uniform(50, 90)

    final_score = (
        visual_score * 0.40
        + storage_score * 0.25
        + remaining_score * 0.35
    )
    final_score = round(max(0.0, min(100.0, final_score)), 1)

    label = _label_from_score(final_score)

    # rough shelf life estimate driven by the score, capped by category
    base_days = {
        "fruits": 7, "vegetables": 6, "dairy": 10, "meat_poultry": 4,
        "seafood": 3, "bakery": 5, "packaged": 60, "beverages": 30,
    }.get(category, 7)
    shelf_life_days = round(base_days * (final_score / 100), 1)

    return final_score, label, shelf_life_days
