/* Páginas secundarias: solo tema y año */
(() => {
  const root = document.documentElement;
  const meta = document.querySelector('meta[name="theme-color"]');
  const sync = () => {
    const dark = root.dataset.theme === "dark";
    document.querySelectorAll(".theme-toggle").forEach((b) => b.setAttribute("aria-label", dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"));
    if (meta) meta.content = dark ? "#0a0a0a" : "#ffffff";
  };
  sync();
  document.querySelectorAll(".theme-toggle").forEach((b) => b.addEventListener("click", () => {
    const next = root.dataset.theme === "dark" ? "light" : "dark";
    try { localStorage.setItem("theme", next); } catch {}
    const apply = () => { root.dataset.theme = next; sync(); };
    if (document.startViewTransition && !matchMedia("(prefers-reduced-motion: reduce)").matches) document.startViewTransition(apply);
    else apply();
  }));
  document.querySelectorAll("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
})();
