from freshness_engine import (
    calculate_freshness_score,
    calculate_storage_score,
    calculate_product_age_score,
    calculate_shelf_life_score
)


# Example storage conditions
storage_score = calculate_storage_score(
    temperature=6,
    humidity=65,
    air_circulation="Good",
    light_exposure="Low",
    packaging="Proper"
)

# Example product age
product_age_score = calculate_product_age_score(
    age_days=3,
    expected_shelf_life_days=10
)

# Example shelf life
shelf_life_score = calculate_shelf_life_score(
    remaining_days=7,
    expected_shelf_life_days=10
)

# Example visual score from AI model
visual_score = 94


result = calculate_freshness_score(
    visual_score=visual_score,
    storage_score=storage_score,
    shelf_life_score=shelf_life_score,
    product_age_score=product_age_score
)


print("\n===== FRESHNESS ANALYSIS =====")
print("Visual Score:", result["components"]["visual"])
print("Storage Score:", result["components"]["storage"])
print("Shelf-Life Score:", result["components"]["shelf_life"])
print("Product Age Score:", result["components"]["product_age"])

print("\nFinal Freshness Score:", result["freshness_score"])
print("Classification:", result["classification"])

print("\nWeights:", result["weights"])