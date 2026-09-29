// ============================================================
// StockSense — Authentication & Session Management
// ============================================================

function isTokenExpired(token) {
    try {
        const payload = JSON.parse(atob(token.split('.')[1]));
        if (payload.exp && Date.now() >= payload.exp * 1000) {
            return true;
        }
        return false;
    } catch (e) {
        return true;
    }
}

function getCurrentUser() {
    try {
        const userStr = localStorage.getItem("stocksense_user");
        return userStr ? JSON.parse(userStr) : null;
    } catch (e) {
        return null;
    }
}

function isLoggedIn() {
    const token = localStorage.getItem("stocksense_token");
    if (!token) return false;

    if (isTokenExpired(token)) {
        localStorage.removeItem("stocksense_token");
        localStorage.removeItem("stocksense_user");
        return false;
    }

    return true;
}

function logout() {
    localStorage.removeItem("stocksense_token");
    localStorage.removeItem("stocksense_user");
    window.location.replace("login.html");
}

function requireAuth() {
    if (!isLoggedIn()) {
        const currentPath = window.location.pathname.split("/").pop() || "dashboard.html";
        const search = window.location.search;

        if (currentPath === "login.html" || currentPath === "register.html") {
            return false;
        }

        window.location.replace(`login.html?redirect=${encodeURIComponent(currentPath + search)}`);
        return false;
    }
    return true;
}

// BFCache (back/forward cache) protection
window.addEventListener("pageshow", (event) => {
    const currentPath = window.location.pathname.split("/").pop() || "";
    const isPublicPage = currentPath === "login.html" || currentPath === "register.html" || currentPath === "index.html" || currentPath === "";

    if (!isPublicPage && !isLoggedIn()) {
        requireAuth();
    }
});

// Toast notification helper
function showToast(message, type = "info") {
    let container = document.getElementById("toastContainer");
    if (!container) {
        container = document.createElement("div");
        container.id = "toastContainer";
        container.className = "toast-container";
        document.body.appendChild(container);
    }

    const toast = document.createElement("div");
    toast.className = `toast toast-${type}`;
    toast.innerHTML = `
        <div class="toast-content">${message}</div>
        <button class="toast-close" onclick="this.parentElement.remove()">&times;</button>
    `;
    container.appendChild(toast);

    setTimeout(() => {
        toast.classList.add("toast-fade-out");
        setTimeout(() => toast.remove(), 400);
    }, 4000);
}

// Update Navbar based on user login state
function updateNavbar() {
    const nav = document.querySelector(".navbar nav");
    const user = getCurrentUser();

    if (!nav) return;

    const currentFile = window.location.pathname.split("/").pop() || "dashboard.html";

    let navHtml = "";

    if (user && isLoggedIn()) {
        navHtml = `
            <a href="dashboard.html" class="${currentFile === 'dashboard.html' ? 'active' : ''}">Dashboard</a>
            <a href="watchlist.html" class="${currentFile === 'watchlist.html' ? 'active' : ''}">Watchlist</a>
            <a href="portfolio.html" class="${currentFile === 'portfolio.html' ? 'active' : ''}">Portfolio</a>
            <a href="ai-chat.html" class="${currentFile === 'ai-chat.html' ? 'active' : ''}">AI Assistant</a>
            <div class="nav-user">
                <span class="user-greeting">👋 ${user.first_name || 'User'}</span>
                <button id="logoutBtn" class="btn-logout" onclick="logout()">Logout</button>
            </div>
        `;
    } else {
        navHtml = `
            <div class="nav-auth-buttons">
                <a href="login.html" class="btn-nav-login ${currentFile === 'login.html' ? 'active' : ''}">Login</a>
                <a href="register.html" class="btn-nav-register ${currentFile === 'register.html' ? 'active' : ''}">Register</a>
            </div>
        `;
    }

    nav.innerHTML = navHtml;

    // Update logo link
    const logo = document.querySelector(".navbar .logo");
    if (logo) {
        logo.href = isLoggedIn() ? "dashboard.html" : "login.html";
    }
}

