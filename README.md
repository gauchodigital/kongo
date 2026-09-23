# Kongo

Sitio público de Kongo (alimento para perros y gatos, Baires S.A.) más un panel editorial en `/admin`.

La web pública conserva el diseño, las animaciones y el HTML actuales. El dashboard no reemplaza esa interfaz: solo alimenta notas, productos, refugios, FAQ y textos generales a través de `/api/content`, con el contenido incrustado como fallback.

## Desarrollo local

Node 20+. Copiá `.env.example` a `.env` y dejá `USE_MEMORY_STORE=true` para trabajar sin MySQL.

```bash
npm install
npm run seed:generate
npm test
npm run dev
```

- Sitio público: http://localhost:3010
- Panel: http://localhost:3010/admin

El puerto **3010** evita choque con otros proyectos locales (por ejemplo Artintex en `:3000`).

Si no hay usuarios, el panel ofrece un alta inicial de administrador. También se puede crear con `ADMIN_EMAIL` y `ADMIN_PASSWORD` (mínimo 12 caracteres).

## Staging

El panel no se publica en `kongo.com.ar`. Staging se prueba en local hasta que haya un host autorizado.

```bash
npm run build
npm start
```

El servidor sirve `index.html`, `/admin` (build de Vite en `admin-dist`) y la API. Las imágenes editoriales viven en `uploads/cms/` (fuera de Git).

Ver [docs/STAGING.md](docs/STAGING.md) para acceso, backups y el procedimiento futuro de promoción (sin ejecutar producción).
