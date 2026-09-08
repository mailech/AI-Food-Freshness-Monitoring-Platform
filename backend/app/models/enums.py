"""Enumerations shared by the database models."""

from enum import Enum


class UserRole(str, Enum):
    CONSUMER = "Consumer"
    RETAIL_MANAGER = "Retail Manager"
    WAREHOUSE_OPERATOR = "Warehouse Operator"
    FOOD_QUALITY_INSPECTOR = "Food Quality Inspector"
    ADMINISTRATOR = "Administrator"


class FoodCategory(str, Enum):
    FRUITS = "Fruits"
    VEGETABLES = "Vegetables"
    DAIRY = "Dairy"
    MEAT_AND_POULTRY = "Meat & Poultry"
    SEAFOOD = "Seafood"
    BAKERY = "Bakery"
    PACKAGED_FOODS = "Packaged Foods"
    BEVERAGES = "Beverages"


class FreshnessCategory(str, Enum):
    FRESH = "Fresh"
    GOOD = "Good"
    ACCEPTABLE = "Acceptable"
    NEAR_SPOILAGE = "Near Spoilage"
    SPOILED = "Spoiled"


class RecommendationType(str, Enum):
    STORAGE = "Storage"
    CONSUMPTION = "Consumption"
    INVENTORY_ROTATION = "Inventory Rotation"
    WASTE_REDUCTION = "Waste Reduction"
    QUALITY_IMPROVEMENT = "Quality Improvement"


class AlertCategory(str, Enum):
    FRESHNESS = "Freshness"
    SHELF_LIFE = "Shelf Life"
    SPOILAGE = "Spoilage"
    STORAGE = "Storage"
    INVENTORY = "Inventory"


class ReportType(str, Enum):
    FRESHNESS_REPORT = "Freshness Report"
    SHELF_LIFE_REPORT = "Shelf-Life Report"
    INVENTORY_QUALITY_REPORT = "Inventory Quality Report"
    WASTE_REDUCTION_REPORT = "Waste Reduction Report"
    STORAGE_COMPLIANCE_REPORT = "Storage Compliance Report"
