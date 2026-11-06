document.getElementById("login-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = document.getElementById("message");
    const form = event.currentTarget;

    const result = await api("/api/login", {
        method: "POST",
        body: JSON.stringify({
            email: form.email.value.trim(),
            password: form.password.value
        })
    });

    if (!result.ok) {
        showMessage(message, result.data.message || "Login failed", "error");
        return;
    }

    setPatient(result.data.patient);
    window.location.href = "dashboard.html";
});
