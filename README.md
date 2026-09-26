# Peluquería Octavio · Elda

Web de Peluquería Octavio (C/ Joaquín Coronel, 9, Elda). Sitio estático: HTML, CSS y JavaScript, sin paso de build.

## Qué tiene

- Portada con el logo del salón. Al hacer scroll, unas tijeras 3D (Three.js) cortan la pantalla y las dos mitades se abren.
- Cortes con tijeras entre secciones, galería horizontal de trabajos, carta de color en abanico.
- Scroll suave (Lenis) y animaciones con GSAP + ScrollTrigger.
- Modo claro y oscuro. Con "reducir movimiento" activado en el sistema, todo se muestra sin desplazamientos.
- Aviso legal, privacidad, cookies y página 404.
- Sin cookies ni llamadas a terceros al cargar: fuentes alojadas aquí y mapa de Google solo si se pulsa "Ver mapa".

## Estructura

```
index.html              Página principal
aviso-legal.html        Aviso legal (LSSI-CE)
privacidad.html         Política de privacidad (RGPD)
cookies.html            Política de cookies
404.html                Página de error (Netlify la usa sola)
assets/css/site.css     Estilos de todas las páginas
assets/js/main.js       Movimiento e interacción de la portada
assets/js/scissors.js   Tijeras 3D
assets/js/page.js       Tema y año en las páginas secundarias
assets/brand/           Logo en SVG (sprite con aro y texto por separado)
assets/img/             Fotos en WebP (600 y 1200 px)
assets/fonts/           Instrument Serif y Manrope
assets/vendor/          GSAP, ScrollTrigger, Lenis y Three.js
tests/                  Pruebas con Playwright
```

## Ver en local

```bash
python3 -m http.server 8080
# abre http://localhost:8080
```

## Pruebas

Usan el Chrome instalado en el sistema.

```bash
npm install
npm test
```

## Publicar en Netlify

1. Sube el repo a GitHub.
2. En Netlify: *Add new site → Import an existing project → GitHub* y elige el repo.
3. Deja el comando de build vacío. El directorio de publicación lo fija `netlify.toml`.
4. Cada `git push` a `main` vuelve a publicar la web.

## Pendiente antes de publicar

En `aviso-legal.html` y `privacidad.html` hay tres datos marcados en amarillo que exige la ley: nombre y apellidos del titular, NIF y correo electrónico. Búscalos por `class="todo"` y sustitúyelos por los datos reales.

## Cambios habituales

- **Horario**: la tabla de `#visita` en `index.html`, el objeto `HOURS` en `assets/js/main.js` y el bloque JSON-LD del `<head>`.
- **Teléfono**: busca `625263146` y `625 263 146`.
- **Fotos**: añade WebP de 600 y 1200 px en `assets/img/` y un `<li class="work">` en `#trabajos`.
