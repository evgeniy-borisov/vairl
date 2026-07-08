# Review Report — Blog — Stage 3: Voice & Clarity

**Post:** `publications/public/2026-07-08-camera-projector-sync-ru.md`
**Reviewer:** `review-blog-voice-clarity`
**Date:** 2026-07-08

## Summary

Голос инженерный, без воды: абзацы короткие, таблицы несут смысл. Термины WebRTC, Sobel, bilinear warp уместны для аудитории VAIRL. Аналогии («почему WebRTC, а не WebSocket») помогают. Главная проблема ясности — **расхождение текста с текущей реализацией** после итераций PoC (размер кадра, fps, режим по умолчанию).

## Scores (1–10)

| Axis | Score | Note |
|------|-------|------|
| engagement | 7 | Мало «истории»/демо-скриншота результата на проекторе |
| clarity | 6 | Текст и код расходятся |
| structure | 8 | Предложения читаются легко |
| production | 7 | `lang: ru` согласован |

## Findings

### Critical (must fix before publish)

- (нет)

### Major

- [ ] **Строки 38, 96–101, mermaid PACK «96×72»** — в `camera-projector-sync.js` сейчас **128×96**, ~**15 fps**, `reliable: true`. Читатель не воспроизведёт ожидания из статьи.
- [ ] **Строка 38:** «`reliable: false` допускает потерю кадров» — в коде `CONN_OPTS = { reliable: true, serialization: 'binary' }`. Переписать обоснование или вернуть false в коде.

### Minor / polish

- [ ] **Sobel / ∂I/∂x** — одна фраза «градиент яркости кадра» до формул снизит порог входа.
- [ ] **PeerJS cloud** — одна строка про `server-error` и зависимость от брокера (читатели уже сталкивались).
- [ ] **Строка 66 (виджет):** «Откройте эту же страницу» — неверно после `data-phone-page`; должно быть «QR откроет страницу телефона».
- [ ] Добавить **скрин или GIF** теплокарты на проекторе — «show don't tell».

## Medium checklist hits

- [x] Strong title & hook
- [x] Clear audience
- [x] Scannable structure (H2/H3)
- [ ] Satisfying conclusion
- [ ] Excerpt works standalone
- [x] Images & tables OK
- [x] Jekyll front matter valid

## Stage verdict

- [ ] **pass**
- [x] **conditional** — синхронизировать текст с кодом
- [ ] **fail**
