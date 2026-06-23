const elements = document.querySelectorAll(
    ".section-title, .card, .doctor-card, .contato-box"
);

elements.forEach((element) => {
    element.classList.add("reveal");
});

function revealOnScroll() {
    elements.forEach((element) => {
        const elementTop = element.getBoundingClientRect().top;
        const windowHeight = window.innerHeight;

        if (elementTop < windowHeight - 90) {
            element.classList.add("active");
        }
    });
}

window.addEventListener("scroll", revealOnScroll);
window.addEventListener("load", revealOnScroll);