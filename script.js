// =========================================
// LOGIN AND REGISTRATION
// =========================================
// Frontend demo only.
// Real authentication should be handled by a backend.
// =========================================


const registerForm =
    document.getElementById(
        "registerForm"
    );


const loginForm =
    document.getElementById(
        "loginForm"
    );


// =========================================
// MESSAGE FUNCTION
// =========================================

function showMessage(
    element,
    text,
    type
) {

    if (!element) {
        return;
    }

    element.textContent =
        text;

    element.className =
        "auth-message " + type;

}


// =========================================
// REGISTRATION
// =========================================

if (registerForm) {

    registerForm.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();


            const name =
                document.getElementById(
                    "registerName"
                ).value.trim();


            const email =
                document.getElementById(
                    "registerEmail"
                ).value
                    .trim()
                    .toLowerCase();


            const password =
                document.getElementById(
                    "registerPassword"
                ).value;


            const confirmPassword =
                document.getElementById(
                    "confirmPassword"
                ).value;


            const message =
                document.getElementById(
                    "registerMessage"
                );


            // Name validation

            if (!name) {

                showMessage(
                    message,
                    "Please enter your name.",
                    "error"
                );

                return;
            }


            // Password length

            if (password.length < 6) {

                showMessage(
                    message,
                    "Password must contain at least 6 characters.",
                    "error"
                );

                return;
            }


            // Password match

            if (
                password !==
                confirmPassword
            ) {

                showMessage(
                    message,
                    "Passwords do not match.",
                    "error"
                );

                return;
            }


            // Existing user

            const existingUser =
                JSON.parse(
                    localStorage.getItem(
                        "foodFreshUser"
                    ) || "null"
                );


            if (
                existingUser &&
                existingUser.email === email
            ) {

                showMessage(
                    message,
                    "An account with this email already exists.",
                    "error"
                );

                return;
            }


            // Create user

            const user = {

                name:
                    name,

                email:
                    email,

                password:
                    password

            };


            localStorage.setItem(
                "foodFreshUser",
                JSON.stringify(user)
            );


            showMessage(
                message,
                "Registration successful! Redirecting to login...",
                "success"
            );


            setTimeout(
                function () {

                    window.location.href =
                        "index.html";

                },
                1000
            );

        }
    );

}


// =========================================
// LOGIN
// =========================================

if (loginForm) {

    loginForm.addEventListener(
        "submit",
        function (event) {

            event.preventDefault();


            const email =
                document.getElementById(
                    "loginEmail"
                ).value
                    .trim()
                    .toLowerCase();


            const password =
                document.getElementById(
                    "loginPassword"
                ).value;


            const message =
                document.getElementById(
                    "loginMessage"
                );


            const user =
                JSON.parse(
                    localStorage.getItem(
                        "foodFreshUser"
                    ) || "null"
                );


            // No account

            if (!user) {

                showMessage(
                    message,
                    "No account found. Please register first.",
                    "error"
                );

                return;
            }


            // Login check

            if (
                email !== user.email ||
                password !== user.password
            ) {

                showMessage(
                    message,
                    "Invalid email or password.",
                    "error"
                );

                return;
            }


            // Create session

            localStorage.setItem(
                "isLoggedIn",
                "true"
            );


            localStorage.setItem(
                "loggedInUser",
                JSON.stringify({

                    name:
                        user.name,

                    email:
                        user.email

                })
            );


            showMessage(
                message,
                "Login successful! Redirecting...",
                "success"
            );


            setTimeout(
                function () {

                    window.location.href =
                        "dashboard.html";

                },
                500
            );

        }
    );

}