const patient = requirePatient();
if (!patient) {
    throw new Error("Sign in required");
}

document.getElementById("profile-initials").textContent = initials(patient.name);
document.getElementById("profile-name").textContent = patient.name;
document.getElementById("profile-email").textContent = patient.email;
document.getElementById("profile-phone").textContent = patient.phone;
document.getElementById("profile-id").textContent = String(patient.patient_id);
