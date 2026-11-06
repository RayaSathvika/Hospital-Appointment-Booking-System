const patient = requirePatient();
if (!patient) {
    throw new Error("Sign in required");
}

const doctorSelect = document.getElementById("doctor");
const dateInput = document.getElementById("date");
const slots = document.getElementById("slots");
const message = document.getElementById("message");
const availability = document.getElementById("availability");
const doctorCard = document.getElementById("doctor-card");
let selectedTime = "";
let currentDoctor = null;

dateInput.min = todayInputValue();
dateInput.value = todayInputValue();

function paintDoctor(doctor) {
    currentDoctor = doctor;
    doctorCard.textContent = "";
    doctorCard.append(el("div", "mini-avatar", initials(doctor.name)));
    doctorCard.append(el("h2", "", doctor.name));
    doctorCard.append(el("div", "muted", doctor.specialization));
    doctorCard.append(el("p", "", `Experience: ${doctor.experience}`));
    doctorCard.append(el("p", "fee", `Consultation Fee: ${formatFee(doctor.fee)}`));
}

function renderSlots(payload) {
    slots.textContent = "";
    selectedTime = "";
    paintDoctor(payload.doctor);
    availability.textContent = payload.works
        ? `Available ${payload.doctor.availability}`
        : `${payload.doctor.name} is not in clinic on this date.`;

    payload.slots.forEach((slot) => {
        const button = document.createElement("button");
        button.type = "button";
        button.className = `slot ${slot.status === "Available" ? "available" : "occupied"}`;
        button.append(document.createTextNode(formatTime(slot.time)));
        button.append(el("small", "", slot.status === "Available" ? "Open" : "Occupied"));
        button.addEventListener("click", () => {
            selectedTime = slot.time;
            slots.querySelectorAll(".slot").forEach((item) => item.classList.remove("selected"));
            button.classList.add("selected");
        });
        slots.append(button);
    });
}

async function loadSlots() {
    if (!doctorSelect.value || !dateInput.value) {
        return;
    }
    const result = await api(`/api/doctors/${doctorSelect.value}/slots?date=${dateInput.value}`);
    if (result.ok) {
        renderSlots(result.data);
    }
}

document.getElementById("book-button").addEventListener("click", async () => {
    if (!selectedTime) {
        showMessage(message, "Select a time slot", "error");
        return;
    }
    const result = await api("/api/appointments", {
        method: "POST",
        body: JSON.stringify({
            patient_id: patient.patient_id,
            doctor_id: Number(doctorSelect.value),
            appointment_date: dateInput.value,
            appointment_time: selectedTime
        })
    });

    if (result.status === 409) {
        showMessage(message, "Booking rejected", "error");
        loadSlots();
        return;
    }
    if (!result.ok) {
        showMessage(message, result.data.message || "Booking failed", "error");
        return;
    }

    sessionStorage.setItem("lastAppointment", JSON.stringify(result.data.appointment));
    window.location.href = "confirmation.html";
});

api("/api/doctors").then(async (result) => {
    if (!result.ok) {
        return;
    }
    result.data.forEach((doctor) => {
        const option = document.createElement("option");
        option.value = doctor.doctor_id;
        option.textContent = `${doctor.name} · ${doctor.specialization}`;
        doctorSelect.append(option);
    });
    const requested = new URLSearchParams(window.location.search).get("doctor");
    if (requested && [...doctorSelect.options].some((option) => option.value === requested)) {
        doctorSelect.value = requested;
    }
    await loadSlots();
});

doctorSelect.addEventListener("change", loadSlots);
dateInput.addEventListener("change", loadSlots);
