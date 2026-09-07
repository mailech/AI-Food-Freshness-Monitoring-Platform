# import requests

# image_path = r"C:\Users\Sayantika Mahanta\OneDrive\Desktop\html\Food Freshness Monitoring Platform\OIP.jpg"

# with open(image_path, "rb") as image:
#     response = requests.post(
#         "http://127.0.0.1:5000/predict",
#         files={"image": image}
#     )

# print("Status Code:", response.status_code)
# print("Response:", response.json())

import requests

image_path = r"C:\Users\Sayantika Mahanta\OneDrive\Desktop\html\Food Freshness Monitoring Platform\OIP.jpg"

try:
    with open(image_path, "rb") as image:
        response = requests.post(
            "http://127.0.0.1:5000/predict",
            files={"image": image},
            timeout=60
        )

    print("Status Code:", response.status_code)
    print("Response:", response.text)

except FileNotFoundError:
    print("ERROR: Image file not found.")
    print("Check the image path:", image_path)

except requests.exceptions.ConnectionError:
    print("ERROR: Cannot connect to Flask backend.")
    print("Make sure your Flask server is running on http://127.0.0.1:5000")

except requests.exceptions.Timeout:
    print("ERROR: Backend took too long to respond.")

except Exception as e:
    print("ERROR:", e)