import numpy as np
from typing import List, Tuple

def evaluate_accuracy(predictions: List[np.ndarray], ground_truth: List[int]) -> float:
    """
    Evaluates classification accuracy between a list of probabilities and ground truth indices.
    """
    if not predictions or not ground_truth or len(predictions) != len(ground_truth):
        return 0.0
        
    correct = 0
    for pred, truth in zip(predictions, ground_truth):
        pred_idx = int(np.argmax(pred))
        if pred_idx == truth:
            correct += 1
            
    return float(correct) / len(ground_truth)
