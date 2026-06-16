const header = document.getElementById("header");
const menuButton = document.getElementById("menu-button");
const navMenu = document.getElementById("nav-menu");
const backToTop = document.getElementById("back-to-top");
const revealElements = document.querySelectorAll(".reveal");

window.addEventListener("scroll", () => {
  if (window.scrollY > 40) {
    header.classList.add("scrolled");
    backToTop.classList.add("active");
  } else {
    header.classList.remove("scrolled");
    backToTop.classList.remove("active");
  }

  revealOnScroll();
});

menuButton.addEventListener("click", () => {
  navMenu.classList.toggle("active");

  const icon = menuButton.querySelector("i");

  if (navMenu.classList.contains("active")) {
    icon.classList.remove("fa-bars");
    icon.classList.add("fa-xmark");
  } else {
    icon.classList.remove("fa-xmark");
    icon.classList.add("fa-bars");
  }
});

document.querySelectorAll(".nav-menu a").forEach((link) => {
  link.addEventListener("click", () => {
    navMenu.classList.remove("active");

    const icon = menuButton.querySelector("i");
    icon.classList.remove("fa-xmark");
    icon.classList.add("fa-bars");
  });
});

backToTop.addEventListener("click", () => {
  window.scrollTo({
    top: 0,
    behavior: "smooth",
  });
});

function revealOnScroll() {
  revealElements.forEach((element) => {
    const windowHeight = window.innerHeight;
    const elementTop = element.getBoundingClientRect().top;
    const revealPoint = 120;

    if (elementTop < windowHeight - revealPoint) {
      element.classList.add("active");
    }
  });
}

revealOnScroll();