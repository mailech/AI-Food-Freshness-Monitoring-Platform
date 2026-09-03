// =========================================
// FOOD INVENTORY MANAGEMENT
// WITH LOCAL STORAGE
// =========================================


// =========================================
// LOAD INVENTORY
// =========================================

let inventory =
    JSON.parse(
        localStorage.getItem("foodInventory")
    ) || [

        {
            id: 1,
            name: "Apple",
            category: "Fruits",
            batch: "A101",
            expiry: "2026-08-22",
            quantity: 20,
            freshness: 92
        },

        {
            id: 2,
            name: "Milk",
            category: "Dairy Products",
            batch: "M202",
            expiry: "2026-08-18",
            quantity: 15,
            freshness: 68
        },

        {
            id: 3,
            name: "Tomato",
            category: "Vegetables",
            batch: "T301",
            expiry: "2026-08-17",
            quantity: 30,
            freshness: 42
        },

        {
            id: 4,
            name: "Bread",
            category: "Bakery Products",
            batch: "B401",
            expiry: "2026-08-25",
            quantity: 12,
            freshness: 85
        },

        {
            id: 5,
            name: "Chicken",
            category: "Meat & Poultry",
            batch: "C501",
            expiry: "2026-08-20",
            quantity: 10,
            freshness: 78
        }

    ];


// =========================================
// SAVE INVENTORY
// =========================================

function saveInventory() {

    localStorage.setItem(
        "foodInventory",
        JSON.stringify(inventory)
    );

}


// =========================================
// DISPLAY INVENTORY
// =========================================

function displayInventory() {

    const table =
        document.getElementById(
            "inventoryTable"
        );

    table.innerHTML = "";


    const search =
        document.getElementById(
            "searchInput"
        ).value.toLowerCase();


    const category =
        document.getElementById(
            "categoryFilter"
        ).value;


    const filteredInventory =
        inventory.filter(item => {

            const matchesSearch =
                item.name
                    .toLowerCase()
                    .includes(search);


            const matchesCategory =
                category === "all" ||
                item.category === category;


            return (
                matchesSearch &&
                matchesCategory
            );

        });


    if (filteredInventory.length === 0) {

        table.innerHTML = `

            <tr>

                <td colspan="8"
                    style="
                    text-align:center;
                    padding:30px;
                    ">

                    No food items found.

                </td>

            </tr>

        `;

    }


    filteredInventory.forEach(item => {

        const status =
            getFreshnessStatus(
                item.freshness
            );


        const expiryStatus =
            getExpiryStatus(
                item.expiry
            );


        const row =
            document.createElement("tr");


        row.innerHTML = `

            <td>
                <strong>
                    ${item.name}
                </strong>
            </td>

            <td>
                ${item.category}
            </td>

            <td>
                ${item.batch}
            </td>

            <td>
                ${item.expiry}
            </td>

            <td>
                ${item.quantity}
            </td>

            <td>
                ${item.freshness}%
            </td>

            <td>

                <span class="status ${status.className}">

                    ${expiryStatus}

                </span>

            </td>

            <td>

                <button
                    onclick="deleteItem(${item.id})"
                    style="
                    border:none;
                    background:#f8d7da;
                    color:#842029;
                    padding:7px 10px;
                    border-radius:6px;
                    cursor:pointer;
                    "
                >

                    Delete

                </button>

            </td>

        `;


        table.appendChild(row);

    });


    updateStatistics();

}


// =========================================
// FRESHNESS STATUS
// =========================================

function getFreshnessStatus(score) {

    if (score >= 90) {

        return {
            name: "Fresh",
            className: "fresh"
        };

    }


    if (score >= 75) {

        return {
            name: "Good",
            className: "good"
        };

    }


    if (score >= 50) {

        return {
            name: "Acceptable",
            className: "warning"
        };

    }


    return {
        name: "Near Spoilage",
        className: "danger"
    };

}


// =========================================
// EXPIRY STATUS
// =========================================

function getExpiryStatus(expiryDate) {

    const today =
        new Date();


    today.setHours(
        0,
        0,
        0,
        0
    );


    const expiry =
        new Date(expiryDate);


    const difference =
        expiry - today;


    const days =
        Math.ceil(
            difference /
            (1000 * 60 * 60 * 24)
        );


    if (days < 0) {

        return "Expired";

    }


    if (days <= 2) {

        return "Expiring Soon";

    }


    return "Active";

}


// =========================================
// ADD FOOD
// =========================================

const inventoryForm =
    document.getElementById(
        "inventoryForm"
    );


inventoryForm.addEventListener(
    "submit",
    function(event) {

        event.preventDefault();


        const name =
            document.getElementById(
                "foodName"
            ).value.trim();


        const category =
            document.getElementById(
                "foodCategory"
            ).value;


        const batch =
            document.getElementById(
                "batchNumber"
            ).value.trim();


        const expiry =
            document.getElementById(
                "expiryDate"
            ).value;


        const freshness =
            Number(
                document.getElementById(
                    "freshnessScore"
                ).value
            );


        const quantity =
            Number(
                document.getElementById(
                    "quantity"
                ).value
            );


        const newItem = {

            id: Date.now(),

            name: name,

            category: category,

            batch: batch,

            expiry: expiry,

            quantity: quantity,

            freshness: freshness

        };


        inventory.push(
            newItem
        );


        saveInventory();


        inventoryForm.reset();


        displayInventory();


        alert(
            "Food item saved successfully!"
        );

    }
);


// =========================================
// DELETE FOOD
// =========================================

function deleteItem(id) {

    const confirmation =
        confirm(
            "Are you sure you want to delete this food item?"
        );


    if (!confirmation) {

        return;

    }


    inventory =
        inventory.filter(
            item => item.id !== id
        );


    saveInventory();


    displayInventory();

}


// =========================================
// STATISTICS
// =========================================

function updateStatistics() {

    const total =
        inventory.length;


    const fresh =
        inventory.filter(
            item =>
                item.freshness >= 75
        ).length;


    const expiring =
        inventory.filter(
            item =>
                getExpiryStatus(
                    item.expiry
                ) === "Expiring Soon"
        ).length;


    const spoiled =
        inventory.filter(
            item =>
                item.freshness < 25
        ).length;


    document.getElementById(
        "totalInventory"
    ).textContent = total;


    document.getElementById(
        "freshInventory"
    ).textContent = fresh;


    document.getElementById(
        "expiringInventory"
    ).textContent = expiring;


    document.getElementById(
        "spoiledInventory"
    ).textContent = spoiled;

}


// =========================================
// SEARCH
// =========================================

document.getElementById(
    "searchInput"
).addEventListener(
    "input",
    displayInventory
);


// =========================================
// CATEGORY FILTER
// =========================================

document.getElementById(
    "categoryFilter"
).addEventListener(
    "change",
    displayInventory
);


// =========================================
// INITIAL DISPLAY
// =========================================

displayInventory();