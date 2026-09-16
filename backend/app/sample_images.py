"""Procedurally generated sample food images.

WHY THIS EXISTS
---------------
The recommended public datasets (Fruits Freshness, Food-101, Kaggle food
freshness sets) have licensing terms that make redistribution inside a repository
inappropriate - see `ml/datasets/README.md`. To keep the project fully runnable
out of the box, the demo data uses **synthetic images generated here**, not
copied photographs.

These are deliberately simple renderings (a coloured body, texture noise, and
scenario-specific defects such as mould colonies, bruises or browning). They are
sufficient to exercise the real analysis pipeline end to end and to make the
dashboards meaningful, and they are honestly labelled as synthetic samples.

They are NOT a substitute for a real dataset when training a model.
"""

from __future__ import annotations

import random
from dataclasses import dataclass, field
from pathlib import Path

import cv2
import numpy as np

SIZE = 520


@dataclass(frozen=True)
class SampleSpec:
    """Declarative description of a synthetic food photo."""

    key: str
    label: str
    # Base body colour in BGR.
    body_bgr: tuple[int, int, int]
    shape: str = "circle"            # circle | ellipse | rounded_rect | fillet
    background_bgr: tuple[int, int, int] = (168, 172, 176)
    texture_strength: int = 14
    # Defect layers.
    mould_patches: int = 0
    mould_bgr: tuple[int, int, int] = (150, 152, 148)
    dark_patches: int = 0
    dark_bgr: tuple[int, int, int] = (28, 32, 46)
    brown_patches: int = 0
    brown_bgr: tuple[int, int, int] = (42, 78, 118)
    pale_overlay: float = 0.0        # 0..1 desaturating wash (dryness)
    gloss: float = 0.0               # 0..1 specular highlights (wetness)
    wrinkle_lines: int = 0
    cuts: int = 0
    notes: str = ""
    tags: tuple[str, ...] = field(default_factory=tuple)


