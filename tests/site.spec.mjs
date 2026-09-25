import { test, expect } from "@playwright/test";

const isMobile = (testInfo) => testInfo.project.name === "movil";

test.describe("Peluquería Octavio", () => {
  test("carga sin errores de consola", async ({ page }) => {
    const errors = [];
    page.on("pageerror", (e) => errors.push(e.message));
    page.on("console", (m) => m.type() === "error" && !/maps|google/i.test(m.text()) && errors.push(m.text()));
    await page.goto("/");
    await expect(page).toHaveTitle(/Peluquería Octavio/);
    await expect(page.locator("h1")).toContainText("Tu pelo");
    expect(errors).toEqual([]);
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

  test("todas las fotos cargan", async ({ page }) => {
    await page.goto("/");
    const imgs = page.locator("main img:not(.lightbox img)");
    const n = await imgs.count();
    expect(n).toBeGreaterThanOrEqual(14);
    for (let i = 0; i < n; i++) {
      const img = imgs.nth(i);
      await img.scrollIntoViewIfNeeded();
      await expect.poll(() => img.evaluate((el) => el.complete && el.naturalWidth > 0)).toBe(true);
    }
  });

  test("visor: abre, navega, cierra con Escape y devuelve el foco", async ({ page }) => {
    await page.goto("/#trabajos");
    const first = page.locator(".work-btn").first();
    await first.click();
    const lb = page.locator(".lightbox");
    await expect(lb).toBeVisible();
    await expect(lb.locator("figcaption")).toContainText("1/12");
    await lb.locator(".lb-next").click();
    await expect(lb.locator("figcaption")).toContainText("2/12");
    await page.keyboard.press("ArrowLeft");
    await expect(lb.locator("figcaption")).toContainText("1/12");
    await page.keyboard.press("ArrowLeft");
    await expect(lb.locator("figcaption")).toContainText("12/12");
    await expect.poll(() => lb.locator("img").evaluate((el) => el.naturalWidth)).toBeGreaterThan(600);
    await page.keyboard.press("Escape");
    await expect(lb).toBeHidden();
    await expect(first).toBeFocused();
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

  test("sin scroll horizontal", async ({ page }) => {
    await page.goto("/");
    const over = await page.evaluate(() => document.documentElement.scrollWidth - innerWidth);
    expect(over).toBeLessThanOrEqual(0);
  });

  test("enlaces de llamada apuntan al teléfono", async ({ page }) => {
    await page.goto("/");
    const tels = page.locator('a[href^="tel:"]');
    expect(await tels.count()).toBeGreaterThanOrEqual(3);
    for (const h of await tels.evaluateAll((as) => as.map((a) => a.getAttribute("href")))) expect(h).toBe("tel:+34965381889");
  });

  test("movimiento reducido: el contenido se ve igualmente", async ({ page }) => {
    await page.emulateMedia({ reducedMotion: "reduce" });
    await page.goto("/");
    await page.locator("#contacto").scrollIntoViewIfNeeded();
    await expect(page.locator("#contacto .card").first()).toHaveCSS("opacity", "1", { timeout: 3000 });
    await expect(page.locator(".pole-stripes")).toHaveCSS("animation-name", "none");
  });

  test("menú móvil abre y cierra", async ({ page }, testInfo) => {
    test.skip(!isMobile(testInfo), "solo móvil");
    await page.goto("/");
    const nav = page.locator("#nav");
    await expect(nav).toBeHidden();
    await page.locator(".menu-toggle").click();
    await expect(nav).toBeVisible();
    await nav.getByRole("link", { name: "Horario" }).click();
    await expect(page.locator(".menu-toggle")).toHaveAttribute("aria-expanded", "false");
  });

  test("carta de color: el hover levanta la tarjeta tras aparecer", async ({ page }, testInfo) => {
    test.skip(isMobile(testInfo), "solo ratón");
    await page.goto("/#color");
    const sw = page.locator(".sw").first();
    await expect(sw).toHaveClass(/is-in/);
    await page.waitForTimeout(1300); // termina la aparición
    await sw.hover();
    await expect.poll(() => sw.evaluate((el) => getComputedStyle(el).transform)).not.toBe("none");
  });
});
