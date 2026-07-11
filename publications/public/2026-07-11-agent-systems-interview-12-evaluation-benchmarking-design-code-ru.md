---
layout: post
title: "Evaluation: практические задачи"
date: 2026-07-10 10:00:00 +0300
excerpt: "Python-задачи: benchmark runner, token cost tracker, release gate."
lang: ru
image: /assets/images/best-ai-agent-specialist.svg
visibility: public
review_track: blog
review_status: approved
series: agent-systems-interview
series_part: 12
article_kind: code
listed: false
feed: false
---

*Серия «Инженер агентных систем». [← Индекс серии](/vairl/blog/2026/07/10/agent-systems-interview-ru/) · практика к части 12*

Связано с [теорией](/vairl/blog/2026/07/10/agent-systems-interview-12-evaluation-benchmarking-design-code-ru/) и [индексом серии](/vairl/blog/2026/07/10/agent-systems-interview-ru/).

Код формирует небольшой, но аудируемый evaluation-контур.

## Задача 1

Опишите test case и вычислите exact-match метрику набора.
```python
from dataclasses import dataclass
@dataclass(frozen=True)
class Case: question: str; expected: str
def exact(cases: list[Case], answers: list[str]) -> float:
    return sum(c.expected.strip()==a.strip() for c,a in zip(cases,answers))/max(1,len(cases))
```

## Задача 2

Добавьте стоимость и latency в запись запуска, затем постройте агрегат.
```python
@dataclass(frozen=True)
class Run: quality: float; cost: float; latency_ms: int
def summary(runs: list[Run]) -> dict[str,float]:
    return {"quality":sum(x.quality for x in runs)/len(runs),
            "cost":sum(x.cost for x in runs),"p95_latency":float(sorted(x.latency_ms for x in runs)[int(.95*(len(runs)-1))])}
```

## Задача 3

Выполните regression gate: кандидат принимается только без падения quality и в рамках бюджета стоимости.
```python
def gate(baseline: Run, candidate: Run, max_cost: float) -> bool:
    return candidate.quality>=baseline.quality and candidate.cost<=max_cost
```

## Что проверяют на собеседовании

- Репрезентативность benchmark-набора.
- Качество, latency и стоимость вместе.
- Regression gates в CI/CD.
