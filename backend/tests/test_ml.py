"""ML pipeline tests: preprocessing, colour/texture, spoilage, freshness, shelf life."""

from __future__ import annotations

import pytest

from app.core.enums import FreshnessCategory, ModelKind, RiskLevel
from app.core.errors import InvalidImageError
from app.ml.image_analysis.analyzer import get_engine
from app.ml.image_analysis.color import analyze_color, color_degradation_score
from app.ml.image_analysis.texture import analyze_texture, texture_condition_score
from app.ml.preprocessing.image_ops import prepare, validate_image_bytes
from app.ml.registry import ModelRegistry
from app.ml.shelf_life.baseline import BaselineShelfLifeModel
from app.sample_images import SAMPLE_SPECS, generate_sample_image


# ------------------------------------------------------------ preprocessing
def test_validation_accepts_a_real_jpeg(sample_image_bytes):
    validate_image_bytes(sample_image_bytes, "image/jpeg", "bread.jpg")


@pytest.mark.parametrize(
    "data,content_type,filename",
    [
        (b"", "image/jpeg", "empty.jpg"),
        (b"MZ\x90\x00 not an image", "image/jpeg", "fake.jpg"),
        (b"<svg/>", "image/svg+xml", "x.svg"),
    ],
)
def test_validation_rejects_bad_input(data, content_type, filename):
    with pytest.raises(InvalidImageError):
        validate_image_bytes(data, content_type, filename)


def test_validation_checks_the_extension_not_only_the_mime(sample_image_bytes):
    with pytest.raises(InvalidImageError):
        validate_image_bytes(sample_image_bytes, "image/jpeg", "payload.exe")


def test_prepare_resizes_and_produces_every_colour_space(sample_image_bytes):
    prepared = prepare(sample_image_bytes, target_size=256)
    assert max(prepared.working_size) == 256
    assert prepared.bgr.shape == prepared.rgb.shape == prepared.hsv.shape == prepared.lab.shape
    assert prepared.gray.ndim == 2
    assert set(map(int, set(prepared.mask.flatten()[:50]))) <= {0, 255}
    assert 0.0 < prepared.food_pixel_ratio <= 1.0
    assert len(prepared.checksum) == 64
    assert prepared.meta["clahe_applied"] is True


def test_prepare_is_deterministic(sample_image_bytes):
    first = prepare(sample_image_bytes)
    second = prepare(sample_image_bytes)
    assert first.checksum == second.checksum
    assert first.food_pixel_ratio == pytest.approx(second.food_pixel_ratio)


# ------------------------------------------------------------------ colour
def test_colour_features_are_finite_and_bounded(fresh_image_bytes):
    prepared = prepare(fresh_image_bytes)
    features = analyze_color(prepared)

    for key in ("browning_ratio", "dark_spot_ratio", "pale_ratio", "green_ratio", "color_uniformity"):
        assert 0.0 <= features[key] <= 1.0, key
    assert 0 <= features["mean_hue"] <= 180
    assert 0 <= features["mean_saturation"] <= 255
    # The 12 hue-histogram bins must sum to ~1.
    bins = sum(features[f"hue_bin_{i}"] for i in range(12))
    assert bins == pytest.approx(1.0, abs=0.02)


def test_colour_degradation_score_penalises_browning(fresh_image_bytes):
    prepared = prepare(fresh_image_bytes)
    clean = analyze_color(prepared)
    browned = {**clean, "browning_ratio": 0.35, "dark_spot_ratio": 0.2}
    assert color_degradation_score(browned) < color_degradation_score(clean)


def test_colour_degradation_score_stays_in_range():
    extreme = {
        "browning_ratio": 1.0,
        "dark_spot_ratio": 1.0,
        "pale_ratio": 1.0,
        "color_uniformity": 0.0,
        "mean_saturation": 0.0,
    }
    assert 0.0 <= color_degradation_score(extreme) <= 100.0
    assert color_degradation_score({}) <= 100.0


