import os
import json
import numpy as np
from PIL import Image, ImageDraw, ImageFilter
from pathlib import Path

CLASSES = [
    'freshapples',
    'rottenapples',
    'freshbanana',
    'rottenbanana',
    'freshoranges',
    'rottenoranges',
    'freshtomato',
    'rottentomato'
]

def generate_fruit_image(class_name, index, output_dir):
    width, height = 224, 224
    img = Image.new('RGB', (width, height), (240, 240, 242))
    draw = ImageDraw.Draw(img)
    
    # Base fruit colors & shapes
    is_rotten = 'rotten' in class_name
    fruit_type = class_name.replace('fresh', '').replace('rotten', '')
    
    # Background subtle surface texture
    noise = np.random.randint(235, 245, (height, width, 3), dtype=np.uint8)
    img = Image.fromarray(noise)
    draw = ImageDraw.Draw(img)
    
    center_x, center_y = width // 2 + np.random.randint(-5, 5), height // 2 + np.random.randint(-5, 5)
    
    if fruit_type == 'apples':
        radius = 70 + np.random.randint(-4, 4)
        if is_rotten:
            base_color = (130 + np.random.randint(-15, 15), 65 + np.random.randint(-10, 10), 35 + np.random.randint(-10, 10))
            draw.ellipse([center_x - radius, center_y - radius + 10, center_x + radius, center_y + radius + 10], fill=base_color)
            # Mold / rot patches
            for _ in range(np.random.randint(4, 8)):
                mx = center_x + np.random.randint(-45, 45)
                my = center_y + np.random.randint(-40, 40)
                mr = np.random.randint(12, 28)
                mcolor = (70 + np.random.randint(0, 30), 85 + np.random.randint(0, 30), 60 + np.random.randint(0, 20)) if np.random.rand() > 0.4 else (220, 225, 215)
                draw.ellipse([mx - mr, my - mr, mx + mr, my + mr], fill=mcolor)
        else:
            base_color = (210 + np.random.randint(-15, 15), 35 + np.random.randint(-10, 10), 40 + np.random.randint(-10, 10))
            draw.ellipse([center_x - radius, center_y - radius + 10, center_x + radius, center_y + radius + 10], fill=base_color)
            # Gloss highlight
            draw.ellipse([center_x - 30, center_y - 35, center_x - 10, center_y - 15], fill=(255, 180, 180))
            # Stem
            draw.line([(center_x, center_y - radius + 10), (center_x + 5, center_y - radius - 15)], fill=(75, 45, 20), width=4)

    elif fruit_type == 'banana':
        if is_rotten:
            base_color = (110 + np.random.randint(-15, 15), 85 + np.random.randint(-10, 10), 30 + np.random.randint(-10, 10))
            draw.arc([center_x - 80, center_y - 60, center_x + 80, center_y + 70], start=30, end=190, fill=base_color, width=45)
            for _ in range(np.random.randint(6, 12)):
                bx = center_x + np.random.randint(-60, 60)
                by = center_y + np.random.randint(-30, 30)
                br = np.random.randint(6, 16)
                draw.ellipse([bx - br, by - br, bx + br, by + br], fill=(45, 30, 15))
        else:
            base_color = (245 + np.random.randint(-5, 10), 215 + np.random.randint(-10, 10), 30 + np.random.randint(-10, 10))
            draw.arc([center_x - 80, center_y - 60, center_x + 80, center_y + 70], start=30, end=190, fill=base_color, width=40)
            # Greenish tip
            draw.arc([center_x - 82, center_y - 62, center_x - 50, center_y - 20], start=140, end=200, fill=(120, 175, 40), width=38)

    elif fruit_type == 'oranges':
        radius = 68 + np.random.randint(-3, 3)
        if is_rotten:
            base_color = (150 + np.random.randint(-15, 15), 100 + np.random.randint(-10, 10), 40 + np.random.randint(-10, 10))
            draw.ellipse([center_x - radius, center_y - radius, center_x + radius, center_y + radius], fill=base_color)
            # Blue-green mold patch
            for _ in range(np.random.randint(3, 7)):
                mx = center_x + np.random.randint(-35, 35)
                my = center_y + np.random.randint(-35, 35)
                mr = np.random.randint(15, 30)
                draw.ellipse([mx - mr, my - mr, mx + mr, my + mr], fill=(60 + np.random.randint(0, 20), 120 + np.random.randint(0, 30), 110 + np.random.randint(0, 20)))
                # White halo around mold
                draw.ellipse([mx - mr + 5, my - mr + 5, mx + mr - 5, my + mr - 5], fill=(225, 235, 225))
        else:
            base_color = (250 + np.random.randint(-5, 5), 140 + np.random.randint(-10, 10), 15 + np.random.randint(-5, 5))
            draw.ellipse([center_x - radius, center_y - radius, center_x + radius, center_y + radius], fill=base_color)
            # Orange texture dimples
            for _ in range(25):
                dx = center_x + np.random.randint(-50, 50)
                dy = center_y + np.random.randint(-50, 50)
                draw.point((dx, dy), fill=(225, 120, 10))

    elif fruit_type == 'tomato':
        radius = 65 + np.random.randint(-3, 3)
        if is_rotten:
            base_color = (130 + np.random.randint(-10, 10), 50 + np.random.randint(-10, 10), 30 + np.random.randint(-5, 5))
            draw.ellipse([center_x - radius, center_y - radius + 5, center_x + radius, center_y + radius + 5], fill=base_color)
            # Dark collapsed soft spot
            draw.ellipse([center_x - 20, center_y - 15, center_x + 35, center_y + 30], fill=(55, 25, 15))
            # Mold fuzz
            for _ in range(4):
                fx = center_x + np.random.randint(-20, 20)
                fy = center_y + np.random.randint(-20, 20)
                draw.ellipse([fx - 8, fy - 8, fx + 8, fy + 8], fill=(195, 205, 195))
        else:
            base_color = (235 + np.random.randint(-10, 15), 35 + np.random.randint(-10, 10), 25 + np.random.randint(-5, 5))
            draw.ellipse([center_x - radius, center_y - radius + 5, center_x + radius, center_y + radius + 5], fill=base_color)
            # Calyx / green leaves
            draw.polygon([(center_x, center_y - radius + 5), (center_x - 18, center_y - radius - 10), (center_x - 5, center_y - radius + 2)], fill=(45, 150, 35))
            draw.polygon([(center_x, center_y - radius + 5), (center_x + 18, center_y - radius - 10), (center_x + 5, center_y - radius + 2)], fill=(45, 150, 35))
            draw.polygon([(center_x, center_y - radius + 5), (center_x, center_y - radius - 15)], fill=(45, 150, 35))

    # Apply slight gaussian smoothing
    img = img.filter(ImageFilter.SMOOTH_MORE)
    
    file_path = output_dir / f"{class_name}_{index:04d}.jpg"
    img.save(file_path, quality=95)
    return file_path

