const loginPanel = document.getElementById("login-panel");
const managePanel = document.getElementById("manage-panel");
const loginMessage = document.getElementById("login-message");
const adminMessage = document.getElementById("admin-message");
const table = document.getElementById("admin-table");
let section = "appointments";
let appointments = [];

function showDesk(signedIn) {
    loginPanel.hidden = signedIn;
    managePanel.hidden = !signedIn;
}

function tableFrom(headers, records, cells) {
    table.textContent = "";
    if (!records.length) {
        table.append(el("p", "empty", "Nothing to show yet."));
        return;
    }
    const grid = document.createElement("table");
    const head = document.createElement("thead");
    const headRow = document.createElement("tr");
    headers.forEach((label) => headRow.append(el("th", "", label)));
    head.append(headRow);
    grid.append(head);
    const body = document.createElement("tbody");
    records.forEach((record) => {
        const line = document.createElement("tr");
        cells(record).forEach((cell) => line.append(cell));
        body.append(line);
    });
    grid.append(body);
    table.append(grid);
}

function renderAppointments() {
    tableFrom(
        ["ID", "Patient", "Doctor", "Date & Time", "Status", "Action"],
        appointments,
        (row) => {
            const action = el("td");
            const view = el("button", "ghost", "View");
            view.type = "button";
            view.addEventListener("click", () => {
                showMessage(
                    adminMessage,
                    `${row.patient_name} with ${row.doctor_name} on ${formatDate(row.appointment_date)} at ${formatTime(row.appointment_time)} · ${statusLabel(row.status)} · ${formatFee(row.fee)}`,
                    "ok"
                );
            });
            action.append(view);
            return [
                el("td", "", `A${row.appointment_id}`),
                el("td", "", row.patient_name),
                el("td", "", row.doctor_name),
                el("td", "", `${formatDate(row.appointment_date)}, ${formatTime(row.appointment_time)}`),
                (() => {
                    const cell = el("td");
                    cell.append(el("span", `badge ${row.status}`, statusLabel(row.status)));
                    return cell;
                })(),
                action
            ];
        }
    );
}

async function loadSection() {
    showMessage(adminMessage, "", "");
    if (section === "appointments") {
        const result = await api("/api/admin/appointments");
        if (result.status === 401) {
            localStorage.removeItem("adminToken");
            showDesk(false);
            return;
        }
        appointments = result.ok ? result.data : [];
        renderAppointments();
        return;
    }
    if (section === "patients") {
        const result = await api("/api/admin/patients");
        tableFrom(["ID", "Patient", "Email", "Phone"], result.data || [], (row) => [
            el("td", "", String(row.patient_id)),
            el("td", "", row.name),
            el("td", "", row.email),
            el("td", "", row.phone)
        ]);
        return;
    }
    if (section === "doctors") {
        const result = await api("/api/doctors");
        tableFrom(["Doctor", "Specialization", "Experience", "Fee"], result.data || [], (row) => [
            el("td", "", row.name),
            el("td", "", row.specialization),
            el("td", "", row.experience),
            el("td", "", formatFee(row.fee))
        ]);
        return;
    }
    const booked = appointments.filter((row) => row.status === "Booked").length;
    const cancelled = appointments.filter((row) => row.status === "Cancelled").length;
    const completed = appointments.filter((row) => row.status === "Completed").length;
    table.textContent = "";
    const grid = el("div", "action-grid");
    [["Appointments", appointments.length], ["Confirmed", booked], ["Cancelled", cancelled], ["Completed", completed]].forEach(([label, value]) => {
        const card = el("article", "action-card");
        card.append(el("h2", "", String(value)));
        card.append(el("div", "muted", label));
        grid.append(card);
    });
    table.append(grid);
}

document.getElementById("admin-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const form = event.currentTarget;
    const result = await api("/api/admin/login", {
        method: "POST",
        body: JSON.stringify({
            username: form.username.value.trim(),
            password: form.password.value
        })
    });
    if (!result.ok) {
        showMessage(loginMessage, result.data.message || "Admin login failed", "error");
        return;
    }
    localStorage.setItem("adminToken", result.data.token);
    showDesk(true);
    const listed = await api("/api/admin/appointments");
    appointments = listed.ok ? listed.data : [];
    loadSection();
});

document.getElementById("admin-logout").addEventListener("click", () => {
    localStorage.removeItem("adminToken");
    showDesk(false);
});

document.querySelectorAll("[data-section]").forEach((link) => {
    link.addEventListener("click", (event) => {
        event.preventDefault();
        section = link.dataset.section;
        document.querySelectorAll("[data-section]").forEach((item) => item.classList.remove("active"));
        link.classList.add("active");
        document.querySelector(".shell-main h1").textContent = link.textContent;
        loadSection();
    });
});

if (getAdminToken()) {
    showDesk(true);
    api("/api/admin/appointments").then((result) => {
        if (result.status === 401) {
            localStorage.removeItem("adminToken");
            showDesk(false);
            return;
        }
        appointments = result.data || [];
        loadSection();
    });
}