# ----------------------------------------------------------------- texture
def test_texture_features_are_produced(fresh_image_bytes):
    prepared = prepare(fresh_image_bytes)
    features = analyze_texture(prepared)

    for key in (
        "laplacian_variance",
        "edge_density",
        "local_variance_mean",
        "ridge_ratio",
        "lbp_entropy",
        "glcm_contrast",
        "glcm_homogeneity",
        "glcm_energy",
        "glcm_entropy",
    ):
        assert key in features
        assert features[key] == features[key]  # not NaN
    assert 0.0 <= features["edge_density"] <= 1.0
    assert 0.0 <= features["glcm_homogeneity"] <= 1.0
    # The 10 LBP bins must sum to ~1.
    assert sum(features[f"lbp_bin_{i}"] for i in range(10)) == pytest.approx(1.0, abs=0.02)


def test_texture_condition_score_stays_in_range(fresh_image_bytes):
    prepared = prepare(fresh_image_bytes)
    score = texture_condition_score(analyze_texture(prepared))
    assert 0.0 <= score <= 100.0


def test_blur_reduces_the_confidence_factor():
    from app.ml.image_analysis.texture import blur_confidence_factor

    assert blur_confidence_factor({"laplacian_variance": 400}) == 1.0
    assert blur_confidence_factor({"laplacian_variance": 5}) < 0.6
    assert 0.55 <= blur_confidence_factor({"laplacian_variance": 80}) <= 1.0


# ------------------------------------------------------- end-to-end pipeline
def test_pipeline_runs_every_stage(sample_image_bytes):
    result = get_engine().analyze_bytes(sample_image_bytes, category_slug="BAKERY")

    for stage in (
        "decode",
        "resize",
        "segment",
        "color_analysis",
        "texture_analysis",
        "food_classification",
        "spoilage_detection",
        "freshness_classification",
    ):
        assert stage in result.pipeline_steps, stage
    assert result.processing_ms >= 0
    assert result.overlay_jpeg and result.overlay_jpeg.startswith(b"\xff\xd8")


def test_pipeline_output_is_within_contract(sample_image_bytes):
    result = get_engine().analyze_bytes(sample_image_bytes, category_slug="BAKERY")

    assert 0.0 <= result.freshness.visual_score <= 100.0
    assert 0.0 <= result.freshness.confidence <= 1.0
    assert 0.0 <= result.spoilage.spoilage_probability <= 1.0
    assert isinstance(result.freshness.freshness_category, FreshnessCategory)
    probabilities = result.freshness.class_probabilities
    assert set(probabilities) == {c.value for c in FreshnessCategory}
    assert sum(probabilities.values()) == pytest.approx(1.0, abs=0.01)


def test_baseline_output_is_always_labelled_as_demo(sample_image_bytes):
    result = get_engine().analyze_bytes(sample_image_bytes, category_slug="BAKERY")
    assert result.freshness.model_info.is_demo is True
    assert result.freshness.model_info.kind is ModelKind.BASELINE
    assert result.spoilage.model_info.is_demo is True
    # Crucially: no fabricated accuracy figures.
    assert result.freshness.model_info.metrics == {}


def test_analysis_is_deterministic(sample_image_bytes):
    engine = get_engine()
    first = engine.analyze_bytes(sample_image_bytes, category_slug="BAKERY")
    second = engine.analyze_bytes(sample_image_bytes, category_slug="BAKERY")
    assert first.freshness.visual_score == pytest.approx(second.freshness.visual_score)
    assert first.spoilage.spoilage_probability == pytest.approx(second.spoilage.spoilage_probability)


def test_all_seven_indicator_checks_are_reported(sample_image_bytes):
    result = get_engine().analyze_bytes(sample_image_bytes, category_slug="BAKERY")
    reported = {finding.indicator_type for finding in result.spoilage.findings}
    for expected in ("MOLD", "BRUISING", "DISCOLORATION", "PHYSICAL_DAMAGE", "SURFACE_DEGRADATION"):
        assert expected in reported


def test_every_finding_carries_confidence_severity_and_detector(sample_image_bytes):
    result = get_engine().analyze_bytes(sample_image_bytes, category_slug="BAKERY")
    for finding in result.spoilage.findings:
        assert 0.0 <= finding.confidence <= 1.0
        assert finding.severity in {"INFO", "LOW", "MEDIUM", "HIGH", "CRITICAL"}
        assert finding.detector
        assert finding.description


