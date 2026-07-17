# Review Report — Blog — Stage 4: Formatting & Media

**Post:** `publications/public/2026-07-17-design-methods-technical-solutions-ru.md`
**Reviewer:** `review-blog-formatting-media`
**Date:** 2026-07-17

## Summary

Front matter валиден, обложка `1200×630` UTF-8 на месте. Главный production-риск — две огромные GFM-таблицы на мобильном и слабая строка ссылки на URSS. Inline-cover с alt отсутствует (не блокер). Verdict: **conditional**.

## Scores (1–10)

| Axis | Score | Note |
|------|-------|------|
| engagement | — | |
| clarity | — | |
| structure | — | |
| production | 6 | Cover OK; mobile tables; meta-хвост |

## Assets

| Asset | Status |
|-------|--------|
| `/assets/images/design-methods-search.svg` | OK (1200×630, UTF-8) |
| Inline figure cover | missing (optional) |
| External links Inventech / altshuller / archive.org | OK (markdown) |
| URSS row | weak — homepage + «поиск», не deep link |

## Findings

### Critical (must fix before publish)

- [ ] **Убрать хвост «Если нужно, могу следующим шагом прогнать…»** — не контент поста.

### Major

- [ ] **Mobile:** Таблица 1 (63×4) — разбить на 2 таблицы + короткая ремарка «на телефоне листайте горизонтально / откройте десктоп».
- [ ] **Таблица 2:** слишком широкие ячейки — допустимо 2 колонки, но сократить аббревиатуры и вынести пример отдельно.
- [ ] **Ссылки:** заменить сырые URL в тексте ячеек на короткие якоря где возможно; починить/убрать слабую строку URSS.

### Minor / polish

- [ ] Добавить `<figure>` с обложкой после lead (как в A2A-посте) — опционально.
- [ ] В библиографии выровнять нумерацию или явно «выборка ключевых позиций».
- [ ] `date` 2026-07-17 — ок (не в будущем).

## Medium checklist hits

- [x] Strong title & hook
- [ ] Clear audience
- [ ] Scannable structure (H2/H3)
- [ ] Satisfying conclusion
- [x] Excerpt works standalone
- [ ] Images & tables OK
- [x] Jekyll front matter valid

## Stage verdict

- [ ] **pass**
- [x] **conditional**
- [ ] **fail**
