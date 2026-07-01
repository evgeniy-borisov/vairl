---
layout: post
title: "Телеметрия AI-агентов: сбор запросов, хранение и поиск похожих задач"
date: 2026-06-29 18:36:39 +0300
excerpt: "Обзор практик логирования коммуникации пользователя с агентом: трассы, задачи, хранилища, PII, embedding-поиск похожих сессий, связь с eval и бенчмарками, фундаментальная литература."
lang: ru
image: /assets/images/agent-telemetry.svg
---

Без телеметрии агент — чёрный ящик: вы не знаете, **какие задачи** приходят пользователям, где падает траектория и что превратить в тест для регрессии. Телеметрия — это не «логи ради логов», а **контур обратной связи продукта**: собрать запросы и диалоги, сохранить в базе, найти похожие кейсы, оценить качество и пополнить eval-набор.

Ниже — обзор **подходов и практик**: что логировать, как хранить, как искать похожие задачи и связать телеметрию с [генерацией бенчмарков](/vairl/blog/2026/06/29/agent-benchmark-generation-ru/) и [устойчивостью control loop](/vairl/blog/2026/06/29/agent-control-loop-stability-ru/). В конце — **фундаментальная литература** по теории агентов, eval LLM и смежным дисциплинам (RL, автоматизация тестирования).

## Зачем телеметрия агенту

| Вопрос продукта | Что даёт телеметрия |
|-----------------|---------------------|
| Какие задачи у пользователей? | Корпус **intent / task** с частотами |
| Где агент ломается? | Трассы с ошибками tools, escalation, abandon |
| Сколько стоит сессия? | Токены, latency, число шагов |
| Что добавить в eval? | Кандидаты из продакшена с outcome |
| Есть ли похожий прошлый кейс? | **Semantic search** по embedding запроса |

```mermaid
flowchart LR
  U[Пользователь] --> A[Агент]
  A --> T[Телеметрия: spans + events]
  T --> S[(Хранилище)]
  S --> E[Eval / бенчмарки]
  S --> Q[Поиск похожих]
  S --> D[Дашборды / алерты]
```

---

## Уровни наблюдаемости

По аналогии с классической observability (metrics / logs / traces):

| Уровень | Содержимое | Пример |
|---------|------------|--------|
| **Metrics** | Агрегаты | success rate, p95 latency, cost/session |
| **Logs** | Строковые события | `tool_error`, `policy_violation` |
| **Traces** | Иерархия span'ов | session → turn → LLM call → tool |
| **Trajectories** | Полная история агента | messages, tool I/O, state checkpoints |

Для action-агентов **trajectory** важнее одной строки лога: eval и replay требуют **структурированной** последовательности шагов.

---

## Что собирать: минимальная схема сессии

### Идентификаторы и контекст

- `session_id`, `trace_id` (W3C Trace Context)
- `user_id` / `anonymous_id` (хешированный)
- `tenant_id`, `agent_version`, `model_id`, `orchestrator_mode` (DAG / FSM / BT)
- `timestamp_start`, `timestamp_end`, `locale`

### Запрос пользователя и извлечённая задача

Разделяйте **сырой utterance** и **нормализованный task**:

| Поле | Назначение |
|------|------------|
| `user_message_raw` | Текст как ввёл пользователь |
| `task_label` | Краткая формулировка (ручная или LLM-summary) |
| `intent_class` | Классификатор: support / coding / search / … |
| `goal_embedding` | Вектор для поиска похожих |
| `constraints` | JSON: deadline, budget, policy tags |

Список задач пользователя — это **не** только первое сообщение. Задача может **уточняться** в диалоге; фиксируйте `task_revision` на каждый существенный pivot.

### Коммуникация и шаги агента

На каждый **turn** или **step** control loop:

| Поле | Зачем |
|------|-------|
| `step_index`, `parent_span_id` | Дерево трассы |
| `role` | user / assistant / tool / system |
| `content` / `content_ref` | Текст или ссылка на blob |
| `tool_name`, `tool_args`, `tool_result` | Tool-calling |
| `fsm_state` | Planning / Executing / Recovering |
| `tokens_in`, `tokens_out`, `latency_ms` | Экономика |
| `error_proxy`, `grounding_score` | Связь с [метриками устойчивости](/vairl/blog/2026/06/29/agent-control-loop-stability-ru/) |
| `outcome` | success / fail / escalated / abandoned |

