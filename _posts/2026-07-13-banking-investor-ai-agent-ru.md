---
layout: post
title: "Мультиагентный финансовый ассистент: зачем банку, зачем клиенту и входить ли в проект"
date: 2026-07-13 18:00:00 +0300
excerpt: "Решение о входе в проект: NPV банка vs NPV клиента, критерии go/no-go, девять агентов с методологией и примерами внедрений в банках. Без воды: тезисы, два вопроса, вердикт."
lang: ru
image: /assets/images/banking-investor-ai-agent.svg
visibility: public
review_track: blog
review_status: approved
---

<div class="post-decision" markdown="1">

**Disclaimer.** Архитектурная заметка; не инвестиционная рекомендация.

**Продолжения:** [классификация задач L×D (ч. 2)](/vairl/blog/2026/07/14/banking-agent-task-classification-ru/) · [кейс грейса](/vairl/blog/2026/07/15/banking-credit-card-grace-case-ru/) · [кейс equity](/vairl/blog/2026/07/17/banking-equity-agent-case-ru/)

</div>

---

## Основные тезисы {#theses}

1. **Банку — входить.** Внедрённые ассистенты снижают cost-to-serve и повышают retention; эффект измерен в production ([Erica](#refs), [Cora](#refs), [Klarna](#refs)). Экономика — рост \(NPV_{bank}\) на каждого клиента (§1).
2. **Банковский ассистент не решает клиентскую задачу.** На комиссионных потоках \(NPV_{bank}\) и \(NPV_{client}\) имеют противоположные знаки; suitability-регулирование ограничивает домен, но не меняет objective ([MiFID II](#refs)) (§2).
3. **Клиентская сторона реализуема из готовых методов.** Все девять агентов закрываются опубликованными методами (Markowitz, GBI, Monte Carlo, Brinson) — научная новизна не требуется, технический риск низкий (§4).
4. **Риск клиентского проекта — не методы, а данные и дистрибуция.** Доступ к счетам (open banking), монетизация без конфликта интересов и юридический статус рекомендаций — три критерия go/no-go (§3).
5. **LLM — только narrative.** Числа считают solvers; LLM не участвует в hot path ([Bender et al., 2021](#refs)).

**Вердикт:** банку — go; независимой команде — conditional go при выполнении критериев §3.

---

## Содержание {#toc}

1. [Зачем это банку](#why-bank)
2. [Зачем это на стороне клиента](#why-client)
3. [Входить в проект или нет](#go-no-go)
4. [Девять агентов: метод и внедрения](#nine-agents)
5. [Риски и ограничения](#limitations)
6. [Литература](#refs)

---

## 1. Зачем это банку {#why-bank}

Банк оптимизирует приведённую стоимость клиента как актива ([Gupta et al., 2006](#refs)):

$$
NPV_{bank} = \sum_{t=1}^{T} \frac{fee_t + cross_t - cost_t}{(1+r)^{t}}
$$

Ассистент воздействует на все три слагаемых:

| Рычаг | Механизм | Подтверждение в production |
|-------|----------|----------------------------|
| ↓ cost-to-serve | чат вместо оператора | [Klarna](#refs): ассистент закрывает ⅔ чатов поддержки, экв. ~700 FTE (2024) |
| ↓ cost-to-serve | самообслуживание, insights | [Erica](#refs) (Bank of America): >2 млрд взаимодействий, >42 млн клиентов |
| ↑ retention / AUM | удержание на просадках, вовлечение | [Cora](#refs) (NatWest), [Fargo](#refs) (Wells Fargo) |
| ↑ продуктивность advisors | RAG по research-базе | [AI @ Morgan Stanley](#refs): GPT-4 assistant для ~16 тыс. advisors |
| ↑ cross-sell | next-best-action на транзакционных данных | стандартный CRM-контур, propensity-модели ([Hosmer et al., 2013](#refs)) |

Экономика положительна при масштабе: unit cost диалога с LLM/NLU на порядки ниже стоимости контакта с оператором, а инфраструктура (данные, KYC, каналы) уже амортизирована. **Для банка вопрос «входить или нет» закрыт рынком: крупные банки уже вошли.**

---

## 2. Зачем это на стороне клиента {#why-client}

Клиентская objective — вероятность достижения цели за вычетом стоимости владения:

$$
NPV_{client} = PV(\text{goal path}) - PV(\text{fees} + \text{taxes} + \text{errors})
$$

На одних и тех же потоках знаки противоположны:

| Событие | \(\Delta NPV_{bank}\) | \(\Delta NPV_{client}\) |
|---------|----------------------|-------------------------|
| ↑ комиссия / оборот | + | − |
| Кросс-селл high-margin продукта | + | часто − |
| Миграция клиента на low-cost канал | −− | + |

Отсюда два следствия:

1. **Bank-side ассистент структурно не может рекомендовать против \(NPV_{bank}\)** (уход на дешёвый тариф, отказ от продукта) — это конфликт с его loss-функцией, а не недоработка. Регулирование (suitability, [MiFID II](#refs)) отсекает вредные рекомендации, но не создаёт полезные.
2. **Клиентский агент обязан содержать Cost/Fee-агента** — учёт комиссий и налогов в явном виде; empirically именно издержки — главный управляемый фактор долгосрочного результата ([Philippon, 2017](#refs); [D'Acunto & Rossi, 2019](#refs)).

Client-side архитектура: objective, данные (агрегация мультибанк) и запреты `must_not` принадлежат клиенту; банк — execution tool. LLM — `narrative_only`.

---

## 3. Входить в проект или нет {#go-no-go}

Раздельно для двух субъектов.

### 3.1. Банк

| Критерий | Оценка |
|----------|--------|
| Технический риск | низкий: методы и вендоры зрелые (§4) |
| Экономика | положительна, измерена конкурентами (§1) |
| Риск бездействия | потеря interface к клиенту в пользу ассистентов-агрегаторов |

**Решение: go.** Оптимальный вход — не «AI-советник по инвестициям» (лицензионный риск), а cost-to-serve и insights, затем advisor tooling.

### 3.2. Независимая команда (client-side агент)

| Критерий go/no-go | Условие входа | Статус |
|-------------------|---------------|--------|
| Доступ к данным | open banking API или устойчивый импорт отчётов брокеров | зависит от юрисдикции; в ЕС/UK решён ([PSD2](#refs)), в РФ — частично (Открытые API ЦБ) |
| Монетизация без конфликта | подписка / flat fee; **не** комиссия с продуктов | проверено моделью robo-advisors ([D'Acunto & Rossi, 2019](#refs)); подписочная retention исторически слабая (кейс Mint) |
| Юридический статус | режим «аналитика/калькулятор», рекомендации — через лицензию или без auto-execute | решается протоколом ACK: агент считает и объясняет, действие подтверждает человек ([Parasuraman et al., 2000](#refs)) |

**Решение: conditional go.** Входить, если закрыты все три строки; методологический риск отсутствует (§4). Не входить, если монетизация планируется через комиссии продуктов — проект воспроизведёт bank-side конфликт (§2).

---

## 4. Девять агентов: метод и внедрения {#nine-agents}

Роли вычислительные (solvers, без LLM в hot path), кроме №8. Маршрутизация задач между агентами — [классификация L×D, ч. 2](/vairl/blog/2026/07/14/banking-agent-task-classification-ru/).

| # | Агент | Метод | Внедрения-аналоги |
|---|-------|-------|-------------------|
| 1 | Profile | reconciliation, open banking | Plaid, Tink; Erica insights |
| 2 | Portfolio | Markowitz, Black–Litterman | robo-advisors (Betterment, Schwab) |
| 3 | Goal | GBI, Monte Carlo | Wealthfront Path, MoneyGuidePro |
| 4 | Cost / Fee | PV издержек (DCF) | Empower Fee Analyzer |
| 5 | Simulation | Monte Carlo what-if | eMoney, Vanguard VCMM |
| 6 | Recommendation | constrained optimization | rebalancing + TLH у robo-advisors |
| 7 | Personal Policy | rule engine | IPS, suitability-движки |
| 8 | Communication | LLM narrative-only | AI @ Morgan Stanley, Erica |
| 9 | Monitoring | Brinson attribution, rules | Aladdin Wealth |

**1. Profile (агрегация).** Сведение счетов, брокерских отчётов и транзакций в customer 360. Метод — data reconciliation поверх open banking API ([PSD2](#refs)). Внедрения: агрегаторы [Plaid](#refs), [Tink](#refs) (Visa); внутри банков — категоризация и insights в [Erica](#refs).

**2. Portfolio (портфель).** Веса и риск: mean–variance ([Markowitz, 1952](#refs)), равновесные views ([Black & Litterman, 1992](#refs)), risk parity ([Maillard et al., 2010](#refs)). Внедрения: подавляющее большинство robo-advisors используют MPT-ядро ([Beketov et al., 2018](#refs)) — Betterment, Schwab Intelligent Portfolios, Vanguard Digital Advisor.

**3. Goal (цель).** \(P(W_T \geq G_T)\) и минимальное пополнение: goal-based investing ([Das et al., 2007](#refs)), lifetime allocation ([Merton, 1969](#refs)). Внедрения: [Wealthfront Path](#refs), планировочные платформы advisors (MoneyGuidePro, eMoney).

**4. Cost / Fee (издержки).** PV комиссий, налогов и спредов; сравнение тарифов каналов. Метод — DCF отрицательных потоков ([Brealey et al., 2020](#refs)); мотивация — устойчиво высокая unit cost финансового посредничества ([Philippon, 2017](#refs)). Внедрения: [Empower Fee Analyzer](#refs) (ex-Personal Capital); в bank-side контуре аналог отсутствует — ключевой аргумент §2.

**5. Simulation (what-if).** Counterfactual-траектории богатства: Monte Carlo по сценариям взносов/тарифов; опционально GARCH для волатильности ([Bollerslev, 1986](#refs)). Внедрения: capital-markets-модели (Vanguard VCMM), стресс-сценарии в advisor-платформах.

**6. Recommendation (шаг).** Не более одного действия за цикл: constrained optimization при ограничениях policy. Внедрения: автоматический rebalancing и tax-loss harvesting robo-advisors ([D'Acunto & Rossi, 2019](#refs)); налоговый компонент — [Constantinides, 1983](#refs).

**7. Personal Policy (правила).** Allow/deny по декларативному YAML: лимиты риска, `must_not` (`recommend_trade`, `upsell_bank_product`, `guarantee_return`). Метод — rule engine; отраслевой аналог — Investment Policy Statement и suitability-контуры ([MiFID II](#refs)), но с клиентом как владельцем правил.

**8. Communication (объяснение).** Единственная LLM-роль: текст поверх выходов solvers, запрет на новые числа ([Bender et al., 2021](#refs)). Внедрения: [AI @ Morgan Stanley](#refs) (RAG для advisors), диалоговый слой [Erica](#refs), ассистент [Klarna](#refs).

**9. Monitoring (надзор).** Alerts по драфту весов, тарифным изменениям и событиям календаря; декомпозиция результата — Brinson attribution ([Brinson et al., 1986/1991](#refs)); tail-метрики — CVaR ([Artzner et al., 1999](#refs)). Внедрения: [Aladdin Wealth](#refs) (BlackRock) как институциональный образец.

Прикладной контур поверх solvers: **Dashboard** (визуализация серий, [кейс грейса](/vairl/blog/2026/07/15/banking-credit-card-grace-case-ru/#dashboard-discipline)) и **Discipline** (human-in-the-loop ACK перед необратимыми действиями, [Parasuraman et al., 2000](#refs)). Формальный decision loop CLASSIFY → SOLVE → VERIFY → NARRATE → ACK и пример на equity-рукаве — в [кейсе equity](/vairl/blog/2026/07/17/banking-equity-agent-case-ru/).

---

## 5. Риски и ограничения {#limitations}

| Риск | Субъект | Следствие |
|------|---------|-----------|
| LLM в hot path | оба | числовые галлюцинации в рекомендациях |
| Монетизация комиссиями | client-side | воспроизведение конфликта §2 |
| Нет доступа к данным | client-side | неполный \(NPV_{client}\), деградация до калькулятора |
| Лицензионный периметр | оба | технический objective ≠ право давать инвестиционный совет |
| Eval без тарифов как параметров мира | оба | ложноположительный «успех» ассистента |

---

## 6. Литература {#refs}

Методология:

| ID | Источник |
|----|----------|
| Markowitz, 1952 | Portfolio Selection. *Journal of Finance*, 7(1), 77–91. |
| Black & Litterman, 1992 | Global Portfolio Optimization. *Financial Analysts Journal*, 48(5), 28–43. |
| Merton, 1969 | Lifetime Portfolio Selection under Uncertainty. *REStat*, 51(3), 247–257. |
| Das et al., 2007 | Dynamic Portfolio Optimization with Goals. *Operations Research*, 55(2). |
| Brinson et al., 1986/1991 | [Determinants of Portfolio Performance](https://doi.org/10.2469/faj.v42.n4.39) и [update](https://doi.org/10.2469/faj.v47.n3.40). *Financial Analysts Journal*. |
| Artzner et al., 1999 | Coherent Measures of Risk. *Mathematical Finance*, 9(3), 203–228. |
| Maillard et al., 2010 | Equally Weighted Risk Contribution Portfolios. *JPM*, 36(4), 60–70. |
| Constantinides, 1983 | [Capital Market Equilibrium with Personal Tax](https://doi.org/10.2307/1912150). *Econometrica*, 51(3), 611–636. |
| Bollerslev, 1986 | Generalized ARCH. *Journal of Econometrics*, 31(3), 307–327. |
| Brealey et al., 2020 | *Principles of Corporate Finance*. McGraw-Hill. |
| Gupta et al., 2006 | Modeling Customer Lifetime Value. *Journal of Service Research*, 9(2). |
| Hosmer et al., 2013 | *Applied Logistic Regression*. Wiley. |
| Philippon, 2017 | *The FinTech Opportunity*. NBER WP 22476. |
| D'Acunto & Rossi, 2019 | D'Acunto F., Prabhala N., Rossi A. The Promises and Pitfalls of Robo-Advising. *Review of Financial Studies*, 32(5), 1983–2020. |
| Beketov et al., 2018 | Robo Advisors: quantitative methods inside the robots. *Journal of Asset Management*, 19, 363–370. |
| Parasuraman et al., 2000 | [A Model for Types and Levels of Human Interaction with Automation](https://doi.org/10.1109/3468.844354). *IEEE SMC—Part A*, 30(3), 286–297. |
| Bender et al., 2021 | On the Dangers of Stochastic Parrots. *FAccT*. |
| MiFID II | Directive 2014/65/EU — suitability requirements. |
| PSD2 | Directive (EU) 2015/2366 — access to account (XS2A). |

Внедрения:

| ID | Источник |
|----|----------|
| Erica | Bank of America, [Erica virtual assistant](https://info.bankofamerica.com/en/digital-banking/erica) — >2 млрд взаимодействий (отчёты BofA Newsroom, 2024). |
| Klarna | [Klarna AI assistant press release, 2024](https://www.klarna.com/international/press/klarna-ai-assistant-handles-two-thirds-of-customer-service-chats-in-its-first-month/). |
| AI @ Morgan Stanley | [Morgan Stanley × OpenAI, 2023](https://www.morganstanley.com/press-releases/key-milestone-in-innovation-journey-with-openai). |
| Cora | NatWest Cora — виртуальный ассистент (NatWest Group annual reports). |
| Fargo | Wells Fargo Fargo — virtual assistant (Google Cloud). |
| Plaid | [plaid.com](https://plaid.com) — агрегация банковских данных. |
| Tink | [tink.com](https://tink.com) — open banking платформа (Visa). |
| Wealthfront Path | [Wealthfront Path](https://www.wealthfront.com/path) — Monte Carlo goal planning. |
| Empower Fee Analyzer | [Empower](https://www.empower.com) (ex-Personal Capital) — анализ комиссий портфеля. |
| Aladdin Wealth | [BlackRock Aladdin Wealth](https://www.blackrock.com/aladdin/products/aladdin-wealth) — риск-мониторинг wealth-портфелей. |

Связанные материалы VAIRL: [методы нейросимволических banking-агентов](/vairl/blog/2026/07/18/neurosymbolic-methods-banking-agents-ru/) · [классификация задач L×D](/vairl/blog/2026/07/14/banking-agent-task-classification-ru/) · [постановка задачи агенту](/vairl/blog/2026/07/04/agent-task-specification-ru/) · [кейс грейса](/vairl/blog/2026/07/15/banking-credit-card-grace-case-ru/) · [кейс equity](/vairl/blog/2026/07/17/banking-equity-agent-case-ru/).