def build_dataset(base_dir: Path, samples_per_class=35):
    dataset_dir = base_dir / 'ml' / 'dataset'
    train_dir = dataset_dir / 'train'
    val_dir = dataset_dir / 'val'
    test_dir = dataset_dir / 'test'
    
    for split_dir in [train_dir, val_dir, test_dir]:
        for cls in CLASSES:
            (split_dir / cls).mkdir(parents=True, exist_ok=True)
            
    print("Generating dataset for 8 fruit freshness classes...")
    for cls in CLASSES:
        # 70% train, 15% val, 15% test
        for i in range(int(samples_per_class * 0.7)):
            generate_fruit_image(cls, i, train_dir / cls)
        for i in range(int(samples_per_class * 0.7), int(samples_per_class * 0.85)):
            generate_fruit_image(cls, i, val_dir / cls)
        for i in range(int(samples_per_class * 0.85), samples_per_class):
            generate_fruit_image(cls, i, test_dir / cls)
            
    # Also save sample images for frontend gallery
    sample_gallery_dir = base_dir / 'frontend' / 'public' / 'samples'
    sample_gallery_dir.mkdir(parents=True, exist_ok=True)
    for cls in CLASSES:
        generate_fruit_image(cls, 999, sample_gallery_dir)
        
    print("Dataset generated successfully at:", dataset_dir)

if __name__ == '__main__':
    base_path = Path(__file__).resolve().parent.parent.parent
    build_dataset(base_path)
