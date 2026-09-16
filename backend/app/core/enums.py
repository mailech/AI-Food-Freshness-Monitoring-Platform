"""Domain enumerations shared by models, schemas and services.

Stored in the database as short strings (not native PG enums) so that adding a
value never requires a type migration.
"""

from __future__ import annotations

from enum import Enum


class StrEnum(str, Enum):
    """`str`-backed enum with a friendly repr and a tolerant parser."""

    def __str__(self) -> str:  # pragma: no cover - convenience
        return str(self.value)

    @classmethod
    def parse(cls, value: object, default=None):
        """Best-effort coercion from arbitrary input to a member."""
        if isinstance(value, cls):
            return value
        if value is None:
            return default
        text = str(value).strip().upper().replace(" ", "_").replace("-", "_")
        for member in cls:
            if member.value.upper() == text or member.name == text:
                return member
        return default


# --------------------------------------------------------------------- roles
class RoleName(StrEnum):
    CONSUMER = "CONSUMER"
    RETAIL_MANAGER = "RETAIL_MANAGER"
    WAREHOUSE_OPERATOR = "WAREHOUSE_OPERATOR"
    QUALITY_INSPECTOR = "QUALITY_INSPECTOR"
    ADMIN = "ADMIN"


class Permission(StrEnum):
    """Fine-grained permissions granted to roles (see app.auth.permissions)."""

    # inventory / catalogue
    PRODUCT_READ = "product:read"
    PRODUCT_WRITE = "product:write"
    BATCH_READ = "batch:read"
    BATCH_WRITE = "batch:write"
    INVENTORY_READ = "inventory:read"
    INVENTORY_WRITE = "inventory:write"
    # analysis
    ANALYSIS_CREATE = "analysis:create"
    ANALYSIS_READ = "analysis:read"
    INSPECTION_MANAGE = "inspection:manage"
    # storage
    STORAGE_READ = "storage:read"
    STORAGE_WRITE = "storage:write"
    # insight
    RECOMMENDATION_READ = "recommendation:read"
    ALERT_READ = "alert:read"
    ALERT_WRITE = "alert:write"
    ANALYTICS_READ = "analytics:read"
    REPORT_GENERATE = "report:generate"
    # administration
    USER_MANAGE = "user:manage"
    SYSTEM_MANAGE = "system:manage"
    AUDIT_READ = "audit:read"


# ---------------------------------------------------------------- freshness
class FreshnessCategory(StrEnum):
    FRESH = "FRESH"
    GOOD = "GOOD"
    ACCEPTABLE = "ACCEPTABLE"
    NEAR_SPOILAGE = "NEAR_SPOILAGE"
    SPOILED = "SPOILED"


class InventoryStatus(StrEnum):
    FRESH = "FRESH"
    GOOD = "GOOD"
    ACCEPTABLE = "ACCEPTABLE"
    NEAR_SPOILAGE = "NEAR_SPOILAGE"
    SPOILED = "SPOILED"
    EXPIRED = "EXPIRED"


