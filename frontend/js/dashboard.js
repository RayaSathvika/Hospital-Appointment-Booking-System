const patient = requirePatient();
if (!patient) {
    throw new Error("Sign in required");
}

function paintAppointments(rows) {
    const firstName = patient.name.split(" ")[0];
    document.getElementById("greeting").textContent = `Welcome, ${firstName}`;
    document.getElementById("summary").textContent = "Manage your appointments and health easily.";

    const upcoming = document.getElementById("upcoming");
    upcoming.textContent = "";
    const today = todayInputValue();
    const next = rows
        .filter((row) => row.status === "Booked" && row.appointment_date >= today)
        .sort((a, b) => `${a.appointment_date}${a.appointment_time}`.localeCompare(`${b.appointment_date}${b.appointment_time}`));

    if (!next.length) {
        upcoming.append(el("p", "empty", "No upcoming appointments."));
        return;
    }

    const row = next[0];
    const card = el("article", "visit");
    const info = el("div");
    const who = el("div");
    who.style.display = "flex";
    who.style.gap = "12px";
    who.style.alignItems = "center";
    who.append(el("div", "mini-avatar", initials(row.doctor_name)));
    const text = el("div");
    text.append(el("h3", "", row.doctor_name));
    text.append(el("div", "muted", `${row.specialization} · ${formatDate(row.appointment_date)} · ${formatTime(row.appointment_time)}`));
    who.append(text);
    info.append(who);
    card.append(info);
    card.append(el("span", "badge Confirmed", "Confirmed"));
    upcoming.append(card);
}

api(`/api/appointments?patient_id=${patient.patient_id}`).then((result) => {
    if (result.ok) {
        paintAppointments(result.data);
    }
});
