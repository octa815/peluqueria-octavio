import { defineConfig, devices } from "@playwright/test";

// Usa el Chrome instalado en el sistema (sin descargar navegadores).
export default defineConfig({
  testDir: "tests",
  timeout: 30_000,
  reporter: [["list"]],
  use: {
    baseURL: "http://127.0.0.1:4173", channel: "chrome", locale: "es-ES", timezoneId: "Europe/Madrid",
    // WebGL por software para que las tijeras 3D se pinten también sin GPU
    launchOptions: { args: ["--enable-unsafe-swiftshader", "--use-angle=swiftshader"] },
  },
  webServer: {
    command: "python3 -m http.server 4173 --bind 127.0.0.1",
    url: "http://127.0.0.1:4173",
    reuseExistingServer: true,
  },
  projects: [
    { name: "escritorio", use: { ...devices["Desktop Chrome"], channel: "chrome" } },
    { name: "movil", use: { ...devices["Pixel 7"], channel: "chrome" } },
  ],
});
