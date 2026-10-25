# gcss-portfolio.ru

Публичный сайт — React SPA в `site/`. Точка входа: `/crm/custom/` (корень `/` редиректит сюда). Стили и SEO: см. `site/README.md` (вход CSS — `site/src/styles/*`, meta — `site/src/seo/routeMeta.ts` + prerender в HTML).

## GitHub Pages (как на проде)

Push в `main` → workflow **Deploy to GitHub Pages**:

1. `npm ci --prefix site` + **`npm run build`** (сайт + демо clinic + flower + pest)
2. Артефакт — папка **`_site/`** целиком
3. На домене всё статически: CRM SPA, legal, KP, демо по **`/crm/demo/flower/`**, **`/crm/demo/clinic/`** и **`/crm/demo/pest/`** — **один хост, без портов и прокси**

## Локально

| Команда | Назначение |
|---------|------------|
| `npm run dev` | Сайт на **8081**; при первом запуске соберёт демо в `_site` (1–2 мин), дальше — сразу |
| `npm run build` | Полная сборка как на GitHub → `_site/` |
| `npm run preview` | Сборка + просмотр `_site` на **8080** (повторяет прод) |

После **`npm run build`** dev-сервер на 8081 отдаёт собранные демо из `_site/crm/demo/*` по тем же URL, что и на gcss-portfolio.ru.
