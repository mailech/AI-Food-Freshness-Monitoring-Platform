// =========================================
// SMART ALERT SYSTEM
// =========================================

let allAlerts = [];


let dismissedAlerts =
    JSON.parse(
        localStorage.getItem(
            "dismissedAlerts"
        ) || "[]"
    );


const alertList =
    document.getElementById(
        "alertList"
    );


const alertFilter =
    document.getElementById(
        "alertFilter"
    );


const clearAlertsButton =
    document.getElementById(
        "clearAlerts"
    );


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
// GENERATE ALERTS
// =========================================

function generateAlerts() {

    const inventory =
        getInventory();


    allAlerts = [];


    const today =
        new Date();


    today.setHours(
        0,
        0,
        0,
        0
    );


    inventory.forEach(
        function (item) {

            const freshness =
                Number(
                    item.freshness || 0
                );


            const expiry =
                item.expiry
                    ? new Date(
                        item.expiry +
                        "T00:00:00"
                    )
                    : null;


            const keyBase =
                String(item.id);


            // Spoilage

            if (freshness < 50) {

                allAlerts.push({

                    key:
                        keyBase +
                        "-spoilage",

                    type:
                        "critical",

                    icon:
                        "🔴",

                    title:
                        "Spoilage Risk",

                    message:
                        item.name +
                        " has a freshness score of " +
                        freshness +
                        "%."

                });

            }


            // Expiry

            if (expiry) {

                const days =
                    Math.ceil(
                        (
                            expiry -
                            today
                        ) / 86400000
                    );


                if (
                    days >= 0 &&
                    days <= 2
                ) {

                    allAlerts.push({

                        key:
                            keyBase +
                            "-expiry",

                        type:
                            "warning",

                        icon:
                            "⚠️",

                        title:
                            "Expiring Soon",

                        message:
                            item.name +
                            " expires in " +
                            days +
                            " day(s)."

                    });

                }


                if (days < 0) {

                    allAlerts.push({

                        key:
                            keyBase +
                            "-expired",

                        type:
                            "critical",

                        icon:
                            "❌",

                        title:
                            "Expired Food",

                        message:
                            item.name +
                            " has expired."

                    });

                }

            }

        }
    );


    // Remove dismissed alerts

    allAlerts =
        allAlerts.filter(
            alert =>
                !dismissedAlerts.includes(
                    alert.key
                )
        );


    updateSummary(
        allAlerts
    );


    renderAlerts();

}


// =========================================
// UPDATE SUMMARY
// =========================================

function updateSummary(
    alerts
) {

    setText(
        "totalAlerts",
        alerts.length
    );


    setText(
        "criticalAlerts",
        alerts.filter(
            alert =>
                alert.type === "critical"
        ).length
    );


    setText(
        "warningAlerts",
        alerts.filter(
            alert =>
                alert.type === "warning"
        ).length
    );


    setText(
        "infoAlerts",
        alerts.filter(
            alert =>
                alert.type === "info"
        ).length
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
// DISPLAY ALERTS
// =========================================

function renderAlerts() {

    if (!alertList) {

        return;

    }


    const filter =
        alertFilter
            ? alertFilter.value
            : "all";


    const filtered =
        filter === "all"
            ? allAlerts
            : allAlerts.filter(
                alert =>
                    alert.type === filter
            );


    if (!filtered.length) {

        alertList.innerHTML =
            `
            <div
                class="card"
                style="
                    box-shadow:none;
                    border:1px solid #eee;
                "
            >

                <h3>
                    ✅ No Active Alerts
                </h3>

                <p style="
                    margin-top:8px;
                    color:#777;
                ">
                    Your food inventory is
                    currently within acceptable
                    conditions.
                </p>

            </div>
            `;

        return;

    }


    alertList.innerHTML = "";


    filtered.forEach(
        function (alert) {

            const element =
                document.createElement(
                    "div"
                );


            element.className =
                "alert-card " +
                alert.type;


            element.innerHTML =
                `
                <div class="alert-icon">
                    ${alert.icon}
                </div>

                <div>

                    <h3>
                        ${escapeHtml(
                            alert.title
                        )}
                    </h3>

                    <p>
                        ${escapeHtml(
                            alert.message
                        )}
                    </p>

                </div>
                `;


            alertList.appendChild(
                element
            );

        }
    );

}


// =========================================
// FILTER
// =========================================

if (alertFilter) {

    alertFilter.addEventListener(
        "change",
        renderAlerts
    );

}


// =========================================
// CLEAR ALERTS
// =========================================

if (clearAlertsButton) {

    clearAlertsButton.addEventListener(
        "click",
        function () {

            const keys =
                allAlerts.map(
                    alert =>
                        alert.key
                );


            dismissedAlerts =
                Array.from(
                    new Set(
                        dismissedAlerts.concat(
                            keys
                        )
                    )
                );


            localStorage.setItem(
                "dismissedAlerts",
                JSON.stringify(
                    dismissedAlerts
                )
            );


            allAlerts = [];


            updateSummary(
                []
            );


            renderAlerts();

        }
    );

}


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

generateAlerts();