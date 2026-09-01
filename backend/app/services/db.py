"""
In-memory Seeded Database for Food Inventory, Storage, Alerts, and Recommendations.
"""

from typing import List, Dict, Any, Optional
import uuid
from datetime import datetime, timedelta

class Database:
    def __init__(self):
        self.foods: List[Dict[str, Any]] = []
        self.storage_zones: List[Dict[str, Any]] = []
        self.alerts: List[Dict[str, Any]] = []
        self.recommendations: List[Dict[str, Any]] = []
        self.recent_analyses: List[Dict[str, Any]] = []
        self.reports: List[Dict[str, Any]] = []
        self.seed_data()

    def seed_data(self):
        today = datetime.now()
        
        # 15+ Realistic Initial Food Items
        raw_items = [
            {
                "name": "Organic Honeycrisp Apples",
                "category": "Fruits",
                "batch_id": "BATCH-AP-101",
                "quantity": 45.0,
                "unit": "kg",
                "purchase_offset": -3,
                "expiry_offset": 6,
                "storage_temp": 4.0,
                "humidity": 88.0,
                "packaging_type": "Perforated Eco-Carton",
                "freshness_status": "Fresh",
                "freshness_score": 92,
                "spoilage_probability": 0.05,
                "shelf_life": 6,
                "image_url": "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=400&q=80"
            },
            {
                "name": "Cavendish Bananas",
                "category": "Fruits",
                "batch_id": "BATCH-BN-204",
                "quantity": 30.0,
                "unit": "kg",
                "purchase_offset": -5,
                "expiry_offset": 2,
                "storage_temp": 14.0,
                "humidity": 85.0,
                "packaging_type": "Vented Crate",
                "freshness_status": "Near Spoilage",
                "freshness_score": 52,
                "spoilage_probability": 0.45,
                "shelf_life": 2,
                "image_url": "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=400&q=80"
            },
            {
                "name": "Roma Vine Tomatoes",
                "category": "Vegetables",
                "batch_id": "BATCH-TM-305",
                "quantity": 25.0,
                "unit": "kg",
                "purchase_offset": -2,
                "expiry_offset": 5,
                "storage_temp": 11.5,
                "humidity": 82.0,
                "packaging_type": "Open Tray",
                "freshness_status": "Good",
                "freshness_score": 84,
                "spoilage_probability": 0.12,
                "shelf_life": 5,
                "image_url": "https://images.unsplash.com/photo-1592924357228-91a4daadcfea?auto=format&fit=crop&w=400&q=80"
            },
            {
                "name": "Russet Gold Potatoes",
                "category": "Vegetables",
                "batch_id": "BATCH-PT-409",
                "quantity": 120.0,
                "unit": "kg",
                "purchase_offset": -6,
                "expiry_offset": 22,
                "storage_temp": 8.0,
                "humidity": 80.0,
                "packaging_type": "Burlap Jute Sack",
                "freshness_status": "Fresh",
                "freshness_score": 95,
                "spoilage_probability": 0.03,
                "shelf_life": 22,
                "image_url": "https://images.unsplash.com/photo-1518977676601-b53f82aba655?auto=format&fit=crop&w=400&q=80"
            },
            {
                "name": "Whole Pasteurized Milk (1L)",
                "category": "Dairy Products",
                "batch_id": "BATCH-MK-512",
                "quantity": 60.0,
                "unit": "liters",
                "purchase_offset": -4,
                "expiry_offset": 3,
                "storage_temp": 3.2,
                "humidity": 70.0,
                "packaging_type": "HDPE Jug / Carton",
                "freshness_status": "Acceptable",
                "freshness_score": 74,
                "spoilage_probability": 0.22,
                "shelf_life": 3,
                "image_url": "https://images.unsplash.com/photo-1550583724-b2692b85b150?auto=format&fit=crop&w=400&q=80"
            },
            {
                "name": "Aged Cheddar Cheese Block",
                "category": "Dairy Products",
                "batch_id": "BATCH-CH-618",
                "quantity": 18.0,
                "unit": "kg",
                "purchase_offset": -10,
                "expiry_offset": 18,
                "storage_temp": 4.5,
                "humidity": 75.0,
                "packaging_type": "Vacuum Sealed Film",
                "freshness_status": "Fresh",
                "freshness_score": 89,
                "spoilage_probability": 0.08,
                "shelf_life": 18,
                "image_url": "https://images.unsplash.com/photo-1618164435735-413d3b066c9a?auto=format&fit=crop&w=400&q=80"
            },
            {
                "name": "Fresh Boneless Chicken Breast",
                "category": "Meat & Poultry",
                "batch_id": "BATCH-CK-701",
                "quantity": 35.0,
                "unit": "kg",
                "purchase_offset": -1,
                "expiry_offset": 2,
                "storage_temp": 1.2,
                "humidity": 85.0,
                "packaging_type": "Modified Atmosphere Tray",
                "freshness_status": "Fresh",
                "freshness_score": 91,
                "spoilage_probability": 0.06,
                "shelf_life": 2,
                "image_url": "https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=400&q=80"
            },
            {
                "name": "Atlantic Salmon Fillets",
                "category": "Seafood",
                "batch_id": "BATCH-SF-803",
                "quantity": 15.0,
                "unit": "kg",
                "purchase_offset": -2,
                "expiry_offset": 1,
                "storage_temp": 0.8,
                "humidity": 90.0,
                "packaging_type": "Iced Poly Styrene Box",
                "freshness_status": "Near Spoilage",
                "freshness_score": 58,
                "spoilage_probability": 0.48,
                "shelf_life": 1,
                "image_url": "https://images.unsplash.com/photo-1519708227418-c8fd9a32b7a2?auto=format&fit=crop&w=400&q=80"
            },
            {
                "name": "Artisan Sourdough Bread",
                "category": "Bakery Products",
                "batch_id": "BATCH-BR-911",
                "quantity": 20.0,
                "unit": "loaves",
                "purchase_offset": -3,
                "expiry_offset": 1,
                "storage_temp": 20.0,
                "humidity": 50.0,
                "packaging_type": "Paper Bag with Window",
                "freshness_status": "Acceptable",
                "freshness_score": 70,
                "spoilage_probability": 0.28,
                "shelf_life": 1,
                "image_url": "https://images.unsplash.com/photo-1509440159596-0249088772ff?auto=format&fit=crop&w=400&q=80"
            },
            {
                "name": "Fresh Sweet Strawberries",
                "category": "Fruits",
                "batch_id": "BATCH-SB-104",
                "quantity": 14.0,
                "unit": "kg",
                "purchase_offset": -4,
                "expiry_offset": 0,
                "storage_temp": 2.5,
                "humidity": 92.0,
                "packaging_type": "Vented Clamshell",
                "freshness_status": "Spoiled",
                "freshness_score": 24,
                "spoilage_probability": 0.88,
                "shelf_life": 0,
                "image_url": "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=400&q=80"
            },
            {
                "name": "Crunchy Baby Carrots",
                "category": "Vegetables",
                "batch_id": "BATCH-CR-115",
                "quantity": 40.0,
                "unit": "kg",
                "purchase_offset": -3,
                "expiry_offset": 14,
                "storage_temp": 3.0,
                "humidity": 95.0,
                "packaging_type": "Resealable Polybag",
                "freshness_status": "Fresh",
                "freshness_score": 94,
                "spoilage_probability": 0.04,
                "shelf_life": 14,
                "image_url": "https://images.unsplash.com/photo-1598170845058-32b9d6a5da37?auto=format&fit=crop&w=400&q=80"
            },
            {
                "name": "Baby Spinach Leaves",
                "category": "Vegetables",
                "batch_id": "BATCH-SP-120",
                "quantity": 16.0,
                "unit": "kg",
                "purchase_offset": -2,
                "expiry_offset": 4,
                "storage_temp": 2.0,
                "humidity": 94.0,
                "packaging_type": "Pillow Pouch with Micro-perforations",
                "freshness_status": "Good",
                "freshness_score": 86,
                "spoilage_probability": 0.10,
                "shelf_life": 4,
                "image_url": "https://images.unsplash.com/photo-1576045057995-568f588f82fb?auto=format&fit=crop&w=400&q=80"
            },
            {
                "name": "Greek Probiotic Yogurt",
                "category": "Dairy Products",
                "batch_id": "BATCH-YG-133",
                "quantity": 28.0,
                "unit": "tubs",
                "purchase_offset": -5,
                "expiry_offset": 9,
                "storage_temp": 3.5,
                "humidity": 70.0,
                "packaging_type": "Polypropylene Tub with Foil Seal",
                "freshness_status": "Fresh",
                "freshness_score": 88,
                "spoilage_probability": 0.09,
                "shelf_life": 9,
                "image_url": "https://images.unsplash.com/photo-1488477181946-6428a0291777?auto=format&fit=crop&w=400&q=80"
            },
            {
                "name": "Valencia Sweet Oranges",
                "category": "Fruits",
                "batch_id": "BATCH-OR-142",
                "quantity": 55.0,
                "unit": "kg",
                "purchase_offset": -4,
                "expiry_offset": 12,
                "storage_temp": 5.5,
                "humidity": 85.0,
                "packaging_type": "Mesh Netting Bag",
                "freshness_status": "Fresh",
                "freshness_score": 90,
                "spoilage_probability": 0.07,
                "shelf_life": 12,
                "image_url": "https://images.unsplash.com/photo-1582979512210-99b6a53386f9?auto=format&fit=crop&w=400&q=80"
            },
            {
                "name": "English Seedless Cucumbers",
                "category": "Vegetables",
                "batch_id": "BATCH-CU-155",
                "quantity": 22.0,
                "unit": "kg",
                "purchase_offset": -2,
                "expiry_offset": 6,
                "storage_temp": 10.0,
                "humidity": 88.0,
                "packaging_type": "Shrink-wrap Film",
                "freshness_status": "Good",
                "freshness_score": 85,
                "spoilage_probability": 0.11,
                "shelf_life": 6,
                "image_url": "https://images.unsplash.com/photo-1604977042946-1eecc30f269e?auto=format&fit=crop&w=400&q=80"
            },
            {
                "name": "Cold-Pressed Orange Juice",
                "category": "Beverages",
                "batch_id": "BATCH-BV-160",
                "quantity": 35.0,
                "unit": "bottles",
                "purchase_offset": -3,
                "expiry_offset": 5,
                "storage_temp": 3.0,
                "humidity": 65.0,
                "packaging_type": "Glass Bottle",
                "freshness_status": "Fresh",
                "freshness_score": 91,
                "spoilage_probability": 0.08,
                "shelf_life": 5,
                "image_url": "https://images.unsplash.com/photo-1613478223719-2ab802602423?auto=format&fit=crop&w=400&q=80"
            },
            {
                "name": "Whole Grain Granola Cereal",
                "category": "Packaged Foods",
                "batch_id": "BATCH-PF-172",
                "quantity": 40.0,
                "unit": "boxes",
                "purchase_offset": -15,
                "expiry_offset": 90,
                "storage_temp": 18.0,
                "humidity": 45.0,
                "packaging_type": "Foil-lined Box",
                "freshness_status": "Fresh",
                "freshness_score": 98,
                "spoilage_probability": 0.01,
                "shelf_life": 90,
                "image_url": "https://images.unsplash.com/photo-1517093157656-b9ec81615cb3?auto=format&fit=crop&w=400&q=80"
            }
        ]

        self.foods = []
        for i, item in enumerate(raw_items):
            item_id = f"food-{i+1:03d}"
            p_date = (today + timedelta(days=item["purchase_offset"])).strftime("%Y-%m-%d")
            e_date = (today + timedelta(days=item["expiry_offset"])).strftime("%Y-%m-%d")
            
            # Generate 7-day freshness history trend
            base_score = item["freshness_score"]
            history = []
            for d in range(6, -1, -1):
                hist_date = (today - timedelta(days=d)).strftime("%Y-%m-%d")
                hist_score = min(100, max(10, base_score + (d * 2) - 1))
                history.append({"date": hist_date, "score": hist_score})

            self.foods.append({
                "id": item_id,
                "name": item["name"],
                "category": item["category"],
                "batch_id": item["batch_id"],
                "quantity": item["quantity"],
                "unit": item["unit"],
                "purchase_date": p_date,
                "expiry_date": e_date,
                "storage_temp": item["storage_temp"],
                "humidity": item["humidity"],
                "packaging_type": item["packaging_type"],
                "image_url": item["image_url"],
                "freshness_status": item["freshness_status"],
                "freshness_score": item["freshness_score"],
                "spoilage_probability": item["spoilage_probability"],
                "estimated_shelf_life_days": item["shelf_life"],
                "storage_duration_days": abs(item["purchase_offset"]),
                "confidence": 0.92,
                "detected_issues": ["None"] if item["freshness_score"] > 75 else ["Surface dehydration / spot degradation"],
                "recommendation": f"Store at {item['storage_temp']}°C with {item['humidity']}% humidity.",
                "created_at": (today - timedelta(days=abs(item["purchase_offset"]))).isoformat(),
                "freshness_history": history
            })

        # Seed Storage Monitoring Zones
        self.storage_zones = [
            {
                "id": "zone-cold-1",
                "zone_name": "Cold Vault Alpha (Dairy & Fresh Produce)",
                "temperature": 3.4,
                "temperature_status": "Normal",
                "humidity": 86.5,
                "humidity_status": "Normal",
                "air_circulation": "Optimal (1.2 m/s)",
                "air_status": "Normal",
                "light_exposure": "Low (15 Lux)",
                "light_status": "Normal",
                "storage_duration": "Continuous 24/7",
                "overall_status": "Normal",
                "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            },
            {
                "id": "zone-meat-2",
                "zone_name": "Chilled Meat & Seafood Locker",
                "temperature": 1.1,
                "temperature_status": "Normal",
                "humidity": 88.0,
                "humidity_status": "Normal",
                "air_circulation": "High (1.8 m/s)",
                "air_status": "Normal",
                "light_exposure": "Dark (2 Lux)",
                "light_status": "Normal",
                "storage_duration": "Continuous 24/7",
                "overall_status": "Normal",
                "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            },
            {
                "id": "zone-pantry-3",
                "zone_name": "Ambient Pantry & Bakery Depot",
                "temperature": 19.8,
                "temperature_status": "Normal",
                "humidity": 52.0,
                "humidity_status": "Normal",
                "air_circulation": "Moderate (0.8 m/s)",
                "air_status": "Normal",
                "light_exposure": "Moderate (120 Lux)",
                "light_status": "Normal",
                "storage_duration": "Ambient Room 24/7",
                "overall_status": "Normal",
                "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            },
            {
                "id": "zone-dock-4",
                "zone_name": "Loading Dock / Quarantine Bay",
                "temperature": 11.2,
                "temperature_status": "Warning",
                "humidity": 78.0,
                "humidity_status": "Normal",
                "air_circulation": "Variable (0.4 m/s)",
                "air_status": "Warning",
                "light_exposure": "High (350 Lux)",
                "light_status": "Warning",
                "storage_duration": "Transit Only (< 4h)",
                "overall_status": "Warning",
                "last_updated": datetime.now().strftime("%Y-%m-%d %H:%M:%S")
            }
        ]

        # Seed Alerts
        self.alerts = [
            {
                "id": "alt-001",
                "title": "5 Products Expiring Soon",
                "message": "Bananas, Salmon fillets, Sourdough bread, and Milk batches have <= 3 days of shelf life remaining.",
                "type": "Shelf-Life Warning",
                "severity": "warning",
                "timestamp": "12 minutes ago",
                "is_read": False,
                "related_item_id": "food-002"
            },
            {
                "id": "alt-002",
                "title": "Spoilage Threshold Exceeded",
                "message": "Fresh Strawberries (Batch BATCH-SB-104) identified as Spoiled (Freshness score: 24/100). Immediate disposal or composting required.",
                "type": "Spoilage Alert",
                "severity": "critical",
                "timestamp": "45 minutes ago",
                "is_read": False,
                "related_item_id": "food-010"
            },
            {
                "id": "alt-003",
                "title": "1 Storage Temperature Warning",
                "message": "Loading Dock Bay experienced a transient spike to 11.2°C during truck unloading.",
                "type": "Storage Condition Alert",
                "severity": "warning",
                "timestamp": "2 hours ago",
                "is_read": False,
                "related_item_id": None
            },
            {
                "id": "alt-004",
                "title": "3 Batches Require Priority Consumption",
                "message": "FIFO automated scheduling recommends prioritizing Cavendish Bananas and Atlantic Salmon for distribution.",
                "type": "Inventory Alert",
                "severity": "info",
                "timestamp": "4 hours ago",
                "is_read": True,
                "related_item_id": "food-008"
            },
            {
                "id": "alt-005",
                "title": "Freshness Index Audit Completed",
                "message": "Daily automated scan recorded an overall inventory freshness average of 84%.",
                "type": "Freshness Alert",
                "severity": "info",
                "timestamp": "6 hours ago",
                "is_read": True,
                "related_item_id": None
            }
        ]

        # Seed Recommendations
        self.recommendations = [
            {
                "id": "rec-001",
                "food_name": "Atlantic Salmon Fillets",
                "category": "Seafood",
                "type": "consumption",
                "title": "Immediate Consumption Priority",
                "description": "Remaining shelf-life is estimated at 1 day. Distribute or prepare for same-day service to avoid quality degradation.",
                "priority": "High",
                "action_text": "Mark for Immediate Kitchen / Retail Dispatch"
            },
            {
                "id": "rec-002",
                "food_name": "Cavendish Bananas",
                "category": "Fruits",
                "type": "inventory",
                "title": "Front-of-Inventory Rotation",
                "description": "Ethylene emission levels increasing. Separate from Honeycrisp Apples and rotate to display front.",
                "priority": "High",
                "action_text": "Move to Front Display / Bake Preparation"
            },
            {
                "id": "rec-003",
                "food_name": "Whole Pasteurized Milk",
                "category": "Dairy Products",
                "type": "storage",
                "title": "Cold Chain Verification",
                "description": "Ensure milk crates remain nestled deep in Cold Vault Alpha away from door opening temperature draft.",
                "priority": "Medium",
                "action_text": "Relocate to Center Vault Shelving"
            },
            {
                "id": "rec-004",
                "food_name": "Organic Honeycrisp Apples",
                "category": "Fruits",
                "type": "waste_reduction",
                "title": "Maintain High-Humidity Setting",
                "description": "High score (92/100). Maintain 88% RH to preserve crispness and prevent skin moisture transpiration for 6+ days.",
                "priority": "Low",
                "action_text": "Confirm Crisper Humidity Valve"
            }
        ]

        # Seed Recent Food Analyses
        self.recent_analyses = [
            {
                "id": "ana-001",
                "food_name": "Organic Honeycrisp Apple",
                "timestamp": "15 minutes ago",
                "score": 92,
                "status": "Fresh",
                "confidence": 0.94,
                "image_url": "https://images.unsplash.com/photo-1560806887-1e4cd0b6cbd6?auto=format&fit=crop&w=400&q=80"
            },
            {
                "id": "ana-002",
                "food_name": "Fresh Boneless Chicken",
                "timestamp": "48 minutes ago",
                "score": 91,
                "status": "Fresh",
                "confidence": 0.91,
                "image_url": "https://images.unsplash.com/photo-1604503468506-a8da13d82791?auto=format&fit=crop&w=400&q=80"
            },
            {
                "id": "ana-003",
                "food_name": "Cavendish Banana",
                "timestamp": "2 hours ago",
                "score": 52,
                "status": "Near Spoilage",
                "confidence": 0.89,
                "image_url": "https://images.unsplash.com/photo-1571771894821-ce9b6c11b08e?auto=format&fit=crop&w=400&q=80"
            },
            {
                "id": "ana-004",
                "food_name": "Fresh Sweet Strawberries",
                "timestamp": "3 hours ago",
                "score": 24,
                "status": "Spoiled",
                "confidence": 0.96,
                "image_url": "https://images.unsplash.com/photo-1464965911861-746a04b4bca6?auto=format&fit=crop&w=400&q=80"
            }
        ]

        # Seed Reports
        self.reports = [
            {
                "id": "rep-001",
                "title": "Comprehensive Weekly Freshness & Quality Audit",
                "report_type": "Freshness Report",
                "created_at": (today - timedelta(days=1)).strftime("%Y-%m-%d"),
                "generated_by": "Food Quality Inspector",
                "summary": "128 total items monitored; 82 Fresh (64%), 18 Near Spoilage (14%), 8 Spoiled (6%). Average Freshness 84%.",
                "status": "Ready",
                "data": {
                    "total_items": 128,
                    "avg_freshness": 84,
                    "fresh_ratio": "64%",
                    "compliance_rate": "96.5%"
                }
            },
            {
                "id": "rep-002",
                "title": "Shelf-Life Forecast & Expiry Horizon (Next 14 Days)",
                "report_type": "Shelf-Life Report",
                "created_at": today.strftime("%Y-%m-%d"),
                "generated_by": "Retail Manager",
                "summary": "Identified 8 critical items expiring within 72 hours. Recommended FIFO dispatch strategies.",
                "status": "Ready",
                "data": {
                    "critical_expiring_count": 8,
                    "est_preventable_loss_usd": "$1,450.00"
                }
            },
            {
                "id": "rep-003",
                "title": "Storage Conditions & Cold Chain Compliance Log",
                "report_type": "Storage Compliance Report",
                "created_at": (today - timedelta(days=2)).strftime("%Y-%m-%d"),
                "generated_by": "Warehouse Operator",
                "summary": "4 monitoring zones surveyed. Cold Vault Alpha maintained 3.4°C +/- 0.4°C throughout 168 hours.",
                "status": "Ready",
                "data": {
                    "uptime": "99.8%",
                    "anomalies_detected": 1
                }
            },
            {
                "id": "rep-004",
                "title": "Waste Reduction & Food Rescue Analytics",
                "report_type": "Waste Reduction Report",
                "created_at": (today - timedelta(days=3)).strftime("%Y-%m-%d"),
                "generated_by": "Administrator",
                "summary": "Proactive shelf-life alerts contributed to a 28% reduction in inventory discard compared to previous month.",
                "status": "Ready",
                "data": {
                    "waste_saved_kg": "340 kg",
                    "co2_reduction_kg": "850 kg"
                }
            }
        ]

db = Database()
