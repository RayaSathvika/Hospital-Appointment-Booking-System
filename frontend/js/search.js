function doctorRow(doctor) {
    const row = el("article", "doctor-row");
    row.append(el("div", "mini-avatar", initials(doctor.name)));
    const text = el("div");
    const title = el("h3", "", doctor.name);
    const link = document.createElement("a");
    link.href = `doctor.html?id=${doctor.doctor_id}`;
    link.append(title);
    text.append(link);
    text.append(el("div", "muted", `${doctor.specialization} · ${doctor.experience} experience`));
    row.append(text);
    row.append(el("div", "fee", formatFee(doctor.fee)));
    const book = el("a", "button", "Book Appointment");
    book.href = `book.html?doctor=${doctor.doctor_id}`;
    row.append(book);
    return row;
}

api("/api/specializations").then((result) => {
    if (!result.ok) {
        return;
    }
    const list = document.getElementById("specialization-list");
    result.data.forEach((name) => {
        const option = document.createElement("option");
        option.value = name;
        list.append(option);
    });
});

document.getElementById("search-form").addEventListener("submit", async (event) => {
    event.preventDefault();
    const term = document.getElementById("specialization").value.trim();
    const location = document.getElementById("location").value;
    const message = document.getElementById("message");
    const results = document.getElementById("results");
    results.textContent = "";

    const result = await api(`/api/doctors/search?specialization=${encodeURIComponent(term)}&location=${encodeURIComponent(location)}`);
    if (!result.ok) {
        showMessage(message, result.data.message || "Search failed", "error");
        return;
    }
    if (!result.data.length) {
        showMessage(message, "No doctors match that specialization.", "error");
        return;
    }

    showMessage(message, "Doctor details displayed", "ok");
    result.data.forEach((doctor) => results.append(doctorRow(doctor)));
});
