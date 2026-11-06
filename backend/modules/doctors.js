const express = require("express");

module.exports = function doctorsModule({ db, decorateDoctor, doctorWorksOn, SLOTS }) {
    const router = express.Router();

    router.get("/specializations", (req, res) => {
        db.all(
            "SELECT DISTINCT specialization FROM doctors ORDER BY specialization",
            [],
            (err, rows) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json(rows.map((row) => row.specialization));
            }
        );
    });

    router.get("/doctors", (req, res) => {
        db.all("SELECT * FROM doctors ORDER BY name", [], (err, rows) => {
            if (err) {
                return res.status(500).json({ error: err.message });
            }
            res.json(rows.map(decorateDoctor));
        });
    });

    router.get("/doctors/search", (req, res) => {
        const specialization = (req.query.specialization || "").trim();
        const location = (req.query.location || "").trim();

        if (!specialization) {
            return res.status(400).json({ message: "Please provide a specialization" });
        }

        if (location && location.toLowerCase() !== "hyderabad") {
            return res.json([]);
        }

        db.all(
            "SELECT * FROM doctors WHERE specialization LIKE ? ORDER BY name",
            [`%${specialization}%`],
            (err, rows) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json(rows.map(decorateDoctor));
            }
        );
    });

    router.get("/doctors/:id", (req, res) => {
        db.get(
            "SELECT * FROM doctors WHERE doctor_id = ?",
            [req.params.id],
            (err, doctor) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                if (!doctor) {
                    return res.status(404).json({ message: "Doctor not found" });
                }
                res.json(decorateDoctor(doctor));
            }
        );
    });

    router.get("/doctors/:id/slots", (req, res) => {
        const { date } = req.query;
        if (!date) {
            return res.status(400).json({ message: "Please provide a date" });
        }

        db.get(
            "SELECT * FROM doctors WHERE doctor_id = ?",
            [req.params.id],
            (err, doctor) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                if (!doctor) {
                    return res.status(404).json({ message: "Doctor not found" });
                }

                const works = doctorWorksOn(doctor.availability, date);
                db.all(
                    `SELECT appointment_time FROM appointments
                     WHERE doctor_id = ? AND appointment_date = ? AND status = 'Booked'`,
                    [req.params.id, date],
                    (slotErr, rows) => {
                        if (slotErr) {
                            return res.status(500).json({ error: slotErr.message });
                        }
                        const taken = new Set(rows.map((row) => row.appointment_time));
                        res.json({
                            doctor: decorateDoctor(doctor),
                            works,
                            slots: SLOTS.map((time) => ({
                                time,
                                status: !works || taken.has(time) ? "Occupied" : "Available"
                            }))
                        });
                    }
                );
            }
        );
    });

    return router;
};
