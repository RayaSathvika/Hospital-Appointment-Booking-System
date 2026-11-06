const express = require("express");
const cors = require("cors");
const path = require("path");
const bcrypt = require("bcrypt");
const patientsModule = require("./modules/patients");
const doctorsModule = require("./modules/doctors");
const appointmentsModule = require("./modules/appointments");
const adminModule = require("./modules/admin");
const db = require("./config/database");

const app = express();
const PORT = 5000;
const SLOTS = ["09:00", "10:00", "11:00", "14:00", "15:00", "16:00"];
const DOCTOR_PROFILES = {
    "Dr. Ananya Rao": {
        experience: "15 years",
        fee: 700,
        location: "Hyderabad",
        about: "Expert in heart diseases, hypertension, and preventive cardiology."
    },
    "Dr. Rahul Sharma": {
        experience: "12 years",
        fee: 500,
        location: "Hyderabad",
        about: "Treats skin conditions, allergies, and cosmetic dermatology."
    },
    "Dr. Priya Reddy": {
        experience: "10 years",
        fee: 600,
        location: "Hyderabad",
        about: "Cares for infants, children, and adolescent health."
    },
    "Dr. Arjun Kumar": {
        experience: "14 years",
        fee: 650,
        location: "Hyderabad",
        about: "Specializes in joint injuries, fractures, and sports medicine."
    },
    "Dr. Sneha Patel": {
        experience: "8 years",
        fee: 800,
        location: "Hyderabad",
        about: "Focuses on headache, stroke prevention, and nerve disorders."
    }
};

function decorateDoctor(doctor) {
    if (!doctor) {
        return doctor;
    }
    const profile = DOCTOR_PROFILES[doctor.name] || {
        experience: "10 years",
        fee: 600,
        location: "Hyderabad",
        about: `${doctor.qualification}. Available ${doctor.availability}.`
    };
    return { ...doctor, ...profile };
}

function decorateAppointment(row) {
    const profile = DOCTOR_PROFILES[row.doctor_name] || { fee: 600, experience: "10 years" };
    return { ...row, fee: profile.fee, experience: profile.experience, location: profile.location || "Hyderabad" };
}
const WEEKDAYS = ["Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday", "Sunday"];

app.use(cors());
app.use(express.json());

function dayName(dateStr) {
    const day = new Date(`${dateStr}T00:00:00`).getDay();
    return ["Sunday", "Monday", "Tuesday", "Wednesday", "Thursday", "Friday", "Saturday"][day];
}

function doctorWorksOn(availability, dateStr) {
    const [start, end] = String(availability).split("-");
    const startIndex = WEEKDAYS.indexOf(start);
    const endIndex = WEEKDAYS.indexOf(end);
    const dayIndex = WEEKDAYS.indexOf(dayName(dateStr));
    if (startIndex === -1 || endIndex === -1 || dayIndex === -1) {
        return false;
    }
    return dayIndex >= startIndex && dayIndex <= endIndex;
}

const appointmentSelect = `
    SELECT
        a.appointment_id,
        a.patient_id,
        a.doctor_id,
        a.appointment_date,
        a.appointment_time,
        a.status,
        p.name AS patient_name,
        p.email AS patient_email,
        p.phone AS patient_phone,
        d.name AS doctor_name,
        d.specialization,
        d.qualification,
        d.availability
    FROM appointments a
    JOIN patients p ON p.patient_id = a.patient_id
    JOIN doctors d ON d.doctor_id = a.doctor_id
`;

