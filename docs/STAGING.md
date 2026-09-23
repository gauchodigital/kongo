# Staging del dashboard Kongo

Entorno temporal independiente. **No opera sobre WordPress ni sobre `kongo.com.ar`.**

## Estado del hosting

Cuenta autorizada: **marketing@baires-sa.com.ar** (`u290235718`, plan Business, order `1005656938`).

- Sitio temporal de prueba: https://lightyellow-woodcock-719601.hostingersite.com
- Carpeta: `/home/u290235718/domains/lightyellow-woodcock-719601.hostingersite.com/public_html`
- Subdominio Kongo (reservado, no es este deploy): https://staging-dashboard.kongo.com.ar
- Panel: `/admin`
- Health: `/api/health`
- Base MySQL exclusiva: `u290235718_kongo_stg` (no es la de WordPress)
- Producción `kongo.com.ar` / WordPress: no se toca
- No se usa Artintex ni otra cuenta de Hostinger

El código se prueba en local (`npm run dev`) en http://localhost:3010. El deploy al staging de Kongo queda en esa URL solamente.

## Acceso local

```bash
cp .env.example .env
npm install
npm run dev
```

Si no hay usuarios, el panel ofrece un alta inicial. También se puede crear con `ADMIN_EMAIL` y `ADMIN_PASSWORD` (mínimo 12 caracteres) en `.env`.

Roles:

- `admin`: contenidos, biblioteca, usuarios
- `editor`: contenidos y biblioteca

## Variables de entorno

Se configuran en el servidor de staging, no en el repositorio.

| Clave | Notas |
| --- | --- |
| `NODE_ENV` | `production` en el servidor; `development` en local |
| `PORT` | lo asigna el host, o `3000` en local |
| `SESSION_SECRET` | ≥ 32 caracteres, exclusivo de staging |
| `DB_HOST` | `127.0.0.1` si MySQL está en el mismo servidor |
| `DB_PORT` | `3306` |
| `DB_NAME` / `DB_USER` / `DB_PASSWORD` | base **exclusiva** de staging |
| `USE_MEMORY_STORE` | `true` en local sin MySQL |
| `ADMIN_EMAIL` / `ADMIN_PASSWORD` | bootstrap; retirar el password luego |
| `PUBLIC_INDEXING` | `false` en staging |
| `UPLOAD_DIR` | opcional; por defecto `uploads/cms` |

## Backups

1. Exportar la base MySQL de staging (cuando exista).
2. Copiar `uploads/cms/` (portadas y media subidos).
3. El contenido semilla del sitio original queda en `server/seed-data.json` y en el HTML público (fallback).

Frecuencia sugerida mientras se edita: diaria. Antes de cualquier prueba destructiva: backup completo.

## Operación editorial

1. Entrar a `/admin`.
2. **Textos, números y video de la home**: Textos del sitio → **Inicio**. Hay miniaturas por bloque (Portada, Números, Familia, Comunidad, etc.).
3. **Tarjetas del carrusel** (sabor, etapa, imagen): Productos.
4. Editar notas, refugios o FAQ desde sus secciones.
5. Guardar como borrador, programar o publicar.
6. Verificar el sitio público (mismo origen). Si la API falla, el HTML original sigue visible.

Refugios: exportar/importar CSV con columnas `provincia,localidad,nombre,instagram`.

## Promoción futura (no ejecutar ahora)

Cuando haya autorización explícita, un procedimiento separado debería:

1. Tomar backup de WordPress y de su base actual.
2. Provisionar un sitio Node **distinto** de `public_html` de WordPress, o un cutover controlado.
3. Crear una base MySQL de producción distinta a la de staging.
4. Copiar contenido publicado (no borradores de prueba) y `uploads/cms`.
5. Apuntar DNS/document root, con `PUBLIC_INDEXING=true` y un `SESSION_SECRET` nuevo.
6. Verificar `/`, `/admin` y `/api/health`.
7. Rollback: restaurar document root y base de WordPress desde el backup del paso 1.

Hasta nueva autorización: no tocar WordPress, la base actual ni `kongo.com.ar`.
