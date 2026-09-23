import json
import threading
import paho.mqtt.client as mqtt


# Latest sensor readings stored in memory
sensor_data = {}


MQTT_BROKER = "test.mosquitto.org"
MQTT_PORT = 1883
MQTT_TOPIC = "foodfreshness/storage/+"


def on_connect(client, userdata, flags, rc):
    if rc == 0:
        print("MQTT connected successfully")
        client.subscribe(MQTT_TOPIC)
        print(f"Subscribed to: {MQTT_TOPIC}")
    else:
        print(f"MQTT connection failed. Code: {rc}")


def on_message(client, userdata, msg):
    try:
        payload = json.loads(msg.payload.decode())

        topic_parts = msg.topic.split("/")

        if len(topic_parts) >= 3:
            storage_id = topic_parts[-1]
        else:
            storage_id = "unknown"

        sensor_data[storage_id] = {
            "temperature": payload.get("temperature"),
            "humidity": payload.get("humidity"),
            "timestamp": payload.get("timestamp")
        }

        print(
            f"Sensor update [{storage_id}]: "
            f"{payload.get('temperature')}°C, "
            f"{payload.get('humidity')}%"
        )

    except Exception as e:
        print(f"MQTT message error: {e}")


def start_mqtt():
    try:
        client = mqtt.Client()

        client.on_connect = on_connect
        client.on_message = on_message

        client.connect(MQTT_BROKER, MQTT_PORT, 60)

        thread = threading.Thread(
            target=client.loop_forever,
            daemon=True
        )

        thread.start()

        return client

    except Exception as e:
        print(f"MQTT startup failed: {e}")
        return None


def get_sensor_data(storage_id: str):
    return sensor_data.get(storage_id)