"""
Stratified Dataset Splitting Script
Splits the Kaggle dataset into:
datasets/processed/train/
datasets/processed/val/
datasets/processed/test/
"""
import os
import shutil
import random
import json
from pathlib import Path
from typing import Dict, List

def run_split():
    base_dir = Path(__file__).resolve().parent.parent
    proc_dir = base_dir / "datasets" / "processed"
    meta_file = proc_dir / "dataset_metadata.json"
    
    if meta_file.exists():
        with open(meta_file, "r") as f:
            meta = json.load(f)
        raw_source_dir = Path(meta["raw_download_path"])
    else:
        raw_source_dir = Path(r"C:\Users\HP\.cache\kagglehub\datasets\sriramr\fruits-fresh-and-rotten-for-classification\versions\1")

    print(f"[*] Splitting dataset from: {raw_source_dir}")
    
    # We will sample a balanced subset per class for fast and highly accurate training (e.g. 1000 images per class = 6000 images total)
    # or all images. Let's sample up to 1000 per class (700 train, 150 val, 150 test per class = 6,000 total images) to train in minutes!
    MAX_PER_CLASS = 1000
    random.seed(42)

    image_extensions = {".jpg", ".jpeg", ".png", ".bmp", ".webp"}
    class_to_images: Dict[str, List[Path]] = {}

    for path in raw_source_dir.rglob("*"):
        if path.is_file() and path.suffix.lower() in image_extensions:
            cls_name = path.parent.name.lower()
            if cls_name in ["train", "test", "val", "validation"]:
                cls_name = path.parts[-2].lower()
            
            clean_cls = cls_name.replace(" ", "_")
            if any(f in clean_cls for f in ["apple", "banana", "orange"]):
                if clean_cls not in class_to_images:
                    class_to_images[clean_cls] = []
                class_to_images[clean_cls].append(path)

    print(f"[+] Detected classes: {list(class_to_images.keys())}")
    
    # Clean previous splits if any
    for split in ["train", "val", "test"]:
        split_dir = proc_dir / split
        if split_dir.exists():
            shutil.rmtree(split_dir)
        for cls in class_to_images.keys():
            (split_dir / cls).mkdir(parents=True, exist_ok=True)

    split_counts = {"train": {}, "val": {}, "test": {}}

    for cls, paths in class_to_images.items():
        random.shuffle(paths)
        selected_paths = paths[:MAX_PER_CLASS]
        n = len(selected_paths)
        
        n_train = int(n * 0.70)
        n_val = int(n * 0.15)
        
        train_imgs = selected_paths[:n_train]
        val_imgs = selected_paths[n_train:n_train + n_val]
        test_imgs = selected_paths[n_train + n_val:]

        for img in train_imgs:
            shutil.copy2(img, proc_dir / "train" / cls / img.name)
        for img in val_imgs:
            shutil.copy2(img, proc_dir / "val" / cls / img.name)
        for img in test_imgs:
            shutil.copy2(img, proc_dir / "test" / cls / img.name)

        split_counts["train"][cls] = len(train_imgs)
        split_counts["val"][cls] = len(val_imgs)
        split_counts["test"][cls] = len(test_imgs)

    print("\n================ DATASET SPLIT COMPLETE ================")
    for split in ["train", "val", "test"]:
        total = sum(split_counts[split].values())
        print(f"  {split.upper()}: {total} images ({split_counts[split]})")
    print("========================================================")

if __name__ == "__main__":
    run_split()
