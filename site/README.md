# gcss-site (React SPA)

## Стили

| Что | Где |
|-----|-----|
| **Точки входа в приложении** | `src/styles/site.css`, `src/styles/crm.css` |
| **Общий shell (legal, footer, modal)** | `../styles-crm-shell.css` + `../css/` в корне репо |
| **CRM-секции** | `../css/sections/crm/*.css` (импорт через `src/styles/crm.css`) |

Портфолио-лендинг на `/` снят; в прод не попадают `hero.css`, `portfolio.css` и т.п.

## SEO

| Слой | Назначение |
|------|------------|
| **`src/seo/routeMeta.ts`** | title, description, canonical, robots по pathname |
| **`scripts/prerender-routes.ts`** | после `vite build` пишет HTML-оболочки **с meta/OG в `<head>`** |
| **`PageMeta`** | meta/OG и один JSON-LD (`data-gcss-seo-jsonld`) при клиентской навигации |

На GitHub Pages боты и превью читают **собранный HTML**; React обновляет тот же JSON-LD при SPA-переходах (без дубликата).
