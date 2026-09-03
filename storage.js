// =========================================
// STORAGE MONITORING
// =========================================

const temperatureInput =
    document.getElementById(
        "temperatureInput"
    );

const humidityInput =
    document.getElementById(
        "humidityInput"
    );

const checkStorageBtn =
    document.getElementById(
        "checkStorageBtn"
    );

const temperatureDisplay =
    document.getElementById(
        "temperature"
    );

const humidityDisplay =
    document.getElementById(
        "humidity"
    );

const storageStatus =
    document.getElementById(
        "storageStatus"
    );

const recommendation =
    document.getElementById(
        "storageRecommendation"
    );


// =========================================
// CHECK STORAGE
// =========================================

function checkStorage() {

    const temperature =
        Number(
            temperatureInput.value
        );

    const humidity =
        Number(
            humidityInput.value
        );


    let status;

    let message;


    // Simple storage rules

    if (
        temperature >= 2 &&
        temperature <= 5 &&
        humidity >= 40 &&
        humidity <= 70
    ) {

        status = "Good";

        message =
            "Storage conditions are suitable. Continue maintaining the current environment.";

    }

    else if (
        temperature > 5 &&
        temperature <= 8
    ) {

        status = "Warning";

        message =
            "Temperature is slightly high. Consider lowering the storage temperature.";

    }

    else if (
        humidity > 70
    ) {

        status = "Warning";

        message =
            "Humidity is high. Excess moisture may accelerate food spoilage.";

    }

    else {

        status = "Critical";

        message =
            "Storage conditions may increase spoilage risk. Check the storage environment.";

    }


    // Update display

    temperatureDisplay.textContent =
        temperature + "°C";


    humidityDisplay.textContent =
        humidity + "%";


    storageStatus.textContent =
        status;


    recommendation.style.display =
        "block";


    recommendation.innerHTML = `

        <h3>
            🤖 Storage Recommendation
        </h3>

        <p>
            ${message}
        </p>

    `;


    // Save storage data

    const storageData = {

        temperature:
            temperature,

        humidity:
            humidity,

        status:
            status,

        updatedAt:
            new Date().toISOString()

    };


    localStorage.setItem(
        "storageData",
        JSON.stringify(
            storageData
        )
    );

}


// =========================================
// BUTTON
// =========================================

checkStorageBtn.addEventListener(
    "click",
    checkStorage
);


// =========================================
// LOAD SAVED DATA
// =========================================

const savedStorage =
    JSON.parse(
        localStorage.getItem(
            "storageData"
        )
    );


if (savedStorage) {

    temperatureInput.value =
        savedStorage.temperature;

    humidityInput.value =
        savedStorage.humidity;

    checkStorage();

}