def test_pipeline_discriminates_fresh_from_degraded(fresh_image_bytes):
    """A clean synthetic sample must score above a heavily degraded one."""
    engine = get_engine()
    fresh = engine.analyze_bytes(fresh_image_bytes, category_slug="FRUITS")
    rotten = engine.analyze_bytes(
        generate_sample_image("rotten_produce"), category_slug="VEGETABLES"
    )

    assert fresh.freshness.visual_score > rotten.freshness.visual_score
    assert fresh.spoilage.spoilage_probability < rotten.spoilage.spoilage_probability
    assert fresh.freshness.freshness_category in {FreshnessCategory.FRESH, FreshnessCategory.GOOD}


def test_mould_sample_raises_spoilage_probability():
    engine = get_engine()
    clean = engine.analyze_bytes(generate_sample_image("fresh_bread"), category_slug="BAKERY")
    mouldy = engine.analyze_bytes(generate_sample_image("mouldy_bread"), category_slug="BAKERY")
    assert mouldy.spoilage.spoilage_probability > clean.spoilage.spoilage_probability


def test_feature_summary_is_json_serialisable(sample_image_bytes):
    import json

    result = get_engine().analyze_bytes(sample_image_bytes, category_slug="BAKERY")
    json.dumps(result.feature_summary())  # must not raise
    assert result.dominant_colors and result.dominant_colors[0]["hex"].startswith("#")


@pytest.mark.parametrize("key", sorted(SAMPLE_SPECS))
def test_every_sample_image_analyses_without_error(key):
    """All shipped synthetic samples must survive the whole pipeline."""
    result = get_engine().analyze_bytes(generate_sample_image(key))
    assert 0.0 <= result.freshness.visual_score <= 100.0


# --------------------------------------------------------------- shelf life
def test_shelf_life_baseline_respects_ideal_conditions():
    model = BaselineShelfLifeModel()
    result = model.predict(
        {
            "category_slug": "DAIRY",
            "base_shelf_life_days": 10,
            "temperature_c": 3.0,   # inside 1-4 C
            "humidity_pct": 65.0,
            "freshness_score": 100,
            "storage_duration_days": 0,
        }
    )
    assert result.factors["temperature_factor"] == 1.0
    assert result.remaining_days > 9
    assert result.model_info.is_demo is True
    assert result.model_info.metrics == {}  # no fabricated accuracy


def test_warm_storage_shortens_predicted_shelf_life():
    model = BaselineShelfLifeModel()
    base = dict(
        category_slug="DAIRY",
        base_shelf_life_days=10,
        humidity_pct=65.0,
        freshness_score=90,
        storage_duration_days=0,
    )
    cold = model.predict({**base, "temperature_c": 3.0})
    warm = model.predict({**base, "temperature_c": 12.0})
    assert warm.remaining_days < cold.remaining_days
    assert warm.factors["temperature_factor"] < 1.0


def test_protective_packaging_extends_shelf_life():
    model = BaselineShelfLifeModel()
    base = dict(
        category_slug="MEAT_POULTRY",
        base_shelf_life_days=4,
        temperature_c=2.0,
        humidity_pct=80.0,
        freshness_score=95,
        storage_duration_days=0,
    )
    loose = model.predict({**base, "packaging_type": "LOOSE"})
    vacuum = model.predict({**base, "packaging_type": "VACUUM_SEALED"})
    assert vacuum.remaining_days > loose.remaining_days


def test_low_freshness_shortens_shelf_life():
    model = BaselineShelfLifeModel()
    base = dict(
        category_slug="FRUITS",
        base_shelf_life_days=7,
        temperature_c=4.0,
        humidity_pct=90.0,
        storage_duration_days=0,
    )
    healthy = model.predict({**base, "freshness_score": 95})
    poor = model.predict({**base, "freshness_score": 25})
    assert poor.remaining_days < healthy.remaining_days


def test_shelf_life_never_goes_negative():
    model = BaselineShelfLifeModel()
    result = model.predict(
        {
            "category_slug": "SEAFOOD",
            "base_shelf_life_days": 2,
            "temperature_c": 25.0,
            "humidity_pct": 99.0,
            "freshness_score": 5,
            "storage_duration_days": 60,
        }
    )
    assert result.remaining_days == 0.0
    assert result.risk_level is RiskLevel.CRITICAL


