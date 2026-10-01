document.addEventListener("DOMContentLoaded", () => {
  const currentPath = window.location.pathname;
  const activeLinks = document.querySelectorAll(`nav a[href="${currentPath}"]`);
  activeLinks.forEach((link) => link.classList.add("active"));
});
