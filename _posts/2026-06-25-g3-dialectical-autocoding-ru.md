---
layout: post
title: "g3: диалектическое автокодирование и adversarial cooperation"
date: 2026-06-25
excerpt: "g3 — референсная реализация Block AI Research для диалектического автокодирования: петля Coach/Player, которая выдаёт протестированный код с соблюдением требований, а не одноразовый vibe coding."
lang: ru
image: /assets/images/g3-dialectical-autocoding.svg
pa_source: "https://github.com/dhanji/g3"
status: draft
---

*Черновик — в работе. По материалам [dhanji/g3](https://github.com/dhanji/g3) и статьи Block AI Research.*

**g3** — это не модель, а **агент для кодирования на Rust** и референсная реализация **диалектического автокодирования** (*dialectical autocoding*): структурированное взаимодействие двух специализированных агентов (Player + Coach) в ограниченном числе ходов.

## Основная публикация

| Ресурс | Ссылка |
|--------|--------|
| **Статья (Block AI Research, дек. 2025)** | [Adversarial Cooperation in Code Synthesis (PDF)](https://block.xyz/documents/adversarial-cooperation-in-code-synthesis.pdf) |
| **Референсная реализация** | [github.com/dhanji/g3](https://github.com/dhanji/g3) |
| **Автор** | [Dhananjay Nene (dhanji)](https://github.com/dhanji) |

В статье вводится **диалектическое автокодирование**: vibe-coding как диалектика (требования → реализация → критика → доработка), но роль рецензента автоматизируется агентом **Coach**.

## Метод: дуэт Coach / Player

```
┌─────────────────────────────────────────────────┐
│  requirements.md  (общий, без деталей реализации) │
└───────────────────────┬─────────────────────────┘
                        │
         ┌──────────────┴──────────────┐
         ▼                             ▼
   PLAYER (исполнитель)          COACH (рецензент)
   • пишет код                    • сверяет с требованиями
   • запускает тесты / shell       • находит пробелы и edge cases
   • правит по фидбеку             • даёт конкретную критику
         │                             │
         └──────────► цикл ходов ◄─────┘
                    (ограничен, ~10)
                        │
                        ▼
              COACH APPROVED → готово
```

**Ограниченный adversarial-процесс:**

- **Лимит ходов** — конечное число обменов coach/player (обычно ~10)
- **Свежий контекст на ход** — новый инстанс агента на роль → меньше «загрязнения» контекста
- **Общий контракт требований** — оба агента стартуют с одного goal-документа
- **Ворота одобрения** — явный sign-off Coach завершает успешный прогон
- **Игнор самоотчёта Player** — Coach проверяет независимо (ловит «готово!» при отсутствии HTTPS)

## Чем g3 отличается от vibe coding и single-agent

| Аспект | Обычный vibe coding | g3 (диалектическое автокодирование) |
|--------|---------------------|-------------------------------------|
| Ревью | Человек ловит пробелы | Coach на каждом ходу |
| Контекст | Один длинный тред | Свежие инстансы + фокусный фидбек |
| Критерий успеха | Размытый | Контракт требований + одобрение Coach |
| Автономность | ~5 мин на ход, человек рядом | Задумано на 30–60 мин без надзора |
| Самоуверенность | Player рано говорит «сделано» | Coach находит HTTPS, auth, metrics |
| Модели | Одна модель на сессию | Естественная ротация моделей по ролям/ходам |

Кейс из статьи: **Calculator API** — goose частично; g3 закрыл требования за несколько ходов **без более сильной базовой модели**, за счёт adversarial-дизайна.

## Уникальные инженерные решения в g3

Помимо парадигмы из статьи, в Rust-коде:

### 1. Управление контекстом
- **Context thinning** на 50/60/70/80% — большие выводы tools → ссылки на файлы
- **Auto-compaction** при 80% ёмкости
- CLI: `/compact`, `/thinnify`, `/skinnify`, `/stats`

### 2. Модульный Rust-workspace
- `g3-core` — оркестрация, tools, streaming parser
- `g3-providers` — Anthropic, Databricks, llama.cpp (Metal на macOS)
- `g3-execution` — планирование, retry, прогресс
- `g3-computer-control` — мышь/клавиатура, скриншоты, OCR (для оценки Coach)
- `g3-cli` — интерактив + автономные режимы

### 3. Agent Skills ([agentskills.io](https://agentskills.io))
Портативные пакеты `SKILL.md` — `.g3/skills/`, `~/.g3/skills/`, встроенные skills в бинарнике.

### 4. Синтаксический поиск кода
tree-sitter: Rust, Python, JS/TS, Go, Java, C/C++.

### 5. Режимы работы
- **По умолчанию: accumulative autonomous** — каждое требование пользователя → цикл coach/player
- `--autonomous` — читает `requirements.md`
- `--planning` — уточнение требований + git commit (`g3-plan/`)
- `--chat` — простой чат без автономного цикла

### 6. Честные бенчмарки локальных моделей
В README — agentic-задача (repack комиксов): dense vs MoE; облачные Opus/Gemini 3 Pro как baseline.

## Эмпирические кейсы (из статьи)

| Кейс | Результат | Ссылки |
|------|-----------|--------|
| Calculator API | g3 завершил; goose — частично | Paper § Empirical Results |
| Diff viewer (SwiftUI) | 4 хода coach/player | [swifty-diff](https://github.com/michaelneale/swifty-diff) |
| iOS-клиент goose | По API-спеке; слабый контроль эмулятора | [goose-ios](https://github.com/dhanji/goose-ios) |
| Git TUI explorer | 5/5 completeness в таблице paper vs Cursor/Codex | Таблица в PDF |

## Связанные ссылки

- [Terminal Bench 2.0](https://www.tbench.ai/leaderboard/terminal-bench/2.0)
- [ACM: стоимость переключения контекста](https://dl.acm.org/doi/10.1145/1281700.1281702)
- [OpenCode: adversarial cooperation](https://github.com/kishb87/opencode-adversarial-cooperation)
- В статье: паттерн планируется как улучшение **goose**

## Связь с VAIRL / агентством

Дуэт Coach/Player перекликается с **критиком** в нейросимволическом пайплайне — реализация vs независимая валидация. Возможные связки:

- Coach как **PubLens / QA gate** перед merge
- Player как coder с tools; Coach как oracle требований и тестов
- Параллельные кластеры экспериментов (проблема «ночей и выходных» из статьи)

## Ограничения

- Лимит ходов может не хватить на очень крупные задачи
- Автоматизация iOS-эмулятора слабее desktop/web для Coach
- Локальные модели всё ещё сильно отстают от облачных top-tier на сложных agentic-задачах
- Паттерн воспроизводим на других агентах — g3 одна из реализаций

## Следующие шаги

- [ ] Минимальный coach/player на задаче VAIRL
- [ ] Сравнение g3 vs single-agent на одном `requirements.md`
- [ ] Связка Coach с peer-review gate (PubLens) в агентстве