class RiskLevel(StrEnum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"


class ComplianceStatus(StrEnum):
    COMPLIANT = "COMPLIANT"
    WARNING = "WARNING"
    NON_COMPLIANT = "NON_COMPLIANT"
    UNKNOWN = "UNKNOWN"


# ------------------------------------------------------------------ spoilage
class SpoilageIndicatorType(StrEnum):
    MOLD = "MOLD"
    BRUISING = "BRUISING"
    DISCOLORATION = "DISCOLORATION"
    PHYSICAL_DAMAGE = "PHYSICAL_DAMAGE"
    SURFACE_DEGRADATION = "SURFACE_DEGRADATION"
    TEXTURE_CHANGE = "TEXTURE_CHANGE"
    COLOR_DEGRADATION = "COLOR_DEGRADATION"
    DRYNESS = "DRYNESS"
    WETNESS = "WETNESS"


# ------------------------------------------------------------------- storage
class PackagingType(StrEnum):
    NONE = "NONE"
    LOOSE = "LOOSE"
    PAPER = "PAPER"
    PLASTIC_WRAP = "PLASTIC_WRAP"
    PLASTIC_CONTAINER = "PLASTIC_CONTAINER"
    VACUUM_SEALED = "VACUUM_SEALED"
    MODIFIED_ATMOSPHERE = "MODIFIED_ATMOSPHERE"
    CANNED = "CANNED"
    GLASS_JAR = "GLASS_JAR"
    TETRA_PACK = "TETRA_PACK"


class AirCirculation(StrEnum):
    POOR = "POOR"
    MODERATE = "MODERATE"
    GOOD = "GOOD"


class LightExposure(StrEnum):
    DARK = "DARK"
    LOW = "LOW"
    MODERATE = "MODERATE"
    HIGH = "HIGH"


class SensorSource(StrEnum):
    MANUAL = "MANUAL"
    MOCK_SENSOR = "MOCK_SENSOR"
    MQTT = "MQTT"
    IMPORT = "IMPORT"


# -------------------------------------------------------------------- alerts
class AlertType(StrEnum):
    FRESHNESS_DEGRADATION = "FRESHNESS_DEGRADATION"
    NEAR_SPOILAGE = "NEAR_SPOILAGE"
    SPOILAGE = "SPOILAGE"
    SHELF_LIFE_WARNING = "SHELF_LIFE_WARNING"
    EXPIRY_APPROACHING = "EXPIRY_APPROACHING"
    TEMPERATURE_VIOLATION = "TEMPERATURE_VIOLATION"
    HUMIDITY_VIOLATION = "HUMIDITY_VIOLATION"
    INVENTORY_RISK = "INVENTORY_RISK"
    STORAGE_NON_COMPLIANCE = "STORAGE_NON_COMPLIANCE"


class AlertSeverity(StrEnum):
    INFO = "INFO"
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    CRITICAL = "CRITICAL"

    @property
    def rank(self) -> int:
        order = {"INFO": 0, "LOW": 1, "MEDIUM": 2, "HIGH": 3, "CRITICAL": 4}
        return order[self.value]


class NotificationType(StrEnum):
    FRESHNESS_ALERT = "freshness_alert"
    SHELF_LIFE_WARNING = "shelf_life_warning"
    SPOILAGE_ALERT = "spoilage_alert"
    STORAGE_ALERT = "storage_alert"
    INVENTORY_ALERT = "inventory_alert"
    SYSTEM_NOTIFICATION = "system_notification"


# ----------------------------------------------------------- recommendations
class RecommendationType(StrEnum):
    STORAGE = "STORAGE"
    CONSUMPTION = "CONSUMPTION"
    INVENTORY_ROTATION = "INVENTORY_ROTATION"
    WASTE_REDUCTION = "WASTE_REDUCTION"
    QUALITY_IMPROVEMENT = "QUALITY_IMPROVEMENT"


class RecommendationPriority(StrEnum):
    LOW = "LOW"
    MEDIUM = "MEDIUM"
    HIGH = "HIGH"
    URGENT = "URGENT"


# ------------------------------------------------------------------- reports
class ReportType(StrEnum):
    FRESHNESS = "FRESHNESS"
    SHELF_LIFE = "SHELF_LIFE"
    INVENTORY_QUALITY = "INVENTORY_QUALITY"
    WASTE_REDUCTION = "WASTE_REDUCTION"
    STORAGE_COMPLIANCE = "STORAGE_COMPLIANCE"


class ReportFormat(StrEnum):
    PDF = "PDF"
    XLSX = "XLSX"


class ReportStatus(StrEnum):
    PENDING = "PENDING"
    COMPLETED = "COMPLETED"
    FAILED = "FAILED"


# ------------------------------------------------------------------- ml meta
class ModelKind(StrEnum):
    BASELINE = "BASELINE"      # transparent CV / rule based
    DEMO = "DEMO"              # deterministic demo inference
    TRAINED = "TRAINED"        # loaded from a trained artefact


class RotationStrategy(StrEnum):
    FIFO = "FIFO"
    FEFO = "FEFO"


class AuditAction(StrEnum):
    LOGIN = "LOGIN"
    LOGIN_FAILED = "LOGIN_FAILED"
    LOGOUT = "LOGOUT"
    REGISTER = "REGISTER"
    TOKEN_REFRESH = "TOKEN_REFRESH"
    CREATE = "CREATE"
    UPDATE = "UPDATE"
    DELETE = "DELETE"
    IMAGE_UPLOAD = "IMAGE_UPLOAD"
    IMAGE_ANALYSIS = "IMAGE_ANALYSIS"
    REPORT_GENERATE = "REPORT_GENERATE"
    ADMIN_CHANGE = "ADMIN_CHANGE"
    STORAGE_READING = "STORAGE_READING"
