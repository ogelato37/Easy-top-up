/* ----------------------
    NAVIGATION LOGIC
---------------------- */
const hamburger = document.getElementById('hamburger');
const navLinks = document.getElementById('navLinks');
const overlay = document.getElementById('navOverlay');

hamburger.addEventListener('click', () => {
    navLinks.classList.toggle('open');
    overlay.classList.toggle('show');
    document.body.style.overflow = navLinks.classList.contains('open') ? "hidden" : "";
});

overlay.addEventListener('click', () => {
    navLinks.classList.remove('open');
    overlay.classList.remove('show');
    document.body.style.overflow = "";
});

window.addEventListener("load", () => {
    const loader = document.getElementById("loader");
    loader.classList.add("hide");

    setTimeout(() => {
        loader.style.display = "none";
    }, 1000);
});