// =========================================
// AUTHENTICATION PROTECTION
// =========================================

(function () {

    const isLoggedIn =
        localStorage.getItem("isLoggedIn");

    // Protect application pages
    if (isLoggedIn !== "true") {

        window.location.replace("index.html");

        return;
    }


    // =========================================
    // GET LOGGED-IN USER
    // =========================================

    const loggedUser =
        JSON.parse(
            localStorage.getItem("loggedInUser") || "null"
        );


    const userName =
        document.getElementById("loggedUserName");


    const profileCircle =
        document.getElementById("profileCircle");


    if (loggedUser) {

        if (userName) {

            userName.textContent =
                loggedUser.name;

        }


        if (profileCircle) {

            profileCircle.textContent =
                loggedUser.name
                    ? loggedUser.name
                        .charAt(0)
                        .toUpperCase()
                    : "U";

        }

    }


    // =========================================
    // LOGOUT
    // =========================================

    document
        .querySelectorAll("#logoutBtn")
        .forEach(function (button) {

            button.addEventListener(
                "click",
                function (event) {

                    event.preventDefault();


                    localStorage.removeItem(
                        "isLoggedIn"
                    );


                    localStorage.removeItem(
                        "loggedInUser"
                    );


                    window.location.replace(
                        "index.html"
                    );

                }
            );

        });

})();