const patient = requirePatient();
if (!patient) {
    throw new Error("Sign in required");
}

const list = document.getElementById("list");
const message = document.getElementById("message");

async function loadAppointments() {
    const result = await api(`/api/appointments?patient_id=${patient.patient_id}`);
    list.textContent = "";
    if (!result.ok) {
        list.append(el("p", "empty", "Appointments could not be loaded."));
        return;
    }

    const booked = result.data.filter((row) => row.status === "Booked");
    if (!booked.length) {
        list.append(el("p", "empty", "There are no booked appointments to cancel."));
        return;
    }

    booked.forEach((row) => {
        const card = el("article", "visit");
        const who = el("div");
        who.style.display = "flex";
        who.style.gap = "12px";
        who.style.alignItems = "center";
        who.append(el("div", "mini-avatar", initials(row.doctor_name)));
        const text = el("div");
        text.append(el("h3", "", row.doctor_name));
        text.append(el("div", "muted", `${row.specialization} · ${formatDate(row.appointment_date)} · ${formatTime(row.appointment_time)}`));
        who.append(text);
        card.append(who);
        const button = el("button", "danger", "Cancel Appointment");
        button.type = "button";
        button.addEventListener("click", () => cancelAppointment(row.appointment_id));
        card.append(button);
        list.append(card);
    });
}

async function cancelAppointment(id) {
    const result = await api(`/api/appointments/${id}/cancel`, {
        method: "PUT",
        body: JSON.stringify({ patient_id: patient.patient_id })
    });
    if (!result.ok) {
        showMessage(message, result.data.message || "Cancellation failed", "error");
        return;
    }
    showMessage(message, "Appointment cancelled", "ok");
    loadAppointments();
}

loadAppointments();
