// =========================================
// DASHBOARD
// =========================================

document.addEventListener(
    "DOMContentLoaded",
    function () {

        const inventory =
            JSON.parse(
                localStorage.getItem(
                    "foodInventory"
                ) || "[]"
            );


        // =========================================
        // STATISTICS
        // =========================================

        const total =
            inventory.length;


        const fresh =
            inventory.filter(
                item =>
                    Number(item.freshness) >= 75
            ).length;


        const warning =
            inventory.filter(
                item =>
                    Number(item.freshness) >= 50 &&
                    Number(item.freshness) < 75
            ).length;


        const spoiled =
            inventory.filter(
                item =>
                    Number(item.freshness) < 50 ||
                    isExpired(item.expiry)
            ).length;


        setText(
            "totalItems",
            total
        );


        setText(
            "freshItems",
            fresh
        );


        setText(
            "warningItems",
            warning
        );


        setText(
            "spoiledItems",
            spoiled
        );


        // =========================================
        // OVERALL SCORE
        // =========================================

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
                                    item.freshness || 0
                                )
                            );

                        },
                        0
                    ) / total
                )
                : 0;


        setText(
            "overallScore",
            average + "%"
        );


        const overallStatus =
            document.getElementById(
                "overallStatus"
            );


        if (overallStatus) {

            overallStatus.textContent =
                total
                    ? getHealthLabel(
                        average
                    )
                    : "NO DATA";


            overallStatus.className =
                "status " +
                getStatusClass(
                    average
                );

        }


        renderChart(
            inventory
        );


        renderRecent(
            inventory
        );

    }
);


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


    const expiry =
        new Date(
            dateString +
            "T00:00:00"
        );


    return expiry < today;

}


// =========================================
// HEALTH LABEL
// =========================================

function getHealthLabel(
    score
) {

    if (score >= 75) {

        return "GOOD";

    }


    if (score >= 50) {

        return "WARNING";

    }


    return "CRITICAL";

}


// =========================================
// STATUS CLASS
// =========================================

function getStatusClass(
    score
) {

    if (score >= 75) {

        return "good";

    }


    if (score >= 50) {

        return "warning";

    }


    return "danger";

}


// =========================================
// CHART
// =========================================

function renderChart(
    inventory
) {

    const chart =
        document.getElementById(
            "freshnessChart"
        );


    if (!chart) {

        return;

    }


    chart.innerHTML = "";


    const items =
        inventory.slice(-7);


    if (!items.length) {

        chart.innerHTML =
            `
            <p style="
                text-align:center;
                color:#777;
                width:100%;
            ">
                Add food items to see
                the freshness chart.
            </p>
            `;

        return;

    }


    items.forEach(
        function (item) {

            const wrapper =
                document.createElement(
                    "div"
                );


            wrapper.className =
                "chart-bar-wrapper";


            const bar =
                document.createElement(
                    "div"
                );


            bar.className =
                "bar";


            const score =
                Number(
                    item.freshness || 0
                );


            bar.style.height =
                Math.max(
                    8,
                    Math.min(
                        100,
                        score
                    )
                ) + "%";


            bar.title =
                item.name +
                " - " +
                score +
                "%";


            const label =
                document.createElement(
                    "span"
                );


            label.textContent =
                item.name.length > 7
                    ? item.name.slice(0, 7) + "..."
                    : item.name;


            wrapper.appendChild(
                bar
            );


            wrapper.appendChild(
                label
            );


            chart.appendChild(
                wrapper
            );

        }
    );

}


// =========================================
// RECENT ANALYSIS
// =========================================

function renderRecent(
    inventory
) {

    const table =
        document.getElementById(
            "recentAnalysisTable"
        );


    if (!table) {

        return;

    }


    table.innerHTML = "";


    if (!inventory.length) {

        table.innerHTML =
            `
            <tr>
                <td
                    colspan="5"
                    style="
                    text-align:center;
                    padding:30px;
                    "
                >
                    No food items available.
                    Analyze food to add items.
                </td>
            </tr>
            `;

        return;

    }


    inventory
        .slice(-5)
        .reverse()
        .forEach(
            function (item) {

                const freshness =
                    Number(
                        item.freshness || 0
                    );


                const status =
                    getHealthLabel(
                        freshness
                    );


                const statusClass =
                    getStatusClass(
                        freshness
                    );


                const risk =
                    freshness < 50
                        ? "High"
                        : freshness < 75
                            ? "Medium"
                            : "Low";


                const row =
                    document.createElement(
                        "tr"
                    );


                row.innerHTML =
                    `
                    <td>
                        ${escapeHtml(item.name)}
                    </td>

                    <td>
                        ${escapeHtml(item.category)}
                    </td>

                    <td>
                        ${freshness}%
                    </td>

                    <td>
                        ${risk}
                    </td>

                    <td>
                        <span class="
                            status
                            ${statusClass}
                        ">
                            ${status}
                        </span>
                    </td>
                    `;


                table.appendChild(
                    row
                );

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