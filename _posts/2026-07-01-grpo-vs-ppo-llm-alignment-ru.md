---
layout: post
title: "GRPO vs PPO: сравнительный анализ для выравнивания LLM"
date: 2026-07-01 16:00:00 +0300
excerpt: "Group Relative Policy Optimization и Proximal Policy Optimization в RLHF/RLVR: actor-critic против группового baseline, память, стабильность и связь с устойчивостью control loop агента."
lang: ru
image: /assets/images/grpo-vs-ppo.svg
---

**PPO** (Proximal Policy Optimization) — стандарт actor-critic RL, на котором годами строили **RLHF** для LLM. **GRPO** (Group Relative Policy Optimization), предложенный в [DeepSeekMath](https://arxiv.org/abs/2402.03300), убирает отдельную сеть-критик и оценивает **относительное качество** нескольких ответов на один промпт — с экономией памяти порядка **~50%** и масштабируемостью для reasoning-моделей (DeepSeek-R1 и др.).

Ниже — сравнительный анализ: архитектура, формулы, плюсы/минусы, связь с **RLVR** (verifiable rewards) и **устойчивостью** обучающего контура. Связанные материалы VAIRL: [устойчивость control loops](/vairl/blog/2026/06/29/agent-control-loop-stability-ru/), [генерация бенчмарков](/vairl/blog/2026/06/29/agent-benchmark-generation-ru/), [карта компетенций агент-разработчика](/vairl/blog/2026/06/29/best-ai-agent-specialist-ru/).

## Зачем RL после SFT

После supervised fine-tuning (SFT) модель имитирует демонстрации, но не оптимизирует **скалярную цель** (правильность, безопасность, краткость). RL-этап максимизирует ожидаемую награду при ограничении отклонения от референсной политики π_ref (обычно SFT-чекпоинт):

| Компонент | Роль |
|-----------|------|
| **Policy π_θ** | Обучаемая LLM |
| **Reward** | RM (RLHF) или верификатор (RLVR: математика, код, unit tests) |
| **Reference π_ref** | KL-якорь против «разгона» политики |

```mermaid
flowchart LR
  Q[Промпт q] --> PI[π_θ]
  PI --> O[Ответ o]
  O --> R[Reward / verify]
  R --> L[Loss RL]
  PI --> KL[KL к π_ref]
  KL --> L
  L --> PI
```

---

## PPO: actor-critic для LLM

[PPO](https://arxiv.org/abs/1707.06347) (Schulman et al., 2017) — on-policy алгоритм с **ограниченным шагом** обновления (clipped surrogate).

### Три сети в классическом RLHF

1. **π_θ** — policy (LLM), обучается.
2. **V_γ** — **critic** (value function), оценивает ожидаемую награду от **частичного** ответа; обучается **вместе** с политикой.
3. **R_φ** — reward model, обычно **заморожен** после отдельного этапа обучения.

Проблема в контексте LLM: награда часто приходит **только на последнем токене** (scalar от RM или verifier). Критик должен предсказывать «ценность» на **каждом** токене цепочки — шумно и дорого по VRAM (вторая сеть размера модели).

### Advantage и GAE

**Advantage** A_t показывает, насколько действие лучше среднего:

\[
A_t = Q(s_t, a_t) - V(s_t)
\]

На практике используют **GAE** (Generalized Advantage Estimation) — экспоненциально взвешенная сумма TD-ошибок δ_t = r_t + γV(s_{t+1}) − V(s_t).

**Clipped objective** (идея PPO):

\[
L^{CLIP} = \mathbb{E}\left[\min\left(r_t(\theta) A_t,\ \mathrm{clip}(r_t(\theta), 1-\epsilon, 1+\epsilon) A_t\right)\right]
\]

где \(r_t(\theta) = \frac{\pi_\theta(a_t|s_t)}{\pi_{\theta_{old}}(a_t|s_t)}\).

| Сильные стороны PPO | Слабые стороны для LLM |
|---------------------|-------------------------|
| Зрелая экосистема (TRL, OpenRLHF) | **2×** память на critic |
| Токен-level credit assignment (GAE) | Критик устаревает при быстрой смене π |
| Clipping стабилизирует шаг | Сложнее при sparse terminal reward |

---

## GRPO: групповой baseline без критика

[GRPO](https://arxiv.org/abs/2402.03300) (Shao et al., 2024, DeepSeekMath) сохраняет **PPO-style clipping** и KL к π_ref, но заменяет критик на **групповую статистику**.

### Алгоритм

1. Для промпта q сэмплировать **G** полных ответов \(\{o_1,\ldots,o_G\}\) из π_{θ_old}.
2. Получить награды \(\{r_1,\ldots,r_G\}\) (RM или verifiable).
3. Нормализовать внутри группы:

\[
A_i = \frac{r_i - \mathrm{mean}(\mathbf{r})}{\mathrm{std}(\mathbf{r})}
\]

4. Один и тот же **A_i** применяется ко **всем токенам** ответа o_i (outcome supervision).
5. Оптимизировать clipped surrogate + β·D_KL(π_θ || π_ref).

```mermaid
flowchart TB
  Q[Промпт q] --> S1[o₁ … o_G]
  S1 --> R1[r₁ … r_G]
  R1 --> N[μ, σ по группе]
  N --> A[A₁ … A_G]
  A --> U[Clipped update π_θ]
```

**Интуиция:** критик заменён на вопрос «этот ответ лучше или хуже **среднего по группе** на том же промпте?» — Monte-Carlo baseline с **нулевой дополнительной сетью**.

### Почему это дешевле

| | PPO | GRPO |
|---|-----|------|
| Обучаемые сети | π + **V** | только **π** |
| VRAM (типично) | ~2× модель | ~1× + batch из G сэмплов |
| Inference на шаг | 1 rollout | **G** rollouts на промпт |
| Baseline | V(s_t) learned | mean(r) по группе |

Экономия на **памяти**; **вычисление** смещается в сторону большего числа генераций — выгодно, когда verifiable reward дешёв, а critic дорог.

---

## Сравнительная таблица

| Критерий | PPO | GRPO |
|----------|-----|------|
| **Год / источник** | Schulman 2017 | Shao et al. 2024 (DeepSeekMath) |
| **Credit assignment** | Потокенный (GAE) | На весь ответ (outcome) |
| **Baseline** | Critic V_γ | Среднее по группе |
| **Variance reduction** | GAE, value loss | Whitening r в группе |
| **Лучше при** | Dense/shaped rewards, RLHF-RM | RLVR, math/code, бинарные награды |
| **Риски** | Bias критика, drift V | Малый G → шумная σ; collapse группы |
| **Варианты** | PPO + RLHF стандарт | Dr. GRPO, DAPO, RLOO |

---

## RLVR и verifiable rewards

GRPO особенно силён в **RL with Verifiable Rewards (RLVR)**: награда 0/1 или частичная от **проверки** (ответ в GSM8K, компиляция кода, formal proof).

- Не нужен отдельный RM на миллиарды параметров.
- Группа ответов на **один** вопрос даёт естественный ранжир: часть верна, часть нет → сигнал для policy gradient.
- Связь с [генерацией бенчмарков](/vairl/blog/2026/06/29/agent-benchmark-generation-ru/): eval-набор = источник промптов и верификаторов.

Теоретический разбор динамики GRPO при RLVR: [arXiv:2503.06639](https://arxiv.org/html/2503.06639v4).

---

## Устойчивость как control loop

Обучение RL — **замкнутый контур**: π → rollout → reward → update → π.

| Элемент control theory | PPO | GRPO |
|------------------------|-----|------|
| **Gain** | Шаг η, ε clip | То же + размер G |
| **Наблюдение** | V(s) на каждом токене | Только terminal r |
| **Положительная ОС** | Ошибка критика → неверный A | Все r в группе одинаковы → σ→0 |
| **Демпфирование** | Clipping, KL, GAE λ | Clipping, KL, whitening |
| **Задержка** | Критик отстаёт от π | Нет критика; lag только в π_old |

См. [устойчивость agent control loops](/vairl/blog/2026/06/29/agent-control-loop-stability-ru/): GRPO убирает один источник положительной обратной связи (ошибочный critic), но добавляет чувствительность к **дисперсии группы**.

**Практические стабилизаторы GRPO:** достаточный G (8–64), ε clip 0.1–0.2, KL penalty, dynamic sampling (отбрасывать группы с нулевой дисперсией награды), варианты без деления на σ (Dr. GRPO).

---

## Варианты и эволюция

| Метод | Отличие |
|-------|---------|
| **Dr. GRPO** | Убрать нормализацию на σ — только mean baseline |
| **DAPO** | Масштабные engineering-твики, иногда без KL к ref |
| **RLOO / REINFORCE leave-one-out** | Похожая идея leave-one-out baseline |
| **PPO + RLHF** | По-прежнему baseline в ChatGPT-классе пайплайнов с RM |

Теория: GRPO gradient как [U-statistic](https://arxiv.org/html/2603.01162v1) — асимптотически близок к oracle с истинным критиком при росте G.

### Интерактив: архитектура и advantage

Переключите **PPO / GRPO** и нажимайте **«Следующий шаг»**: слева — схема сетей и полоса VRAM; справа — группа ответов (GRPO) или кривая критика и GAE по токенам (PPO).

<div id="grpo-ppo-demo" class="grpo-ppo-widget">
  <div class="rl-header">
    <p>Сравнение циклов выравнивания: PPO держит критик <code>V<sub>γ</sub></code>; GRPO заменяет его групповым baseline по наградам <code>r<sub>i</sub></code> на одном промпте.</p>
  </div>
  <div class="rl-controls">
    <button type="button" data-rl-mode="grpo" class="active">GRPO</button>
    <button type="button" data-rl-mode="ppo">PPO</button>
    <button type="button" class="rl-step-btn" data-rl-step>Следующий шаг →</button>
  </div>
  <p class="rl-formula"></p>
  <div class="rl-canvas-wrap">
    <canvas id="grpo-ppo-canvas"></canvas>
  </div>
  <p class="rl-caption"></p>
</div>

<script src="{{ '/assets/js/grpo-ppo-demo.js' | relative_url }}"></script>

---

## Когда что выбирать

| Сценарий | Рекомендация |
|----------|--------------|
| RLHF с дорогим RM, нужен token-level shaping | **PPO** + зрелый стек |
| Math / code / formal verify, бинарная награда | **GRPO** / RLVR |
| Ограниченная VRAM на кластере | **GRPO** (нет critic) |
| Много промптов, дешёвая генерация | **GRPO** (G сэмплов параллельно) |
| Продукт с human preference без верификатора | **PPO** + RM, возможно hybrid |

В продакшен-агентах RL-этап — часть [пайплайна ролей](/vairl/blog/2026/07/01/agent-lifecycle-pipeline-ru/): Builder внедряет, Maintainer следит за drift политики, eval из [телеметрии](/vairl/blog/2026/06/29/agent-telemetry-ru/) ловит регрессии после обновления π_θ.

---

## Практический чеклист

1. **π_ref** — зафиксировать SFT-чекпоинт для KL.
2. **Reward** — явный контракт: RM vs verifier vs hybrid.
3. **PPO:** инициализировать V от RM; мониторить value loss и explained variance.
4. **GRPO:** G ≥ 8; фильтровать группы с σ(r)=0; логировать распределение A_i.
5. **Общее:** clip ε, KL budget, [бенчмарк](/vairl/blog/2026/06/29/agent-benchmark-generation-ru/) до/после RL.

## Further reading

- [DeepSeekMath / GRPO](https://arxiv.org/abs/2402.03300) — оригинальная статья
- [PPO](https://arxiv.org/abs/1707.06347) — Schulman et al.
- [Hugging Face LLM Course: GRPO](https://huggingface.co/learn/llm-course/en/chapter12/3a)
- [PPO & GRPO guide](https://yugeten.github.io/posts/2025/01/ppogrpo/) — Yuge Shi
- [GRPO dynamics under RLVR](https://arxiv.org/html/2503.06639v4)
- [Demystifying GRPO (U-statistic)](https://arxiv.org/html/2603.01162v1)
- [Устойчивость control loops](/vairl/blog/2026/06/29/agent-control-loop-stability-ru/)
