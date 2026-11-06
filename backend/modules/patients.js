const express = require("express");

module.exports = function patientsModule({ db, bcrypt }) {
    const router = express.Router();

    router.post("/register", async (req, res) => {
        const { name, email, password, phone } = req.body;

        if (!name || !email || !password || !phone) {
            return res.status(400).json({ message: "All fields are required" });
        }

        try {
            const hashedPassword = await bcrypt.hash(password, 10);
            db.run(
                `INSERT INTO patients (name, email, password, phone)
                 VALUES (?, ?, ?, ?)`,
                [name.trim(), email.trim().toLowerCase(), hashedPassword, phone.trim()],
                function (err) {
                    if (err) {
                        if (err.code === "SQLITE_CONSTRAINT") {
                            return res.status(409).json({ message: "Email already registered" });
                        }
                        return res.status(500).json({ error: err.message });
                    }

                    res.status(201).json({
                        message: "Registration successful",
                        patient_id: this.lastID
                    });
                }
            );
        } catch (err) {
            res.status(500).json({ error: "Registration failed" });
        }
    });

    router.post("/login", (req, res) => {
        const { email, password } = req.body;

        if (!email || !password) {
            return res.status(400).json({ message: "Email and password are required" });
        }

        db.get(
            "SELECT * FROM patients WHERE email = ?",
            [email.trim().toLowerCase()],
            async (err, patient) => {
                if (err) {
                    return res.status(500).json({ error: err.message });
                }
                if (!patient) {
                    return res.status(401).json({ message: "Invalid email or password" });
                }

                try {
                    const isMatch = await bcrypt.compare(password, patient.password);
                    if (!isMatch) {
                        return res.status(401).json({ message: "Invalid email or password" });
                    }

                    res.json({
                        message: "Login successful",
                        patient: {
                            patient_id: patient.patient_id,
                            name: patient.name,
                            email: patient.email,
                            phone: patient.phone
                        }
                    });
                } catch (error) {
                    res.status(500).json({ error: "Login failed" });
                }
            }
        );
    });

    return router;
};