SAMPLE_SPECS: dict[str, SampleSpec] = {
    # ---------------------------------------------------------- produce ---
    "fresh_tomato": SampleSpec(
        key="fresh_tomato", label="Fresh tomato", body_bgr=(46, 48, 208),
        shape="circle", texture_strength=10, gloss=0.18,
        notes="Saturated red, smooth surface, no defects.", tags=("FRUITS", "fresh"),
    ),
    "ripe_banana": SampleSpec(
        key="ripe_banana", label="Ripe banana", body_bgr=(62, 196, 232),
        shape="ellipse", texture_strength=12, brown_patches=1,
        notes="Even yellow with one small spot.", tags=("FRUITS", "good"),
    ),
    "overripe_banana": SampleSpec(
        key="overripe_banana", label="Overripe banana", body_bgr=(58, 158, 198),
        shape="ellipse", texture_strength=18, brown_patches=6, dark_patches=2,
        wrinkle_lines=8,
        notes="Extensive browning and surface wrinkling.", tags=("FRUITS", "near_spoilage"),
    ),
    "bruised_apple": SampleSpec(
        key="bruised_apple", label="Bruised apple", body_bgr=(48, 58, 196),
        shape="circle", texture_strength=13, dark_patches=3, gloss=0.1,
        notes="Localised dark bruise regions.", tags=("FRUITS", "acceptable"),
    ),
    "fresh_greens": SampleSpec(
        key="fresh_greens", label="Fresh leafy greens", body_bgr=(58, 158, 62),
        shape="rounded_rect", texture_strength=22,
        notes="Vivid green, high micro-texture from leaf structure.",
        tags=("VEGETABLES", "fresh"),
    ),
    "wilting_greens": SampleSpec(
        key="wilting_greens", label="Wilting greens", body_bgr=(64, 118, 78),
        shape="rounded_rect", texture_strength=26, brown_patches=5, wrinkle_lines=14,
        pale_overlay=0.16,
        notes="Yellowing edges, wrinkled and dull.", tags=("VEGETABLES", "near_spoilage"),
    ),
    "rotten_produce": SampleSpec(
        key="rotten_produce", label="Rotten produce", body_bgr=(52, 74, 86),
        shape="circle", texture_strength=30, dark_patches=7, brown_patches=8,
        mould_patches=10, wrinkle_lines=10, gloss=0.22,
        notes="Widespread rot, dark collapse and mould.", tags=("VEGETABLES", "spoiled"),
    ),
    # ----------------------------------------------------------- bakery ---
    "fresh_bread": SampleSpec(
        key="fresh_bread", label="Fresh sourdough", body_bgr=(122, 168, 204),
        shape="ellipse", background_bgr=(96, 102, 110), texture_strength=20,
        notes="Golden crust, even texture.", tags=("BAKERY", "fresh"),
    ),
    "stale_bread": SampleSpec(
        key="stale_bread", label="Stale bread", body_bgr=(112, 152, 186),
        shape="ellipse", background_bgr=(96, 102, 110), texture_strength=24,
        wrinkle_lines=16, pale_overlay=0.2, cuts=2,
        notes="Dry, cracked, dull crust.", tags=("BAKERY", "acceptable"),
    ),
    "mouldy_bread": SampleSpec(
        key="mouldy_bread", label="Mouldy bread", body_bgr=(118, 160, 198),
        shape="ellipse", background_bgr=(96, 102, 110), texture_strength=22,
        mould_patches=22, mould_bgr=(148, 150, 146), dark_patches=3,
        notes="Numerous grey-green fuzzy colonies.", tags=("BAKERY", "spoiled"),
    ),
    # ------------------------------------------------------------ dairy ---
    "fresh_dairy": SampleSpec(
        key="fresh_dairy", label="Fresh dairy", body_bgr=(238, 242, 246),
        shape="rounded_rect", background_bgr=(120, 126, 132), texture_strength=6,
        gloss=0.14,
        notes="Clean uniform white.", tags=("DAIRY", "fresh"),
    ),
    "aging_dairy": SampleSpec(
        key="aging_dairy", label="Aging dairy", body_bgr=(214, 224, 232),
        shape="rounded_rect", background_bgr=(120, 126, 132), texture_strength=12,
        brown_patches=2, gloss=0.2,
        notes="Slight yellowing at the edges.", tags=("DAIRY", "acceptable"),
    ),
    "mouldy_dairy": SampleSpec(
        key="mouldy_dairy", label="Mouldy dairy", body_bgr=(212, 222, 230),
        shape="rounded_rect", background_bgr=(120, 126, 132), texture_strength=16,
        mould_patches=16, mould_bgr=(140, 152, 138), dark_patches=2, gloss=0.24,
        notes="Blue-green colonies on a pale surface.", tags=("DAIRY", "spoiled"),
    ),
    # ------------------------------------------------------------- meat ---
    "fresh_meat": SampleSpec(
        key="fresh_meat", label="Fresh red meat", body_bgr=(62, 62, 186),
        shape="fillet", background_bgr=(150, 154, 158), texture_strength=16, gloss=0.22,
        notes="Bright red, moist and firm.", tags=("MEAT_POULTRY", "fresh"),
    ),
    "aging_meat": SampleSpec(
        key="aging_meat", label="Aging meat", body_bgr=(58, 70, 146),
        shape="fillet", background_bgr=(150, 154, 158), texture_strength=20,
        brown_patches=4, gloss=0.16,
        notes="Darkening surface, dulled colour.", tags=("MEAT_POULTRY", "acceptable"),
    ),
    "spoiling_meat": SampleSpec(
        key="spoiling_meat", label="Spoiling meat", body_bgr=(74, 92, 118),
        shape="fillet", background_bgr=(150, 154, 158), texture_strength=26,
        brown_patches=8, dark_patches=4, mould_patches=4, gloss=0.42,
        notes="Grey-brown discoloration with a slimy sheen.",
        tags=("MEAT_POULTRY", "spoiled"),
    ),
    # ---------------------------------------------------------- seafood ---
    "fresh_fish": SampleSpec(
        key="fresh_fish", label="Fresh fish fillet", body_bgr=(126, 152, 220),
        shape="fillet", background_bgr=(158, 162, 166), texture_strength=14, gloss=0.3,
        notes="Translucent pink-orange, glossy.", tags=("SEAFOOD", "fresh"),
    ),
    "aging_fish": SampleSpec(
        key="aging_fish", label="Aging fish", body_bgr=(140, 156, 190),
        shape="fillet", background_bgr=(158, 162, 166), texture_strength=20,
        pale_overlay=0.18, brown_patches=3, gloss=0.26,
        notes="Fading colour, matte patches.", tags=("SEAFOOD", "acceptable"),
    ),
    "spoiling_fish": SampleSpec(
        key="spoiling_fish", label="Spoiling fish", body_bgr=(148, 158, 172),
        shape="fillet", background_bgr=(158, 162, 166), texture_strength=28,
        pale_overlay=0.3, brown_patches=5, dark_patches=3, gloss=0.5,
        notes="Grey, dull and excessively wet.", tags=("SEAFOOD", "spoiled"),
    ),
    # --------------------------------------------------------- packaged ---
    "packaged_good": SampleSpec(
        key="packaged_good", label="Sealed packaged food", body_bgr=(186, 156, 96),
        shape="rounded_rect", background_bgr=(134, 138, 142), texture_strength=8,
        gloss=0.2,
        notes="Intact packaging, uniform print colour.", tags=("PACKAGED", "fresh"),
    ),
    "packaged_damaged": SampleSpec(
        key="packaged_damaged", label="Damaged packaging", body_bgr=(172, 148, 96),
        shape="rounded_rect", background_bgr=(134, 138, 142), texture_strength=14,
        cuts=5, wrinkle_lines=12, dark_patches=2, gloss=0.18,
        notes="Dented, creased and torn packaging.", tags=("PACKAGED", "spoiled"),
    ),
}


