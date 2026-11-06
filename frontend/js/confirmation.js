const patient = requirePatient();
if (!patient) {
    throw new Error("Sign in required");
}

const saved = sessionStorage.getItem("lastAppointment");
const appointment = saved ? JSON.parse(saved) : null;
const box = document.getElementById("confirm");

if (!appointment) {
    box.append(el("p", "empty", "No new appointment to show."));
} else {
    box.append(el("div", "check", "✓"));
    box.append(el("h1", "", "Appointment Confirmed!"));
    box.append(el("p", "muted", "Your appointment has been successfully booked."));
    const details = el("div", "detail-table");
    [
        ["Doctor", `${appointment.doctor_name} (${appointment.specialization})`],
        ["Date", formatDate(appointment.appointment_date)],
        ["Time", formatTime(appointment.appointment_time)],
        ["Consultation Fee", formatFee(appointment.fee)]
    ].forEach(([label, value]) => {
        const line = el("div");
        line.append(el("span", "", label));
        line.append(el("strong", "", value));
        details.append(line);
    });
    box.append(details);
    const actions = el("div", "confirm-actions");
    const view = el("a", "button", "View My Appointments");
    view.href = "appointments.html";
    const back = el("a", "button ghost", "Back to Dashboard");
    back.href = "dashboard.html";
    actions.append(view, back);
    box.append(actions);
}
