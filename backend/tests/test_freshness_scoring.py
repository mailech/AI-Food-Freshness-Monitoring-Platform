"""Freshness scoring engine tests.

The scoring formula is the heart of the platform, so it is tested in isolation
(no database, no HTTP) exactly as the specification requires.
"""

from __future__ import annotations

import pytest

from app.core.category_rules import get_profile
from app.core.enums import FreshnessCategory
from app.freshness.scoring import (
    build_score_explanation,
    clamp_score,
    compute_freshness_score,
    normalise_weights,
    overall_health_score,
    product_age_score,
    score_to_category,
    shelf_life_score,
    storage_score_from_deviation,
)


# ------------------------------------------------------- the required case
def test_all_components_100_yields_exactly_100():
    """Visual=Storage=ShelfLife=Age=100 must produce exactly 100."""
    result = compute_freshness_score(
        visual_score=100,
        storage_score=100,
        shelf_life_score_value=100,
        product_age_score_value=100,
    )
    assert result.score == 100.0
    assert result.category is FreshnessCategory.FRESH


def test_all_components_zero_yields_zero():
    result = compute_freshness_score(
        visual_score=0, storage_score=0, shelf_life_score_value=0, product_age_score_value=0
    )
    assert result.score == 0.0
    assert result.category is FreshnessCategory.SPOILED


def test_specification_example_produces_81_good():
    """The spec's worked example: 82/74/80/90 -> 81/100 'Good'."""
    result = compute_freshness_score(
        visual_score=82,
        storage_score=74,
        shelf_life_score_value=80,
        product_age_score_value=90,
    )
    assert round(result.score) == 81
    assert result.category is FreshnessCategory.GOOD


def test_weights_match_the_specification():
    result = compute_freshness_score(
        visual_score=50, storage_score=50, shelf_life_score_value=50, product_age_score_value=50
    )
    assert result.weights == {
        "visual": 0.4,
        "storage": 0.25,
        "shelf_life": 0.2,
        "product_age": 0.15,
    }
    assert sum(result.weights.values()) == pytest.approx(1.0)


def test_score_is_the_weighted_sum_of_contributions():
    result = compute_freshness_score(
        visual_score=90, storage_score=60, shelf_life_score_value=40, product_age_score_value=20
    )
    expected = 0.40 * 90 + 0.25 * 60 + 0.20 * 40 + 0.15 * 20
    assert result.score == pytest.approx(expected)
    assert sum(result.contributions.values()) == pytest.approx(result.score)


def test_component_scores_are_persisted_for_explainability():
    result = compute_freshness_score(
        visual_score=71.4, storage_score=64.2, shelf_life_score_value=59.5, product_age_score_value=100
    )
    components = result.components.as_dict()
    assert components == {
        "visual": 71.4,
        "storage": 64.2,
        "shelf_life": 59.5,
        "product_age": 100.0,
    }


# ---------------------------------------------------------------- clamping
@pytest.mark.parametrize(
    "value,expected",
    [(150, 100.0), (-20, 0.0), (None, 50.0), (float("nan"), 50.0), ("abc", 50.0), (73.2, 73.2)],
)
def test_clamp_score_handles_out_of_range_and_invalid_input(value, expected):
    assert clamp_score(value) == expected


def test_out_of_range_components_cannot_push_the_score_outside_0_100():
    high = compute_freshness_score(
        visual_score=500, storage_score=500, shelf_life_score_value=500, product_age_score_value=500
    )
    low = compute_freshness_score(
        visual_score=-500, storage_score=-500, shelf_life_score_value=-500, product_age_score_value=-500
    )
    assert high.score == 100.0
    assert low.score == 0.0


