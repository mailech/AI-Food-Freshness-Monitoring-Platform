/**
 * FreshCheck - Add Food Controller
 * Fixed duplicate variable declarations & improved UI state handle.
 */

document.addEventListener("DOMContentLoaded", () => {
    const fileInput = document.getElementById("fileInput");
    const dropArea = document.getElementById("dropArea");
    const scanButton = document.getElementById("scanButton");
    const purchaseDateInput = document.getElementById("purchaseDate");

    // Set today's date by default
    if (purchaseDateInput && !purchaseDateInput.value) {
        const todayStr = new Date().toISOString().split("T")[0];
        purchaseDateInput.value = todayStr;
    }

    // Drag and Drop Handling
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

        dropArea.addEventListener("click", (e) => {
            if (e.target !== fileInput) {
                fileInput.click();
            }
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

    const token = localStorage.getItem("freshcheck_token");

    if (!token) {
        alert("Session expired or token missing. Please log in again.");
        window.location.href = "signin.html";
        return;
    }

    const foodNameInput = document.getElementById("foodName");
    const foodCategorySelect = document.getElementById("foodCategory");
    const purchaseDateInput = document.getElementById("purchaseDate");
    const expiryDateInput = document.getElementById("expiryDate");
    const fileInput = document.getElementById("fileInput");
    const scanButton = document.getElementById("scanButton");
    const aiResultContainer = document.getElementById("aiResult");

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
    const originalButtonText = scanButton ? scanButton.innerHTML : '<i class="fa-solid fa-robot"></i> Run AI Scan & Save';

    if (scanButton) {
        scanButton.disabled = true;
        scanButton.innerHTML = "<span>Analyzing & Saving...</span>";
    }

    try {
        const formData = new FormData();
        formData.append("image", selectedFile);
        formData.append("food_name", foodName);
        formData.append("category", category);

        // 1. AI Predict Endpoint
        const predictResponse = await fetch("http://127.0.0.1:5000/predict", {
            method: "POST",
            headers: {
                "Authorization": `Bearer ${token}`
            },
            body: formData
        });

        if (predictResponse.status === 401) {
            alert("Session expired! Please log in again.");
            localStorage.removeItem("freshcheck_token");
            window.location.href = "signin.html";
            return;
        }

        if (!predictResponse.ok) {
            const errData = await predictResponse.json().catch(() => ({}));
            throw new Error(errData.message || errData.error || `AI Scan failed (${predictResponse.status})`);
        }

        const aiData = await predictResponse.json();

        // Extracted data from AI response
        const currentStatus = aiData.status || (aiData.freshness_score < 50 ? "Spoiled" : "Fresh");
        const freshnessScore = aiData.freshness_score !== undefined ? aiData.freshness_score : (aiData.ai_confidence || 95);
        const spoilageScore = aiData.spoilage_score !== undefined ? aiData.spoilage_score : Math.round(100 - freshnessScore);
        const recommendedTemp = aiData.recommended_temp || "1°C – 5°C";
        const storageAdvice = aiData.storage_advice || "Store in a cool place.";
        const shelfLifeDays = parseInt(aiData.shelf_life_days, 10) || 5;

        // Render AI UI Result Card
        if (aiResultContainer) {
            const statusColor = currentStatus === "Fresh" ? "#22c55e" : "#ef4444";
            aiResultContainer.innerHTML = `
                <h3 style="color: ${statusColor}; font-size: 1.05rem; margin-bottom: 10px;">
                    <i class="fa-solid fa-robot"></i> AI Scan Result
                </h3>
                <p><strong>Status:</strong> <span style="color: ${statusColor}; font-weight: 600;">${currentStatus}</span></p>
                <p><strong>Fresh Score:</strong> ${freshnessScore}%</p>
                <p><strong>Spoiled Score:</strong> ${spoilageScore}%</p>
                <p><strong>Recommended Temp:</strong> ${recommendedTemp}</p>
                <p><strong>Storage Advice:</strong> ${storageAdvice}</p>
            `;
            aiResultContainer.style.display = "block";
            aiResultContainer.classList.remove("hidden");
        }

        // 2. Database Save Payload
        let confNum = parseFloat(aiData.confidence || (freshnessScore / 100.0));
        if (confNum > 1.0) confNum = confNum / 100.0;

        const foodPayload = {
            food_name: foodName,
            category: category,
            scanned_date: scannedDate,
            expiry_date: expiryDateInput ? expiryDateInput.value : "",
            shelf_life_days: currentStatus === "Spoiled" ? 0 : shelfLifeDays,
            status: currentStatus,
            ai_confidence: confNum
        };

        const saveResponse = await fetch("http://127.0.0.1:5000/api/food", {
            method: "POST",
            headers: {
                "Content-Type": "application/json",
                "Authorization": `Bearer ${token}`
            },
            body: JSON.stringify(foodPayload)
        });

        if (!saveResponse.ok) {
            const saveErr = await saveResponse.json().catch(() => ({}));
            throw new Error(saveErr.error || saveErr.message || "Failed to save food record to database.");
        }

        alert("Food item successfully scanned and saved to database!");

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