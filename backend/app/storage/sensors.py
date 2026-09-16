"""Sensor provider abstraction (optional IoT integration).

The platform works **completely without hardware**. `MockSensorProvider` is the
default and produces deterministic, physically plausible readings so storage
monitoring, trend graphs and alerting can be demonstrated end to end.

`MQTTSensorProvider` is provided as ready-to-use architecture: it requires
`paho-mqtt` and a reachable broker. If either is missing, `connect()` returns
False, the API reports the provider as unavailable and the mock keeps working.

Topic convention for MQTT
-------------------------
    freshness/sensors/<location>/<sensor_id>
    payload: {"temperature_c": 4.2, "humidity_pct": 82, "co2_ppm": 480}
"""

from __future__ import annotations

import hashlib
import math
import threading
from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from datetime import UTC, datetime
from typing import Any, Callable

from app.config import settings
from app.core.enums import SensorSource
from app.core.logging_config import get_logger

logger = get_logger("app.storage.sensors")


@dataclass
class SensorReading:
    sensor_id: str
    location_name: str
    temperature_c: float | None = None
    humidity_pct: float | None = None
    co2_ppm: float | None = None
    recorded_at: datetime = field(default_factory=lambda: datetime.now(UTC))
    source: SensorSource = SensorSource.MOCK_SENSOR

    def as_dict(self) -> dict[str, Any]:
        return {
            "sensor_id": self.sensor_id,
            "location_name": self.location_name,
            "temperature_c": self.temperature_c,
            "humidity_pct": self.humidity_pct,
            "co2_ppm": self.co2_ppm,
            "recorded_at": self.recorded_at,
            "source": str(self.source),
        }


class SensorProvider(ABC):
    """Contract for any environmental data source."""

    name: str = "abstract"

    @abstractmethod
    def is_available(self) -> bool: ...

    @abstractmethod
    def read(self, sensor_id: str, location_name: str) -> SensorReading: ...

    @abstractmethod
    def read_all(self) -> list[SensorReading]: ...

    def describe(self) -> dict[str, Any]:
        return {
            "provider": self.name,
            "available": self.is_available(),
            "requires_hardware": self.name == "mqtt",
        }


class MockSensorProvider(SensorProvider):
    """Deterministic pseudo-sensor.

    Values are a smooth function of (sensor_id, time) rather than random, so
    repeated calls form a realistic diurnal curve and tests are reproducible.
    """

    name = "mock"

    # Nominal set points per location keyword.
    _PROFILES: dict[str, tuple[float, float]] = {
        "freezer": (-18.0, 60.0),
        "chiller": (3.0, 85.0),
        "cold": (3.0, 85.0),
        "dairy": (3.0, 70.0),
        "meat": (1.5, 82.0),
        "seafood": (0.5, 90.0),
        "produce": (5.0, 92.0),
        "bakery": (20.0, 55.0),
        "dry": (20.0, 45.0),
        "ambient": (22.0, 50.0),
    }

    def __init__(self, sensors: list[tuple[str, str]] | None = None) -> None:
        # (sensor_id, location_name)
        self._sensors = sensors or [
            ("TMP-CHILL-01", "Cold Room A"),
            ("TMP-CHILL-02", "Cold Room B"),
            ("TMP-DAIRY-01", "Dairy Chiller"),
            ("TMP-MEAT-01", "Meat Chiller"),
            ("TMP-PROD-01", "Produce Cold Store"),
            ("TMP-BAKE-01", "Bakery Shelf"),
            ("TMP-DRY-01", "Dry Store"),
        ]

    def is_available(self) -> bool:
        return True

    def _nominal(self, location_name: str) -> tuple[float, float]:
        lowered = location_name.lower()
        for keyword, values in self._PROFILES.items():
            if keyword in lowered:
                return values
        return 6.0, 75.0

    def read(self, sensor_id: str, location_name: str) -> SensorReading:
        base_temp, base_humidity = self._nominal(location_name)
        # Stable per-sensor offset.
        seed = int(hashlib.sha256(sensor_id.encode()).hexdigest()[:8], 16)
        offset = ((seed % 1000) / 1000.0 - 0.5) * 1.6

        now = datetime.now(UTC)
        minutes = now.hour * 60 + now.minute
        # Diurnal cycle: warmest mid-afternoon.
        diurnal = math.sin((minutes / 1440.0) * 2 * math.pi - math.pi / 2)

        temperature = base_temp + offset + diurnal * 0.9
        humidity = base_humidity + offset * 2.0 - diurnal * 3.0

        return SensorReading(
            sensor_id=sensor_id,
            location_name=location_name,
            temperature_c=round(temperature, 2),
            humidity_pct=round(min(100.0, max(0.0, humidity)), 1),
            co2_ppm=round(430.0 + (seed % 120), 1),
            recorded_at=now,
            source=SensorSource.MOCK_SENSOR,
        )

    def read_all(self) -> list[SensorReading]:
        return [self.read(sensor_id, location) for sensor_id, location in self._sensors]

    @property
    def sensors(self) -> list[tuple[str, str]]:
        return list(self._sensors)


