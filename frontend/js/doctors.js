function doctorCard(doctor) {
    const row = el("article", "doctor-row");
    row.append(el("div", "mini-avatar", initials(doctor.name)));
    const text = el("div");
    const title = document.createElement("a");
    title.href = `doctor.html?id=${doctor.doctor_id}`;
    title.append(el("h3", "", doctor.name));
    text.append(title);
    text.append(el("div", "muted", `${doctor.specialization} · ${doctor.qualification}`));
    text.append(el("div", "muted", `${doctor.experience} experience · ${doctor.availability} · ${doctor.location}`));
    row.append(text);
    row.append(el("div", "fee", formatFee(doctor.fee)));
    const book = el("a", "button", "Book Appointment");
    book.href = `book.html?doctor=${doctor.doctor_id}`;
    row.append(book);
    return row;
}

api("/api/doctors").then((result) => {
    const board = document.getElementById("doctors");
    if (!result.ok) {
        board.append(el("p", "empty", "Doctor details could not be loaded."));
        return;
    }
    result.data.forEach((doctor) => board.append(doctorCard(doctor)));
});
