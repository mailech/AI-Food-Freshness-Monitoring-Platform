// =====================================================
// FOOD FRESHNESS ANALYSIS
// FRONTEND VERSION
// =====================================================


// =====================================================
// GET HTML ELEMENTS
// =====================================================

const foodImage =
    document.getElementById("foodImage");

const imagePreview =
    document.getElementById("imagePreview");

const imagePreviewContainer =
    document.getElementById(
        "imagePreviewContainer"
    );

const removeImageBtn =
    document.getElementById(
        "removeImageBtn"
    );

const analyzeBtn =
    document.getElementById(
        "analyzeBtn"
    );

const foodName =
    document.getElementById(
        "foodName"
    );

const foodCategory =
    document.getElementById(
        "foodCategory"
    );

const analysisResult =
    document.getElementById(
        "analysisResult"
    );

const addAnalysisToInventory =
    document.getElementById(
        "addAnalysisToInventory"
    );

const message =
    document.getElementById(
        "message"
    );


// =====================================================
// VARIABLES
// =====================================================

let selectedImageData = null;

let currentAnalysis = null;


// =====================================================
// IMAGE UPLOAD
// =====================================================

foodImage.addEventListener(
    "change",
    function () {

        const file =
            foodImage.files[0];


        // No file selected

        if (!file) {

            return;

        }


        // =================================================
        // CHECK FILE TYPE
        // =================================================

        if (
            !file.type.startsWith("image/")
        ) {

            showMessage(
                "Please select a valid image file.",
                "error"
            );

            foodImage.value = "";

            return;

        }


        // =================================================
        // CHECK FILE SIZE
        // =================================================

        if (
            file.size > 10 * 1024 * 1024
        ) {

            showMessage(
                "Image must be smaller than 10 MB.",
                "error"
            );

            foodImage.value = "";

            return;

        }


        // =================================================
        // SHOW IMAGE PREVIEW
        // =================================================

        const reader =
            new FileReader();


        reader.onload =
            function (event) {

                imagePreview.src =
                    event.target.result;

                imagePreviewContainer.style.display =
                    "block";

            };


        reader.readAsDataURL(file);


        // =================================================
        // COMPRESS IMAGE FOR STORAGE
        // =================================================

        compressImage(
            file,
            function (compressedImage) {

                selectedImageData =
                    compressedImage;


                showMessage(
                    "Image selected successfully!",
                    "success"
                );

            }
        );


        // Remove previous result

        currentAnalysis = null;

        addAnalysisToInventory.style.display =
            "none";

    }
);


// =====================================================
// REMOVE IMAGE
// =====================================================

removeImageBtn.addEventListener(
    "click",
    function () {

        foodImage.value = "";

        imagePreview.src = "";

        imagePreviewContainer.style.display =
            "none";

        selectedImageData = null;

        currentAnalysis = null;

        addAnalysisToInventory.style.display =
            "none";

        analysisResult.innerHTML = `

            <div class="empty-result">

                <div style="font-size:45px;">
                    🍎
                </div>

                <p>
                    Upload an image and click
                    "Analyze Freshness".
                </p>

            </div>

        `;

        hideMessage();

    }
);


// =====================================================
// COMPRESS IMAGE
// =====================================================

function compressImage(
    file,
    callback
) {

    const reader =
        new FileReader();


    reader.onload =
        function (event) {

            const img =
                new Image();


            img.onload =
                function () {

                    const canvas =
                        document.createElement(
                            "canvas"
                        );


                    const maxWidth = 600;

                    const maxHeight = 600;


                    let width =
                        img.width;

                    let height =
                        img.height;


                    // -----------------------------------------
                    // Resize width
                    // -----------------------------------------

                    if (
                        width > maxWidth
                    ) {

                        height =
                            height *
                            (maxWidth / width);

                        width =
                            maxWidth;

                    }


                    // -----------------------------------------
                    // Resize height
                    // -----------------------------------------

                    if (
                        height > maxHeight
                    ) {

                        width =
                            width *
                            (maxHeight / height);

                        height =
                            maxHeight;

                    }


                    canvas.width =
                        width;

                    canvas.height =
                        height;


                    const context =
                        canvas.getContext(
                            "2d"
                        );


                    context.drawImage(
                        img,
                        0,
                        0,
                        width,
                        height
                    );


                    // -----------------------------------------
                    // Convert to JPEG
                    // -----------------------------------------

                    const compressedImage =
                        canvas.toDataURL(
                            "image/jpeg",
                            0.70
                        );


                    callback(
                        compressedImage
                    );

                };


            img.onerror =
                function () {

                    showMessage(
                        "Could not read this image.",
                        "error"
                    );

                };


            img.src =
                event.target.result;

        };


    reader.onerror =
        function () {

            showMessage(
                "Could not load the selected image.",
                "error"
            );

        };


    reader.readAsDataURL(file);

}