# ------------------------------------------------------- category boundaries
@pytest.mark.parametrize(
    "score,expected",
    [
        (100, FreshnessCategory.FRESH),
        (90, FreshnessCategory.FRESH),       # lower bound of Fresh
        (89.99, FreshnessCategory.GOOD),
        (75, FreshnessCategory.GOOD),        # lower bound of Good
        (74.99, FreshnessCategory.ACCEPTABLE),
        (60, FreshnessCategory.ACCEPTABLE),  # lower bound of Acceptable
        (59.99, FreshnessCategory.NEAR_SPOILAGE),
        (30, FreshnessCategory.NEAR_SPOILAGE),  # lower bound of Near Spoilage
        (29.99, FreshnessCategory.SPOILED),
        (0, FreshnessCategory.SPOILED),
    ],
)
def test_score_to_category_boundaries(score, expected):
    assert score_to_category(score) is expected


def test_thresholds_are_configurable():
    strict = {"FRESH": 95.0, "GOOD": 85.0, "ACCEPTABLE": 70.0, "NEAR_SPOILAGE": 40.0}
    # 90 is Fresh by default but only Good under the stricter thresholds.
    assert score_to_category(90) is FreshnessCategory.FRESH
    assert score_to_category(90, strict) is FreshnessCategory.GOOD


def test_weights_are_configurable_and_renormalised():
    # Deliberately unnormalised weights must be scaled to sum to 1.
    weights = normalise_weights({"visual": 2, "storage": 1, "shelf_life": 1, "product_age": 0})
    assert sum(weights.values()) == pytest.approx(1.0)
    assert weights["visual"] == pytest.approx(0.5)
    assert weights["product_age"] == 0.0


def test_zero_weights_fall_back_to_the_specification_defaults():
    weights = normalise_weights({"visual": 0, "storage": 0, "shelf_life": 0, "product_age": 0})
    assert weights == {"visual": 0.40, "storage": 0.25, "shelf_life": 0.20, "product_age": 0.15}


def test_visual_component_dominates_because_it_carries_the_largest_weight():
    good_visual = compute_freshness_score(
        visual_score=100, storage_score=0, shelf_life_score_value=0, product_age_score_value=0
    )
    good_storage = compute_freshness_score(
        visual_score=0, storage_score=100, shelf_life_score_value=0, product_age_score_value=0
    )
    assert good_visual.score > good_storage.score
    assert good_visual.score == pytest.approx(40.0)
    assert good_storage.score == pytest.approx(25.0)


# ----------------------------------------------------------- shelf-life score
def test_shelf_life_score_scales_with_the_fraction_of_life_remaining():
    profile = get_profile("FRUITS")  # 7-day baseline
    full = shelf_life_score(7, total_shelf_life_days=7, profile=profile)
    half = shelf_life_score(3.5, total_shelf_life_days=7, profile=profile)
    none = shelf_life_score(0, total_shelf_life_days=7, profile=profile)

    assert full == pytest.approx(100.0)
    assert 0 < half < full
    assert none == 0.0


def test_shelf_life_score_is_relative_to_the_category():
    """3 days left is dire for seafood but fine for canned goods."""
    seafood = shelf_life_score(3, total_shelf_life_days=2.5)
    packaged = shelf_life_score(3, total_shelf_life_days=120)
    assert seafood > packaged


def test_shelf_life_score_defaults_to_neutral_when_unknown():
    assert shelf_life_score(None) == 50.0


# ----------------------------------------------------------- product-age score
def test_product_age_score_decreases_with_age():
    fresh = product_age_score(0, total_shelf_life_days=10)
    mid = product_age_score(5, total_shelf_life_days=10)
    old = product_age_score(10, total_shelf_life_days=10)
    ancient = product_age_score(30, total_shelf_life_days=10)

    assert fresh == 100.0
    assert mid == pytest.approx(50.0)
    assert old == 0.0
    assert ancient == 0.0  # clamped, never negative


def test_unknown_age_is_mildly_optimistic_but_not_perfect():
    assert product_age_score(None) == 75.0


