document.addEventListener("DOMContentLoaded", function () {

    /* =========================
       ANALYZE FOOD PAGE
    ========================= */

    const foodImage = document.getElementById("foodImage");
    const imagePreview = document.getElementById("imagePreview");
    const analyzeButton = document.getElementById("analyzeButton");

    if (foodImage && imagePreview && analyzeButton) {

        foodImage.addEventListener("change", function () {

            const file = this.files[0];

            if (file) {
                imagePreview.src = URL.createObjectURL(file);
                imagePreview.style.display = "block";
            }

        });


        analyzeButton.addEventListener("click", function () {

            if (!foodImage.files[0]) {
                alert("Please select a food image first!");
                return;
            }

            document.getElementById("resultIcon").textContent = "🥬";
            document.getElementById("resultTitle").textContent =
                "Food Analysis Complete";

            document.getElementById("resultText").textContent =
                "The food image has been analyzed successfully.";

            document.getElementById("freshnessScore").textContent = "85%";
            document.getElementById("foodStatus").textContent = "Fresh";
            document.getElementById("shelfLife").textContent = "4 Days";

            document.getElementById("recommendation").textContent =
                "Store in a cool refrigerator to maintain freshness.";

        });

    }


    /* =========================
       SHELF LIFE PAGE
    ========================= */

    const foodName = document.getElementById("foodName");
    const storageType = document.getElementById("storageType");
    const foodCondition = document.getElementById("foodCondition");
    const predictButton = document.getElementById("predictButton");

    const predictionTitle = document.getElementById("predictionTitle");
    const predictionDays = document.getElementById("predictionDays");
    const predictionText = document.getElementById("predictionText");


    if (
        foodName &&
        storageType &&
        foodCondition &&
        predictButton
    ) {

        predictButton.addEventListener("click", function () {

            /* Check if all fields are filled */

            if (
                foodName.value.trim() === "" ||
                storageType.value === "" ||
                foodCondition.value === ""
            ) {

                alert("Please fill in all food information!");

                return;
            }


            /* Temporary prediction logic */

            let days = 5;


            if (foodCondition.value === "fresh") {
                days = 7;
            }

            else if (foodCondition.value === "good") {
                days = 4;
            }

            else if (foodCondition.value === "near") {
                days = 2;
            }


            /* Storage adjustment */

            if (storageType.value === "refrigerator") {
                days += 3;
            }

            else if (storageType.value === "freezer") {
                days += 10;
            }


            /* Display prediction */

            predictionTitle.textContent =
                foodName.value + " Shelf Life";

            predictionDays.textContent =
                days + " Days";

            predictionText.textContent =
                "Estimated remaining shelf life based on the selected condition and storage method.";

        });

    }

});