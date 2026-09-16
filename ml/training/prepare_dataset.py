"""Prepare a downloaded dataset for training.

    python ml/training/prepare_dataset.py --source ~/Downloads/fruits --target ml/datasets/freshness

Public freshness datasets arrive in inconsistent shapes. This script normalises
one into the layout the training scripts expect:

    <target>/<band>/<image files>

with `<band>` in {fresh, good, acceptable, near_spoilage, spoiled}.

What it does
------------
* walks the source tree and infers a band from each directory name
* verifies every file really is a decodable image (corrupt files are skipped)
* de-duplicates by SHA-256 so the same photo cannot land in both train and test
* optionally caps the number of images per class to balance the dataset
* writes a manifest recording exactly what was copied and what was skipped

It copies (never moves) so your download stays intact, and it never fetches
anything from the internet.
"""

from __future__ import annotations

import argparse
import hashlib
import json
import shutil
import sys
from collections import Counter, defaultdict
from datetime import UTC, datetime
from pathlib import Path

REPO_ROOT = Path(__file__).resolve().parents[2]
if str(REPO_ROOT / "ml") not in sys.path:
    sys.path.insert(0, str(REPO_ROOT / "ml"))

BANDS = ["fresh", "good", "acceptable", "near_spoilage", "spoiled"]

# Substring -> band. Longest match wins, so order matters little.
BAND_HINTS: list[tuple[str, str]] = [
    ("freshripe", "fresh"),
    ("fresh", "fresh"),
    ("good", "good"),
    ("acceptable", "acceptable"),
    ("average", "acceptable"),
    ("nearspoil", "near_spoilage"),
    ("near_spoil", "near_spoilage"),
    ("overripe", "near_spoilage"),
    ("stale", "near_spoilage"),
    ("rotten", "spoiled"),
    ("spoiled", "spoiled"),
    ("mould", "spoiled"),
    ("mold", "spoiled"),
    ("bad", "spoiled"),
]

IMAGE_EXTENSIONS = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}


def infer_band(path: Path, source_root: Path) -> str | None:
    """Infer the freshness band from any directory name on the relative path."""
    parts = [part.lower().replace(" ", "").replace("-", "").replace("_", "")
             for part in path.relative_to(source_root).parts[:-1]]
    for part in reversed(parts):  # the closest directory is most specific
        for hint, band in BAND_HINTS:
            if hint.replace("_", "") in part:
                return band
    return None


def is_decodable(path: Path) -> tuple[bool, str]:
    try:
        from PIL import Image

        with Image.open(path) as image:
            image.verify()
        with Image.open(path) as image:
            width, height = image.size
            if width < 32 or height < 32:
                return False, f"too small ({width}x{height})"
        return True, ""
    except Exception as exc:  # noqa: BLE001
        return False, f"{type(exc).__name__}"