### Итог сессии

- `task_success` (bool + причина)
- `user_feedback` (thumbs, rating, free text)
- `cost_total_usd`, `steps_count`
- `final_artifact_ref` (ответ, patch, DB snapshot id)

---

## Где и как собирать

### 1. In-process hooks (оркестратор)

Перехват в LangGraph / custom event loop: before/after каждого узла, callback на tool.

**Плюсы:** полный контроль, низкая латентность.  
**Минусы:** нужно поддерживать схему в коде.

### 2. OpenTelemetry (OTel)

Стандарт **traces + spans + attributes**. Экспорт в Jaeger, Tempo, Datadog, Honeycomb.

**Практика:** один `trace_id` на сессию; span на LLM-вызов и tool; attributes — `model`, `tokens`, `tool.status`.

### 3. Специализированные LLM-платформы

| Платформа | Фокус |
|-----------|--------|
| **LangSmith** | Трассы LangChain/LangGraph, datasets, eval |
| **Langfuse** | Open-source traces, scores, prompt management |
| **Arize Phoenix** | Traces + embeddings drift |
| **Weights & Biases Weave** | Эксперименты + online traces |
| **Braintrust** | Logs → eval → regression |
| **Helicone** / **Portkey** | Gateway + логирование запросов |

Выбор: нужен **open-source on-prem** → Langfuse / OTel; tight LangGraph → LangSmith; eval-first → Braintrust.

### 4. Gateway / proxy

Прокси перед API провайдера логирует все completion'ы. Не видит tool side effects вне LLM — **дополняйте** application-level events.

### 5. Event bus (Kafka / Redis Streams)

Асинхронная запись: агент публикует `AgentStepRecorded`, consumer пишет в DWH. Снижает риск потери при падении UI, масштабируется.

```mermaid
flowchart TB
  A[Agent runtime] --> H[Telemetry SDK]
  H --> B[Event bus]
  H --> O[OTel collector]
  B --> W[(Warehouse)]
  O --> T[Trace backend]
  W --> V[Vector index]
  W --> SQL[(PostgreSQL / ClickHouse)]
```

---

## Хранение: какие базы и слои

Типичная **медальонная** архитектура:

| Слой | Технология | Данные |
|------|------------|--------|
| **Hot** (7–30 дней) | PostgreSQL, Redis | Сессии, быстрый lookup по id |
| **Warm** (месяцы) | ClickHouse, BigQuery | Аналитика, агрегаты, funnel |
| **Cold** | S3 / GCS + Parquet | Полные trajectories, compliance archive |
| **Vector** | pgvector, Qdrant, Chroma, Pinecone | `goal_embedding`, `task_embedding` |
| **Search** | OpenSearch, Elasticsearch | Full-text по сообщениям (с PII filter) |

**PostgreSQL + pgvector** — разумный старт: одна БД для метаданных сессии и similarity search.

### Пример реляционной модели (упрощённо)

```
sessions(session_id, user_hash, started_at, outcome, cost, ...)
tasks(task_id, session_id, label, intent, embedding, ...)
steps(step_id, session_id, idx, role, tool_name, latency, ...)
message_blobs(blob_id, storage_uri, sha256, ...)
```

Большие payloads (полный контекст, tool JSON) — в **object storage**, в БД только ссылка и хеш.

---

## Список задач пользователя (task mining)

Цель: из потока диалогов получить **каталог задач** — что люди реально просят сделать.

### Подходы извлечения task

1. **Первое сообщение** — просто, но грубо (много уточнений потом).
2. **LLM-summarize** в конце сессии — «какую задачу решал пользователь?»
3. **Классификатор intent** на каждый turn — детект смены задачи.
4. **Structured output** при входе — форма + agent; task = schema instance.
5. **Кластеризация** embedding'ов всех opening messages — emergent taxonomy.

### Пайплайн task catalog

```
Сырые сессии → дедуп / PII scrub → extract task_label → embed → кластер → human review топ-кластеров → taxonomy v1
```

