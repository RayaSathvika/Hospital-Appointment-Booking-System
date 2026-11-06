const express = require("express");

module.exports = function appointmentsModule({
    db,
    SLOTS,
    decorateDoctor,
    decorateAppointment,
    doctorWorksOn,
    dayName,
    appointmentSelect
}) {
    const router = express.Router();

    router.post("/appointments", (req, res) => {
        const { patient_id, doctor_id, appointment_date, appointment_time } = req.body;

        if (!patient_id || !doctor_id || !appointment_date || !appointment_time) {
            return res.status(400).json({ message: "All appointment details are required" });
        }

        if (!SLOTS.includes(appointment_time)) {
            return res.status(400).json({ message: "Please choose a valid time slot" });
        }

        const today = new Date();
        today.setHours(0, 0, 0, 0);
        const chosen = new Date(`${appointment_date}T00:00:00`);
        if (Number.isNaN(chosen.getTime()) || chosen < today) {
            return res.status(400).json({ message: "Choose today or a future date" });
        }

        db.get("SELECT patient_id FROM patients WHERE patient_id = ?", [patient_id], (err, patient) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            if (!patient) {
                return res.status(404).json({ message: "Patient not found" });
            }

            db.get("SELECT * FROM doctors WHERE doctor_id = ?", [doctor_id], (doctorErr, doctor) => {
                if (doctorErr) {
                    return res.status(500).json({ error: doctorErr.message });
                }
                if (!doctor) {
                    return res.status(404).json({ message: "Doctor not found" });
                }
                if (!doctorWorksOn(doctor.availability, appointment_date)) {
                    return res.status(409).json({
                        message: "Booking rejected",
                        reason: `${doctor.name} is not available on ${dayName(appointment_date)}`
                    });
                }

                db.get(
                    `SELECT appointment_id FROM appointments
                     WHERE doctor_id = ? AND appointment_date = ? AND appointment_time = ? AND status = 'Booked'`,
                    [doctor_id, appointment_date, appointment_time],
                    (slotErr, existing) => {
                        if (slotErr) {
                            return res.status(500).json({ error: slotErr.message });
                        }
                        if (existing) {
                            return res.status(409).json({ message: "Booking rejected" });
                        }

                        db.run(
                            `INSERT INTO appointments
                             (patient_id, doctor_id, appointment_date, appointment_time, status)
                             VALUES (?, ?, ?, ?, 'Booked')`,
                            [patient_id, doctor_id, appointment_date, appointment_time],
                            function (insertErr) {
                                if (insertErr) {
                                    if (insertErr.code === "SQLITE_CONSTRAINT") {
                                        return res.status(409).json({ message: "Booking rejected" });
                                    }
                                    return res.status(500).json({ error: insertErr.message });
                                }

                                const profile = decorateDoctor(doctor);
                                res.status(201).json({
                                    message: "Appointment confirmed",
                                    appointment_id: this.lastID,
                                    appointment: {
                                        appointment_id: this.lastID,
                                        patient_id,
                                        doctor_id,
                                        doctor_name: doctor.name,
                                        specialization: doctor.specialization,
                                        qualification: doctor.qualification,
                                        experience: profile.experience,
                                        fee: profile.fee,
                                        appointment_date,
                                        appointment_time,
                                        status: "Booked"
                                    }
                                });
                            }
                        );
                    }
                );
            });
        });
    });

    router.get("/appointments", (req, res) => {
        const patientId = req.query.patient_id;
        if (!patientId) {
            return res.status(400).json({ message: "Patient id is required" });
        }

        db.all(
            `${appointmentSelect} WHERE a.patient_id = ? ORDER BY a.appointment_date, a.appointment_time`,
            [patientId],
            (err, rows) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json(rows.map(decorateAppointment));
            }
        );
    });

    router.put("/appointments/:id/cancel", (req, res) => {
        const { patient_id } = req.body;
        if (!patient_id) {
            return res.status(400).json({ message: "Patient id is required" });
        }

        db.run(
            `UPDATE appointments
             SET status = 'Cancelled'
             WHERE appointment_id = ? AND patient_id = ? AND status = 'Booked'`,
            [req.params.id, patient_id],
            function (err) {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                if (this.changes === 0) {
                    return res.status(404).json({
                        message: "Booked appointment not found for this patient"
                    });
                }
                res.json({ message: "Appointment cancelled" });
            }
        );
    });

    return router;
};
