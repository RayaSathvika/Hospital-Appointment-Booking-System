document.getElementById("register-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const message = document.getElementById("message");
    const form = event.currentTarget;

    if (form.password.value !== form.confirm.value) {
        showMessage(message, "Passwords do not match", "error");
        return;
    }

    const result = await api("/api/register", {
        method: "POST",
        body: JSON.stringify({
            name: form.name.value.trim(),
            email: form.email.value.trim(),
            phone: form.phone.value.trim(),
            password: form.password.value
        })
    });

    if (!result.ok) {
        showMessage(message, result.data.message || "Registration failed", "error");
        return;
    }

    showMessage(message, "Registration successful", "ok");
    form.reset();
});