Каталог связывается с **частотой**, **success rate**, **cost** — приоритизация улучшений агента и [генерации бенчмарков](/vairl/blog/2026/06/29/agent-benchmark-generation-ru/) из частых failure-кластеров.

---

## Поиск похожих задач и сессий

Зачем: подсказать оператору прошлый кейс, найти regression twin, собрать few-shot, дедуплицировать eval.

### Методы

| Метод | Когда |
|-------|--------|
| **Cosine similarity** embedding'ов запроса | Семантически близкие формулировки |
| **Hybrid** (BM25 + dense) | Точные термины + смысл |
| **Reranker** (cross-encoder) | Топ-50 → топ-5 для продакшена |
| **SimHash / MinHash** | Быстрый дедуп почти дубликатов |
| **Trajectory similarity** | DTW по последовательности tool calls |

### Практический API

```
POST /telemetry/similar-tasks
{ "query": "...", "k": 10, "filters": { "outcome": "fail", "intent": "billing" } }
→ [{ task_id, session_id, score, label, outcome }]
```

Фильтры критичны: искать похожие **неуспешные** кейсы для отладки, успешные — для few-shot.

Связь с [пространством гипотез и PaCMAP](/vairl/blog/2026/06/24/hypothesis-space-pacmap/): кластеры задач в 2D — карта «белых пятен» продукта.

---

## Практики и политики

### PII и compliance

- Маскирование email, phone, card **до** записи (presidio, regex, LLM-redact).
- Retention policy: 30 / 90 / 365 дней по классу данных.
- Opt-out, GDPR erase по `user_hash`.
- Разделение **prod telemetry** и **eval corpus** (анонимизированный экспорт).

### Sampling

100% логирование дорого. Стратегии:

- 100% ошибок и escalation;
- 100% сессий с `user_feedback`;
- random sample успешных (например 10%);
- **headline** sample новых intent'ов.

### Версионирование агента

Каждая запись привязана к `agent_version` + `prompt_hash` + `model` — иначе невозможно сравнить регрессии.

### Идемпотентность записи

`step_id = hash(session_id, step_index, tool_call_id)` — защита от двойной доставки в bus.

### Связь с eval

| Телеметрия | Eval |
|------------|------|
| Failed session + verifier | Кандидат в golden set |
| High-cost session | Кандидат на оптимизацию |
| Частый кластер | Приоритет для synthetic benchmark |
| pass^k на replay | Regression CI |

Пайплайн: `telemetry → human label → scenario pack → CI` (как AgentSynth / τ-bench packs).

---

## Антипаттерны

| Плохо | Почему |
|-------|--------|
| Только plain-text логи без trace_id | Нельзя собрать trajectory |
| LLM-ответ целиком в БД без redaction | PII, раздувание storage |
| Поиск только по keyword | Пропуск парафразов |
| Нет outcome на сессии | Нельзя приоритизировать failures |
| Один embedding на весь диалог | Теряются pivot'ы задачи |
| Телеметрия без sampling budget | Неконтролируемые расходы |

---

## Рекомендуемый стек для старта

Минимум viable telemetry для action-агента:

1. **OTel SDK** в оркестраторе + exporter в Langfuse или Jaeger  
2. **PostgreSQL**: `sessions`, `steps`, outcomes  
3. **S3**: blob tool I/O  
4. **pgvector**: `goal_embedding` на task  
5. **Nightly job**: extract tasks → update catalog → flag new clusters  
6. **Weekly**: экспорт failure-кластеров в eval backlog  

Расширение: ClickHouse для дашбордов, Braintrust/LangSmith для human review и A/B.

---

## Чеклист внедрения

1. Есть ли **единый trace_id** на всю сессию?
2. Логируются ли **все tool calls** с args/result (или ref)?
3. Фиксируется ли **task_label** отдельно от raw message?
4. Есть ли **outcome** и **cost** на сессию?
5. Работает ли **поиск похожих** по embedding + фильтрам?
6. Настроены **retention** и **PII scrub**?
7. Связана ли телеметрия с **eval / regression** pipeline?
8. Можно ли **replay** сессии в sandbox по сохранённой trajectory?

---

## Связанные публикации VAIRL