// Handle Login & Register Forms
document.addEventListener("DOMContentLoaded", () => {
    updateNavbar();

    // Check URL query parameters on login page
    const urlParams = new URLSearchParams(window.location.search);
    const alertBox = document.getElementById("authAlert");

    if (alertBox) {
        if (urlParams.get("registered") === "true") {
            alertBox.textContent = "✅ Account created successfully! Please sign in with your credentials.";
            alertBox.className = "alert alert-success";
            alertBox.style.display = "block";
        } else if (urlParams.get("session_expired") === "true") {
            alertBox.textContent = "Your session has expired. Please sign in again.";
            alertBox.className = "alert alert-error";
            alertBox.style.display = "block";
        } else if (urlParams.get("redirect")) {
            alertBox.textContent = "Please sign in to access that page.";
            alertBox.className = "alert alert-info";
            alertBox.style.display = "block";
        }
    }

    // Login Form Handler
    const loginForm = document.getElementById("loginForm");
    if (loginForm) {
        loginForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const email = document.getElementById("email").value.trim();
            const password = document.getElementById("password").value;
            const submitBtn = loginForm.querySelector("button[type='submit']");

            if (!email || !password) {
                if (alertBox) {
                    alertBox.textContent = "Please enter both email and password";
                    alertBox.className = "alert alert-error";
                    alertBox.style.display = "block";
                }
                return;
            }

            try {
                if (submitBtn) submitBtn.disabled = true;
                if (submitBtn) submitBtn.textContent = "Signing In...";
                if (alertBox) alertBox.style.display = "none";

                const data = await loginUser(email, password);

                if (data.success && data.token) {
                    localStorage.setItem("stocksense_token", data.token);
                    localStorage.setItem("stocksense_user", JSON.stringify(data.user));

                    showToast("Login successful!", "success");

                    const redirect = urlParams.get("redirect") || "dashboard.html";
                    setTimeout(() => {
                        window.location.replace(redirect);
                    }, 400);
                }
            } catch (err) {
                console.error("Login error:", err);
                if (alertBox) {
                    alertBox.textContent = err.message || "Invalid email or password";
                    alertBox.className = "alert alert-error";
                    alertBox.style.display = "block";
                }
            } finally {
                if (submitBtn) submitBtn.disabled = false;
                if (submitBtn) submitBtn.textContent = "Sign In";
            }
        });
    }

    // Register Form Handler
    const registerForm = document.getElementById("registerForm");
    if (registerForm) {
        registerForm.addEventListener("submit", async (e) => {
            e.preventDefault();
            const firstName = document.getElementById("firstName").value.trim();
            const lastName = document.getElementById("lastName").value.trim();
            const email = document.getElementById("email").value.trim();
            const phone = document.getElementById("phone") ? document.getElementById("phone").value.trim() : "";
            const password = document.getElementById("password").value;
            const confirmPassword = document.getElementById("confirmPassword").value;
            const submitBtn = registerForm.querySelector("button[type='submit']");

            if (!firstName || !email || !password) {
                if (alertBox) {
                    alertBox.textContent = "Please fill in all required fields";
                    alertBox.className = "alert alert-error";
                    alertBox.style.display = "block";
                }
                return;
            }

            if (password !== confirmPassword) {
                if (alertBox) {
                    alertBox.textContent = "Passwords do not match";
                    alertBox.className = "alert alert-error";
                    alertBox.style.display = "block";
                }
                return;
            }

            if (password.length < 6) {
                if (alertBox) {
                    alertBox.textContent = "Password must be at least 6 characters long";
                    alertBox.className = "alert alert-error";
                    alertBox.style.display = "block";
                }
                return;
            }

            try {
                if (submitBtn) submitBtn.disabled = true;
                if (submitBtn) submitBtn.textContent = "Creating Account...";
                if (alertBox) alertBox.style.display = "none";

                const data = await registerUser({
                    first_name: firstName,
                    last_name: lastName,
                    email,
                    phone,
                    password
                });

                if (data.success) {
                    showToast("Account registered successfully!", "success");
                    setTimeout(() => {
                        window.location.replace("login.html?registered=true");
                    }, 500);
                }
            } catch (err) {
                console.error("Registration error:", err);
                if (alertBox) {
                    alertBox.textContent = err.message || "Registration failed. Please try again.";
                    alertBox.className = "alert alert-error";
                    alertBox.style.display = "block";
                }
            } finally {
                if (submitBtn) submitBtn.disabled = false;
                if (submitBtn) submitBtn.textContent = "Create Account";
            }
        });
    }
});
