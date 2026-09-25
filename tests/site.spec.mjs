import { test, expect } from "@playwright/test";

const isMobile = (testInfo) => testInfo.project.name === "movil";

test.describe("Portada y contenido", () => {
  test("carga sin errores de consola", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && errors.push(m.text()));
    await page.goto("/");
    await expect(page).toHaveTitle(/Peluquería Octavio/);
    await expect(page.locator("h1")).toHaveText(/Peluquería Octavio/);
    await page.waitForTimeout(1500);
    expect(errors).toEqual([]);
  });

  test("no hace peticiones a terceros al cargar (sin Google Fonts ni mapas)", async ({ page }) => {
    const external = [];
    page.on("request", (r) => { if (!r.url().startsWith("http://127.0.0.1")) external.push(r.url()); });
    await page.goto("/", { waitUntil: "networkidle" });
    await page.mouse.wheel(0, 4000);
    await page.waitForTimeout(800);
    expect(external).toEqual([]);
  });

  test("horario: sábado de 8 a 14, domingo y lunes cerrado", async ({ page }) => {
    await page.goto("/");
    const row = (d) => page.locator(`.hours tr[data-day="${d}"] td`);
    await expect(row(6)).toHaveText("8:00 – 14:00");
    await expect(row(0)).toHaveText("Cerrado");
    await expect(row(1)).toHaveText("Cerrado");
    for (const d of [2, 3, 4, 5]) await expect(row(d)).toHaveText("9:00 – 13:00 · 15:00 – 20:00");
  });

  const cases = [
    ["2026-09-26T10:00:00+02:00", /Abierto ahora · hasta las 14:00/, "sábado mañana"],
    ["2026-09-26T15:00:00+02:00", /abrimos el martes a las 9:00/, "sábado tarde"],
    ["2026-09-28T10:00:00+02:00", /abrimos mañana a las 9:00/, "lunes"],
    ["2026-09-29T14:00:00+02:00", /abrimos a las 15:00/, "martes a mediodía"],
    ["2026-09-29T19:59:00+02:00", /Abierto ahora · hasta las 20:00/, "martes tarde"],
    ["2026-10-02T21:00:00+02:00", /abrimos mañana a las 8:00/, "viernes noche"],
  ];
  for (const [when, expected, label] of cases) {
    test(`estado abierto/cerrado: ${label}`, async ({ page }) => {
      await page.clock.setFixedTime(new Date(when));
      await page.goto("/");
      await expect(page.locator(".now .status-text")).toHaveText(expected);
    });
  }

  test("el día de hoy se resalta en la tabla", async ({ page }) => {
    await page.clock.setFixedTime(new Date("2026-09-26T10:00:00+02:00"));
    await page.goto("/");
    await expect(page.locator(".hours tr.is-today")).toHaveAttribute("data-day", "6");
  });

  test("todas las fotos existen y cargan", async ({ page, request }) => {
    await page.goto("/");
    const srcs = await page.locator("main img[src]").evaluateAll((els) => [...new Set(els.map((e) => e.getAttribute("src")))]);
    expect(srcs.length).toBeGreaterThanOrEqual(14);
    for (const s of srcs) expect((await request.get("/" + s)).status(), s).toBe(200);
  });

  test("enlaces de llamada apuntan al teléfono", async ({ page }) => {
    await page.goto("/");
    const hrefs = await page.locator('a[href^="tel:"]').evaluateAll((as) => as.map((a) => a.getAttribute("href")));
    expect(hrefs.length).toBeGreaterThanOrEqual(4);
    for (const h of hrefs) expect(h).toBe("tel:+34965381889");
  });

  test("sin scroll horizontal", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1000);
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(over).toBeLessThanOrEqual(0);
  });
});