class MQTTSensorProvider(SensorProvider):  # pragma: no cover - requires a broker
    """MQTT-backed provider. Subscribes and caches the latest reading per sensor."""

    name = "mqtt"

    def __init__(self) -> None:
        self._client: Any | None = None
        self._connected = False
        self._cache: dict[str, SensorReading] = {}
        self._lock = threading.Lock()
        self._on_reading: Callable[[SensorReading], None] | None = None

    def set_callback(self, callback: Callable[[SensorReading], None]) -> None:
        self._on_reading = callback

    def connect(self) -> bool:
        try:
            import paho.mqtt.client as mqtt  # noqa: PLC0415 - optional dependency
        except ImportError:
            logger.info(
                "paho-mqtt is not installed - MQTT sensor provider unavailable "
                "(pip install paho-mqtt). The platform continues with the mock provider."
            )
            return False
        try:
            client = mqtt.Client()
            if settings.MQTT_USERNAME:
                client.username_pw_set(settings.MQTT_USERNAME, settings.MQTT_PASSWORD)
            client.on_connect = self._on_connect
            client.on_message = self._on_message
            client.connect(settings.MQTT_BROKER_HOST, settings.MQTT_BROKER_PORT, keepalive=60)
            client.loop_start()
            self._client = client
            self._connected = True
            logger.info(
                "connected to MQTT broker %s:%s", settings.MQTT_BROKER_HOST, settings.MQTT_BROKER_PORT
            )
        except Exception as exc:  # noqa: BLE001
            logger.warning("MQTT connection failed: %s", exc)
            self._connected = False
        return self._connected

    def _on_connect(self, client, _userdata, _flags, _rc) -> None:
        client.subscribe(settings.MQTT_TOPIC)
        logger.info("subscribed to MQTT topic %s", settings.MQTT_TOPIC)

    def _on_message(self, _client, _userdata, message) -> None:
        import json

        try:
            payload = json.loads(message.payload.decode("utf-8"))
        except (ValueError, UnicodeDecodeError):
            logger.warning("discarded malformed MQTT payload on %s", message.topic)
            return

        parts = message.topic.split("/")
        location = parts[-2] if len(parts) >= 2 else "unknown"
        sensor_id = parts[-1] if parts else "unknown"

        reading = SensorReading(
            sensor_id=str(payload.get("sensor_id") or sensor_id),
            location_name=str(payload.get("location") or location),
            temperature_c=payload.get("temperature_c"),
            humidity_pct=payload.get("humidity_pct"),
            co2_ppm=payload.get("co2_ppm"),
            source=SensorSource.MQTT,
        )
        with self._lock:
            self._cache[reading.sensor_id] = reading
        if self._on_reading:
            self._on_reading(reading)

    def is_available(self) -> bool:
        return self._connected

    def read(self, sensor_id: str, location_name: str) -> SensorReading:
        with self._lock:
            cached = self._cache.get(sensor_id)
        if cached:
            return cached
        return SensorReading(
            sensor_id=sensor_id, location_name=location_name, source=SensorSource.MQTT
        )

    def read_all(self) -> list[SensorReading]:
        with self._lock:
            return list(self._cache.values())

    def disconnect(self) -> None:
        if self._client is not None:
            try:
                self._client.loop_stop()
                self._client.disconnect()
            finally:
                self._connected = False


_provider: SensorProvider | None = None


def get_sensor_provider() -> SensorProvider:
    """Return the configured provider, falling back to the mock."""
    global _provider
    if _provider is not None:
        return _provider

    if settings.SENSOR_PROVIDER == "mqtt":
        mqtt_provider = MQTTSensorProvider()
        if mqtt_provider.connect():
            _provider = mqtt_provider
            return _provider
        logger.info("falling back to MockSensorProvider (no MQTT broker available)")
    _provider = MockSensorProvider()
    return _provider


def reset_sensor_provider() -> None:
    global _provider
    _provider = None