// =====================================================
// ANALYZE BUTTON
// =====================================================

analyzeBtn.addEventListener(
    "click",
    function () {

        analyzeFood();

    }
);


// =====================================================
// ANALYZE FOOD
// =====================================================

function analyzeFood() {


    // =================================================
    // CHECK IMAGE
    // =================================================

    if (
        !selectedImageData
    ) {

        showMessage(
            "Please choose a food image first.",
            "error"
        );

        return;

    }


    // =================================================
    // CHECK FOOD NAME
    // =================================================

    const name =
        foodName.value.trim();


    if (!name) {

        showMessage(
            "Please enter the food name.",
            "error"
        );

        foodName.focus();

        return;

    }


    // =================================================
    // CHECK CATEGORY
    // =================================================

    const category =
        foodCategory.value;


    if (!category) {

        showMessage(
            "Please select the food category.",
            "error"
        );

        foodCategory.focus();

        return;

    }


    // =================================================
    // DISABLE BUTTON
    // =================================================

    analyzeBtn.disabled =
        true;


    analyzeBtn.textContent =
        "🤖 Analyzing...";


    addAnalysisToInventory.style.display =
        "none";


    hideMessage();


    // =================================================
    // SHOW LOADING
    // =================================================

    analysisResult.innerHTML = `

        <div class="loading">

            <div class="loading-icon">
                🤖
            </div>

            <h3>
                Analyzing Food Image...
            </h3>

            <p>
                Checking freshness indicators.
            </p>

        </div>

    `;


    // =================================================
    // FRONTEND AI SIMULATION
    // =================================================
    // Later this section can be replaced with
    // a real Python/FastAPI AI model.
    // =================================================

    setTimeout(
        function () {

            generateAnalysis(
                name,
                category
            );


            analyzeBtn.disabled =
                false;


            analyzeBtn.textContent =
                "🤖 Analyze Freshness";

        },
        1500
    );

}


// =====================================================
// GENERATE FRONTEND ANALYSIS
// =====================================================

function generateAnalysis(
    name,
    category
) {


    // =================================================
    // GENERATE FRESHNESS SCORE
    // =================================================

    const freshness =
        Math.floor(
            Math.random() * 26
        ) + 70;


    let status;

    let shelfLife;

    let recommendation;


    // =================================================
    // CLASSIFICATION
    // =================================================

    if (
        freshness >= 90
    ) {

        status =
            "Fresh";

        shelfLife =
            6;

        recommendation =
            "The food appears fresh. Continue storing it under suitable conditions and consume before the estimated expiry date.";

    }

    else if (
        freshness >= 80
    ) {

        status =
            "Good";

        shelfLife =
            4;

        recommendation =
            "The food appears to be in good condition. Maintain proper storage and consume within the estimated shelf life.";

    }

    else {

        status =
            "Acceptable";

        shelfLife =
            2;

        recommendation =
            "The food may be losing freshness. Monitor it carefully and consider consuming it soon.";

    }


    // =================================================
    // EXPIRY DATE
    // =================================================

    const expiryDate =
        new Date();


    expiryDate.setDate(
        expiryDate.getDate() +
        shelfLife
    );


    const expiry =
        expiryDate
            .toISOString()
            .split("T")[0];


    // =================================================
    // CREATE ANALYSIS OBJECT
    // =================================================

    currentAnalysis = {

        id:
            Date.now(),

        name:
            name,

        category:
            category,

        freshness:
            freshness,

        status:
            status,

        shelfLife:
            shelfLife,

        expiry:
            expiry,

        recommendation:
            recommendation,

        imageData:
            selectedImageData,

        analyzedAt:
            new Date().toISOString()

    };


    // =================================================
    // SAVE LAST ANALYSIS
    // =================================================

    try {

        localStorage.setItem(
            "latestAIResult",
            JSON.stringify(
                currentAnalysis
            )
        );

    }

    catch (error) {

        console.error(
            error
        );

    }


    // =================================================
    // DISPLAY RESULT
    // =================================================

    displayResult();

}


// =====================================================
// DISPLAY RESULT
// =====================================================

