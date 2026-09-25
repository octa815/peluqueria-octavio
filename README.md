# Peluquería Octavio · Elda

Web de Peluquería Octavio (C/ Joaquín Coronel, 9, Elda). HTML, CSS y JavaScript sin dependencias ni paso de build.

## Estructura

```
index.html            Página única
assets/css/site.css   Estilos, temas claro/oscuro y animaciones
assets/js/site.js     Tema, menú, apariciones, estado "abierto ahora"
favicon.svg
netlify.toml          Configuración de Netlify (publica la raíz)
```

## Ver en local

```bash
python3 -m http.server 8000
# abre http://localhost:8000
```

## Publicar en Netlify

1. Sube el repo a GitHub.
2. En Netlify: *Add new site → Import an existing project → GitHub* y elige el repo.
3. Deja el comando de build vacío. El directorio de publicación ya lo fija `netlify.toml`.
4. Cada `git push` a `main` vuelve a publicar la web.

## Cambios habituales

- **Horario**: la tabla en `index.html` (sección `#horario`) y el objeto `HOURS` en `assets/js/site.js`. También el bloque JSON-LD del `<head>`.
- **Teléfono**: busca `965381889` y `965 381 889`.
- **Fotos**: añade imágenes en `assets/img/` y úsalas en la sección `#salon` o sustituyendo la carta de color.
