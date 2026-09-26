/* Peluquería Octavio — interacción y movimiento
   GSAP + ScrollTrigger para la coreografía, Lenis para el scroll suave, Three.js para las tijeras. */

const $ = (s, c = document) => c.querySelector(s);
const $$ = (s, c = document) => [...c.querySelectorAll(s)];
const root = document.documentElement;
const reduce = matchMedia("(prefers-reduced-motion: reduce)").matches;
const finePointer = matchMedia("(hover: hover) and (pointer: fine)").matches;
const store = {
  get(k) { try { return localStorage.getItem(k); } catch { return null; } },
  set(k, v) { try { localStorage.setItem(k, v); } catch {} },
};
const clamp = (v, a, b) => Math.min(b, Math.max(a, v));
const lerp = (a, b, t) => a + (b - a) * t;

/* =====================================================================
   Básicos (funcionan sin GSAP)
   ===================================================================== */

/* ---------- Tema ---------- */
const themeMeta = $('meta[name="theme-color"]');
function syncTheme() {
  const dark = root.dataset.theme === "dark";
  $$(".theme-toggle").forEach((b) => b.setAttribute("aria-label", dark ? "Cambiar a modo claro" : "Cambiar a modo oscuro"));
  if (themeMeta) themeMeta.content = dark ? "#0a0a0a" : "#ffffff";
}
syncTheme();
$$(".theme-toggle").forEach((btn) => btn.addEventListener("click", () => {
  const next = root.dataset.theme === "dark" ? "light" : "dark";
  store.set("theme", next);
  const apply = () => { root.dataset.theme = next; syncTheme(); };
  if (document.startViewTransition && !reduce) document.startViewTransition(apply);
  else apply();
}));

/* ---------- Año ---------- */
$$("[data-year]").forEach((el) => (el.textContent = new Date().getFullYear()));

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
  return {
    day: ["Sun", "Mon", "Tue", "Wed", "Thu", "Fri", "Sat"].indexOf(get("weekday")),
    min: Number(get("hour")) * 60 + Number(get("minute")),
  };
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
    const t = $(".status-text", el);
    if (t) t.textContent = s.text;
  });
  const { day } = madridNow();
  $$(".hours tr").forEach((tr) => tr.classList.toggle("is-today", Number(tr.dataset.day) === day));
}

/* ---------- Mapa bajo demanda (sin cookies de Google hasta que se pide) ---------- */
$$(".map").forEach((map) => {
  const btn = $(".map-load", map);
  btn?.addEventListener("click", () => {
    const f = document.createElement("iframe");
    f.title = "Mapa: Peluquería Octavio en Elda";
    f.loading = "lazy";
    f.referrerPolicy = "no-referrer-when-downgrade";
    f.src = map.dataset.mapSrc;
    map.append(f);
    btn.remove();
  });
});

/* ---------- Carta de color: toque ---------- */
$$(".sw").forEach((sw) => sw.addEventListener("click", () => {
  $$(".sw.is-lit").forEach((o) => o !== sw && o.classList.remove("is-lit"));
  sw.classList.toggle("is-lit");
}));

/* ---------- Visor de trabajos ---------- */
const lb = $(".lightbox");
const works = $$(".work-btn");
let lenis = null;
if (lb && works.length && typeof lb.showModal === "function") {
  const lbImg = $("img", lb);
  const lbCap = $("figcaption", lb);
  let idx = 0, opener = null;
  const show = (i) => {
    idx = (i + works.length) % works.length;
    const thumb = $("img", works[idx]);
    lbImg.classList.add("is-loading");
    lbImg.alt = thumb.alt;
    lbImg.src = works[idx].dataset.full;
    lbCap.textContent = `${thumb.alt} · ${idx + 1}/${works.length}`;
  };
  lbImg.addEventListener("load", () => lbImg.classList.remove("is-loading"));
  works.forEach((btn, i) => btn.addEventListener("click", () => {
    opener = btn;
    show(i);
    lb.showModal();
    lenis?.stop();
  }));
  $(".lb-prev", lb).addEventListener("click", () => show(idx - 1));
  $(".lb-next", lb).addEventListener("click", () => show(idx + 1));
  $(".lb-close", lb).addEventListener("click", () => lb.close());
  lb.addEventListener("click", (e) => { if (e.target === lb || e.target.tagName === "FIGURE") lb.close(); });
  lb.addEventListener("keydown", (e) => {
    if (e.key === "ArrowLeft") show(idx - 1);
    if (e.key === "ArrowRight") show(idx + 1);
  });
  lb.addEventListener("close", () => { lenis?.start(); opener?.focus({ preventScroll: true }); });
  let x0 = null;
  lb.addEventListener("touchstart", (e) => { x0 = e.touches[0].clientX; }, { passive: true });
  lb.addEventListener("touchend", (e) => {
    if (x0 === null) return;
    const dx = e.changedTouches[0].clientX - x0;
    if (Math.abs(dx) > 50) show(idx + (dx < 0 ? 1 : -1));
    x0 = null;
  });
}

