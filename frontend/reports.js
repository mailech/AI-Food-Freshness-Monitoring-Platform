document.addEventListener("DOMContentLoaded", () => {
    initUserProfile();
    fetchReportsData();
});

function initUserProfile() {
    const userName = localStorage.getItem("userName") || "Sayantika Mahanta";
    const userEmail = localStorage.getItem("userEmail") || "sayantikamahanta02@gmail.com";

    const userNameElem = document.getElementById("userName");
    const userContactElem = document.getElementById("userContact");
    const userAvatarElem = document.getElementById("userAvatar");

    // null-check যোগ করা হলো যেন element না থাকলেও JS ক্র্যাশ না করে
    if (userNameElem) userNameElem.innerText = userName;
    if (userContactElem) userContactElem.innerText = userEmail;
    if (userAvatarElem) userAvatarElem.innerText = userName.charAt(0).toUpperCase();
}

async function fetchReportsData() {
    const token = localStorage.getItem("token") || sessionStorage.getItem("token");

    try {
        const response = await fetch("http://127.0.0.1:5000/api/reports", {
            method: "GET",
            headers: {
                "Content-Type": "application/json",
                "Authorization": token ? `Bearer ${token}` : ""
            }
        });

        if (response.ok) {
            const data = await response.json();
            updateReportsUI(data);
        }
    } catch (error) {
        console.warn("Unable to fetch reports data:", error);
    }
}

function updateReportsUI(data) {
    // API response অনুযায়ী metric cards ও table update
    if (data.total_generated !== undefined) {
        const totalElem = document.getElementById("totalGenerated");
        if (totalElem) totalElem.textContent = data.total_generated;
    }
    
    // Available Reports Table Render
    const reportsTableBody = document.getElementById("reportsTableBody");
    if (reportsTableBody && data.reports) {
        reportsTableBody.innerHTML = data.reports.map(report => `
            <tr>
                <td><strong>${report.name}</strong></td>
                <td>${report.category}</td>
                <td>${report.generated_on}</td>
                <td>${report.file_size}</td>
                <td>
                    <a href="${report.download_url}" class="btn-demo" style="text-decoration:none;">
                        <i class="fa-solid fa-download"></i> Download
                    </a>
                </td>
            </tr>
        `).join('');
    }
}