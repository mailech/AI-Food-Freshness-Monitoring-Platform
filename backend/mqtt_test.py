import paho.mqtt.publish as publish
import json

payload = {
    "temperature": 6,
    "humidity": 65,
    "timestamp": "2026-09-23T17:00:00"
}

publish.single(
    "foodfreshness/storage/Cold-Storage-A",
    payload=json.dumps(payload),
    hostname="test.mosquitto.org",
    port=1883
)

print("Sensor data published successfully")