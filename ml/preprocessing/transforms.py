import cv2
import numpy as np
import torch
from torchvision import transforms
from PIL import Image

# ImageNet standard normalization
MEAN = [0.485, 0.456, 0.406]
STD = [0.229, 0.224, 0.225]

def get_train_transforms(image_size=224):
    return transforms.Compose([
        transforms.Resize((image_size, image_size)),
        transforms.RandomHorizontalFlip(p=0.5),
        transforms.RandomRotation(degrees=15),
        transforms.ColorJitter(brightness=0.1, contrast=0.1, saturation=0.1),
        transforms.ToTensor(),
        transforms.Normalize(mean=MEAN, std=STD)
    ])

def get_eval_transforms(image_size=224):
    return transforms.Compose([
        transforms.Resize((image_size, image_size)),
        transforms.ToTensor(),
        transforms.Normalize(mean=MEAN, std=STD)
    ])

def preprocess_pil_image(pil_img, image_size=224):
    if pil_img.mode != 'RGB':
        pil_img = pil_img.convert('RGB')
    transform = get_eval_transforms(image_size)
    tensor = transform(pil_img).unsqueeze(0)
    return tensor
