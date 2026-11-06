const patient = requirePatient();
if (!patient) {
    throw new Error("Sign in required");
}

const list = document.getElementById("list");
const tabUpcoming = document.getElementById("tab-upcoming");
const tabPast = document.getElementById("tab-past");
let rows = [];
let showUpcoming = true;

function isUpcoming(row) {
    return row.status === "Booked" && row.appointment_date >= todayInputValue();
}

function render() {
    const visible = rows.filter((row) => (showUpcoming ? isUpcoming(row) : !isUpcoming(row)));
    tabUpcoming.textContent = `Upcoming (${rows.filter(isUpcoming).length})`;
    tabPast.textContent = `Past (${rows.filter((row) => !isUpcoming(row)).length})`;
    document.getElementById("intro").textContent = `${patient.name} · correct appointment details`;
    list.textContent = "";

    if (!visible.length) {
        list.append(el("p", "empty", showUpcoming ? "No upcoming appointments." : "No past appointments."));
        return;
    }

    visible.forEach((row) => {
        const card = el("article", "visit");
        const who = el("div");
        who.style.display = "flex";
        who.style.gap = "12px";
        who.style.alignItems = "center";
        who.append(el("div", "mini-avatar", initials(row.doctor_name)));
        const text = el("div");
        text.append(el("h3", "", row.doctor_name));
        text.append(el("div", "muted", `${row.specialization} · ${formatDate(row.appointment_date)}, ${formatTime(row.appointment_time)}`));
        text.append(el("div", "fee", formatFee(row.fee)));
        who.append(text);
        card.append(who);
        const actions = el("div");
        actions.style.display = "flex";
        actions.style.gap = "8px";
        actions.style.alignItems = "center";
        actions.append(el("span", `badge ${row.status}`, statusLabel(row.status)));
        card.append(actions);
        list.append(card);
    });
}

async function load() {
    const result = await api(`/api/appointments?patient_id=${patient.patient_id}`);
    if (!result.ok) {
        list.append(el("p", "empty", "Appointment details could not be loaded."));
        return;
    }
    rows = result.data;
    render();
}

tabUpcoming.addEventListener("click", () => {
    showUpcoming = true;
    tabUpcoming.classList.add("active");
    tabPast.classList.remove("active");
    render();
});

tabPast.addEventListener("click", () => {
    showUpcoming = false;
    tabPast.classList.add("active");
    tabUpcoming.classList.remove("active");
    render();
});

load();
