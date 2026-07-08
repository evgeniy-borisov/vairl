# Review Report — Blog — Stage 4: Formatting & Media

**Post:** `publications/public/2026-07-08-camera-projector-sync-ru.md`
**Reviewer:** `review-blog-formatting-media`
**Date:** 2026-07-08

## Summary

Front matter корректен: `layout`, `date` в прошлом, явный `permalink`, обложка `assets/images/camera-projector-sync.svg` (1200×630) существует. Mermaid валиден. Виджет Jekyll (`relative_url`, `data-phone-page`) соответствует паттерну других интерактивных постов VAIRL. Скрипт `assets/js/camera-projector-sync.js` в репозитории есть. Production-замечания — устаревшие числа в тексте и отсутствие inline-иллюстрации демо.

## Scores (1–10)

| Axis | Score | Note |
|------|-------|------|
| engagement | 7 | Нет figure с обложкой/скрином в теле |
| clarity | 7 | Таблицы GFM ок |
| structure | 8 | HR-разделители уместны |
| production | 6 | Drift текста vs JS; excerpt |

## Findings

### Critical (must fix before publish)

- (нет)

### Major

- [ ] **Числа в статье ≠ код:** 96×72 → **128×96**; ~7 KB → ~**37 KB** (128×96×3 + header); ~12 fps → **15 fps** (строки 25, 33, 96–101, таблица режимов ок).
- [ ] **excerpt** (YAML): упоминание только контуров — обновить под градиент по умолчанию.
- [ ] **_posts/** копия может расходиться с **publications/public/** — после правок синхронизировать оба файла + `publish_article.py`.

### Minor / polish

- [ ] Mermaid-узлы с emoji 📱🖥 — на части рендереров могут глючить; допустимо для VAIRL.
- [ ] Виджет: кнопка «На весь экран» вешает fullscreen на canvas, не на sidebar — ок, но стоит footnote в статье.
- [ ] Таблица «Режимы» — добавить строку **«Градиент (теплокарта)»** как default.
- [ ] Inline `<script>` в посте — осознанный паттерн сайта; CSP на GitHub Pages не блокирует same-origin.
- [ ] Ссылка `/vairl/camera-projector-poc.html` — файл в корне репо, деплоится; OK.

## Medium checklist hits

- [x] Strong title & hook
- [x] Clear audience
- [x] Scannable structure (H2/H3)
- [ ] Satisfying conclusion
- [ ] Excerpt works standalone
- [x] Images & tables OK (обложка есть; нет demo screenshot)
- [x] Jekyll front matter valid

## Stage verdict

- [ ] **pass**
- [x] **conditional** — обновить числа и excerpt
- [ ] **fail**

## Production checklist (files)

| Asset | Status |
|-------|--------|
| `assets/images/camera-projector-sync.svg` | ✅ exists |
| `assets/js/camera-projector-sync.js` | ✅ exists |
| `camera-projector-poc.html` | ✅ exists |
| `assets/css/style.css` (`.camera-projector-sync-widget`) | ✅ exists |
