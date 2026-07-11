---
layout: post
title: "ML-метрики: практические задачи"
date: 2026-07-10 10:00:00 +0300
excerpt: "Python-задачи: F1/precision/recall, train/val split, Pareto-отбор кандидатов."
lang: ru
image: /assets/images/best-ai-agent-specialist.svg
visibility: public
review_track: blog
review_status: approved
series: agent-systems-interview
series_part: 3
article_kind: code
listed: false
feed: false
---

*Серия «Инженер агентных систем». [← Индекс серии](/vairl/blog/2026/07/10/agent-systems-interview-ru/) · практика к части 3*

Связано с [теорией](/vairl/blog/2026/07/10/agent-systems-interview-03-ml-metrics-algorithms-code-ru/) и [индексом серии](/vairl/blog/2026/07/10/agent-systems-interview-ru/).

Упражнения связывают качество ответов, стоимость и отбор кандидатов.

## Задача 1

Вычислите precision, recall и F1 для бинарной проверки ответов. Пустые знаменатели не должны приводить к ошибке.

```python
from dataclasses import dataclass
@dataclass(frozen=True)
class Scores: precision: float; recall: float; f1: float
def classification(y: list[bool], p: list[bool]) -> Scores:
    tp=sum(a and b for a,b in zip(y,p)); fp=sum(not a and b for a,b in zip(y,p)); fn=sum(a and not b for a,b in zip(y,p))
    precision=tp/(tp+fp) if tp+fp else 0.; recall=tp/(tp+fn) if tp+fn else 0.
    return Scores(precision, recall, 2*precision*recall/(precision+recall) if precision+recall else 0.)
```

## Задача 2

Отберите пайплайн по качеству и стоимости. Результат должен быть устойчивым при равных score.

```python
from dataclasses import dataclass
@dataclass(frozen=True)
class Candidate: name: str; quality: float; cost: float
def choose(items: list[Candidate], alpha: float = .1) -> Candidate:
    return max(items, key=lambda x: (x.quality - alpha*x.cost, -x.cost, x.name))
```

## Задача 3

Разбейте датасет на воспроизводимые train/validation части. Не используйте глобальное состояние random.

```python
import random
from typing import TypeVar
T=TypeVar("T")
def split(items: list[T], validation: float, seed: int=7) -> tuple[list[T],list[T]]:
    data=items[:]; random.Random(seed).shuffle(data); cut=round(len(data)*(1-validation))
    return data[:cut], data[cut:]
```

## Что проверяют на собеседовании

- Смысл метрик при дисбалансе классов.
- Компромисс качества и стоимости.
- Воспроизводимость экспериментов.
