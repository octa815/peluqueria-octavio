/* Peluquería Octavio — interacción */
(() => {
  "use strict";

  const $ = (s, c = document) => c.querySelector(s);
  const $$ = (s, c = document) => [...c.querySelectorAll(s)];
  const root = document.documentElement;
  const reduceMotion = matchMedia("(prefers-reduced-motion: reduce)");
  const finePointer = matchMedia("(hover: hover) and (pointer: fine)");
  const store = {
    get(k) { try { return localStorage.getItem(k); } catch { return null; } },
    set(k, v) { try { localStorage.setItem(k, v); } catch {} },
  };

  /* ---------- Tema ---------- */
  const themeMeta = $('meta[name="theme-color"]');
  function syncTheme() {
    const dark = root.dataset.theme === "dark";
    $$(".theme-toggle").forEach((b) =>
      b.setAttribute("aria-label", dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"));
    if (themeMeta) themeMeta.content = dark ? "#121010" : "#f5f1ea";
  }
  syncTheme();

  $$(".theme-toggle").forEach((btn) =>
    btn.addEventListener("click", () => {
      const next = root.dataset.theme === "dark" ? "light" : "dark";
      store.set("theme", next);
      const apply = () => { root.dataset.theme = next; syncTheme(); };
      if (document.startViewTransition && !reduceMotion.matches) {
        document.startViewTransition(apply);
      } else {
        root.classList.add("theme-swap");
        apply();
        setTimeout(() => root.classList.remove("theme-swap"), 300);
      }
    }));

  matchMedia("(prefers-color-scheme: dark)").addEventListener("change", (e) => {
    if (!store.get("theme")) { root.dataset.theme = e.matches ? "dark" : "light"; syncTheme(); }
  });

  /* ---------- Menú móvil ---------- */
  const nav = $("#nav");
  const menuBtn = $(".menu-toggle");
  function setMenu(open) {
    nav.classList.toggle("is-open", open);
    menuBtn.setAttribute("aria-expanded", String(open));
    menuBtn.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
  }
  menuBtn.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
  $$("a", nav).forEach((a) => a.addEventListener("click", () => setMenu(false)));
  document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

  /* ---------- Scroll: cabecera, progreso, parallax ---------- */
  const header = $(".site-header");
  const progress = $(".progress");
  const heroVisual = $(".hero-visual");
  const sign = $(".am-sign");
  let ticking = false;
  function onScroll() {
    ticking = false;
    const y = scrollY;
    header.classList.toggle("is-scrolled", y > 8);
    const max = document.documentElement.scrollHeight - innerHeight;
    progress.style.setProperty("--p", max > 0 ? (y / max).toFixed(4) : 0);
    if (heroVisual && !reduceMotion.matches && y < innerHeight * 1.2) {
      heroVisual.style.setProperty("--py", `${(y * 0.12).toFixed(1)}px`);
    }
    if (sign && !reduceMotion.matches) {
      const r = sign.parentElement.getBoundingClientRect();
      if (r.bottom > 0 && r.top < innerHeight) {
        const t = (r.top + r.height / 2 - innerHeight / 2) / innerHeight; // -1…1
        sign.style.setProperty("--sy", `${(t * 40).toFixed(1)}px`);
      }
    }
  }
  addEventListener("scroll", () => {
    if (!ticking) { ticking = true; requestAnimationFrame(onScroll); }
  }, { passive: true });
  onScroll();

  /* ---------- Apariciones al hacer scroll ---------- */
  const revealEls = $$("[data-reveal]");
  if ("IntersectionObserver" in window) {
    // Escalonado entre hermanos que entran juntos
    const io = new IntersectionObserver((entries) => {
      const incoming = entries.filter((e) => e.isIntersecting).map((e) => e.target);
      incoming.forEach((el, i) => {
        el.style.setProperty("--d", `${Math.min(i, 6) * 60}ms`);
        el.classList.add("is-revealing", "is-in");
        io.unobserve(el);
        // Al terminar, se quita la transición de entrada: el hover no hereda el retraso
        setTimeout(() => { el.classList.remove("is-revealing"); el.style.removeProperty("--d"); }, 1200);
      });
    }, { rootMargin: "0px 0px -8% 0px", threshold: 0.12 });
    revealEls.forEach((el) => io.observe(el));
  } else {
    revealEls.forEach((el) => el.classList.add("is-in"));
  }

  /* ---------- Sección activa en el menú ---------- */
  const links = $$(".nav a");
  const sections = links.map((a) => $(a.getAttribute("href"))).filter(Boolean);
  if ("IntersectionObserver" in window) {
    const spy = new IntersectionObserver((entries) => {
      entries.forEach((e) => {
        if (!e.isIntersecting) return;
        links.forEach((a) => a.classList.toggle("is-active", a.getAttribute("href") === `#${e.target.id}`));
      });
    }, { rootMargin: "-45% 0px -50% 0px" });
    sections.forEach((s) => spy.observe(s));
  }

  /* ---------- Botón flotante: se oculta sobre el hero y el contacto ---------- */
  const floatCall = $(".float-call");
  if (floatCall && "IntersectionObserver" in window) {
    const watched = [$(".hero"), $("#contacto")].filter(Boolean);
    const visible = new Set();
    const fo = new IntersectionObserver((entries) => {
      entries.forEach((e) => (e.isIntersecting ? visible.add(e.target) : visible.delete(e.target)));
      floatCall.classList.toggle("is-hidden", visible.size > 0);
    }, { threshold: 0.15 });
    watched.forEach((el) => fo.observe(el));
  }

  /* ---------- Botones magnéticos (solo ratón) ---------- */
  if (finePointer.matches && !reduceMotion.matches) {
    $$(".magnetic").forEach((el) => {
      el.style.transition += ", translate 400ms cubic-bezier(0.23, 1, 0.32, 1)";
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        const x = (e.clientX - r.left - r.width / 2) * 0.18;
        const y = (e.clientY - r.top - r.height / 2) * 0.28;
        el.style.translate = `${x.toFixed(1)}px ${y.toFixed(1)}px`;
      });
      el.addEventListener("pointerleave", () => { el.style.translate = "0 0"; });
    });
  }

  /* ---------- Carta de color: toque en móvil ---------- */
  $$(".sw").forEach((sw) =>
    sw.addEventListener("click", () => {
      $$(".sw.is-lit").forEach((o) => o !== sw && o.classList.remove("is-lit"));
      sw.classList.toggle("is-lit");
    }));

  /* ---------- Abierto / cerrado (hora de Madrid) ---------- */
  // 0 = domingo … 6 = sábado. Tramos en minutos desde medianoche.
  const HOURS = {
    2: [[540, 780], [900, 1200]],
    3: [[540, 780], [900, 1200]],
    4: [[540, 780], [900, 1200]],
    5: [[540, 780], [900, 1200]],
    6: [[480, 840]],
  };
  const DAY_NAMES = ["domingo", "lunes", "martes", "miércoles", "jueves", "viernes", "sábado"];
  const fmt = (m) => `${Math.floor(m / 60)}:${String(m % 60).padStart(2, "0")}`;

  function madridNow() {
    const parts = new Intl.DateTimeFormat("en-GB", {
      timeZone: "Europe/Madrid", weekday: "short", hour: "2-digit", minute: "2-digit", hourCycle: "h23",
    }).formatToParts(new Date());
    const get = (t) => parts.find((p) => p.type === t).value;
    const day = ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday"));
    return { day, min: Number(get("hour")) * 60 + Number(get("minute")) };
  }

  function statusText() {
    const { day, min } = madridNow();
    const today = HOURS[day] || [];
    const open = today.find(([a, b]) => min >= a && min < b);
    if (open) return { open: true, text: `Abierto ahora · hasta las ${fmt(open[1])}` };

    const later = today.find(([a]) => min < a);
    if (later) return { open: false, text: `Cerrado · abrimos a las ${fmt(later[0])}` };

    for (let i = 1; i <= 7; i++) {
      const d = (day + i) % 7;
      if (HOURS[d]) {
        const when = i === 1 ? "mañana" : `el ${DAY_NAMES[d]}`;
        return { open: false, text: `Cerrado · abrimos ${when} a las ${fmt(HOURS[d][0][0])}` };
      }
    }
    return { open: false, text: "Cerrado" };
  }

  function paintStatus() {
    const s = statusText();
    $$("[data-status]").forEach((el) => {
      el.classList.toggle("is-open", s.open);
      $(".status-text", el).textContent = s.text;
    });
    const { day } = madridNow();
    $$(".hours tr").forEach((tr) => tr.classList.toggle("is-today", Number(tr.dataset.day) === day));
  }
  paintStatus();
  setInterval(paintStatus, 60_000);

  /* ---------- Visor de trabajos ---------- */
  const lb = $(".lightbox");
  const works = $$(".work-btn");
  if (lb && works.length && typeof lb.showModal === "function") {
    const lbImg = $("img", lb);
    const lbCap = $("figcaption", lb);
    let idx = 0;
    let opener = null;

    function show(i) {
      idx = (i + works.length) % works.length;
      const btn = works[idx];
      const thumb = $("img", btn);
      lbImg.classList.add("is-loading");
      lbImg.alt = thumb.alt;
      lbImg.src = btn.dataset.full;
      lbCap.textContent = `${thumb.alt} · ${idx + 1}/${works.length}`;
    }
    lbImg.addEventListener("load", () => lbImg.classList.remove("is-loading"));

    works.forEach((btn, i) => btn.addEventListener("click", () => {
      opener = btn;
      show(i);
      lb.showModal();
      document.body.style.overflow = "hidden";
    }));
    $(".lb-prev", lb).addEventListener("click", () => show(idx - 1));
    $(".lb-next", lb).addEventListener("click", () => show(idx + 1));
    $(".lb-close", lb).addEventListener("click", () => lb.close());
    lb.addEventListener("click", (e) => { if (e.target === lb || e.target.tagName === "FIGURE") lb.close(); });
    lb.addEventListener("keydown", (e) => {
      if (e.key === "ArrowLeft") show(idx - 1);
      if (e.key === "ArrowRight") show(idx + 1);
    });
    lb.addEventListener("close", () => {
      document.body.style.overflow = "";
      opener?.focus({ preventScroll: true });
    });

    // Deslizar en móvil
    let x0 = null;
    lb.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
    lb.addEventListener("touchend", (e) => {
      if (x0 === null) return;
      const dx = e.changedTouches[0].clientX - x0;
      if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
      x0 = null;
    });
  }

  /* ---------- Año ---------- */
  $$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));
})();