- [Генерация бенчмарков для AI-агентов](/vairl/blog/2026/06/29/agent-benchmark-generation-ru/) — от телеметрии к eval-наборам
- [Как готовить ведущего специалиста по AI-агентам](/vairl/blog/2026/06/29/best-ai-agent-specialist-ru/) — observability в компетенциях
- [Устойчивость control loops](/vairl/blog/2026/06/29/agent-control-loop-stability-ru/) — метрики на каждом шаге
- [Пространство гипотез и PaCMAP](/vairl/blog/2026/06/24/hypothesis-space-pacmap/) — визуализация кластеров задач
- [Синтез гипотез локальной LLM](/vairl/blog/2026/06/26/llm-hypothesis-synthesis-agents-ru/) — гипотезы из накопленных трасс

---

## Фундаментальная литература

Поскольку направление AI-агентов (и тем более их **тестирования и observability**) развивается стремительно, классические бумажные книги часто не успевают за индустрией. Тем не менее существует фундаментальная академическая литература по архитектуре агентов, тестированию систем ИИ и методологиям оценки — она задаёт **теоретическую базу** для того, *что* логировать в телеметрии, *как* строить метрики и *как* превращать продакшен-трассы в eval-наборы.

Ниже — три категории источников и их связь с практиками из этой статьи. Подробнее про eval и бенчмарки — в [обзоре генерации бенчмарков](/vairl/blog/2026/06/29/agent-benchmark-generation-ru/).

### 1. Фундаментальная теория AI-агентов и систем

Эти книги объясняют, как агенты принимают решения, строят траектории и взаимодействуют со средой — то, что ложится в основу **схемы span'ов**, **task mining** и метрик надёжности.

| Книга | Авторы | О чём | Связь с телеметрией |
|-------|--------|-------|---------------------|
| *Artificial Intelligence: A Modern Approach* (4th ed.) | Stuart Russell, Peter Norvig | Главный учебник по ИИ. Главы про **рационального агента** (Rational Agent), архитектуру интеллектуальных агентов и **среды** (Task Environments), PEAS-описание | Без PEAS нельзя спроектировать **таксономию событий**: Performance → метрики success/cost; Environment → sandbox id; Actuators → tool calls; Sensors → user input и tool results |
| *An Introduction to MultiAgent Systems* (2nd ed.) | Michael Wooldridge | Многоагентные системы (MAS): кооперация, конкуренция, протоколы общения | Критично для телеметрии **мультиагентных** стеков (AutoGen, CrewAI, [MAESTRO](/vairl/blog/2026/07/01/maestro-airi-stack-ru/)): логировать `agent_id`, `message_protocol`, handoff между ролями, конфликты и дедлоки |

**Практический вывод:** при проектировании схемы `sessions` / `steps` задайте вопрос из Norvig: «какие **перцепты** и **действия** у агента в нашей среде?» — ответ определяет обязательные поля трассы.

### 2. Тестирование и оценка систем ИИ и LLM

Практические руководства по методологиям оценки качества генерации, надёжности и работы с кодом — мост от **сырой телеметрии** к **continuous evaluation**.

| Книга | Авторы / издатель | О чём | Связь с телеметрией |
|-------|-------------------|-------|---------------------|
| *Evaluating LLMs and LLM-Based Applications* | O'Reilly Media (сборник) | Практика оценки LLM в бизнес-сценариях: автоматические метрики, **LLM-as-a-Judge**, eval **chains** и **tool calling** | Телеметрия — источник данных для offline eval: replay trajectory → scorer; judge только на выборке из `outcome = fail` |
| *Building Intelligent Systems: A Guide to Machine Learning Engineering* | Geoff Hulten | Инженерия ИИ-систем: **continuous evaluation**, сбор телеметрии, edge cases, **test suites** в продакшене | Прямое попадание в nightly job «extract tasks → flag clusters → eval backlog»; Hulten формализует то, что в статье названо **контуром обратной связи продукта** |

**Практический вывод:** телеметрия без eval pipeline — дорогое хранилище логов. Книги этого блока описывают, как из потока трасс строить **регрессионные наборы** и не путать monitoring с validation.

### 3. Смежные дисциплины: тестирование ПО и обучение с подкреплением

