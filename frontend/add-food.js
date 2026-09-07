/**
 * FreshCheck - Add Food Controller
 * Orchestrates image file uploads, prediction calls (/predict),
 * and record persistence (/api/food).
 */

document.addEventListener("DOMContentLoaded", () => {
    const fileInput = document.getElementById("fileInput");
    const dropArea = document.getElementById("dropArea");
    const imagePreviewContainer = document.getElementById("imagePreviewContainer");
    const imagePreview = document.getElementById("imagePreview");
    const fileNameDisplay = document.getElementById("fileNameDisplay");
    const scanButton = document.getElementById("scanButton");
    const purchaseDateInput = document.getElementById("purchaseDate");

    // Initialize purchase date input to today in YYYY-MM-DD
    if (purchaseDateInput && !purchaseDateInput.value) {
        const todayStr = new Date().toISOString().split("T")[0];
        purchaseDateInput.value = todayStr;
    }

    // Drag & Drop handlers
    if (dropArea && fileInput) {
        ["dragenter", "dragover"].forEach(eventName => {
            dropArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropArea.classList.add("highlight");
            });
        });

        ["dragleave", "drop"].forEach(eventName => {
            dropArea.addEventListener(eventName, (e) => {
                e.preventDefault();
                e.stopPropagation();
                dropArea.classList.remove("highlight");
            });
        });

        dropArea.addEventListener("drop", (e) => {
            const dt = e.dataTransfer;
            if (dt && dt.files && dt.files.length > 0) {
                fileInput.files = dt.files;
                handleFileSelection(dt.files[0]);
            }
        });

        dropArea.addEventListener("click", () => {
            fileInput.click();
        });
    }

    if (fileInput) {
        fileInput.addEventListener("change", (e) => {
            if (e.target.files && e.target.files.length > 0) {
                handleFileSelection(e.target.files[0]);
            }
        });
    }

    if (scanButton) {
        scanButton.addEventListener("click", handleAddFoodProcess);
    }
});

function handleFileSelection(file) {
    const imagePreviewContainer = document.getElementById("imagePreviewContainer");
    const imagePreview = document.getElementById("imagePreview");
    const fileNameDisplay = document.getElementById("fileNameDisplay");

    if (file) {
        const reader = new FileReader();
        reader.onload = function (e) {
            if (imagePreview) imagePreview.src = e.target.result;
            if (fileNameDisplay) fileNameDisplay.innerText = file.name;
            if (imagePreviewContainer) imagePreviewContainer.classList.remove("hidden");
        };
        reader.readAsDataURL(file);
    }
}

async function handleAddFoodProcess(e) {
    if (e) e.preventDefault();

    const foodNameInput = document.getElementById("foodName");
    const foodCategorySelect = document.getElementById("foodCategory");
    const purchaseDateInput = document.getElementById("purchaseDate");
    const fileInput = document.getElementById("fileInput");
    const scanButton = document.getElementById("scanButton");

    const aiResultContainer = document.getElementById("aiResult");
    const aiPredictionText = document.getElementById("aiPredictionText");
    const aiConfidenceText = document.getElementById("aiConfidenceText");

    const foodName = foodNameInput ? foodNameInput.value.trim() : "";
    const category = foodCategorySelect ? foodCategorySelect.value : "General";
    const scannedDate = purchaseDateInput ? purchaseDateInput.value : new Date().toISOString().split("T")[0];

    if (!foodName) {
        alert("Please enter a food name.");
        if (foodNameInput) foodNameInput.focus();
        return;
    }

    if (!fileInput || !fileInput.files || fileInput.files.length === 0) {
        alert("Please select or upload a food image first.");
        return;
    }

    const selectedFile = fileInput.files[0];
    const originalButtonText = scanButton ? scanButton.innerHTML : "Run AI Scan & Save";

    if (scanButton) {
        scanButton.disabled = true;
        scanButton.innerHTML = "<span>Analyzing & Saving...</span>";
    }

    try {
        // STEP 1: AI Prediction Request
        const formData = new FormData();
        formData.append("image", selectedFile);
        formData.append("food_name", foodName);
        formData.append("category", category);

        const predictResponse = await fetch("http://127.0.0.1:5000/predict", {
            method: "POST",
            body: formData
        });

        if (!predictResponse.ok) {
            const errData = await predictResponse.json().catch(() => ({}));
            throw new Error(errData.error || `AI Scan failed with status ${predictResponse.status}`);
        }

        const aiData = await predictResponse.json();

        const predictedStatus = aiData.status || "Fresh";
        const shelfLifeDays = parseInt(aiData.shelf_life_days, 10) || 5;

        let rawConf = aiData.confidence !== undefined ? aiData.confidence : (aiData.ai_confidence !== undefined ? aiData.ai_confidence : 0.95);
        let confNum = parseFloat(rawConf);
        if (confNum > 1.0) {
            confNum = confNum / 100.0;
        } else if (isNaN(confNum) || confNum <= 0) {
            confNum = 0.95;
        }

        const displayConfPct = `${Math.round(confNum * 100)}%`;

        if (aiPredictionText) {
            aiPredictionText.innerText = `Prediction: ${predictedStatus}`;
        }
        if (aiConfidenceText) {
            aiConfidenceText.innerText = `Confidence: ${displayConfPct}`;
        }
        if (aiResultContainer) {
            aiResultContainer.style.display = "flex";
            aiResultContainer.classList.remove("hidden");
        }

        // STEP 2: Database Save Request
        const foodPayload = {
            food_name: foodName,
            category: category,
            scanned_date: scannedDate,
            expiry_date: "",
            shelf_life_days: shelfLifeDays,
            status: predictedStatus,
            ai_confidence: confNum
        };

        const saveResponse = await fetch("http://127.0.0.1:5000/api/food", {
            method: "POST",
            headers: {
                "Content-Type": "application/json"
            },
            body: JSON.stringify(foodPayload)
        });

        if (!saveResponse.ok) {
            const saveErr = await saveResponse.json().catch(() => ({}));
            throw new Error(saveErr.error || saveErr.message || "Failed to save food record to database.");
        }

        alert("Food item successfully scanned and saved to database!");
        window.location.href = "Dashboard.html";

    } catch (error) {
        console.error("Add Food process error:", error);
        alert(`Error: ${error.message}`);
    } finally {
        if (scanButton) {
            scanButton.disabled = false;
            scanButton.innerHTML = originalButtonText;
        }
    }
}