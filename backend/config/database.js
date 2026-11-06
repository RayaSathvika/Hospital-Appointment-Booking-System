
const sqlite3 = require("sqlite3").verbose();
const path = require("path");
const fs = require("fs");

const databaseFolder = path.join(__dirname, "../../database");

if (!fs.existsSync(databaseFolder)) {
    fs.mkdirSync(databaseFolder, { recursive: true });
}

const dbPath = path.join(databaseFolder, "hospital.db");

const db = new sqlite3.Database(dbPath, (err) => {
    if (err) {
        console.error("Database connection failed:", err.message);
    } else {
        console.log("Connected to Hospital Appointment Database.");

        db.run("PRAGMA foreign_keys = ON");
    }
});

module.exports = db;