Агентные бенчмарки (WebArena, SWE-bench) и продакшен-телеметрия работают на стыке **автоматизации тестирования** и **интерактивных сред RL**.

| Книга | Авторы | О чём | Связь с телеметрией |
|-------|--------|-------|---------------------|
| *Reinforcement Learning: An Introduction* (2nd ed.) | Richard S. Sutton, Andrew G. Barto | MDP, **reward**, оценка **траекторий** | Язык для логирования **trajectory-level** метрик: state checkpoints, reward proxy (`task_success`, `user_feedback`), pass^k при replay; см. [устойчивость control loops](/vairl/blog/2026/06/29/agent-control-loop-stability-ru/) |
| *Software Test Automation* | Mark Fewster, Dorothy Graham | Детерминированные проверки, изоляция тестовых сред (песочницы, Docker), ложноположительные | Replay сессии из телеметрии в **sandbox** с тем же `initial_state`; deterministic oracle на tool I/O; защита от false pass при flaky среде |

**Практический вывод:** каждая сохранённая trajectory — потенциальный **тест-кейс**; Sutton даёт метрики над траекторией, Fewster & Graham — инженерию воспроизводимого прогона.

### Как литература стыкуется с пайплайном телеметрии

```mermaid
flowchart LR
  subgraph theory [Теория]
    N[Russell & Norvig: PEAS]
    W[Wooldridge: MAS]
  end
  subgraph practice [Практика eval]
    H[Hulten: continuous eval]
    O[O'Reilly: LLM eval]
  end
  subgraph adjacent [Смежное]
    S[Sutton & Barto: trajectories]
    F[Fewster & Graham: test automation]
  end
  T[Телеметрия: spans + trajectories] --> E[Eval / regression]
  theory --> T
  practice --> E
  adjacent --> E
```

| Этап пайплайна (см. выше) | Книга-ориентир |
|---------------------------|----------------|
| Схема полей `session` / `step` | Russell & Norvig — PEAS, task environment |
| Логирование multi-agent handoff | Wooldridge — протоколы и роли |
| Nightly task catalog + sampling | Hulten — continuous evaluation |
| Scoring failed sessions | O'Reilly — LLM-as-a-Judge + детерминированные checks |
| Trajectory metrics, pass^k | Sutton & Barto — оценка эпизодов |
| Replay в sandbox | Fewster & Graham — изоляция и oracle |

---

## Обзорные работы (survey papers)

Академические обзоры по eval агентов дополняют книги актуальными бенчмарками и метриками — полезны при проектировании **дашбордов** и **алертов** поверх телеметрии:

| Работа | Год | Фокус | Ссылка |
|--------|-----|-------|--------|
| **Evaluation and Benchmarking of LLM Agents: A Survey** | 2025 | Таксономия: что оценивать и как; среды и метрики | [arXiv:2507.21504](https://arxiv.org/abs/2507.21504) |
| **A Survey on Evaluation of LLM-based Agents** | 2026 | Эволюция бенчмарков; память; мультиагентные среды | [arXiv:2503.16416](https://arxiv.org/html/2503.16416v2) |
| **Establishing Best Practices for Building Rigorous Agentic Benchmarks** | 2025 | Ложноположительные при auto-check; rigor eval | [arXiv:2507.02825](https://arxiv.org/html/2507.02825v2) |

Полный каталог survey'ов, платформ и бенчмарков — в [статье про генерацию бенчмарков](/vairl/blog/2026/06/29/agent-benchmark-generation-ru/#обзорные-работы-survey-papers).

---

## Инструменты и стандарты

| Категория | Инструмент | Роль в телеметрии |
|-----------|------------|-------------------|
| Стандарт traces | **OpenTelemetry** | Spans, semantic conventions, экспорт в Jaeger / Tempo / Datadog |
| Propagation | **W3C Trace Context** | `traceparent` сквозь gateway и микросервисы |
| LLM observability | **LangSmith**, **Langfuse**, **Arize Phoenix**, **Braintrust** | Трассы, datasets, human review, regression |
| Gateway | **Helicone**, **Portkey** | Логирование completion'ов на границе API |
| Compliance | OpenAI / Anthropic logging policies | Retention, abuse monitoring, PII |