function displayResult() {


    if (
        !currentAnalysis
    ) {

        return;

    }


    const result =
        currentAnalysis;


    let statusClass =
        "status-good";


    if (
        result.status === "Fresh"
    ) {

        statusClass =
            "status-fresh";

    }

    else if (
        result.status === "Acceptable"
    ) {

        statusClass =
            "status-warning";

    }


    analysisResult.innerHTML = `

        <!-- FOOD IMAGE -->

        <img
            src="${result.imageData}"
            alt="Analyzed Food"
            class="result-image">


        <!-- FOOD NAME -->

        <h2 class="result-food-name">

            ${escapeHtml(
                result.name
            )}

        </h2>


        <!-- CATEGORY -->

        <p class="result-category">

            ${escapeHtml(
                result.category
            )}

        </p>


        <!-- SCORE -->

        <div class="score-section">

            <div>
                Freshness Score
            </div>

            <div class="score">

                ${result.freshness}%

            </div>


            <span
                class="status ${statusClass}">

                ${result.status}

            </span>

        </div>


        <!-- DETAILS -->

        <div class="details-grid">


            <div class="detail-box">

                <span>
                    Estimated Shelf Life
                </span>

                <strong>
                    ${result.shelfLife} days
                </strong>

            </div>


            <div class="detail-box">

                <span>
                    Estimated Expiry
                </span>

                <strong>
                    ${result.expiry}
                </strong>

            </div>


        </div>


        <!-- RECOMMENDATION -->

        <div class="recommendation">

            <h3>
                🤖 AI Recommendation
            </h3>

            <p>
                ${escapeHtml(
                    result.recommendation
                )}
            </p>

        </div>

    `;


    // =================================================
    // SHOW ADD BUTTON
    // =================================================

    addAnalysisToInventory.style.display =
        "block";

}


// =====================================================
// ADD TO INVENTORY
// =====================================================

addAnalysisToInventory.addEventListener(
    "click",
    function () {

        addToInventory();

    }
);


// =====================================================
// ADD FOOD TO INVENTORY
// =====================================================

function addToInventory() {


    if (
        !currentAnalysis
    ) {

        showMessage(
            "Please analyze the food first.",
            "error"
        );

        return;

    }


    if (
        !currentAnalysis.imageData
    ) {

        showMessage(
            "Food image is missing. Please select the image again.",
            "error"
        );

        return;

    }


    // =================================================
    // GET OLD INVENTORY
    // =================================================

    let inventory = [];


    try {

        inventory =
            JSON.parse(
                localStorage.getItem(
                    "foodInventory"
                ) || "[]"
            );

    }

    catch (error) {

        inventory = [];

    }


    // =================================================
    // CREATE INVENTORY ITEM
    // =================================================

    const item = {

        id:
            Date.now(),

        name:
            currentAnalysis.name,

        category:
            currentAnalysis.category,

        freshness:
            currentAnalysis.freshness,

        status:
            currentAnalysis.status,

        shelfLife:
            currentAnalysis.shelfLife,

        expiry:
            currentAnalysis.expiry,

        quantity:
            1,

        batch:
            "AI-" +
            Date.now(),

        recommendation:
            currentAnalysis.recommendation,

        // ⭐ THIS IS THE IMAGE
        imageData:
            currentAnalysis.imageData,

        analyzedAt:
            currentAnalysis.analyzedAt

    };


    // =================================================
    // ADD ITEM
    // =================================================

    inventory.push(
        item
    );


    // =================================================
    // SAVE INVENTORY
    // =================================================

    try {

        localStorage.setItem(
            "foodInventory",
            JSON.stringify(
                inventory
            )
        );

    }

    catch (error) {

        console.error(
            error
        );


        showMessage(
            "Could not save the image. Please choose a smaller image.",
            "error"
        );

        return;

    }


    // =================================================
    // SUCCESS
    // =================================================

    showMessage(
        "Food and image successfully added to inventory!",
        "success"
    );


    addAnalysisToInventory.style.display =
        "none";


    // =================================================
    // REDIRECT TO INVENTORY AFTER 1.5 SEC
    // =================================================

    setTimeout(
        function () {

            window.location.href =
                "inventory.html";

        },
        1500
    );

}


// =====================================================
// SHOW MESSAGE
// =====================================================

function showMessage(
    text,
    type
) {

    message.textContent =
        text;


    message.className =
        "message " +
        type;

}


// =====================================================
// HIDE MESSAGE
// =====================================================

function hideMessage() {

    message.textContent =
        "";

    message.className =
        "message";

}


// =====================================================
// ESCAPE HTML
// =====================================================

function escapeHtml(
    value
) {

    return String(
        value ?? ""
    ).replace(
        /[&<>'"]/g,
        function (character) {

            const characters = {

                "&": "&amp;",

                "<": "&lt;",

                ">": "&gt;",

                "'": "&#39;",

                '"': "&quot;"

            };


            return characters[
                character
            ];

        }
    );

}