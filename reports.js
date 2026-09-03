// =========================================
// REPORTS AND ANALYTICS
// =========================================


// =========================================
// GET INVENTORY
// =========================================

function getInventory() {

    return JSON.parse(
        localStorage.getItem(
            "foodInventory"
        ) || "[]"
    );

}


// =========================================
// CHECK EXPIRY
// =========================================

function isExpired(
    dateString
) {

    if (!dateString) {

        return false;

    }


    const today =
        new Date();


    today.setHours(
        0,
        0,
        0,
        0
    );


    return new Date(
        dateString +
        "T00:00:00"
    ) < today;

}


// =========================================
// CALCULATE REPORT
// =========================================

function calculateReport() {

    const inventory =
        getInventory();


    const total =
        inventory.length;


    const fresh =
        inventory.filter(
            item =>
                Number(
                    item.freshness || 0
                ) >= 75
        ).length;


    const risk =
        inventory.filter(
            item =>
                Number(
                    item.freshness || 0
                ) < 50
        ).length;


    const expired =
        inventory.filter(
            item =>
                isExpired(
                    item.expiry
                )
        ).length;


    setText(
        "reportTotal",
        total
    );


    setText(
        "reportFresh",
        fresh
    );


    setText(
        "reportRisk",
        risk
    );


    setText(
        "reportExpired",
        expired
    );

}


// =========================================
// SET TEXT
// =========================================

function setText(
    id,
    value
) {

    const element =
        document.getElementById(
            id
        );


    if (element) {

        element.textContent =
            value;

    }

}


// =========================================
// GENERATE REPORT
// =========================================

function generateReport(
    type
) {

    const inventory =
        getInventory();


    const output =
        document.getElementById(
            "reportResult"
        );


    if (!output) {

        return;

    }


    const total =
        inventory.length;


    const average =
        total
            ? Math.round(
                inventory.reduce(
                    function (
                        sum,
                        item
                    ) {

                        return (
                            sum +
                            Number(
                                item.freshness ||
                                0
                            )
                        );

                    },
                    0
                ) / total
            )
            : 0;


    let content = "";


    // =========================================
    // FRESHNESS
    // =========================================

    if (
        type === "Freshness"
    ) {

        const fresh =
            inventory.filter(
                item =>
                    Number(
                        item.freshness ||
                        0
                    ) >= 75
            ).length;


        content =
            `
            <p>
                Average freshness score:
                <strong>
                    ${average}%
                </strong>
            </p>

            <p>
                Fresh items:
                <strong>
                    ${fresh}
                </strong>
            </p>
            `;

    }


    // =========================================
    // SHELF LIFE
    // =========================================

    else if (
        type === "Shelf-Life"
    ) {

        const itemsWithExpiry =
            inventory.filter(
                item =>
                    item.expiry
            ).length;


        const expired =
            inventory.filter(
                item =>
                    isExpired(
                        item.expiry
                    )
            ).length;


        content =
            `
            <p>
                Items with expiry information:
                <strong>
                    ${itemsWithExpiry}
                </strong>
            </p>

            <p>
                Expired items:
                <strong>
                    ${expired}
                </strong>
            </p>
            `;

    }


    // =========================================
    // INVENTORY QUALITY
    // =========================================

    else if (
        type ===
        "Inventory Quality"
    ) {

        const good =
            inventory.filter(
                item =>
                    Number(
                        item.freshness ||
                        0
                    ) >= 75
            ).length;


        const risk =
            inventory.filter(
                item =>
                    Number(
                        item.freshness ||
                        0
                    ) < 50
            ).length;


        content =
            `
            <p>
                Good-quality items:
                <strong>
                    ${good}
                </strong>
            </p>

            <p>
                High-risk items:
                <strong>
                    ${risk}
                </strong>
            </p>
            `;

    }


    // =========================================
    // WASTE REDUCTION
    // =========================================

    else if (
        type ===
        "Waste Reduction"
    ) {

        const wasteRisk =
            inventory.filter(
                item =>
                    Number(
                        item.freshness ||
                        0
                    ) < 50 ||
                    isExpired(
                        item.expiry
                    )
            ).length;


        content =
            `
            <p>
                Items currently at
                waste/spoilage risk:
                <strong>
                    ${wasteRisk}
                </strong>
            </p>

            <p>
                Consider consuming or
                managing these items first.
            </p>
            `;

    }


    // =========================================
    // STORAGE
    // =========================================

    else if (
        type ===
        "Storage Compliance"
    ) {

        const storage =
            JSON.parse(
                localStorage.getItem(
                    "storageData"
                ) || "null"
            );


        if (storage) {

            content =
                `
                <p>
                    Temperature:
                    <strong>
                        ${storage.temperature}°C
                    </strong>
                </p>

                <p>
                    Humidity:
                    <strong>
                        ${storage.humidity}%
                    </strong>
                </p>

                <p>
                    Condition:
                    <strong>
                        ${escapeHtml(
                            storage.status
                        )}
                    </strong>
                </p>
                `;

        }

        else {

            content =
                `
                <p>
                    No storage reading
                    is available yet.
                </p>

                <p>
                    Go to Storage and check
                    the current condition first.
                </p>
                `;

        }

    }


    output.innerHTML =
        `
        <div class="recommendation">

            <h3>
                📊
                ${escapeHtml(type)}
                Report
            </h3>

            <p>
                Total inventory items:
                <strong>
                    ${total}
                </strong>
            </p>

            ${content}

            <p>
                Generated on:
                <strong>
                    ${new Date().toLocaleString()}
                </strong>
            </p>

        </div>
        `;

}


// =========================================
// REPORT BUTTONS
// =========================================

document
    .querySelectorAll(
        "[data-report]"
    )
    .forEach(
        function (button) {

            button.addEventListener(
                "click",
                function () {

                    generateReport(
                        button.dataset.report
                    );

                }
            );

        }
    );


// =========================================
// HTML SAFETY
// =========================================

function escapeHtml(
    value
) {

    return String(
        value ?? ""
    ).replace(
        /[&<>'"]/g,
        function (char) {

            return {

                "&": "&amp;",
                "<": "&lt;",
                ">": "&gt;",
                "'": "&#39;",
                "\"": "&quot;"

            }[char];

        }
    );

}


// =========================================
// START
// =========================================

calculateReport();