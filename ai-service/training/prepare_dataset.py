import os
import shutil
import json
import kagglehub
from PIL import Image
from pathlib import Path

DATASET_NAME = "sriramr/fruits-fresh-and-rotten-for-classification"
BASE_DIR = Path(__file__).resolve().parent.parent
DATASET_DIR = BASE_DIR / "datasets" / "raw"
PROCESSED_DIR = BASE_DIR / "datasets" / "processed"

def download_and_inspect():
    print(f"[*] Downloading dataset '{DATASET_NAME}' via kagglehub...")
    download_path = kagglehub.dataset_download(DATASET_NAME)
    print(f"[+] Download complete: {download_path}")
    
    download_path = Path(download_path)
    
    # Analyze raw downloaded contents
    print("\n--- Inspecting Directory Structure ---")
    all_files = list(download_path.rglob("*"))
    print(f"Total items in downloaded path: {len(all_files)}")
    
    # Find image files and directory classes
    class_counts = {}
    corrupt_count = 0
    valid_images = []
    
    for item in all_files:
        if item.is_file() and item.suffix.lower() in [".jpg", ".jpeg", ".png", ".bmp", ".webp"]:
            # Class name from parent or grandparent directory
            rel_parts = item.relative_to(download_path).parts
            # Often structured as dataset/train/freshapples or dataset/test/rottenapples
            class_name = rel_parts[-2] if len(rel_parts) >= 2 else "unknown"
            
            # Verify image readability
            try:
                with Image.open(item) as img:
                    img.verify()
                class_counts[class_name] = class_counts.get(class_name, 0) + 1
                valid_images.append((item, class_name))
            except Exception as e:
                corrupt_count += 1
                print(f"[!] Corrupt image skipped: {item} ({e})")
                
    print("\n--- Detected Classes and Image Counts ---")
    for cls, cnt in sorted(class_counts.items()):
        print(f"  • {cls}: {cnt} images")
    print(f"\nTotal Valid Images: {len(valid_images)}")
    print(f"Total Corrupt / Unreadable Images: {corrupt_count}")
    
    # Save dataset metadata
    metadata = {
        "dataset_name": DATASET_NAME,
        "raw_download_path": str(download_path),
        "classes": class_counts,
        "total_valid_images": len(valid_images),
        "corrupt_images": corrupt_count
    }
    
    PROCESSED_DIR.mkdir(parents=True, exist_ok=True)
    with open(PROCESSED_DIR / "dataset_metadata.json", "w") as f:
        json.dump(metadata, f, indent=2)
        
    print(f"[+] Dataset metadata saved to {PROCESSED_DIR / 'dataset_metadata.json'}")
    return download_path, class_counts

if __name__ == "__main__":
    download_and_inspect()
