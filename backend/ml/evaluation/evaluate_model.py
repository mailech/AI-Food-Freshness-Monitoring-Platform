import numpy as np
from typing import List, Dict, Any

def evaluate_metrics(predictions: List[np.ndarray], ground_truth: List[int]) -> Dict[str, Any]:
    """
    Computes Accuracy, Precision, Recall, F1-score, and Confusion Matrix.
    """
    if not predictions or not ground_truth or len(predictions) != len(ground_truth):
        return {"status": "MODEL EVALUATION NOT AVAILABLE", "reason": "No evaluation dataset provided"}
        
    preds = np.argmax(predictions, axis=1)
    truth = np.array(ground_truth)
    
    accuracy = float(np.mean(preds == truth))
    
    # Simple multi-class macro averaging
    classes = np.unique(truth)
    precisions = []
    recalls = []
    
    for c in classes:
        tp = np.sum((preds == c) & (truth == c))
        fp = np.sum((preds == c) & (truth != c))
        fn = np.sum((preds != c) & (truth == c))
        
        precision = tp / (tp + fp) if (tp + fp) > 0 else 0.0
        recall = tp / (tp + fn) if (tp + fn) > 0 else 0.0
        
        precisions.append(precision)
        recalls.append(recall)
        
    macro_precision = float(np.mean(precisions))
    macro_recall = float(np.mean(recalls))
    
    f1 = 2 * (macro_precision * macro_recall) / (macro_precision + macro_recall) if (macro_precision + macro_recall) > 0 else 0.0
    
    # Calculate simple Confusion Matrix
    num_classes = 5
    confusion_matrix = np.zeros((num_classes, num_classes), dtype=int)
    for t, p in zip(truth, preds):
        if 0 <= t < num_classes and 0 <= p < num_classes:
            confusion_matrix[t, p] += 1
            
    return {
        "accuracy": round(accuracy, 4),
        "precision": round(macro_precision, 4),
        "recall": round(macro_recall, 4),
        "f1_score": round(f1, 4),
        "confusion_matrix": confusion_matrix.tolist()
    }
