function getPatient() {
    try {
        return JSON.parse(localStorage.getItem("patient") || "null");
    } catch (error) {
        return null;
    }
}

function setPatient(patient) {
    localStorage.setItem("patient", JSON.stringify(patient));
}

function logoutPatient() {
    localStorage.removeItem("patient");
    window.location.href = "login.html";
}

function requirePatient() {
    const patient = getPatient();
    if (!patient) {
        window.location.href = "login.html";
        return null;
    }
    return patient;
}

function getAdminToken() {
    return localStorage.getItem("adminToken");
}

async function api(path, options = {}) {
    const headers = { ...(options.headers || {}) };
    if (options.body) {
        headers["Content-Type"] = "application/json";
    }
    const token = getAdminToken();
    if (token) {
        headers["x-admin-token"] = token;
    }
    const response = await fetch(path, { ...options, headers });
    const data = await response.json().catch(() => ({}));
    return { ok: response.ok, status: response.status, data };
}

function showMessage(element, text, type) {
    if (!element) {
        return;
    }
    element.hidden = !text;
    element.textContent = text || "";
    element.className = `message ${type || ""}`.trim();
}

function el(tag, className, text) {
    const node = document.createElement(tag);
    if (className) {
        node.className = className;
    }
    if (text != null) {
        node.textContent = text;
    }
    return node;
}

function formatDate(value) {
    const date = new Date(`${value}T00:00:00`);
    if (Number.isNaN(date.getTime())) {
        return value;
    }
    return date.toLocaleDateString("en-GB", {
        day: "numeric",
        month: "short",
        year: "numeric"
    });
}

function formatTime(value) {
    const [hourText, minute] = String(value).split(":");
    const hour = Number(hourText);
    if (Number.isNaN(hour)) {
        return value;
    }
    const suffix = hour >= 12 ? "PM" : "AM";
    const displayHour = hour % 12 || 12;
    return `${String(displayHour).padStart(2, "0")}:${minute} ${suffix}`;
}

function formatFee(amount) {
    return `₹ ${amount}`;
}

function statusLabel(status) {
    return status === "Booked" ? "Confirmed" : status;
}

function initials(name) {
    return String(name || "?")
        .split(" ")
        .filter((part) => part && part !== "Dr.")
        .slice(0, 2)
        .map((part) => part[0])
        .join("")
        .toUpperCase();
}

function todayInputValue() {
    const now = new Date();
    const month = String(now.getMonth() + 1).padStart(2, "0");
    const day = String(now.getDate()).padStart(2, "0");
    return `${now.getFullYear()}-${month}-${day}`;
}

const publicLinks = [
    ["home", "index.html", "Home"],
    ["register", "register.html", "Register"],
    ["login", "login.html", "Login"],
    ["doctors", "doctors.html", "Doctors"],
    ["search", "search.html", "Search"],
    ["book", "book.html", "Book"],
    ["appointments", "appointments.html", "Appointments"],
    ["cancel", "cancel.html", "Cancel"],
    ["admin", "admin.html", "Admin"]
];

const patientLinks = [
    ["dashboard", "dashboard.html", "Dashboard"],
    ["doctors", "doctors.html", "Doctor details"],
    ["search", "search.html", "Search doctors"],
    ["book", "book.html", "Book appointment"],
    ["appointments", "appointments.html", "View appointments"],
    ["cancel", "cancel.html", "Cancel appointment"],
    ["profile", "profile.html", "Profile"]
];

document.querySelectorAll("[data-nav='public']").forEach((nav) => {
    publicLinks.forEach(([page, href, label]) => {
        const link = el("a", page === "register" ? "nav-pill" : "", label);
        link.href = href;
        link.dataset.page = page;
        nav.append(link);
    });
});

document.querySelectorAll("[data-nav='patient']").forEach((nav) => {
    patientLinks.forEach(([page, href, label]) => {
        const link = el("a", "", label);
        link.href = href;
        link.dataset.page = page;
        nav.append(link);
    });
});

document.querySelectorAll(".nav a, .side-nav a").forEach((link) => {
    if (link.dataset.page === document.body.dataset.page) {
        link.classList.add("active");
    }
});

document.querySelectorAll(".js-logout").forEach((button) => {
    button.addEventListener("click", logoutPatient);
});