# --------------------------------------------------------------- storage score
def test_storage_score_is_100_inside_the_recommended_envelope():
    profile = get_profile("DAIRY")  # 1-4 C, 50-80% RH
    score, notes = storage_score_from_deviation(3.0, 65.0, profile=profile)
    assert score == 100.0
    assert any("inside the recommended envelope" in note for note in notes)


def test_storage_score_penalises_temperature_above_the_maximum():
    profile = get_profile("DAIRY")
    score, notes = storage_score_from_deviation(9.0, 65.0, profile=profile)
    assert score < 100.0
    assert any("exceeds" in note for note in notes)


def test_more_perishable_categories_are_penalised_harder_for_the_same_excursion():
    """A 4 C overshoot matters more for meat than for packaged goods."""
    meat = get_profile("MEAT_POULTRY")
    packaged = get_profile("PACKAGED")
    meat_score, _ = storage_score_from_deviation(
        meat.storage_rule.temp_max_c + 4, 80, profile=meat
    )
    packaged_score, _ = storage_score_from_deviation(
        packaged.storage_rule.temp_max_c + 4, 45, profile=packaged
    )
    assert meat_score < packaged_score


def test_missing_readings_are_penalised_and_explained():
    profile = get_profile("FRUITS")
    score, notes = storage_score_from_deviation(None, None, profile=profile)
    assert score < 100.0
    assert any("temperature not recorded" in note for note in notes)
    assert any("humidity not recorded" in note for note in notes)


def test_poor_circulation_and_excess_light_reduce_the_score():
    profile = get_profile("DAIRY")
    base, _ = storage_score_from_deviation(3.0, 65.0, profile=profile)
    worse, notes = storage_score_from_deviation(
        3.0, 65.0, profile=profile, air_circulation="POOR", light_exposure="HIGH"
    )
    assert worse < base
    assert any("circulation" in note for note in notes)
    assert any("light" in note for note in notes)


def test_storage_score_never_goes_below_zero():
    profile = get_profile("SEAFOOD")
    score, _ = storage_score_from_deviation(
        45.0, 100.0, profile=profile, air_circulation="POOR", light_exposure="HIGH"
    )
    assert score == 0.0


# --------------------------------------------------------------- health score
def test_overall_health_score_is_reduced_by_spoilage_probability():
    clean = overall_health_score(80, spoilage_probability=0.0)
    risky = overall_health_score(80, spoilage_probability=0.8)
    assert clean == 80.0
    assert risky < clean
    assert risky >= 0.0


def test_overall_health_score_stays_within_bounds():
    assert overall_health_score(10, spoilage_probability=1.0, compliance_penalty=50) == 0.0
    assert overall_health_score(100, spoilage_probability=0.0) == 100.0


# --------------------------------------------------------------- explanation
def test_explanation_lists_every_component_with_its_weight():
    result = compute_freshness_score(
        visual_score=82, storage_score=74, shelf_life_score_value=80, product_age_score_value=90
    )
    explanation = build_score_explanation(result)

    assert explanation["final_score"] == pytest.approx(80.8, abs=0.1)
    assert explanation["final_category"] == "GOOD"
    keys = [component["key"] for component in explanation["components"]]
    assert keys == ["visual", "storage", "shelf_life", "product_age"]

    visual = explanation["components"][0]
    assert visual["weight_label"] == "40%"
    assert visual["score"] == pytest.approx(82.0)
    assert visual["contribution"] == pytest.approx(32.8)

    # Honesty requirement: the disclaimer must be attached to the explanation.
    assert "AI estimate" in explanation["disclaimer"]
    assert "not a laboratory measurement" in explanation["disclaimer"]


def test_explanation_notes_include_the_formula():
    result = compute_freshness_score(
        visual_score=90, storage_score=90, shelf_life_score_value=90, product_age_score_value=90
    )
    joined = " ".join(result.explanation)
    assert "Weighted model" in joined
    assert "40%" in joined
