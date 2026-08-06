---
layout: post
title: "Методы нейросимволических банковских агентов: от Markowitz до human-in-the-loop"
date: 2026-07-18 12:00:00 +0300
excerpt: "Десять методов для нейросимволического banking-агента: что вычисляет численная модель, что прогнозирует нейросеть, какие правила проверяет символический слой и где требуется подтверждение человека."
lang: ru
image: /assets/images/neurosymbolic-banking-methods.svg
visibility: public
review_track: blog
review_status: approved
---

<div class="post-decision" markdown="1">

**Кратко.** Нейросимволический банковский агент не заменяет финансовые методы нейросетью. Нейронный слой оценивает неизвестные параметры и распознаёт неструктурированные входы; численные solvers строят портфель и сценарии; символический слой применяет policy, проверяет инварианты и управляет уровнем автономии.

**Практический вывод:** Markowitz, Brinson, Grinold–Kahn, maximum diversification, \(1/N\), налоговая оптимизация, Merton и human-in-the-loop образуют не конкурирующие «модели», а разные блоки одного проверяемого контура.

**Контекст серии:** [девять banking-агентов](/vairl/blog/2026/07/13/banking-investor-ai-agent-ru/#nine-agents) · [equity-кейс Monitor → Recommend → Manage](/vairl/blog/2026/07/17/banking-equity-agent-case-ru/) · [классификация задач L×D](/vairl/blog/2026/07/14/banking-agent-task-classification-ru/).

</div>

---

## 1. Карта методов {#map}

| Метод | Решаемая задача | Роль в нейросимволическом контуре | Банковский агент |
|-------|-----------------|-----------------------------------|------------------|
| Markowitz (1952) | риск–доходность | нейронные оценки \(\mu,\Sigma\) → символическая оптимизация с ограничениями | Portfolio, Recommendation |
| Brinson et al. (1986/1991) | атрибуция результата | детерминированная декомпозиция → проверяемое объяснение | Monitoring, Communication |
| Grinold–Kahn (1999) | активные сигналы относительно benchmark | learned score → риск-модель → constrained optimizer | Portfolio, Monitoring |
| Choueifaty–Coignard (2008) | максимальная диверсификация | оценка covariance → точная оптимизация diversification ratio | Portfolio, Risk |
| DeMiguel et al. (2009) | устойчивый baseline \(1/N\) | контроль против переобучения и fallback | Verifier, Portfolio |
| Constantinides (1983) | налог на реализованный P&L | прогноз cash flow → точный lot/tax engine | Cost/Fee, Recommendation |
| Merton (1969) | межвременной выбор | сценарная модель → динамическая policy под ограничениями | Goal, Simulation |
| Parasuraman et al. (2000) | уровень автоматизации | разделение observe / analyze / recommend / execute | Discipline, Personal Policy |
| Black–Litterman (1992) | объединение prior и views | learned views + confidence → байесовский posterior | Portfolio |
| CVaR / coherent risk (1999) | хвостовой риск | сценарии → выпуклый risk constraint | Risk, Recommendation |

Методы разделяются по типу вывода:

| Слой | Что допустимо | Что недопустимо |
|------|---------------|-----------------|
| Нейронный | forecast, embedding, классификация документа, regime score | самостоятельно менять objective или исполнять сделку |
| Численный | оптимизация, Monte Carlo, attribution, tax-lot расчёт | подменять юридические и клиентские ограничения |
| Символический | policy, лимиты, типы событий, инварианты, переходы автомата | генерировать рыночный прогноз без модели данных |
| Человек | утверждать цель, риск-бюджет и необратимое действие | подтверждать вывод без раскрытых fee, tax и uncertainty |

---

## 2. Общая архитектура {#architecture}

Пусть \(x_t\) — наблюдаемое состояние счетов и рынка, \(z_t\) — неструктурированные данные, \(P\) — персональная policy. Контур состоит из четырёх функций:

$$
\hat{\theta}_t = f_{\mathrm{NN}}(x_{0:t}, z_t), \qquad
a_t^* = \operatorname{Solver}(x_t,\hat{\theta}_t;P)
$$

$$
v_t = \operatorname{Verify}(x_t,a_t^*,P), \qquad
a_t = \operatorname{Gate}(a_t^*,v_t,\mathrm{ACK})
$$

- \(f_{\mathrm{NN}}\) оценивает параметры: expected return, covariance regime, вероятность cash-flow event, класс документа;
- `Solver` реализует один из методов §3–§12;
- `Verify` проверяет сумму весов, лимиты, fee/tax, источник данных и устойчивость относительно baseline;
- `Gate` разрешает только допустимый policy переход; LLM может объяснить уже вычисленный результат, но не изменить его.

Это и есть рабочее определение **нейросимволического подхода** в данной статье: статистическое обучение для неопределённых величин плюс формальные правила и проверяемая математика для решений.

---

## 3. Markowitz: оптимизация при явных ограничениях {#markowitz}

Классическая постановка:

$$
\min_w \; w^\top \Sigma w - \lambda \mu^\top w,
\qquad
\mathbf{1}^\top w=1,\quad w\in\mathcal{P}
$$

где \(\mu\) — ожидаемые доходности, \(\Sigma\) — ковариационная матрица, \(\mathcal{P}\) — ограничения policy.

**Нейронная часть.** Оценивает \(\hat{\mu}\), volatility regime или shrinkage-параметры \(\hat{\Sigma}\) по временным рядам и альтернативным данным. Это прогноз, а не готовый ордер.

**Символическая часть.** Фиксирует \(\sum_i w_i=1\), long-only, лимиты эмитента/сектора, blacklist, максимальный turnover и fee budget. Квадратичный solver возвращает веса; verifier независимо пересчитывает ограничения.

**Применение.** Portfolio Agent строит допустимое множество, Recommendation Agent вычисляет минимальное изменение текущих весов. Если решение чувствительно к малому изменению \(\hat{\mu}\), агент обязан перейти к устойчивому baseline (§7), а не выдавать точечную рекомендацию.

**Проверки:** positive semidefinite \(\Sigma\); post-trade weights внутри \(P\); out-of-sample сравнение с \(1/N\); полный cost-of-turnover.

---

## 4. Brinson: детерминированная атрибуция результата {#brinson}

Brinson attribution раскладывает разницу доходности портфеля и benchmark на allocation, selection и interaction. Для класса активов \(i\):

$$
A_i=(w_i^P-w_i^B)(R_i^B-R^B),\qquad
S_i=w_i^B(R_i^P-R_i^B)
$$

Конвенции формул различаются; поэтому контракт должен фиксировать вариант и обеспечивать тождество:

$$
R^P-R^B = \sum_i(A_i+S_i+I_i)
$$

**Нейронная часть.** Может классифицировать инструменты и транзакции по сектору, стратегии или типу эффекта. Её результат не считается истинным, пока reconciliation не сопоставит позиции с taxonomy benchmark.

**Символическая часть.** Выполняет арифметическую декомпозицию и проверяет равенство суммы эффектов активной доходности. Communication Agent только переводит структуру результата в текст: например, «−1,4 п.п. связано с overweight сектора, −0,3 п.п. — с selection».

**Применение.** Monitoring Agent отвечает на вопрос «почему результат отличается от benchmark?» без генеративного причинного рассказа. Метод объясняет **декомпозицию**, но сам по себе не доказывает причинность и не формирует торговый сигнал.

**Библиографическая поправка.** В исходном списке смешаны публикации. Оригинальная статья Brinson–Hood–Beebower вышла в 1986 году; обновление Brinson–Singer–Beebower — в 1991 году. Ссылка «Brinson et al., 1995, 51(1), 133–138» не соответствует указанным авторам и названию.

---

## 5. Grinold–Kahn: learned signals под контролем benchmark {#grinold-kahn}

Активное управление задаётся относительно benchmark. Упрощённая фундаментальная зависимость:

$$
IR \approx IC\sqrt{BR}
$$

где \(IR\) — information ratio, \(IC\) — корреляция прогноза с последующей активной доходностью, \(BR\) — эффективная ширина независимых решений.

**Нейронная часть.** Строит cross-sectional score \(\alpha_i\) по данным. Модель может ранжировать активы, но не выбирать размер позиции.

**Символическая часть.** Преобразует score в active weights относительно benchmark с ограничениями tracking error, turnover, ликвидности и экспозиции факторов. Monitoring Agent вычисляет realized \(IC\), decay и drift.

**Применение.** Метод полезен только при доказанном out-of-sample \(IC\). Количество активов нельзя механически считать breadth: коррелированные сигналы не являются независимыми ставками. При распаде \(IC\) policy переводит сигнал в режим `monitor_only`.

**Верификаторы:** отсутствие look-ahead; timestamped features; net-of-cost information ratio; лимит active risk; сравнение с null-signal.

---

## 6. Maximum diversification: риск без прогноза доходности {#maximum-diversification}

Choueifaty–Coignard вводят diversification ratio:

$$
DR(w)=\frac{w^\top \sigma}{\sqrt{w^\top\Sigma w}},
\qquad
w^*=\arg\max_{w\in\mathcal{P}}DR(w)
$$

где \(\sigma\) — вектор волатильностей активов.

**Нейронная часть.** Определяет covariance regime или оценивает условную \(\Sigma_t\). Прогноз ожидаемой доходности не требуется.

**Символическая часть.** Максимизирует \(DR\) при лимитах весов, ликвидности и turnover. Verifier сравнивает концентрацию risk contributions до и после шага.

**Применение.** Метод подходит как альтернативный portfolio solver при слишком нестабильной \(\hat{\mu}\). Однако он остаётся чувствительным к covariance estimation и может создавать концентрацию в низковолатильных или высококоррелированных группах. Поэтому maximum diversification не заменяет policy-лимиты.

---

## 7. DeMiguel et al.: \(1/N\) как обязательный baseline {#demiguel}

DeMiguel–Garlappi–Uppal показали, что 14 оптимизационных моделей в их выборке не превосходили \(1/N\) стабильно out-of-sample по Sharpe ratio, certainty-equivalent return и turnover. Причина — estimation error.

**Нейронная часть.** Любая learned allocation считается challenger, а не источником истины.

**Символическая часть.** Eval policy требует сравнить challenger с:

$$
w_i^{base}=\frac{1}{N}
$$

после комиссий, налогов и одинаковых ограничений. Выбор сложной модели разрешён только при устойчивом выигрыше на rolling out-of-sample окнах.

**Применение.** \(1/N\) — baseline и безопасный fallback Portfolio Agent. Он не является универсально оптимальным: игнорирует различия риска, корреляций, налогов и обязательств. Его роль — обнаруживать ложную сложность и переобучение.

---

## 8. Constantinides: налоговая опциональность лотов {#constantinides}

Налогообложение реализованных gains создаёт временную опциональность: убытки можно реализовать раньше, а gains — отложить. Поэтому одинаковый pre-tax портфель может иметь разные after-tax траектории.

**Нейронная часть.** Прогнозирует будущие withdrawals, вероятность пополнения и ликвидностную потребность; может извлекать tax lots из документов.

**Символическая часть.** Lot engine точно хранит cost basis, holding period, realized P&L, ставки и правила юрисдикции:

$$
C_{\mathrm{action}} =
\mathrm{fee}+\mathrm{spread}+\mathrm{tax}(\text{selected lots})
$$

Recommendation Agent сравнивает cost действия и бездействия. Нейросеть не вычисляет налог: это нормативный расчёт с версионируемыми правилами.

**Применение.** Tax-loss harvesting, выбор лотов при продаже, сравнение rebalance now vs defer. Требуется legal/tax boundary: метод описывает экономический эффект, но конкретная реализация зависит от юрисдикции.

**Библиографическая поправка.** Верные страницы статьи Constantinides — 611–636, а не 639–662.

---

## 9. Merton: решение на всём жизненном горизонте {#merton}

Merton рассматривает совместный выбор потребления и доли рискованного актива во времени. В общем виде:

$$
V(t,W)=\max_{\pi,c}
\mathbb{E}\left[\int_t^T U(c_s)\,ds+B(W_T)\right]
$$

при стохастической динамике богатства \(W_t\).

**Нейронная часть.** Оценивает динамику доходов, вероятность жизненных событий и параметры сценарной модели; в сложной постановке может аппроксимировать value function.

**Символическая часть.** Задаёт бюджетное ограничение, horizon, цель, минимальную ликвидность, запрет leverage и risk budget. Simulation Agent проверяет policy на множестве сценариев; Goal Agent возвращает не «лучший актив», а вероятность достижения цели и shortfall.

**Применение.** Retirement, накопление на крупную цель, glide path. Метод не оправдывает точный долгосрочный forecast: ошибки параметров должны отражаться диапазоном сценариев и stress-тестами.

---

## 10. Parasuraman et al.: какой уровень автономии допустим {#parasuraman}

Авторы различают четыре класса функций автоматизации:

1. получение информации;
2. анализ информации;
3. выбор решения/действия;
4. исполнение действия.

Каждый класс может иметь свой уровень автоматизации. Для банковского агента это важнее единой метки «автономный»:

| Функция | Допустимый режим по умолчанию | Контроль |
|---------|-------------------------------|----------|
| Получение данных | автоматический | provenance, reconciliation |
| Анализ | автоматический | numeric verifier |
| Рекомендация | автоматическая подготовка | policy + раскрытие uncertainty |
| Исполнение | ручной ACK | pre/post-trade checks, журнал |

**Нейронная часть.** Извлекает и анализирует информацию, формирует текст объяснения.

**Символическая часть.** Конечный автомат запрещает переход к исполнению без выполненных predicates и ACK. Стоимость ошибки определяет уровень автономии: read-only alert может быть полностью автоматическим; необратимый перевод или сделка — нет.

**Применение.** Discipline Agent и Personal Policy реализуют Monitor → Recommend → Manage как разные полномочия, а не как стили ответа.

**Библиографическая поправка.** Корректный источник — Parasuraman, Sheridan, Wickens (2000), *IEEE Transactions on Systems, Man, and Cybernetics—Part A*, 30(3), 286–297; это не статья «Automation and Human Performance» в *Human Factors*.

---

## 11. Black–Litterman: интерфейс между learned views и prior {#black-litterman}

Markowitz требует \(\mu\), оценка которого неустойчива. Black–Litterman начинает с равновесного prior \(\Pi\) и объединяет его с views \(Q\) и их неопределённостью \(\Omega\):

$$
\mu_{BL}=
\left[(\tau\Sigma)^{-1}+P^\top\Omega^{-1}P\right]^{-1}
\left[(\tau\Sigma)^{-1}\Pi+P^\top\Omega^{-1}Q\right]
$$

**Нейронная часть.** Генерирует view \(Q\) и calibrated confidence, из которого строится \(\Omega\).

**Символическая часть.** Матрица \(P\) явно связывает view с активами; posterior передаётся в constrained Markowitz solver. Низкая confidence должна приближать результат к prior, а не усиливать сигнал.

**Применение.** Это естественный контракт между ML forecast и Portfolio Agent: каждый learned signal получает область действия, confidence, timestamp и срок истечения.

---

## 12. CVaR: ограничение хвостового риска {#cvar}

Variance симметрична и недостаточно описывает тяжёлые хвосты. Для loss \(L\) Conditional Value at Risk:

$$
\operatorname{CVaR}_{\alpha}(L)
=\mathbb{E}[L\mid L\geq \operatorname{VaR}_{\alpha}(L)]
$$

В практической оптимизации используется эквивалентная выпуклая сценарная формулировка.

**Нейронная часть.** Генерирует или перевзвешивает сценарии, обнаруживает regime shift.

**Символическая часть.** Ограничивает CVaR, проверяет набор сценариев и запрещает рекомендацию при недостаточном tail coverage.

**Применение.** Risk Agent блокирует решение, которое выглядит допустимым по volatility, но нарушает tail budget. Метод требует stress-сценариев; оценка CVaR только по короткой истории создаёт ложную точность.

---

## 13. Как методы собираются в один agent loop {#loop}

| Состояние | Основной метод | Выход | Обязательный verifier |
|-----------|----------------|-------|------------------------|
| `OBSERVE` | reconciliation, neural extraction | нормализованные позиции и lots | суммы совпадают с отчётом |
| `ESTIMATE` | learned \(\mu,\Sigma,Q\), regimes | параметры + uncertainty | timestamp, calibration, drift |
| `SOLVE` | Markowitz / MDP / BL / Merton / CVaR | candidate action | constraints и numerical residuals |
| `COMPARE` | \(1/N\), current portfolio, no-action | net-of-cost delta | одинаковые horizon и costs |
| `EXPLAIN` | Brinson, structured evidence | причины и trade-offs | attribution identity, no new numbers |
| `GATE` | Parasuraman + policy | allow / ACK / deny | полномочия и стоимость ошибки |
| `EXECUTE` | tax-lot selection | broker ticket | fee, tax, pre/post-state |

Минимальный контракт результата:

```yaml
method: black_litterman_markowitz
objective: client_goal_npv
inputs_as_of: 2026-07-18T09:00:00Z
uncertainty: {mu_confidence: low, covariance_regime: stress}
baseline: equal_weight
costs: {fee: 0.0005, tax: lot_engine}
constraints: [max_issuer, max_sector, max_turnover, cvar_budget]
verifiers: [weights_sum_one, policy_satisfied, challenger_beats_baseline]
authority: recommend
requires_ack: true
```

LLM получает этот объект после `Verify` и не имеет права добавлять веса, доходности или причины, отсутствующие в evidence.

---

## 14. Ограничения {#limitations}

1. Методы портфельной теории не устраняют model risk; они делают objective и ограничения явными.
2. Нейросимволическая архитектура не гарантирует качество нейронных прогнозов; нужны calibration, drift monitoring и out-of-sample eval.
3. Brinson — attribution, не causal inference.
4. \(1/N\) — baseline, не нормативная рекомендация.
5. Налоговые правила и допустимый уровень автоматизации зависят от юрисдикции.
6. Human ACK снижает риск несанкционированного действия, но не исправляет неверный расчёт; до ACK обязателен независимый verifier.

---

## 15. Вывод {#conclusion}

Нейросимволический banking-агент — это не одна модель. Markowitz, maximum diversification, Black–Litterman, Merton и CVaR образуют набор solvers; Brinson даёт проверяемую атрибуцию; \(1/N\) контролирует переобучение; Constantinides задаёт after-tax расчёт; Parasuraman определяет границу автономии.

Рабочая последовательность одна: learned parameters → exact solver → baseline comparison → symbolic verification → human gate. Если из неё удалить baseline, policy или verifier, система перестаёт быть проверяемым финансовым агентом и становится генератором правдоподобных рекомендаций.

---

## Литература {#refs}

| ID | Корректированный источник |
|----|---------------------------|
| Markowitz, 1952 | Markowitz H. [Portfolio Selection](https://doi.org/10.1111/j.1540-6261.1952.tb01525.x). *Journal of Finance*, 7(1), 77–91. |
| Brinson et al., 1986 | Brinson G., Hood L., Beebower G. [Determinants of Portfolio Performance](https://doi.org/10.2469/faj.v42.n4.39). *Financial Analysts Journal*, 42(4), 39–44. |
| Brinson et al., 1991 | Brinson G., Singer B., Beebower G. [Determinants of Portfolio Performance II: An Update](https://doi.org/10.2469/faj.v47.n3.40). *Financial Analysts Journal*, 47(3), 40–48. |
| Grinold & Kahn, 1999 | Grinold R., Kahn R. *Active Portfolio Management*, 2nd ed. McGraw-Hill, ISBN 978-0-07-024882-3. |
| Choueifaty & Coignard, 2008 | Choueifaty Y., Coignard Y. [Toward Maximum Diversification](https://doi.org/10.3905/JPM.2008.35.1.40). *Journal of Portfolio Management*, 35(1), 40–51. |
| DeMiguel et al., 2009 | DeMiguel V., Garlappi L., Uppal R. [Optimal Versus Naive Diversification](https://doi.org/10.1093/rfs/hhm075). *Review of Financial Studies*, 22(5), 1915–1953. |
| Constantinides, 1983 | Constantinides G. [Capital Market Equilibrium with Personal Tax](https://doi.org/10.2307/1912150). *Econometrica*, 51(3), 611–636. |
| Merton, 1969 | Merton R. [Lifetime Portfolio Selection under Uncertainty: The Continuous-Time Case](https://doi.org/10.2307/1926560). *Review of Economics and Statistics*, 51(3), 247–257. |
| Parasuraman et al., 2000 | Parasuraman R., Sheridan T., Wickens C. [A Model for Types and Levels of Human Interaction with Automation](https://doi.org/10.1109/3468.844354). *IEEE Transactions on Systems, Man, and Cybernetics—Part A*, 30(3), 286–297. |
| Black & Litterman, 1992 | Black F., Litterman R. Global Portfolio Optimization. *Financial Analysts Journal*, 48(5), 28–43. |
| Artzner et al., 1999 | Artzner P., Delbaen F., Eber J.-M., Heath D. Coherent Measures of Risk. *Mathematical Finance*, 9(3), 203–228. |