/* ---------- Menú móvil ---------- */
const nav = $("#nav");
const menuBtn = $(".menu-toggle");
function setMenu(open) {
  if (!nav || !menuBtn) return;
  nav.classList.toggle("is-open", open);
  menuBtn.setAttribute("aria-expanded", String(open));
  menuBtn.setAttribute("aria-label", open ? "Cerrar menú" : "Abrir menú");
  if (open) lenis?.stop(); else lenis?.start();
}
menuBtn?.addEventListener("click", () => setMenu(!nav.classList.contains("is-open")));
document.addEventListener("keydown", (e) => { if (e.key === "Escape") setMenu(false); });

/* =====================================================================
   Movimiento (GSAP)
   ===================================================================== */
const { gsap, ScrollTrigger } = window;

function initNoMotion() {
  // Sin GSAP o con movimiento reducido: todo visible, navegación nativa
  root.classList.add("works-native");
  $$("#nav a").forEach((a) => a.addEventListener("click", () => setMenu(false)));
  paintStatus();
  setInterval(paintStatus, 60_000);
}

if (!gsap || !ScrollTrigger || reduce) {
  initNoMotion();
  if (gsap && ScrollTrigger && reduce) initReduced();
} else {
  initMotion();
}

function initReduced() {
  // Movimiento reducido: fundidos suaves, sin desplazamientos ni pines
  gsap.registerPlugin(ScrollTrigger);
  [...new Set($$("[data-rise], [data-split], .svc, .tile"))].forEach((el) => {
    gsap.from(el, { opacity: 0, duration: 0.5, ease: "none", scrollTrigger: { trigger: el, start: "top 90%", once: true } });
  });
}

function splitWords(el) {
  // Parte el texto en palabras respetando <em>; devuelve los <span> interiores
  const out = [];
  const walk = (node, parent) => {
    [...node.childNodes].forEach((n) => {
      if (n.nodeType === 3) {
        n.textContent.split(/(\s+)/).forEach((part) => {
          if (!part) return;
          if (/^\s+$/.test(part)) { parent.append(document.createTextNode(" ")); return; }
          const w = document.createElement("span");
          w.className = "w";
          const inner = document.createElement("span");
          inner.textContent = part;
          w.append(inner);
          parent.append(w);
          out.push(inner);
        });
      } else if (n.nodeType === 1) {
        const clone = n.cloneNode(false);
        parent.append(clone);
        walk(n, clone);
      }
    });
  };
  const frag = document.createDocumentFragment();
  walk(el, frag);
  el.setAttribute("aria-label", el.textContent.replace(/\s+/g, " ").trim());
  el.replaceChildren(frag);
  [...el.children].forEach((c) => c.setAttribute("aria-hidden", "true"));
  return out;
}