# ------------------------------------------------------------------ drawing
def _body_mask(spec: SampleSpec, rng: random.Random) -> np.ndarray:
    mask = np.zeros((SIZE, SIZE), dtype=np.uint8)
    centre = (SIZE // 2, SIZE // 2)

    if spec.shape == "circle":
        cv2.circle(mask, centre, int(SIZE * 0.36), 255, -1)
    elif spec.shape == "ellipse":
        cv2.ellipse(mask, centre, (int(SIZE * 0.40), int(SIZE * 0.22)),
                    rng.randint(-25, 25), 0, 360, 255, -1)
    elif spec.shape == "rounded_rect":
        x1, y1 = int(SIZE * 0.16), int(SIZE * 0.22)
        x2, y2 = int(SIZE * 0.84), int(SIZE * 0.78)
        radius = int(SIZE * 0.08)
        cv2.rectangle(mask, (x1 + radius, y1), (x2 - radius, y2), 255, -1)
        cv2.rectangle(mask, (x1, y1 + radius), (x2, y2 - radius), 255, -1)
        for cx, cy in ((x1 + radius, y1 + radius), (x2 - radius, y1 + radius),
                       (x1 + radius, y2 - radius), (x2 - radius, y2 - radius)):
            cv2.circle(mask, (cx, cy), radius, 255, -1)
    else:  # fillet - an irregular blob
        points = []
        for angle in range(0, 360, 24):
            radians = np.deg2rad(angle)
            radius = SIZE * (0.30 + rng.uniform(-0.045, 0.055))
            points.append(
                [int(centre[0] + radius * np.cos(radians) * 1.25),
                 int(centre[1] + radius * np.sin(radians) * 0.82)]
            )
        cv2.fillPoly(mask, [np.array(points, dtype=np.int32)], 255)
    return mask


def _random_point_in(mask: np.ndarray, rng: random.Random) -> tuple[int, int]:
    ys, xs = np.nonzero(mask)
    if xs.size == 0:
        return SIZE // 2, SIZE // 2
    index = rng.randrange(xs.size)
    return int(xs[index]), int(ys[index])


def generate_sample_image(key: str, *, seed: int | None = None) -> bytes:
    """Render a synthetic sample as JPEG bytes."""
    spec = SAMPLE_SPECS.get(key)
    if spec is None:
        raise KeyError(f"Unknown sample spec '{key}'")

    rng = random.Random(seed if seed is not None else abs(hash(key)) % (2**31))
    np_rng = np.random.default_rng(rng.randrange(2**31))

    # Background with a soft vignette so segmentation has something to separate.
    image = np.full((SIZE, SIZE, 3), spec.background_bgr, dtype=np.uint8)
    image = cv2.add(
        image, np_rng.integers(0, 9, image.shape, dtype=np.int16).astype(np.uint8)
    )

    mask = _body_mask(spec, rng)
    body = np.full((SIZE, SIZE, 3), spec.body_bgr, dtype=np.uint8)

    # Base texture: correlated noise looks more organic than per-pixel noise.
    noise = np_rng.normal(0, spec.texture_strength, (SIZE, SIZE)).astype(np.float32)
    noise = cv2.GaussianBlur(noise, (0, 0), sigmaX=1.6)
    body = np.clip(body.astype(np.float32) + noise[:, :, None], 0, 255).astype(np.uint8)

    # Gentle radial shading for a three-dimensional look.
    yy, xx = np.mgrid[0:SIZE, 0:SIZE].astype(np.float32)
    distance = np.sqrt((xx - SIZE / 2) ** 2 + (yy - SIZE / 2) ** 2) / (SIZE * 0.5)
    shading = np.clip(1.12 - distance * 0.36, 0.6, 1.15)
    body = np.clip(body.astype(np.float32) * shading[:, :, None], 0, 255).astype(np.uint8)

    image = np.where(mask[:, :, None] > 0, body, image)

    # ---- defect layers -------------------------------------------------
    for _ in range(spec.brown_patches):
        cx, cy = _random_point_in(mask, rng)
        cv2.circle(image, (cx, cy), rng.randint(16, 46), spec.brown_bgr, -1)

    for _ in range(spec.dark_patches):
        cx, cy = _random_point_in(mask, rng)
        axes = (rng.randint(18, 44), rng.randint(14, 38))
        cv2.ellipse(image, (cx, cy), axes, rng.randint(0, 180), 0, 360, spec.dark_bgr, -1)

    for _ in range(spec.mould_patches):
        cx, cy = _random_point_in(mask, rng)
        radius = rng.randint(8, 24)
        colony = image.copy()
        cv2.circle(colony, (cx, cy), radius, spec.mould_bgr, -1)
        # Fuzzy edge: blend the colony with a feathered alpha.
        alpha = np.zeros((SIZE, SIZE), dtype=np.float32)
        cv2.circle(alpha, (cx, cy), radius, 1.0, -1)
        alpha = cv2.GaussianBlur(alpha, (0, 0), sigmaX=radius * 0.35)
        image = (image * (1 - alpha[:, :, None]) + colony * alpha[:, :, None]).astype(np.uint8)
        # Speckle inside the colony so texture metrics react.
        for _ in range(radius // 2):
            sx = cx + rng.randint(-radius, radius)
            sy = cy + rng.randint(-radius, radius)
            if 0 <= sx < SIZE and 0 <= sy < SIZE:
                cv2.circle(image, (sx, sy), rng.randint(1, 3),
                           tuple(int(c * 0.82) for c in spec.mould_bgr), -1)

    for _ in range(spec.wrinkle_lines):
        x1, y1 = _random_point_in(mask, rng)
        length = rng.randint(24, 90)
        angle = rng.uniform(0, np.pi)
        x2 = int(x1 + length * np.cos(angle))
        y2 = int(y1 + length * np.sin(angle))
        shade = tuple(max(0, int(c * 0.7)) for c in spec.body_bgr)
        cv2.line(image, (x1, y1), (x2, y2), shade, rng.randint(1, 2), cv2.LINE_AA)

    for _ in range(spec.cuts):
        x1, y1 = _random_point_in(mask, rng)
        x2, y2 = _random_point_in(mask, rng)
        cv2.line(image, (x1, y1), (x2, y2), (24, 24, 24), rng.randint(2, 4), cv2.LINE_AA)

    if spec.pale_overlay > 0:
        hsv = cv2.cvtColor(image, cv2.COLOR_BGR2HSV).astype(np.float32)
        region = mask > 0
        hsv[:, :, 1][region] *= (1.0 - spec.pale_overlay)
        hsv[:, :, 2][region] = np.clip(
            hsv[:, :, 2][region] * (1.0 + spec.pale_overlay * 0.28), 0, 255
        )
        image = cv2.cvtColor(np.clip(hsv, 0, 255).astype(np.uint8), cv2.COLOR_HSV2BGR)

    if spec.gloss > 0:
        highlight = np.zeros((SIZE, SIZE), dtype=np.float32)
        for _ in range(max(1, int(spec.gloss * 8))):
            cx, cy = _random_point_in(mask, rng)
            cv2.circle(highlight, (cx, cy), rng.randint(10, 26), 1.0, -1)
        highlight = cv2.GaussianBlur(highlight, (0, 0), sigmaX=9) * spec.gloss
        image = np.clip(
            image.astype(np.float32) + highlight[:, :, None] * 190, 0, 255
        ).astype(np.uint8)

    # Slight blur + JPEG encoding, as a phone camera would produce.
    image = cv2.GaussianBlur(image, (3, 3), 0)
    ok, buffer = cv2.imencode(".jpg", image, [int(cv2.IMWRITE_JPEG_QUALITY), 90])
    if not ok:  # pragma: no cover
        raise RuntimeError("failed to encode the generated sample image")
    return buffer.tobytes()


def write_sample_library(destination: Path | None = None) -> int:
    """Write every sample plus a manifest into the configured sample directory.

    Purely a developer convenience: callers treat failure as non-fatal because
    the seeder generates the images it needs in memory regardless.
    """
    from app.config import settings

    target = Path(destination) if destination else Path(settings.SAMPLE_DIR)
    target.mkdir(parents=True, exist_ok=True)

    written = 0
    manifest_lines = [
        "# Synthetic sample images",
        "",
        "Generated by `backend/app/sample_images.py`. These are **procedurally drawn**,",
        "not photographs, so the repository redistributes no third-party dataset.",
        "They exist so the analysis pipeline and dashboards can be demonstrated without",
        "downloading anything. They are not suitable for training a model.",
        "",
        "| File | Scenario | Category | Expected band | Rendered defects |",
        "| --- | --- | --- | --- | --- |",
    ]

    for key, spec in SAMPLE_SPECS.items():
        payload = generate_sample_image(key)
        (target / f"{key}.jpg").write_bytes(payload)
        written += 1
        category = spec.tags[0] if spec.tags else "-"
        expected = spec.tags[1] if len(spec.tags) > 1 else "-"
        manifest_lines.append(
            f"| `{key}.jpg` | {spec.label} | {category} | {expected} | {spec.notes} |"
        )

    manifest_lines += [
        "",
        "## Regenerate",
        "",
        "```bash",
        "cd backend",
        "python -c \"from app.sample_images import write_sample_library; write_sample_library()\"",
        "```",
        "",
        "## Using real photographs instead",
        "",
        "Drop your own JPG/PNG files anywhere and upload them through the UI or",
        "`POST /api/v1/analysis/image`. For dataset acquisition see",
        "`ml/datasets/README.md`.",
    ]
    (target / "README.md").write_text("\n".join(manifest_lines) + "\n", encoding="utf-8")
    return written


if __name__ == "__main__":  # pragma: no cover
    count = write_sample_library()
    print(f"wrote {count} synthetic sample images to data/sample/")