test.describe("Movimiento", () => {
  test("tijeras 3D visibles en la portada", async ({ page }) => {
    await page.goto("/");
    await expect(page.locator(".scissors-canvas")).toHaveClass(/is-on/, { timeout: 8000 });
  });

  test("el corte separa la portada y muestra el mensaje de debajo", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(1200);
    const vh = await page.evaluate(() => innerHeight);
    await page.evaluate((y) => window.scrollTo(0, y), vh * 1.7);
    await expect.poll(() => page.locator(".half-top").evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42), { timeout: 6000 })
      .toBeLessThan(-vh * 0.3);
    await expect.poll(() => page.locator(".half-bot").evaluate((el) => new DOMMatrix(getComputedStyle(el).transform).m42), { timeout: 6000 })
      .toBeGreaterThan(vh * 0.3);
    await expect(page.locator(".under-title")).toBeVisible();
  });

  test("la mitad inferior es una copia oculta a lectores de pantalla", async ({ page }) => {
    await page.goto("/");
    const bot = page.locator(".half-bot");
    await expect(bot).toHaveAttribute("aria-hidden", "true");
    expect(await bot.locator("[id]").count()).toBe(0);
  });

  test("movimiento reducido: sin tijeras ni corte, todo visible", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await expect(page.locator("html")).not.toHaveClass(/cut-ready/);
    await expect(page.locator(".scissors-canvas")).not.toHaveClass(/is-on/);
    await page.locator("#visita").scrollIntoViewIfNeeded();
    await expect(page.locator("#visita .tile").first()).toHaveCSS("opacity", "1", { timeout: 4000 });
  });

  test("carta de color se abre en abanico", async ({ page }) => {
    await page.goto("/");
    await page.waitForTimeout(800);
    await page.evaluate(() => window.scrollTo(0, document.querySelector(".fan").getBoundingClientRect().top + scrollY - innerHeight * 0.3));
    const first = page.locator(".sw").first();
    await expect.poll(() => first.evaluate((el) => {
      const m = new DOMMatrix(getComputedStyle(el).transform);
      return Math.round(Math.atan2(m.b, m.a) * 180 / Math.PI);
    }), { timeout: 6000 }).toBeLessThan(-10);
  });
});

test.describe("Interacción", () => {
  test("visor: abre, navega, cierra con Escape y devuelve el foco", async ({ page }) => {
    await page.goto("/");
    const first = page.locator(".work-btn").first();
    await first.dispatchEvent("click");
    const lb = page.locator(".lightbox");
    await expect(lb).toBeVisible();
    await expect(lb.locator("figcaption")).toContainText("1/12");
    await lb.locator(".lb-next").click();
    await expect(lb.locator("figcaption")).toContainText("2/12");
    await page.keyboard.press("ArrowLeft");
    await page.keyboard.press("ArrowLeft");
    await expect(lb.locator("figcaption")).toContainText("12/12");
    await expect.poll(() => lb.locator("img").evaluate((el) => el.naturalWidth)).toBeGreaterThan(600);
    await page.keyboard.press("Escape");
    await expect(lb).toBeHidden();
    await expect(first).toBeFocused();
  });

  test("mapa: solo se carga al pedirlo", async ({ page }) => {
    await page.route(/google\.com/, (r) => r.fulfill({ status: 200, contentType: "text/html", body: "<p>mapa</p>" }));
    await page.goto("/");
    const map = page.locator(".map");
    await expect(map.locator("iframe")).toHaveCount(0);
    await map.locator(".map-load").dispatchEvent("click");
    await expect(map.locator("iframe")).toHaveAttribute("src", /google\.com\/maps/);
  });

  test("tema oscuro: cambia y se recuerda", async ({ page }) => {
    await page.emulateMedia({ colorScheme: "light" });
    await page.goto("/");
    await expect(page.locator("html")).toHaveAttribute("data-theme", "light");
    await page.locator(".theme-toggle").click();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
    await page.reload();
    await expect(page.locator("html")).toHaveAttribute("data-theme", "dark");
  });

  test("menú móvil a pantalla completa, abre y cierra", async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo), "solo móvil");
    await page.goto("/");
    await page.waitForTimeout(1600);
    const nav = page.locator("#nav");
    await expect(nav).toBeHidden();
    await page.locator(".menu-toggle").click();
    await expect(nav).toBeVisible();
    const box = await nav.boundingBox();
    const vp = page.viewportSize();
    expect(box.height).toBeGreaterThan(vp.height * 0.9);
    await nav.getByRole("link", { name: "Visítanos" }).click();
    await expect(page.locator(".menu-toggle")).toHaveAttribute("aria-expanded", "false");
  });
});

test.describe("Páginas legales y error", () => {
  for (const [path, heading] of [["/aviso-legal.html", /Aviso legal/], ["/privacidad.html", /Política de privacidad/], ["/cookies.html", /Política de cookies/], ["/404.html", /de las tijeras/]]) {
    test(`${path} carga y tiene título`, async ({ page }) => {
      const errors = [];
      page.on("pageerror", (e) => errors.push(e.message));
      await page.goto(path);
      await expect(page.locator("h1")).toHaveText(heading);
      await expect(page.locator(".hdr-logo")).toHaveAttribute("href", "/");
      expect(errors).toEqual([]);
    });
  }

  test("el pie enlaza a las tres páginas legales", async ({ page }) => {
    await page.goto("/");
    for (const name of ["Aviso legal", "Privacidad", "Cookies"]) {
      await expect(page.locator(".ftr-legal").getByRole("link", { name })).toBeVisible();
    }
  });
});