function initMotion() {
  gsap.registerPlugin(ScrollTrigger);
  // En móvil la barra de direcciones cambia la altura al hacer scroll: no recalcular por eso (evita saltos)
  ScrollTrigger.config({ ignoreMobileResize: true });
  gsap.defaults({ ease: "expo.out", duration: 1.1 });

  /* ---------- Scroll suave ---------- */
  if (window.Lenis) {
    lenis = new window.Lenis({ lerp: 0.085, wheelMultiplier: 0.95, smoothWheel: true });
    lenis.on("scroll", ScrollTrigger.update);
    gsap.ticker.add((t) => lenis.raf(t * 1000));
    gsap.ticker.lagSmoothing(0);
  }
  $$('a[href^="#"]').forEach((a) => a.addEventListener("click", (e) => {
    const id = a.getAttribute("href");
    const target = id === "#top" ? 0 : $(id);
    if (target === null) return;
    e.preventDefault();
    setMenu(false);
    if (lenis) lenis.scrollTo(target, { offset: id === "#top" ? 0 : -10, duration: 1.4, easing: (t) => 1 - Math.pow(1 - t, 4) });
    else if (target === 0) window.scrollTo(0, 0);
    else target.scrollIntoView();
    history.replaceState(null, "", id);
  }));

  paintStatus();
  setInterval(paintStatus, 60_000);

  /* ---------- Tijeras 3D (se cargan aparte; si fallan, todo sigue) ---------- */
  const canvas = $(".scissors-canvas");
  let sc = null;
  const scActive = new Set();
  const scShow = (id, on) => {
    on ? scActive.add(id) : scActive.delete(id);
    canvas.classList.toggle("is-on", scActive.size > 0);
    sc?.set({ visible: scActive.size > 0 });
  };
  const scReady = import("./scissors.js")
    .then((m) => { sc = m.createScissors(canvas); return sc; })
    .catch(() => null);

  const vw = () => window.innerWidth;
  const vh = () => window.innerHeight;
  const bigLen = () => (vw() < 700 ? vw() * 0.62 : Math.min(vw() * 0.3, 440));

  /* ---------- Portada: duplicar en dos mitades ---------- */
  const stage = $(".stage");
  const top = $(".half-top");
  const bot = document.createElement("div");
  bot.className = "half half-bot";
  bot.setAttribute("aria-hidden", "true");
  bot.inert = true;
  const heroClone = $(".hero", top).cloneNode(true);
  $$("[id]", heroClone).forEach((n) => n.removeAttribute("id"));
  $$("h1, h2, h3", heroClone).forEach((n) => n.remove());
  $$("img", heroClone).forEach((n) => n.removeAttribute("fetchpriority"));
  bot.append(heroClone);
  top.after(bot);
  root.classList.add("cut-ready");
  paintStatus();

  const floats = $$(".float");
  const logos = $$(".hero-logo");
  const rings = $$(".hl-ring");
  const texts = $$(".hl-text");
  const foots = $$(".hero-foot");

  /* ---------- Entrada al cargar ---------- */
  const intro = gsap.timeline({ defaults: { ease: "expo.out" } });
  intro
    .from(".hdr", { yPercent: -120, duration: 1.2, clearProps: "transform" }, 0.2)
    .from(rings, { rotate: -120, scale: 0.7, opacity: 0, duration: 1.8, transformOrigin: "50% 50%" }, 0)
    .from(texts, { y: 40, opacity: 0, duration: 1.4 }, 0.35)
    .from(floats, { scale: 0.4, opacity: 0, duration: 1.4, stagger: { each: 0.08, from: "random" } }, 0.45)
    .from(foots, { y: 30, opacity: 0, duration: 1 }, 0.8);

  // Anillo girando despacio siempre
  gsap.to(rings, { rotate: "+=360", duration: 60, ease: "none", repeat: -1, transformOrigin: "50% 50%", delay: 1.8 });

  /* ---------- Parallax con el ratón en la portada ---------- */
  if (finePointer) {
    const movers = floats.map((f) => ({
      d: Number(f.dataset.depth || 1),
      x: gsap.quickTo(f, "x", { duration: 1.2, ease: "power3.out" }),
      y: gsap.quickTo(f, "y", { duration: 1.2, ease: "power3.out" }),
    }));
    const lx = logos.map((l) => gsap.quickTo(l, "x", { duration: 1.6, ease: "power3.out" }));
    const ly = logos.map((l) => gsap.quickTo(l, "y", { duration: 1.6, ease: "power3.out" }));
    stage.addEventListener("pointermove", (e) => {
      const nx = e.clientX / vw() - 0.5;
      const ny = e.clientY / vh() - 0.5;
      movers.forEach((m) => { m.x(nx * 50 * m.d); m.y(ny * 36 * m.d); });
      lx.forEach((f) => f(nx * -12));
      ly.forEach((f) => f(ny * -8));
    });
  }

  /* ---------- El gran corte ---------- */
  const cutline = $(".cutline i");
  const underLines = $$(".under-title .line > span");
  gsap.set(underLines, { yPercent: 110 });
  gsap.set([".under-kicker", ".under-sub"], { opacity: 0, y: 20 });

  const cut = { p: 0, enter: 0 };
  function placeHeroScissors() {
    if (!sc) return;
    const len = bigLen();
    const W = vw();
    const startX = W < 700 ? W * -0.04 : W * 0.1;
    const x = lerp(lerp(-len * 0.8, startX, cut.enter), W + len * 0.9, cut.p);
    const snips = 6;
    const open = cut.p > 0 ? 0.5 - 0.5 * Math.cos(cut.p * Math.PI * 2 * snips) : 0.75;
    const y = stage.getBoundingClientRect().top + stage.offsetHeight / 2;
    sc.set({ x, y: y + Math.sin(cut.p * 40) * 2, len, open: 0.15 + open * 0.85, roll: Math.sin(cut.p * Math.PI * 2 * snips) });
    // La línea de corte llega hasta el cruce de las hojas
    cutline && gsap.set(cutline, { scaleX: clamp((x + len * 0.12) / W, 0, 1) * (cut.p > 0 ? 1 : 0) });
  }

  // Las tijeras entran solas al cargar y esperan en la línea
  scReady.then((s) => {
    if (!s) return;
    scShow("hero", window.scrollY < vh());
    gsap.to(cut, { enter: 1, duration: 1.6, delay: 0.9, ease: "expo.out", onUpdate: placeHeroScissors });
    placeHeroScissors();
  });

  const heroTl = gsap.timeline({
    scrollTrigger: {
      trigger: stage,
      start: "top top",
      end: () => "+=" + vh() * 1.9,
      pin: true,
      scrub: 0.7,
      anticipatePin: 1,
      invalidateOnRefresh: true,
      onToggle: (self) => scShow("hero", self.isActive || self.progress === 0),
      onUpdate: (self) => $(".hdr").classList.toggle("on-dark", self.progress > 0.6 && self.progress < 1),
      onLeaveBack: () => scShow("hero", true),
    },
  });
  heroTl
    .to(cut, { p: 1, duration: 0.55, ease: "none", onUpdate: placeHeroScissors }, 0)
    .to(".scroll-cue", { opacity: 0, duration: 0.05 }, 0)
    .to(top, { yPercent: -58, rotate: -2.5, duration: 0.45, ease: "power2.in" }, 0.5)
    .to(bot, { yPercent: 58, rotate: 1.8, duration: 0.45, ease: "power2.in" }, 0.5)
    .to(".cutline", { opacity: 0, duration: 0.08 }, 0.5)
    .fromTo(".under", { scale: 1.12 }, { scale: 1, duration: 0.5, ease: "power2.out" }, 0.5)
    .to(underLines, { yPercent: 0, duration: 0.3, stagger: 0.06, ease: "power3.out" }, 0.66)
    .to([".under-kicker", ".under-sub"], { opacity: 0.75, y: 0, duration: 0.25, stagger: 0.05, ease: "power2.out" }, 0.72)
    .to({}, { duration: 0.1 });

  /* ---------- Cortes entre secciones ---------- */
  $$(".snip").forEach((snip, i) => {
    const cutEl = $(".snip-cut", snip);
    const id = "snip" + i;
    const len = () => bigLen() * 0.62;
    const st = { p: 0 };
    gsap.to(st, {
      p: 1, ease: "none",
      scrollTrigger: { trigger: snip, start: "top 88%", end: "top 28%", scrub: 0.6 },
      onUpdate: () => {
        const p = st.p;
        scShow(id, p > 0.002 && p < 0.998);
        const W = vw();
        const L = len();
        const x = lerp(-L * 0.7, W + L * 0.8, p);
        const r = snip.getBoundingClientRect();
        gsap.set(cutEl, { scaleX: clamp((x - r.left + L * 0.1) / r.width, 0, 1) });
        sc?.set({ x, y: r.top + 1, len: L, open: 0.15 + (0.5 - 0.5 * Math.cos(p * Math.PI * 2 * 4)) * 0.85, roll: Math.sin(p * Math.PI * 8) });
      },
    });
  });

  /* ---------- Cinta que acelera con el scroll ---------- */
  const track = $(".marquee-track");
  if (track) {
    track.append(...[...track.children].map((n) => n.cloneNode(true)));
    const loop = gsap.to(track, { xPercent: -50, duration: 38, ease: "none", repeat: -1 });
    const skewTo = gsap.quickTo(track, "skewX", { duration: 0.5, ease: "power3.out" });
    let dir = 1, settle = 0;
    ScrollTrigger.create({
      trigger: ".marquee", start: "top bottom", end: "bottom top",
      onUpdate: (self) => {
        const v = self.getVelocity();
        dir = v < 0 ? -1 : 1;
        gsap.to(loop, { timeScale: dir * clamp(1 + Math.abs(v) / 400, 1, 5), duration: 0.2, overwrite: true });
        skewTo(clamp(v / -300, -7, 7));
        clearTimeout(settle);
        settle = setTimeout(() => { gsap.to(loop, { timeScale: dir, duration: 1.2, overwrite: true }); skewTo(0); }, 140);
      },
    });
  }

  /* ---------- Títulos palabra a palabra ---------- */
  $$("[data-split]").forEach((el) => {
    const words = splitWords(el);
    gsap.from(words, { yPercent: 115, rotate: 4, duration: 1.2, stagger: 0.06, scrollTrigger: { trigger: el, start: "top 85%", once: true } });
  });
  $$("[data-rise]").forEach((el) => {
    gsap.from(el, { y: 36, opacity: 0, duration: 1.1, scrollTrigger: { trigger: el, start: "top 90%", once: true } });
  });

  /* ---------- Servicios ---------- */
  $$(".svc").forEach((row) => {
    gsap.from(row, { y: 50, opacity: 0, duration: 1.1, scrollTrigger: { trigger: row, start: "top 92%", once: true } });
  });
  const follow = $(".svc-follow");
  if (follow && finePointer) {
    const img = $("img", follow);
    const fx = gsap.quickTo(follow, "x", { duration: 0.6, ease: "power3.out" });
    const fy = gsap.quickTo(follow, "y", { duration: 0.6, ease: "power3.out" });
    const fr = gsap.quickTo(follow, "rotate", { duration: 0.8, ease: "power3.out" });
    let lastX = 0;
    const list = $(".svc-list");
    list.addEventListener("pointermove", (e) => {
      fx(e.clientX - 120);
      fy(e.clientY - 150);
      fr(clamp((e.clientX - lastX) * 0.6, -12, 12));
      lastX = e.clientX;
    });
    $$(".svc").forEach((row) => row.addEventListener("pointerenter", () => {
      if (!img.src.endsWith(row.dataset.img)) img.src = row.dataset.img;
      follow.classList.add("is-on");
    }));
    list.addEventListener("pointerleave", () => follow.classList.remove("is-on"));
  }

  /* ---------- Trabajos: pista horizontal (pantallas medianas y grandes) ---------- */
  const mm = gsap.matchMedia();
  mm.add("(min-width: 701px)", () => {
    const pin = $(".works-pin");
    const trackEl = $(".works-track");
    const dist = () => Math.max(0, trackEl.scrollWidth - window.innerWidth);
    const tween = gsap.to(trackEl, {
      x: () => -dist(),
      ease: "none",
      scrollTrigger: { trigger: pin, start: "top top", end: () => "+=" + dist(), pin: true, scrub: true, invalidateOnRefresh: true },
    });
    $$(".work", trackEl).forEach((w) => {
      gsap.from(w, {
        yPercent: 12, opacity: 0, rotate: 2, duration: 1, ease: "power3.out",
        scrollTrigger: { trigger: w, containerAnimation: tween, start: "left 95%", toggleActions: "play none none reverse" },
      });
      gsap.fromTo($("img", w), { scale: 1.15 }, {
        scale: 1, ease: "none",
        scrollTrigger: { trigger: w, containerAnimation: tween, start: "left right", end: "right left", scrub: true },
      });
    });
    return () => gsap.set(trackEl, { clearProps: "transform" });
  });
  mm.add("(max-width: 700px)", () => {
    root.classList.add("works-native");
    return () => root.classList.remove("works-native");
  });

  /* ---------- Carta de color en abanico ---------- */
  const fan = $(".fan");
  if (fan && matchMedia("(min-width: 701px)").matches) {
    root.classList.add("fan-ready");
    const cards = $$(".sw", fan);
    const mid = (cards.length - 1) / 2;
    const spread = () => (vw() < 700 ? 9.5 : 12);
    gsap.set(cards, { rotate: 0, y: 40, transformOrigin: "50% 160%" });
    gsap.to(cards, {
      rotate: (i) => (i - mid) * spread(),
      y: (i) => Math.abs(i - mid) * 6,
      ease: "power2.out",
      stagger: 0,
      scrollTrigger: { trigger: fan, start: "top 85%", end: "center 55%", scrub: true, invalidateOnRefresh: true },
    });
    if (finePointer) {
      cards.forEach((c) => {
        c.addEventListener("pointerenter", () => gsap.to(c, { yPercent: -14, scale: 1.04, duration: 0.3, ease: "power3.out", overwrite: "auto" }));
        c.addEventListener("pointerleave", () => gsap.to(c, { yPercent: 0, scale: 1, duration: 0.3, ease: "power3.out", overwrite: "auto" }));
      });
    }
  }

  /* ---------- Manifiesto: palabras que se encienden ---------- */
  $$("[data-words]").forEach((el) => {
    const words = splitWords(el);
    gsap.fromTo(words, { opacity: 0.22 }, {
      opacity: 1, ease: "none", stagger: 0.1,
      scrollTrigger: { trigger: el, start: "top 85%", end: "bottom 70%", scrub: 0.4 },
    });
  });

  /* ---------- Parallax de fotos ---------- */
  $$("[data-parallax]").forEach((el) => {
    const f = Number(el.dataset.parallax);
    gsap.fromTo(el, { yPercent: -f * 100 }, { yPercent: f * 100, ease: "none", scrollTrigger: { trigger: el, start: "top bottom", end: "bottom top", scrub: true } });
  });

  /* ---------- Tarjetas de Visítanos ---------- */
  gsap.from(".tile", { y: 60, opacity: 0, duration: 1.2, stagger: 0.08, scrollTrigger: { trigger: ".bento", start: "top 85%", once: true } });

  /* ---------- Pie: la palabra sube ---------- */
  gsap.from(".ftr-mark span", { yPercent: 100, ease: "none", scrollTrigger: { trigger: ".ftr", start: "top bottom", end: "bottom bottom", scrub: true } });

  /* ---------- Barra de progreso, cabecera y menú activo ---------- */
  gsap.to(".progress", { scaleX: 1, ease: "none", scrollTrigger: { start: 0, end: "max", scrub: true } });
  const hdr = $(".hdr");
  ScrollTrigger.create({
    start: 0, end: "max",
    onUpdate: (self) => hdr.classList.toggle("is-hidden", self.direction === 1 && self.scroll() > vh() * 2.4 && !nav.classList.contains("is-open")),
  });
  $$("#nav a").forEach((a) => {
    const sec = $(a.getAttribute("href"));
    if (!sec) return;
    ScrollTrigger.create({ trigger: sec, start: "top 50%", end: "bottom 50%", onToggle: (s) => a.classList.toggle("is-active", s.isActive) });
  });

  /* ---------- Botones magnéticos ---------- */
  if (finePointer) {
    $$(".magnetic").forEach((el) => {
      const qx = gsap.quickTo(el, "x", { duration: 0.5, ease: "power3.out" });
      const qy = gsap.quickTo(el, "y", { duration: 0.5, ease: "power3.out" });
      el.addEventListener("pointermove", (e) => {
        const r = el.getBoundingClientRect();
        qx((e.clientX - r.left - r.width / 2) * 0.25);
        qy((e.clientY - r.top - r.height / 2) * 0.35);
      });
      el.addEventListener("pointerleave", () => { qx(0); qy(0); });
    });
  }

  // Recalcular al cargar fuentes e imágenes
  document.fonts?.ready.then(() => ScrollTrigger.refresh());
  window.addEventListener("load", () => ScrollTrigger.refresh());
}