db.serialize(() => {
    db.run(`
        CREATE TABLE IF NOT EXISTS patients (
            patient_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            email TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL,
            phone TEXT NOT NULL
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS doctors (
            doctor_id INTEGER PRIMARY KEY AUTOINCREMENT,
            name TEXT NOT NULL,
            specialization TEXT NOT NULL,
            qualification TEXT NOT NULL,
            availability TEXT NOT NULL
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS admins (
            admin_id INTEGER PRIMARY KEY AUTOINCREMENT,
            username TEXT UNIQUE NOT NULL,
            password TEXT NOT NULL
        )
    `);

    db.run(`
        CREATE TABLE IF NOT EXISTS appointments (
            appointment_id INTEGER PRIMARY KEY AUTOINCREMENT,
            patient_id INTEGER NOT NULL,
            doctor_id INTEGER NOT NULL,
            appointment_date TEXT NOT NULL,
            appointment_time TEXT NOT NULL,
            status TEXT DEFAULT 'Booked',
            FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
            FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id)
        )
    `);

    const doctors = [
        ["Dr. Ananya Rao", "Cardiology", "MBBS, MD", "Monday-Friday"],
        ["Dr. Rahul Sharma", "Dermatology", "MBBS, MD", "Monday-Saturday"],
        ["Dr. Priya Reddy", "Pediatrics", "MBBS, DCH", "Monday-Friday"],
        ["Dr. Arjun Kumar", "Orthopedics", "MBBS, MS", "Tuesday-Saturday"],
        ["Dr. Sneha Patel", "Neurology", "MBBS, DM", "Monday-Saturday"]
    ];

    const insertDoctor = db.prepare(`
        INSERT INTO doctors (name, specialization, qualification, availability)
        SELECT ?, ?, ?, ?
        WHERE NOT EXISTS (
            SELECT 1 FROM doctors WHERE name = ?
        )
    `);

    doctors.forEach((doctor) => {
        insertDoctor.run([...doctor, doctor[0]]);
    });
    insertDoctor.finalize();

    db.get("SELECT admin_id FROM admins WHERE username = ?", ["admin"], (err, admin) => {
        if (!err && !admin) {
            const hash = bcrypt.hashSync("admin123", 10);
            db.run(
                "INSERT INTO admins (username, password) VALUES (?, ?)",
                ["admin", hash]
            );
        }
    });

    db.get(
        "SELECT sql FROM sqlite_master WHERE type = 'table' AND name = 'appointments'",
        [],
        (err, row) => {
            const finish = () => {
                db.run(
                    `CREATE UNIQUE INDEX IF NOT EXISTS idx_active_slot
                     ON appointments (doctor_id, appointment_date, appointment_time)
                     WHERE status = 'Booked'`,
                    () => startServer()
                );
            };

            if (row && /UNIQUE\s*\(/i.test(row.sql || "")) {
                db.serialize(() => {
                    db.run("ALTER TABLE appointments RENAME TO appointments_old");
                    db.run(`
                        CREATE TABLE appointments (
                            appointment_id INTEGER PRIMARY KEY AUTOINCREMENT,
                            patient_id INTEGER NOT NULL,
                            doctor_id INTEGER NOT NULL,
                            appointment_date TEXT NOT NULL,
                            appointment_time TEXT NOT NULL,
                            status TEXT DEFAULT 'Booked',
                            FOREIGN KEY (patient_id) REFERENCES patients(patient_id),
                            FOREIGN KEY (doctor_id) REFERENCES doctors(doctor_id)
                        )
                    `);
                    db.run(`
                        INSERT INTO appointments (
                            appointment_id, patient_id, doctor_id,
                            appointment_date, appointment_time, status
                        )
                        SELECT
                            appointment_id, patient_id, doctor_id,
                            appointment_date, appointment_time, status
                        FROM appointments_old
                    `);
                    db.run("DROP TABLE appointments_old", finish);
                });
                return;
            }

            finish();
        }
    );
});

app.get("/api/health", (req, res) => {
    res.json({ message: "Hospital Appointment Booking System API is running" });
});

const moduleDeps = {
    db,
    bcrypt,
    SLOTS,
    decorateDoctor,
    decorateAppointment,
    doctorWorksOn,
    dayName,
    appointmentSelect
};

app.use("/api", patientsModule(moduleDeps));
app.use("/api", doctorsModule(moduleDeps));
app.use("/api", appointmentsModule(moduleDeps));
app.use("/api", adminModule(moduleDeps));


app.use(express.static(path.join(__dirname, "../frontend")));

let started = false;
function startServer() {
    if (started) {
        return;
    }
    started = true;
    const server = app.listen(PORT, "127.0.0.1", () => {
        console.log(`Server running at http://127.0.0.1:${PORT}`);
    });
    server.on("error", (error) => {
        console.error(error.message);
        process.exit(1);
    });
}
