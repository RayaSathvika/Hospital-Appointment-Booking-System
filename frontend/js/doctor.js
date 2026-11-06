const id = new URLSearchParams(window.location.search).get("id");
const box = document.getElementById("doctor");

if (!id) {
    box.append(el("p", "empty", "Choose a doctor from search."));
} else {
    api(`/api/doctors/${id}`).then((result) => {
        if (!result.ok) {
            box.append(el("p", "empty", "Doctor details could not be loaded."));
            return;
        }
        const doctor = result.data;
        box.append(el("div", "mini-avatar", initials(doctor.name)));
        box.append(el("h1", "", doctor.name));
        box.append(el("p", "muted", doctor.specialization));
        const grid = el("div", "profile-grid");
        [
            ["Experience", doctor.experience],
            ["Consultation Fee", formatFee(doctor.fee)],
            ["Specialization", doctor.specialization],
            ["Qualification", doctor.qualification],
            ["Availability", doctor.availability],
            ["Location", doctor.location]
        ].forEach(([label, value]) => {
            const item = el("article");
            item.append(el("span", "", label));
            item.append(el("strong", "", value));
            grid.append(item);
        });
        box.append(grid);
        box.append(el("h3", "", "About"));
        box.append(el("p", "", doctor.about));
        const book = el("a", "button", "Book Appointment");
        book.href = `book.html?doctor=${doctor.doctor_id}`;
        book.style.marginTop = "8px";
        box.append(book);
    });
}
