---
layout: post
title: "Кейс: кредитка Сбера или Т-Банка — грейс, проценты и как агенты ищут стратегию"
date: 2026-07-15 12:00:00 +0300
excerpt: "Подстатья к клиентскому investment-агенту: грейс Сбера/Т-Банка, симуляция политик, p5-дашборд; Dashboard Agent (Streamlit + p5 + Python) и Discipline Agent (Telegram / календарь / email с ACK)."
lang: ru
image: /assets/images/banking-credit-card-grace-case.svg
visibility: public
review_track: blog
review_status: approved
---

<div class="post-tldr" markdown="1">

### TL;DR

Это **живой кейс** к статье про [агента на стороне клиента](/vairl/blog/2026/07/13/banking-investor-ai-agent-ru/): не портфель акций, а кредитная карта с льготным периодом. Условия сняты с [Банки.ру](https://www.banki.ru/products/creditcards/) (карточки продуктов), сведены к учебной модели и прогнаны через симуляцию.

- **СберКарта:** до **120 дней** грейса (месяц покупок + ~90 дней на возврат), ставка в витрине от **~49.8%**, min payment до **10%**.
- **Т-Банк Платинум:** до **55 дней** на покупки, до **120 дней** на рефинансирование других карт; ставка в модели **~29.9%+**, min до **8–14%**.
- **Ловушка:** минимальный платёж ≠ сохранение грейса. Платите «как удобно» — и \(CF\) клиента уходит в проценты.
- **Агенты** не «советуют в чате»: Ledger → Grace Calendar → Cost → Strategy search → Policy → объяснение. Objective — **минимизировать client cost** (проценты + комиссии), не take-up банка.
- **Входы:** учебные **PDF-выписки** → парсер → ledger; выходы — **p5.js-динамика** по дням (+ SVG-снимки).
- **Два прикладных агента поверх расчёта:** **Dashboard Agent** (Streamlit + p5.js + Python-viz) и **Discipline Agent** (Telegram / календарь / email с обязательным подтверждением шага).

</div>

<div class="post-decision" markdown="1">

### Важно

Модели **упрощены**. Реальный расчёт грейса, ПСК (*full cost of credit*) и даты платежа смотрите в тарифе банка и выписке. Цифры ниже — для демонстрации **логики агентов**, не индивидуальная рекомендация. Снимок условий: [`assets/data/banki-credit-cards-sber-tbank-2026-08.json`](/vairl/assets/data/banki-credit-cards-sber-tbank-2026-08.json) (дата съёма: 2026-08-04).

</div>

<div class="post-toc" markdown="1">

**Погружение:**

1. [Зачем этот кейс](#why)
2. [Что скачали с Банки.ру](#banki)
3. [Модели грейса](#models)
4. [PDF-выписки → Ledger Agent](#pdf)
5. [Персона и временная динамика трат](#persona)
6. [Симуляция политик](#sim)
7. [Временные графики (p5.js)](#charts)
8. [Как агенты ищут стратегию](#agents)
9. [Dashboard Agent и Discipline Agent](#dashboard-discipline)
10. [Рефинансирование / balance transfer](#refinance)
11. [Код и воспроизведение](#code)
12. [Связь с частью 1](#link)

</div>

---

## Зачем этот кейс {#why}

В [части 1](/vairl/blog/2026/07/13/banking-investor-ai-agent-ru/) конфликт NPV банка и клиента виден на fee брокерки. На **кредитной карте** он ещё жёстче:

| Событие | Банк | Клиент |
|---------|------|--------|
| Клиент уложился в грейс | мало % (часто 0) | выигрыш |
| Клиент сорвал грейс / живёт на минималке | поток процентов ↑ | \(NPV_{client}\) ↓↓ |
| Снятие наличных | комиссия + % сразу | худший \(CF\) |
| Рефинанс на 120 дней | банк-донор забирает AUM долга | шанс снова поймать 0% |

Клиентский агент обязан уметь **календарь грейса**, а не только «ваш платёж 8 000 ₽».

---

## Что скачали с Банки.ру {#banki}

Публичные карточки продуктов (агрегатор; перед решением сверяйте сайт банка):

| Продукт | Карточка | Льготный период (витрина) | Ставка (витрина) | Min payment |
|---------|----------|--------------------------|------------------|-------------|
| Кредитная СберКарта | [card/8481](https://www.banki.ru/products/creditcards/card/8481/) | до **120 дней**; новый период с 1-го числа, ~4 месяца на покупки месяца | от **49.8%** до 59.8%; ПСК 48.816–58.320% | до **10%** долга + проценты |
| Платинум (оформление на Банки.ру) | [card/675](https://www.banki.ru/products/creditcards/card/675/) | **55 дней** на покупки/переводы в сервисах; **120** (до 180 с Pro) на рефинанс | от **29.9%** до 61.9%; ПСК 29.855–61.999% | до **14%**, мин. 600 ₽ |
| Платинум | [card/8813](https://www.banki.ru/products/creditcards/card/8813/) | **55** на покупки; **120** на рефинанс других карт | витрина шире (покупки / снятие раздельно) | до **8%**, мин. 600 ₽ |

Дополнительно по витрине: снятие наличных у Сбера **5,9% + 590 ₽**; у Т-Банка порядка **2,9–4,9% + фикс** — в грейс обычно **не** входит, проценты с первого дня.

Официальные пояснения грейса (для сверки механики): [Сбер — как работает беспроцентный период](https://www.sberbank.ru/ru/person/blog/kak-rabotaet-besprocentnyi-period-po-kreditnoi-karte), [Т-Банк — grace period](https://www.tbank.ru/bank/help/credit-cards/tinkoff-platinum/how-to-use-a-credit-card/grace-period/).

---

## Модели грейса {#models}

Агенту нужна не HTML-страница, а **исполняемая модель**. Учебные правила:

### Сбер (упрощение «120 дней»)

```text
grace_days(purchase_day_in_month) = (30 − day) + 90
```

Покупка 1-го → ~120 дней; покупка 30-го → ~91 день. Грейс на **покупки**; cash — сразу в «дорогой» слой.

### Т-Банк (упрощение «до 55 дней»)

```text
grace_days(purchase_day_in_cycle) = (30 − day) + 25
```

Расчётный период + окно до платежа. Отдельно: **balance transfer / рефинанс** → до **120** дней грейса (по витрине Банки.ру).

### Общее для обеих моделей

1. Пока \(t \le \text{grace\_end}\) и долг по корзине погашен вовремя — ставка 0 на эту корзину.  
2. Минимальный платёж **не** равен «грейс жив».  
3. После срыва — \(r_{\mathrm{day}} = APR / 365\), капитализация в учебной модели ежедневная.  
4. Платежи гасят сначала **внегрейсовые** корзины (дороже), потом ближайший `grace_end`.

В коде это `CardModel` + `Position` в [`scripts/credit_card_grace_case_sim.py`](https://github.com/evgeniy-borisov/vairl/blob/main/scripts/credit_card_grace_case_sim.py).

---

## PDF-выписки → Ledger Agent {#pdf}

Реальный контур клиента начинается не с YAML персоны, а с **файла выписки**. В кейсе — синтетические PDF (не документы банка), с **стабильными маркерами** для парсера:

| Маркер | Смысл |
|--------|--------|
| `BANK:` / `CARD:` | какой продукт / календарь грейса подключить |
| `STATEMENT_PERIOD:` | границы расчётного периода |
| `PAYMENT_DUE:` / `GRACE_PAYMENT:` / `MIN_PAYMENT:` | даты и суммы из «шапки» |
| `APR_PURCHASES:` | ставка модели для Cost Agent |
| `=== OPERATIONS ===` | строки `DATE KIND AMOUNT DESCRIPTION` |

Файлы в репозитории:

- [anna-month1-sber.pdf](/vairl/assets/data/credit-card-statements/anna-month1-sber.pdf)
- [anna-month1-tbank.pdf](/vairl/assets/data/credit-card-statements/anna-month1-tbank.pdf)
- рядом `.parsed.json` и `.ledger.json` — выход Ledger Agent

Пайплайн:

```text
PDF (PyMuPDF generate / банк export)
  → pypdf extract_text
  → regex markers
  → StatementMeta + operations[]
  → relative-day ledger
  → grace sim / charts
```

```bash
python scripts/credit_card_statement_pdf.py generate
python scripts/credit_card_statement_pdf.py parse \
  --pdf assets/data/credit-card-statements/anna-month1-sber.pdf
```

Фрагмент парсера:

```python
def parse_statement_pdf(pdf_path: Path) -> dict:
    text = extract_text(pdf_path)  # pypdf
    # BANK:, PAYMENT_DUE:, блок OPERATIONS → meta + ops
    ...
```

Почему **PDF**, а не сразу CSV: в жизни клиент чаще тащит именно PDF/скан из ЛК. Агент обязан уметь текст слой; OCR — следующий слой (вне демо). Контракт маркеров отделяет «как банк сверстал» от «что симулятор ест».

На выписке Сбера за месяц 1 парсер поднимает: `grace_payment = 120 000`, `payment_due = 2026-04-30`, три покупки → ledger с `day` 3/10/20 относительно начала периода.

---

## Персона и временная динамика трат {#persona}

**Анна**, зарплата 120 000 ₽ 5-го числа, стартовый кэш 20 000 ₽.

| День | Событие |
|------|---------|
| 3 | Покупка мебели **80 000 ₽** кредиткой |
| каждый месяц, 10-е и 20-е | «жизнь» **25k + 15k** |
| горизонт | **180 дней** (6 циклов) |

```mermaid
flowchart LR
  subgraph M1["Месяц 1"]
    A["День 3: 80k"]
    B["10: 25k"]
    C["20: 15k"]
  end
  subgraph Risk["Риск"]
    D["Только min payment"]
    E["Срыв grace"]
    F["% каждый день"]
  end
  M1 --> Risk
```

Две карты — два календаря. На Сбере у Анны больше «воздуха» до первого процента; на Т-Банке окно короче, зато ниже модельная APR и есть BT на 120 дней.

---

## Симуляция политик {#sim}

Strategy Agent перебирает политики (один и тот же ledger):

| Политика | Поведение |
|----------|-----------|
| `min_trap` | в платёжные дни только минималка |
| `grace_keeper` | к дате платежа закрывать корзины с близким `grace_end` |
| `payday_clear` | в зарплату гасить долг, сколько позволяет кэш |
| `cash_then_min` | снять 40k наличными на старте + дальше минималка |

Прогон (`python scripts/credit_card_grace_case_sim.py`), APR в модели: Сбер **49.8%**, Т-Банк **29.9%** (нижняя граница витрины для покупок):

| Карта | Политика | Client cost (%% + fees) | Долг на день 180 |
|-------|----------|-------------------------|------------------|
| Сбер | `payday_clear` | **0** | 40 000 |
| Сбер | `grace_keeper` | **158** | 160 000 |
| Сбер | `min_trap` | **5 614** | 240 017 |
| Сбер | `cash_then_min` | **14 321** (из них fees 2 950) | 269 792 |
| Т-Банк | `payday_clear` | **0** | 40 000 |
| Т-Банк | `grace_keeper` | **222** | 40 000 |
| Т-Банк | `min_trap` | **14 698** | 241 900 |
| Т-Банк | `cash_then_min` | **22 216** | 271 486 |

Что видно сразу:

1. **Зарплатное гашение** обнуляет проценты в обеих моделях — это и есть «клиентский NPV» в миниатюре.  
2. **Минималка** на коротком грейсе (Т-Банк) при тех же тратах наказывает сильнее: проценты стартуют раньше, долг успевает «нарасти».  
3. **Наличные** — отдельный удар: комиссия сразу + APR без грейса.  
4. `grace_keeper` держит cost около нуля, но не заменяет дисциплину зарплаты, если траты > свободного кэша.

Банковский ассистент часто пушит «внесите минимальный платёж — всё в порядке». Клиентский — считает **разницу cost** между `min_trap` и `payday_clear` и показывает её в рублях.

---

## Временные графики (p5.js) {#charts}

Таблицы дают итог на день 180. Агенту и читателю нужна **динамика**. Ниже — интерактив на [p5.js](https://p5js.org/) (уже в layout VAIRL): проигрывание симуляции по дням, переключение банка и политики, площадь «под грейсом / уже %», пунктир остальных политик для сравнения.

Данные те же, что у Python-симулятора (`run_daily` → JSON). SVG-экспорт оставлен как статичный снимок для печати и офлайна.

<div
  class="cc-grace-widget"
  id="cc-grace-demo"
  data-series-url="{{ '/assets/data/credit-card-grace-series.json' | relative_url }}"
>
  <div class="cc-grace-toolbar">
    <button type="button" data-cc-card="sber" class="active">Сбер</button>
    <button type="button" data-cc-card="tbank">Т-Банк</button>
    <span class="cc-grace-sep" aria-hidden="true"></span>
    <button type="button" data-cc-policy="min_trap" class="active">min_trap</button>
    <button type="button" data-cc-policy="grace_keeper">grace_keeper</button>
    <button type="button" data-cc-policy="payday_clear">payday_clear</button>
    <button type="button" data-cc-policy="cash_then_min">cash_then_min</button>
    <span class="cc-grace-sep" aria-hidden="true"></span>
    <button type="button" data-cc-play>⏸ Пауза</button>
    <button type="button" data-cc-reset>↺ Сброс</button>
    <button type="button" data-cc-compare class="active">Сравнение политик: вкл</button>
    <label class="cc-grace-speed">Скорость
      <input type="range" data-cc-speed min="0.5" max="8" step="0.5" value="2" />
    </label>
    <button type="button" data-cc-fullscreen title="Полный экран" aria-label="Полный экран">⛶</button>
  </div>
  <div class="cc-grace-stats">
    <div><span>День</span><strong data-cc-day>0</strong></div>
    <div><span>Долг</span><strong data-cc-debt>—</strong></div>
    <div><span>Client cost</span><strong data-cc-cost>—</strong></div>
    <div><span>Под грейсом</span><strong data-cc-under>—</strong></div>
    <div><span>Уже %</span><strong data-cc-accr>—</strong></div>
    <div><span>До ближайшего grace_end</span><strong data-cc-gleft>—</strong></div>
  </div>
  <div class="cc-grace-narrative" data-cc-narrative>
    <p>Выберите банк и политику — здесь появится описание сценария.</p>
  </div>
  <div class="cc-grace-scrub">
    <input type="range" data-cc-scrub min="0" max="179" value="0" aria-label="День симуляции" />
  </div>
  <div id="cc-grace-canvas"></div>
  <div class="cc-grace-tooltip" data-cc-tooltip hidden></div>
  <p class="cc-grace-caption">
    Пунктир: серый — закрытие выписки, синий — платёжная дата, красный — конец грейса.
    Наведите на кривую долга — подсказка (покупка, минималка, начисление %…).
    Ряды из <code>credit-card-grace-series.json</code> · p5.js · ⛶ полноэкранный режим.
  </p>
</div>

<script src="{{ '/assets/js/credit-card-grace-demo.js' | relative_url }}"></script>

<details markdown="1">
<summary>Статичные SVG (снимок тех же рядов)</summary>

<figure style="margin: 1.5em auto; text-align: center;">
  <img src="/vairl/assets/images/credit-card-grace-debt-sber.svg" alt="Долг во времени, СберКарта, четыре политики" style="max-width: 100%; height: auto;" />
  <figcaption style="font-size: 0.9em; color: #666;">Сбер: длинный грейс — «воздух» дольше, но min_trap всё равно раздувает долг</figcaption>
</figure>

<figure style="margin: 1.5em auto; text-align: center;">
  <img src="/vairl/assets/images/credit-card-grace-debt-tbank.svg" alt="Долг во времени, Т-Банк Платинум, четыре политики" style="max-width: 100%; height: auto;" />
  <figcaption style="font-size: 0.9em; color: #666;">Т-Банк: короткий грейс — раньше расходятся кривые min_trap и payday_clear</figcaption>
</figure>

<figure style="margin: 1.5em auto; text-align: center;">
  <img src="/vairl/assets/images/credit-card-grace-cost-sber.svg" alt="Накопленный client cost, Сбер" style="max-width: 100%; height: auto;" />
</figure>

<figure style="margin: 1.5em auto; text-align: center;">
  <img src="/vairl/assets/images/credit-card-grace-cost-tbank.svg" alt="Накопленный client cost, Т-Банк" style="max-width: 100%; height: auto;" />
</figure>

<figure style="margin: 1.5em auto; text-align: center;">
  <img src="/vairl/assets/images/credit-card-grace-split-sber-min.svg" alt="Структура долга, Сбер min_trap" style="max-width: 100%; height: auto;" />
</figure>

<figure style="margin: 1.5em auto; text-align: center;">
  <img src="/vairl/assets/images/credit-card-grace-split-tbank-min.svg" alt="Структура долга, Т-Банк min_trap" style="max-width: 100%; height: auto;" />
</figure>

<figure style="margin: 1.5em auto; text-align: center;">
  <img src="/vairl/assets/images/credit-card-grace-min-trap-compare.svg" alt="Сравнение min_trap Сбер vs Т-Банк" style="max-width: 100%; height: auto;" />
</figure>

```bash
python scripts/generate_credit_card_grace_charts.py
# → SVG + assets/data/credit-card-grace-series.json для p5
```

</details>

---

## Как агенты ищут стратегию {#agents}

```mermaid
flowchart TB
  User["Анна: «почему капают проценты?»"]
  Orch["Оркестратор"]
  Led["Ledger Agent"]
  Grace["Grace Calendar"]
  Cost["Cost Agent"]
  Strat["Strategy Search"]
  Pol["Personal Policy"]
  Dash["Dashboard Agent"]
  Disc["Discipline Agent"]
  Comm["Communication"]

  User --> Orch
  Orch --> Led --> Grace --> Cost --> Strat
  Strat --> Pol
  Pol --> Dash
  Pol --> Disc
  Dash --> Comm
  Disc --> Comm
```

| Агент | Метод | В этом кейсе |
|-------|-------|--------------|
| **Ledger** | PDF / open banking → ops | маркеры выписки → `purchase` / `cash` / `payment` |
| **Grace Calendar** | детерминированный календарь | считает `grace_end` по модели карты |
| **Cost** | дневной ряд + сумма %% | `client_cost = interest + fees` |
| **Strategy Search** | перебор политик + what-if | `min_trap` … `payday_clear`, BT |
| **Personal Policy** | `must_not` | не рекомендовать снятие наличных «для кэшбэка»; не обещать 0% без календаря |
| **Simulation** | `run_daily` 30–180 дней | JSON-ряды → **p5.js** анимация / SVG |
| **Dashboard Agent** | расчёты → дашборд | Streamlit-приложение + p5 + Python-viz |
| **Discipline Agent** | nudge + confirm | Telegram / календарь / email до шага |
| **Communication** | LLM *только* narrative | «на графике красная зона с дня N» |

Контракт задачи (как в части 1):

```yaml
id: credit-card-grace-distress
intent: "капают проценты / что делать"
abstract_model: grace_calendar + cashflow_sim
objective: client_cost_min
family: symbolic
must_not: [upsell_bank_product, recommend_cash_advance, guarantee_zero_apr]
verifier: interest_matches_apr_outside_grace
llm_role: narrative_only
outputs: [dashboard_views, discipline_nudges]
```

Поиск стратегии — не RL из коробки, а **явный enumerate** политик + оценка Cost Agent. Это тот же принцип: *считает математика, подписывает policy, объясняет LLM*.

Дальше — два агента, которые делают расчёт **живым** для человека: один рисует дашборд, второй не даёт пропустить платёж/грейс.

---

## Dashboard Agent и Discipline Agent {#dashboard-discipline}

После Strategy Search у клиента два риска: *не понять* цифры и *забыть* сделать шаг. Поэтому поверх солверов садятся два прикладных агента.

```mermaid
flowchart LR
  Sim["Simulation / Cost JSON"]
  DA["1. Dashboard Agent"]
  DI["2. Discipline Agent"]
  ST["Streamlit app"]
  P5["p5.js виджеты"]
  Py["matplotlib / plotly / altair"]
  TG["Telegram"]
  Cal["Календарь"]
  Mail["Email"]
  ACK["Confirm / ACK"]

  Sim --> DA --> ST
  DA --> P5
  DA --> Py
  Sim --> DI
  DI --> TG & Cal & Mail
  TG & Cal & Mail --> ACK
  ACK -.->|шаг выполнен / перенос| DI
```

### 1. Dashboard Agent — «всё время в дашборды»

**Роль.** Берёт выходы симуляции (`run_daily`, маркеры грейса, ранжирование политик, what-if BT) и **постоянно** материализует их в обозримые панели. Не считает APR сам — только *переводит* аналитику в UI.

**Стек в этом кейсе:**

| Слой | Зачем |
|------|--------|
| **[Streamlit](https://streamlit.io/)** | Оболочка дашборда: вкладки «Карта», «Грейс», «Политики», «Журнал nudges»; слайдеры what-if, `st.metric` / `st.dataframe`, деплой на Streamlit Cloud ([обзор на VAIRL](/vairl/blog/2026/07/08/streamlit-folium-geospatial-ru/)) |
| **p5.js** | Живая динамика внутри Streamlit (`components.html` / iframe): playhead по дням, hover, fullscreen — как виджет выше |
| **Python viz** | Доработка и экспорт: `matplotlib` → SVG для печати/постов; `plotly` / `altair` → `st.plotly_chart` / Vega в том же приложении |

**Что обязан уметь:**

1. Подписаться на артефакты солверов (`credit-card-grace-series.json`, outcomes политик).  
2. Собрать **views** в Streamlit: долг / cost / структура грейса / сравнение банков.  
3. Встроить p5-хост (`data-series-url`) рядом с `st.line_chart` / Plotly.  
4. При смене политики или новой PDF-выписке — перезапустить скрипт / `@st.cache_data` без ручного копипаста.  
5. Хранить **snapshot** («дашборд на 2026-08-04») для audit (session state + выгрузка JSON/SVG).

Контракт:

```yaml
id: dashboard-agent
role: render_analytics
inputs: [sim_series_json, markers, policy_outcomes, narrative_blocks]
outputs:
  - streamlit_app: [grace-overview, policy-compare, event-journal]
  - p5_widgets: [cc-grace-demo]
  - static_exports: [svg, optional_pdf_report]
tools: [streamlit, matplotlib, plotly, altair]
must_not: [change_objective, invent_apr, hide_grace_end_markers]
refresh: on_new_statement | on_policy_change | on_rerun
```

Идея: человек смотрит **один** дашборд (Streamlit), а не чат с таблицами. p5 отвечает за ощущение времени; Plotly/matplotlib — за точность срезов и пакетную перерисовку.

### 2. Discipline Agent — дисциплина и уведомления

**Роль.** Не рисует графики. Следит, чтобы запланированный шаг **не потерялся**: внести grace payment, до зарплаты доложить сумму, не снимать наличные «просто так», подтвердить BT. Канал — не «ещё один баннер банка», а личные каналы клиента.

**Каналы (обязательный набор):**

| Канал | Зачем | Формат nudge |
|-------|--------|----------------|
| **Telegram** | быстрый push + inline-кнопки | «До конца грейса 5 дн. Нужно 48 200 ₽. Подтверди план.» |
| **Календарь** (CalDAV / Google / Apple) | якорь в дне человека | событие «Платёж для грейса» + reminder −3д / −1д / утром |
| **Email** | длинный audit-след и вложения | письмо + ICS + ссылка на Streamlit-дашборд |

**Обязательное подтверждение (ACK).** Без ACK шаг считается *не выполненным*, даже если уведомление ушло. Иначе это просто шум.

```text
nudge → deliver(Telegram|Calendar|Email)
     → wait ACK (confirm | snooze | done)
     → if timeout: escalate (другой канал + громче)
     → if confirm: закрепить план в journal + обновить Dashboard
     → if done: закрыть задачу, сверить ledger на следующем sync
```

Типовые события дисциплины в кейсе кредитки:

| Триггер | Сообщение агента | ACK |
|---------|------------------|-----|
| `grace_end` через ≤ 5 дней | «Закрой корзину / внеси grace payment» | confirm сумма / snooze 24ч |
| Платёжная дата завтра | «Min ≠ грейс. Нужная сумма: …» | confirm |
| Выбрана политика `payday_clear` | «В день зарплаты зарезервировать X» | calendar accept |
| Обнаружен cash advance | «Это сразу % + fee. Подтверди, что осознанно» | confirm risk |
| Рекомендован BT | «Окно 120 дней — только если погасишь внутри» | confirm plan |

Контракт:

```yaml
id: discipline-agent
role: nudge_with_ack
channels: [telegram, calendar, email]
inputs: [grace_calendar, planned_steps, user_prefs]
outputs: [nudge_events, ack_log]
policy:
  require_ack: true
  ack_timeout_hours: 24
  escalate_after_misses: 2
  quiet_hours: ["23:00-08:00"]
must_not: [auto_pay_without_ack, spam_without_backoff, upsell_bank_product]
verifier: every_planned_step_has_ack_or_escalation
```

Связка с дашбордом: Discipline Agent пишет в journal (`ack_log`); Dashboard Agent показывает ленту «что ждали / что подтвердили / что сорвали». Communication-слой формулирует текст, но **не** подменяет ACK кнопкой «ок, спасибо» без статуса шага.

**Почему два агента, а не один.** Dashboard отвечает за *понимание*, Discipline — за *исполнение во времени*. Смешивать нельзя: красивый график без ACK снова превращается в «я потом»; пуши без дашборда — в тревожный спам без контекста.

---

## Рефинансирование / balance transfer {#refinance}

По витрине Т-Банка на Банки.ру: до **120 дней** грейса на погашение кредитов в других банках (до 180 с Pro — в партнёрской карточке).

Учебный what-if: долг **150 000 ₽** уже вне грейса на Сбере @ 49.8% → перенос под BT 120 дней:

\[
150\,000 \times \frac{0{,}498}{365} \times 120 \approx 24\,559\ \text{₽}
\]

столько процентов *можно* не заплатить за окно BT, **если** успеть погасить внутри нового грейса и если операция реально попадает под тариф «перевод баланса». Агент обязан проверить:

1. комиссию/условия BT;  
2. новый `grace_end`;  
3. запрет снова уйти в минималку на новой карте;  
4. что это не upsell «открой ещё одну карту ради бонуса банку».

---

## Код и воспроизведение {#code}

```bash
# 1) условия с Банки.ру (снимок)
cat assets/data/banki-credit-cards-sber-tbank-2026-08.json

# 2) PDF-выписки + parse
python scripts/credit_card_statement_pdf.py generate
python scripts/credit_card_statement_pdf.py parse \
  --pdf assets/data/credit-card-statements/anna-month1-sber.pdf

# 3) симуляция политик
python scripts/credit_card_grace_case_sim.py

# 4) SVG + JSON для p5.js
python scripts/generate_credit_card_grace_charts.py
```

Зависимости скриптов: `pymupdf`, `pypdf`, `matplotlib`. В браузере: p5.js (CDN в layout) + `assets/js/credit-card-grace-demo.js`.

Фрагмент ранжирования стратегий:

```python
def agent_rank(card: CardModel) -> list[dict]:
    ledger = persona_spending()
    common = dict(horizon=180, salary=120_000, payday_offset=5, start_cash=20_000)
    rows = [
        run(card, ledger, policy=p, **common)
        for p in ("min_trap", "grace_keeper", "payday_clear", "cash_then_min")
    ]
    return sorted(rows, key=lambda r: (r["client_cost"], r["final_debt"]))
```

Дальше по лестнице: OCR сканов, несколько карт в одном personal vault, CEP «до grace_end 5 дней», eval «агент не предложил cash advance».

---

## Связь с частью 1 {#link}

| Часть 1 | Этот кейс |
|---------|-----------|
| \(NPV_{bank}\) vs \(NPV_{client}\) | %% карты = доход банка и cost клиента |
| Fee / cost слой в архитектуре | Grace Calendar + Cost Agent |
| Оркестратор + `must_not` | запрет cash advance и пустых обещаний 0% |
| Eval на тарифах | сценарии `min_trap` vs `payday_clear` |
| Код: PV → Monte Carlo → orch | PDF ledger → календарь грейса → SVG / p5 ряды |
| Оркестратор агентов | **Dashboard Agent** (Streamlit + p5 + Python) и **Discipline Agent** (Telegram / календарь / email + ACK) |

**Вывод кейса:** кредитка с длинным маркетинговым «до 120 дней» не спасает, если агент (или человек) оптимизирует «не получить штраф за просрочку» вместо «не потерять грейс». Клиентский агент измеряет второе — на временном графике и через nudges с подтверждением, а не только в push «внесите минимум».

Продолжение линии: [бриф для руководителей](/vairl/blog/2026/07/16/client-money-agent-exec-brief-ru/) · [часть 1 — DCF/NPV и сторона клиента](/vairl/blog/2026/07/13/banking-investor-ai-agent-ru/) · [часть 2 — классификация задач](/vairl/blog/2026/07/14/banking-agent-task-classification-ru/).
