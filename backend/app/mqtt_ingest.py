"""MQTT sensor ingestion (SRS FR-6.1, sensor path).

Subscribes to  ffp/items/{item_id}/readings  with JSON payloads:
  {"temperature_c": 4.2, "humidity_pct": 88.0,
   "light_exposure": "low", "air_circulation": "medium"}

Each message is stored as a StorageReading (source="mqtt") after validating
the item exists. Run: python -m app.mqtt_ingest
"""

import json
import logging
import os

import paho.mqtt.client as mqtt

from app.db import SessionLocal
from app.models.inventory import FoodItem
from app.models.storage import StorageReading

logging.basicConfig(level=logging.INFO, format="%(asctime)s %(levelname)s %(name)s: %(message)s")
logger = logging.getLogger("mqtt_ingest")

MQTT_HOST = os.getenv("MQTT_HOST", "localhost")
MQTT_PORT = int(os.getenv("MQTT_PORT", "1883"))
TOPIC_PREFIX = "ffp/items/"

VALID_EXPOSURES = {"low", "medium", "high"}


def _store_reading(item_id: int, payload: dict) -> bool:
    if not isinstance(payload, dict):
        return False
    reading = StorageReading(
        item_id=item_id,
        temperature_c=payload.get("temperature_c"),
        humidity_pct=payload.get("humidity_pct"),
        light_exposure=payload.get("light_exposure") if payload.get("light_exposure") in VALID_EXPOSURES else None,
        air_circulation=payload.get("air_circulation") if payload.get("air_circulation") in VALID_EXPOSURES else None,
        source="mqtt",
    )
    with SessionLocal() as db:
        if db.get(FoodItem, item_id) is None:
            logger.warning("Unknown item_id %s; dropping message", item_id)
            return False
        db.add(reading)
        db.commit()
    logger.info("Stored MQTT reading for item %s", item_id)
    return True


def _on_connect(client: mqtt.Client, userdata, flags, reason_code, properties=None):
    logger.info("Connected to MQTT broker at %s:%s", MQTT_HOST, MQTT_PORT)
    client.subscribe(f"{TOPIC_PREFIX}+/readings")


def _on_message(client: mqtt.Client, userdata, msg: mqtt.MQTTMessage):
    try:
        item_id = int(msg.topic[len(TOPIC_PREFIX):].split("/")[0])
    except ValueError:
        logger.warning("Unparseable topic %r", msg.topic)
        return
    try:
        payload = json.loads(msg.payload.decode("utf-8"))
    except (UnicodeDecodeError, json.JSONDecodeError):
        logger.warning("Non-JSON payload on %r", msg.topic)
        return
    try:
        _store_reading(item_id, payload)
    except Exception:
        logger.exception("Failed to store reading for item %s", item_id)


def main() -> None:
    client = mqtt.Client(mqtt.CallbackAPIVersion.VERSION2, client_id="ffp-ingest")
    client.on_connect = _on_connect
    client.on_message = _on_message
    client.connect(MQTT_HOST, MQTT_PORT, keepalive=30)
    client.loop_forever(retry_first_connection=True)


if __name__ == "__main__":
    main()