def test_prediction_is_capped_by_a_declared_expiry_date():
    model = BaselineShelfLifeModel()
    result = model.predict(
        {
            "category_slug": "PACKAGED",
            "base_shelf_life_days": 365,
            "temperature_c": 18.0,
            "humidity_pct": 45.0,
            "freshness_score": 100,
            "storage_duration_days": 0,
            "declared_remaining_days": 5,
        }
    )
    assert result.remaining_days == 5.0
    assert "capped" in result.explanation.lower()


def test_risk_level_reflects_category_perishability():
    model = BaselineShelfLifeModel()
    # 2 days left is critical for seafood but low risk for packaged food.
    seafood = model.predict(
        {"category_slug": "SEAFOOD", "base_shelf_life_days": 2.5, "temperature_c": 1,
         "humidity_pct": 90, "freshness_score": 80, "storage_duration_days": 0,
         "declared_remaining_days": 2}
    )
    packaged = model.predict(
        {"category_slug": "PACKAGED", "base_shelf_life_days": 120, "temperature_c": 18,
         "humidity_pct": 45, "freshness_score": 80, "storage_duration_days": 0,
         "declared_remaining_days": 2}
    )
    assert seafood.risk_level in {RiskLevel.HIGH, RiskLevel.CRITICAL, RiskLevel.MEDIUM}
    assert packaged.risk_level in {RiskLevel.MEDIUM, RiskLevel.HIGH}
    assert seafood.risk_level.value != "LOW"


def test_shelf_life_explanation_lists_every_applied_factor():
    model = BaselineShelfLifeModel()
    result = model.predict(
        {
            "category_slug": "DAIRY",
            "base_shelf_life_days": 10,
            "temperature_c": 6.2,
            "humidity_pct": 70.0,
            "packaging_type": "TETRA_PACK",
            "freshness_score": 81,
            "storage_duration_days": 3,
        }
    )
    assert "Baseline prediction" in result.explanation
    assert "temperature" in result.explanation
    for key in ("temperature_factor", "humidity_factor", "packaging_factor", "freshness_factor"):
        assert key in result.factors
    assert result.lower_bound_days <= result.remaining_days <= result.upper_bound_days


def test_confidence_rises_with_the_number_of_known_inputs():
    model = BaselineShelfLifeModel()
    sparse = model.predict({"category_slug": "FRUITS", "base_shelf_life_days": 7})
    rich = model.predict(
        {
            "category_slug": "FRUITS",
            "base_shelf_life_days": 7,
            "temperature_c": 4,
            "humidity_pct": 90,
            "packaging_type": "PLASTIC_WRAP",
            "freshness_score": 85,
        }
    )
    assert rich.confidence > sparse.confidence
    assert 0.0 <= sparse.confidence <= 1.0


# ----------------------------------------------------------------- registry
def test_demo_mode_registry_uses_only_baselines():
    registry = ModelRegistry(demo_mode=True).load()
    assert registry.all_demo is True
    assert registry.analysis_label() == "Demo AI Analysis (baseline)"

    described = registry.describe()
    assert described["mode"] == "demo"
    assert set(described["roles"]) == {
        "freshness",
        "spoilage",
        "shelf_life",
        "food_classification",
    }
    assert all(info["is_demo"] for info in described["roles"].values())
    assert "NOT trained neural networks" in described["disclaimer"]


def test_registry_falls_back_and_reports_when_artefacts_are_missing():
    """DEMO_MODE=false with no artefacts must still work, and say so."""
    registry = ModelRegistry(demo_mode=False).load()
    described = registry.describe()

    assert registry.any_trained is False
    assert described["mode"] == "baseline"
    assert len(described["fallback_notes"]) == 4
    assert all("training required" in note for note in described["fallback_notes"])
    # The pipeline is still usable.
    assert registry.freshness is not None
    assert registry.shelf_life is not None


def test_no_role_claims_metrics_without_a_trained_artefact():
    registry = ModelRegistry(demo_mode=False).load()
    for role, info in registry.describe()["roles"].items():
        assert info["metrics"] == {}, f"{role} claims metrics without training"
        assert info["label"] == "Demo / Baseline Analysis"
