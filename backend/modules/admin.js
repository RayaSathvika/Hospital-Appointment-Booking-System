const express = require("express");
const crypto = require("crypto");

module.exports = function adminModule({ db, bcrypt, decorateAppointment, appointmentSelect }) {
    const router = express.Router();
    const adminTokens = new Set();

    function requireAdmin(req, res, next) {
        const token = req.get("x-admin-token");
        if (!token || !adminTokens.has(token)) {
            return res.status(401).json({ message: "Admin login required" });
        }
        next();
    }

    router.post("/admin/login", (req, res) => {
        const { username, password } = req.body;
        if (!username || !password) {
            return res.status(400).json({ message: "Username and password are required" });
        }

        db.get(
            "SELECT * FROM admins WHERE username = ?",
            [username.trim()],
            async (err, admin) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                if (!admin) {
                    return res.status(401).json({ message: "Invalid admin credentials" });
                }

                const matches = await bcrypt.compare(password, admin.password);
                if (!matches) {
                    return res.status(401).json({ message: "Invalid admin credentials" });
                }

                const token = crypto.randomBytes(24).toString("hex");
                adminTokens.add(token);
                res.json({
                    message: "Admin login successful",
                    token,
                    admin: { username: admin.username }
                });
            }
        );
    });

    router.get("/admin/appointments", requireAdmin, (req, res) => {
        db.all(
            `${appointmentSelect} ORDER BY a.appointment_date DESC, a.appointment_time`,
            [],
            (err, rows) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json(rows.map(decorateAppointment));
            }
        );
    });

    router.get("/admin/patients", requireAdmin, (req, res) => {
        db.all(
            "SELECT patient_id, name, email, phone FROM patients ORDER BY patient_id DESC",
            [],
            (err, rows) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                res.json(rows);
            }
        );
    });

    router.put("/admin/appointments/:id", requireAdmin, (req, res) => {
        const { status } = req.body;
        const allowed = ["Booked", "Cancelled", "Completed"];
        if (!allowed.includes(status)) {
            return res.status(400).json({ message: "Status must be Booked, Cancelled, or Completed" });
        }

        db.run(
            "UPDATE appointments SET status = ? WHERE appointment_id = ?",
            [status, req.params.id],
            function (err) {
                if (err) {
                    if (err.code === "SQLITE_CONSTRAINT") {
                        return res.status(409).json({ message: "That slot is already booked" });
                    }
                    return res.status(500).json({ error: err.message });
                }
                if (this.changes === 0) {
                    return res.status(404).json({ message: "Appointment not found" });
                }
                res.json({ message: "Appointment updated", status });
            }
        );
    });

    return router;
};
