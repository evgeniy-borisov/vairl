# Review Report — Blog — Stage 4: Formatting & Media

**Post:** `publications/public/2026-07-13-banking-investor-ai-agent-ru.md`
**Reviewer:** `review-blog-formatting-media`
**Date:** 2026-07-14

## Summary

Пост технически хорошо собран: front matter полный, все 4 внутренние ссылки ведут на существующие посты, все 10 якорей TOC совпадают с заголовками, все code blocks с языковыми тегами, mermaid-синтаксис в целом валиден. Но есть **один блокер**: файл обложки `assets/images/banking-investor-ai-agent.svg` существует, но **сломан** — вся кириллица внутри превратилась в мусор (8 контрольных байтов 0x10–0x1F, невалидных для XML) плюс 2 неэкранированных `&`. Браузер не отрисует этот SVG (XML parse error), а это и cover (`image:` в front matter, OG-превью), и единственная inline-картинка поста. До регенерации SVG публиковать нельзя.

## Scores (1–10)

| Axis | Score | Note |
|------|-------|------|
| engagement | 8 | TL;DR-блок, TOC с якорями, много таблиц — сканируется отлично |
| clarity | 8 | Форматирование поддерживает текст; таблицы с чёткими заголовками |
| structure | 9 | H2/H3 иерархия чистая, разделители `---`, якоря работают |
| production | 5 | Битая обложка = сломанное OG-превью и пустая картинка в посте |

## Asset → Status

| Asset / Link | Где | Status |
|--------------|-----|--------|
| `assets/images/banking-investor-ai-agent.svg` (cover, `image:` front matter) | строка 7 | **broken** — файл есть, размер 1200×630 верный, но XML невалиден: 8 контрольных байтов (0x1A, 0x1E, 0x1F, 0x10, 0x14, 0x1C) и 2 неэкранированных `&` (строки 65, 106); вся кириллица — мусор («Клиент» → `;85=B`, «Портфель» → `>@BD5;L`). `xmllint` даёт 11+ parse errors |
| `/vairl/assets/images/banking-investor-ai-agent.svg` (inline `<img>`) | строка 48 | **broken** — тот же файл; путь и alt text корректны |
| `/vairl/blog/2026/07/02/systems-theory-task-types-ru/` (×2) | строки 454, 568 | OK — `_posts/2026-07-02-systems-theory-task-types-ru.md` существует, permalink совпадает |
| `/vairl/blog/2026/07/04/agent-task-specification-ru/` | строка 585 | OK — `_posts/2026-07-04-agent-task-specification-ru.md` |
| `/vairl/blog/2026/06/29/agent-benchmark-generation-ru/` | строка 660 | OK — `_posts/2026-06-29-agent-benchmark-generation-ru.md` |

## Findings

### Critical (must fix before publish)

- [ ] **Cover SVG сломан** (`assets/images/banking-investor-ai-agent.svg`). Кириллический текст записан с потерей старших байтов (mojibake): контрольные символы 0x10–0x1F невалидны в XML 1.0, два `&` не экранированы как `&amp;`. Браузеры откажутся рендерить файл целиком — пост выйдет без обложки и без единственной иллюстрации, OG-превью в соцсетях будет пустым. **Фикс:** перегенерировать SVG с UTF-8 кириллицей (структура файла — заголовок, 6 агентов, Data Platform, бейдж «Цикл клиента» — восстановима по назначению блоков).

### Major

- [ ] **Таблица «Полная таблица» математических моделей** (`{#math-models}`, строки 333–385): 4 колонки × **51 строка данных** — сильно превышает порог 15 строк. На мобильном это бесконечная простыня. Рекомендация: разбить на подтаблицы по категориям (риск / оптимизация / прогноз / ML / XAI) с H4-заголовками, либо свернуть в `<details>`.
- [ ] **Mermaid, блок 6 (routing, строки 601–622):** `\n` внутри кавычек узлов (`T["Таксономия:\nmodel + method"]` и др.). В Mermaid 11 (на сайте подключён `mermaid@11.4.0`) `\n` в quoted-строках flowchart не гарантирует перенос и может отрисоваться литерально. Заменить на `<br/>`.

### Minor / polish

- [ ] **Таблица размещения задач на матрице L×D** (строки 551–560): 5 колонок — на границе мобильной читаемости; колонку `computation_family` можно слить с Pipeline или сократить заголовки.
- [ ] **Mermaid, блок 1 (architecture):** узел `Data["Data Platform"]` и subgraph `DataPlatform ["Data Platform"]` дублируют друг друга — на диаграмме будет два элемента с одинаковой подписью и странная стрелка `Data --> DataPlatform`. Синтаксически валидно, но визуально лучше вести стрелки агентов сразу в subgraph.
- [ ] Опечатка: «**Пятуровневая** таксономия» → «Пятиуровневая» (строка 452, таблица трёх осей).
- [ ] Таблица «Каталог задач по фазам» — 14 строк, у самой границы; при добавлении примеров стоит разбить по фазам.

## Checklist (stage 4)

- [x] Front matter: `layout: post`, `title`, `date: 2026-07-13 18:00:00 +0300` (в прошлом относительно сборки 2026-07-14), `excerpt`, `lang: ru`, `image`, `review_track: blog` — всё на месте
- [x] `image:` без префикса `/vairl` — соответствует конвенции остальных постов в `_posts/`
- [ ] Cover 1200×630 существует и валиден — размеры верные, **файл битый** (см. Critical)
- [x] Inline images: alt text есть, путь `/vairl/assets/images/...` соответствует `baseurl: "/vairl"`
- [x] Tables: все GFM с header row и разделителем; 2 таблицы отмечены по mobile-читаемости
- [x] Code blocks: все fenced с языком (6 × `mermaid`, 1 × `yaml`); YAML в task_record валиден
- [x] Mermaid: блоки 1–5 валидны (chained `-->`, `&`-группировка, quoted subgraph titles, edge labels `|...|` — ок для v11); блок 6 — замечание про `\n`
- [x] Links: все 4 внутренние ссылки соответствуют permalink-паттерну `/blog/:year/:month/:day/:title/` и существующим файлам в `_posts/`
- [x] Якоря `{#anchor}` на 10 H2-заголовках — валидный kramdown IAL, все 10 ссылок TOC совпадают с якорями

## Medium checklist hits

- [x] Strong title & hook
- [x] Clear audience
- [x] Scannable structure (H2/H3)
- [x] Satisfying conclusion
- [x] Excerpt works standalone
- [ ] Images & tables OK — **cover broken**, 1 таблица чрезмерно длинная
- [x] Jekyll front matter valid

## Stage verdict

- [ ] **pass**
- [x] **conditional** — блокер один и локальный: перегенерировать cover SVG с корректной UTF-8 кириллицей. После этого + фикс `\n` в mermaid-блоке 6 пост готов к публикации.
- [ ] **fail**
