const { spawn } = require("child_process");
const path = require("path");

const BASE = process.env.API_BASE || "http://127.0.0.1:5000";
const results = [];

function record(id, name, expected, ok, detail) {
    results.push({ id, name, expected, ok, detail });
    const mark = ok ? "PASS" : "FAIL";
    console.log(`${mark}  ${id}  ${name}  →  ${detail}`);
}

async function request(url, options) {
    const response = await fetch(url, options);
    const data = await response.json().catch(() => ({}));
    return { status: response.status, data };
}

function nextOpenDate() {
    const date = new Date();
    date.setDate(date.getDate() + 1);
    while (date.getDay() === 0 || date.getDay() === 6) {
        date.setDate(date.getDate() + 1);
    }
    const month = String(date.getMonth() + 1).padStart(2, "0");
    const day = String(date.getDate()).padStart(2, "0");
    return `${date.getFullYear()}-${month}-${day}`;
}

async function serverIsUp() {
    try {
        const response = await fetch(`${BASE}/api/health`);
        return response.ok;
    } catch (error) {
        return false;
    }
}

async function waitForServer() {
    const started = Date.now();
    while (Date.now() - started < 20000) {
        if (await serverIsUp()) {
            return;
        }
        await new Promise((resolve) => setTimeout(resolve, 400));
    }
    throw new Error("Server did not start");
}

async function run() {
    const stamp = Date.now();
    const email = `patient.${stamp}@northbridge.test`;
    const password = "patient123";
    const appointmentDate = nextOpenDate();

    const registered = await request(`${BASE}/api/register`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            name: "Test Patient",
            email,
            password,
            phone: "9876543210"
        })
    });
    record(
        "TC01",
        "Patient registration",
        "Registration successful",
        registered.status === 201 && registered.data.message === "Registration successful",
        registered.data.message || registered.status
    );

    const loggedIn = await request(`${BASE}/api/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ email, password })
    });
    const patient = loggedIn.data.patient;
    record(
        "TC02",
        "Patient login",
        "Dashboard displayed",
        loggedIn.status === 200 && patient && patient.email === email,
        patient ? `Dashboard displayed for ${patient.name}` : loggedIn.data.message
    );

    const search = await request(`${BASE}/api/doctors/search?specialization=Cardiology`);
    const doctor = Array.isArray(search.data) ? search.data[0] : null;
    const detailsShown = Boolean(
        doctor && doctor.name && doctor.specialization && doctor.qualification && doctor.availability
    );
    record(
        "TC03",
        "Search doctor",
        "Doctor details displayed",
        search.status === 200 && detailsShown,
        detailsShown
            ? `${doctor.name}, ${doctor.specialization}, ${doctor.qualification}, ${doctor.availability}`
            : "Doctor details missing"
    );

    const booked = await request(`${BASE}/api/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            patient_id: patient.patient_id,
            doctor_id: doctor.doctor_id,
            appointment_date: appointmentDate,
            appointment_time: "10:00"
        })
    });
    record(
        "TC04",
        "Book available slot",
        "Appointment confirmed",
        booked.status === 201 && booked.data.message === "Appointment confirmed",
        booked.data.message || booked.status
    );

    const rejected = await request(`${BASE}/api/appointments`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
            patient_id: patient.patient_id,
            doctor_id: doctor.doctor_id,
            appointment_date: appointmentDate,
            appointment_time: "10:00"
        })
    });
    record(
        "TC05",
        "Book already occupied slot",
        "Booking rejected",
        rejected.status === 409 && rejected.data.message === "Booking rejected",
        rejected.data.message || rejected.status
    );

    const cancelled = await request(`${BASE}/api/appointments/${booked.data.appointment_id}/cancel`, {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ patient_id: patient.patient_id })
    });
    record(
        "TC06",
        "Cancel appointment",
        "Appointment cancelled",
        cancelled.status === 200 && cancelled.data.message === "Appointment cancelled",
        cancelled.data.message || cancelled.status
    );

    const viewed = await request(`${BASE}/api/appointments?patient_id=${patient.patient_id}`);
    const match = Array.isArray(viewed.data)
        ? viewed.data.find((row) => row.appointment_id === booked.data.appointment_id)
        : null;
    const correct = Boolean(
        match &&
        match.doctor_name === doctor.name &&
        match.specialization === doctor.specialization &&
        match.appointment_date === appointmentDate &&
        match.appointment_time === "10:00" &&
        match.status === "Cancelled" &&
        match.patient_name === "Test Patient"
    );
    record(
        "TC07",
        "View appointments",
        "Correct appointment details",
        viewed.status === 200 && correct,
        correct
            ? `${match.doctor_name} on ${match.appointment_date} at ${match.appointment_time} (${match.status})`
            : "Appointment details did not match"
    );

    const admin = await request(`${BASE}/api/admin/login`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username: "admin", password: "admin123" })
    });
    const managed = await request(`${BASE}/api/admin/appointments`, {
        headers: { "x-admin-token": admin.data.token || "" }
    });
    const visibleToAdmin = Array.isArray(managed.data)
        && managed.data.some((row) => row.appointment_id === booked.data.appointment_id);
    record(
        "ADMIN",
        "Admin appointment management",
        "Appointment listed for admin",
        admin.status === 200 && managed.status === 200 && visibleToAdmin,
        visibleToAdmin ? "Appointment visible on the admin desk" : "Admin could not see the appointment"
    );

    const failed = results.filter((item) => !item.ok);
    console.log(`\n${results.length - failed.length}/${results.length} checks passed.`);
    if (failed.length) {
        process.exitCode = 1;
    }
}

async function main() {
    let child = null;
    if (!(await serverIsUp())) {
        child = spawn(process.execPath, ["server.js"], {
            cwd: path.join(__dirname, "../backend"),
            stdio: "inherit"
        });
        await waitForServer();
    }

    try {
        await run();
    } finally {
        if (child) {
            child.kill();
        }
    }
    process.exit(process.exitCode || 0);
}

main().catch((error) => {
    console.error(error);
    process.exit(1);
});
