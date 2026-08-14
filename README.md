# kongo

Sitio web de Kongo — alimento para perros y gatos (Baires S.A.).

Sitio estático: HTML + CSS inline + JavaScript. No requiere build ni backend.

## Estructura

- `index.html` — el sitio completo (home, productos, comunidad baires, refugios, consejos, faq, contacto)
- `support.js` — runtime de render
- `refugios.json` — listado de refugios de Buenos Aires
- `uploads/` — imágenes

## Deploy

**Vercel:** importar el repo. Framework preset: *Other*. Sin build command, output directory `.`

**GitHub Pages:** Settings → Pages → Branch `main` / root.
