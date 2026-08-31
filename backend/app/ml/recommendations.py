"""Recommendation engine (SRS Module 8).

  FR-8.1 Storage recommendations (temperature/humidity adjustments)  Must
  FR-8.2 Consumption recommendations (consume-first prioritization)  Must
  FR-8.3 Inventory rotation suggestions (FIFO/risk-based)            Should
  FR-8.4 Waste reduction recommendations                             Should
  FR-8.5 Quality improvement suggestions                             Could
"""

PRIORITY_ORDER = {"high": 0, "medium": 1, "low": 2}


def _rec(rec_type: str, priority: str, message: str, **extra) -> dict:
    return {"type": rec_type, "priority": priority, "message": message, **extra}


def item_recommendations(state: dict) -> list[dict]:
    item = state["item"]
    composite = state["composite"]
    prediction = state["prediction"]
    flags = state["flags"]
    recs: list[dict] = []

    # FR-8.1 storage adjustments
    compliance = state.get("compliance")
    if compliance:
        for violation in compliance["violations"]:
            recs.append(_rec("storage", "high", f"Fix storage: {violation}"))
        for note in compliance["recommendations"]:
            recs.append(_rec("storage", "medium", note))
    else:
        recs.append(
            _rec(
                "storage",
                "low",
                "Record temperature and humidity readings to unlock storage guidance.",
            )
        )

    # FR-8.2 consumption prioritization
    remaining = prediction.remaining_days
    score = composite.overall_score
    if composite.health_category == "Spoiled" or remaining <= 0:
        recs.append(_rec("consumption", "high", "Discard or compost — item is no longer safe to eat.", remaining_days=remaining))
    elif remaining <= 1 or score < 55:
        recs.append(_rec("consumption", "high", f"Consume immediately (about {max(remaining, 1)} day(s) left).", remaining_days=remaining))
    elif remaining <= 3 or score < 70:
        recs.append(_rec("consumption", "medium", f"Plan to consume within {remaining} days.", remaining_days=remaining))
    else:
        recs.append(_rec("consumption", "low", f"No rush — roughly {remaining} days of shelf life remain.", remaining_days=remaining))

    # FR-8.4 waste reduction
    if score < 70 and composite.health_category != "Spoiled":
        recs.append(
            _rec(
                "waste",
                "medium",
                "Consider cooking, freezing, or sharing this item soon to avoid waste.",
            )
        )
    if state["batches"] and any(b.expiry_date is not None for b in state["batches"]):
        soonest = min(b.expiry_date for b in state["batches"])
        recs.append(_rec("waste", "low", f"Labeled batch expiry: {soonest.isoformat()}."))

    # FR-8.5 quality improvement
    if flags["light_exposure"] == "high":
        recs.append(_rec("quality", "medium", "Store away from direct light to preserve quality."))
    if flags["air_circulation"] == "low":
        recs.append(_rec("quality", "medium", "Improve air circulation to keep conditions even."))
    if not item.packaging_type:
        recs.append(_rec("quality", "low", "Sealed or airtight packaging would extend freshness."))
    if state["assessment"] is None:
        recs.append(_rec("quality", "low", "Upload a photo to get an accurate visual freshness assessment."))

    recs.sort(key=lambda r: PRIORITY_ORDER[r["priority"]])
    return recs


def rotation_recommendations(states: list[dict]) -> list[dict]:
    """FR-8.3 risk-based consume-first ordering + FIFO batch rotation."""
    recs: list[dict] = []
    ranked = sorted(states, key=lambda s: (s["composite"].overall_score, s["prediction"].remaining_days))
    for rank, state in enumerate(ranked[:10], start=1):
        item = state["item"]
        batches = state["batches"]
        fifo_note = ""
        if len(batches) > 1:
            fifo_note = f" FIFO: use batch {batches[0].batch_code} (received {batches[0].received_date.isoformat()}) first."
        recs.append(
            _rec(
                "rotation",
                "high" if rank <= 3 else ("medium" if rank <= 6 else "low"),
                f"#{rank} Consume first: {item.name} "
                f"(score {state['composite'].overall_score}, ~{state['prediction'].remaining_days}d left).{fifo_note}",
                item_id=item.id,
                rank=rank,
            )
        )
    return recs