def main() -> int:
    parser = argparse.ArgumentParser(description=__doc__.split("\n")[0])
    parser.add_argument("--source", type=Path, required=True, help="downloaded dataset root")
    parser.add_argument(
        "--target", type=Path, default=REPO_ROOT / "ml" / "datasets" / "freshness"
    )
    parser.add_argument(
        "--max-per-class", type=int, default=0, help="0 keeps everything (no balancing)"
    )
    parser.add_argument("--clean", action="store_true", help="empty the target first")
    parser.add_argument("--dry-run", action="store_true")
    args = parser.parse_args()

    print("=" * 74)
    print(" PREPARE DATASET")
    print("=" * 74)

    if not args.source.is_dir():
        print(f"\nERROR: source directory not found: {args.source}", file=sys.stderr)
        print(
            "\nDownload a dataset first - see ml/datasets/README.md for sources and\n"
            "their licence terms. Nothing is downloaded automatically.",
            file=sys.stderr,
        )
        return 1

    print(f"\nSource: {args.source}")
    print(f"Target: {args.target}")
    if args.dry_run:
        print("MODE:   dry run (nothing will be written)")

    # ---- scan ------------------------------------------------------------
    candidates = [
        path
        for path in sorted(args.source.rglob("*"))
        if path.is_file() and path.suffix.lower() in IMAGE_EXTENSIONS
    ]
    print(f"\nFound {len(candidates)} image file(s)")
    if not candidates:
        print("ERROR: no images found.", file=sys.stderr)
        return 1

    by_band: dict[str, list[Path]] = defaultdict(list)
    unmapped: Counter[str] = Counter()
    corrupt: list[str] = []
    duplicates = 0
    seen: set[str] = set()

    for path in candidates:
        band = infer_band(path, args.source)
        if band is None:
            unmapped[str(path.parent.relative_to(args.source))] += 1
            continue

        ok, reason = is_decodable(path)
        if not ok:
            corrupt.append(f"{path.name}: {reason}")
            continue

        digest = hashlib.sha256(path.read_bytes()).hexdigest()
        if digest in seen:
            duplicates += 1
            continue
        seen.add(digest)
        by_band[band].append(path)

    print("\nClassified:")
    for band in BANDS:
        if by_band.get(band):
            print(f"  {band:<16} {len(by_band[band])}")
    if duplicates:
        print(f"  (removed {duplicates} duplicate image(s) by content hash)")
    if corrupt:
        print(f"  (skipped {len(corrupt)} undecodable file(s))")
        for entry in corrupt[:5]:
            print(f"     - {entry}")
    if unmapped:
        print("\nDirectories that could not be mapped to a freshness band:")
        for directory, count in unmapped.most_common(10):
            print(f"  {directory or '<root>'}: {count} image(s)")
        print("  -> rename them, or extend BAND_HINTS in this script.")

    if not by_band:
        print("\nERROR: nothing could be classified.", file=sys.stderr)
        return 1

    # ---- balance ---------------------------------------------------------
    if args.max_per_class > 0:
        for band, paths in by_band.items():
            if len(paths) > args.max_per_class:
                print(f"  capping {band}: {len(paths)} -> {args.max_per_class}")
                by_band[band] = paths[: args.max_per_class]

    total = sum(len(paths) for paths in by_band.values())
    print(f"\nWill prepare {total} image(s) across {len(by_band)} class(es)")

    if args.dry_run:
        print("\nDry run complete - nothing written.")
        return 0

    # ---- copy ------------------------------------------------------------
    if args.clean and args.target.exists():
        print(f"Cleaning {args.target}")
        shutil.rmtree(args.target)

    copied = 0
    for band, paths in sorted(by_band.items()):
        band_dir = args.target / band
        band_dir.mkdir(parents=True, exist_ok=True)
        for index, path in enumerate(paths):
            destination = band_dir / f"{band}_{index:06d}{path.suffix.lower()}"
            shutil.copy2(path, destination)
            copied += 1
        print(f"  {band:<16} {len(paths)} -> {band_dir}")

    manifest = {
        "prepared_at": datetime.now(UTC).isoformat(),
        "source": str(args.source),
        "target": str(args.target),
        "images_copied": copied,
        "class_counts": {band: len(paths) for band, paths in sorted(by_band.items())},
        "duplicates_removed": duplicates,
        "undecodable_skipped": len(corrupt),
        "unmapped_directories": dict(unmapped.most_common()),
        "max_per_class": args.max_per_class or None,
        "note": (
            "Generated by ml/training/prepare_dataset.py. The source dataset is NOT "
            "redistributed with this repository; record its licence and provenance "
            "alongside this manifest."
        ),
    }
    manifest_path = args.target / "manifest.json"
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")

    print(f"\nManifest: {manifest_path}")
    print("\nNext:")
    print(f"  python ml/training/train_freshness.py --data {args.target}")
    print("=" * 74)
    return 0


if __name__ == "__main__":
    sys.exit(main())
