---
layout: post
title: "Эволюционный движок: практические задачи"
date: 2026-07-10 10:00:00 +0300
excerpt: "Python-задачи: мутация промптов, MAP-Elites grid, multi-objective отбор."
lang: ru
image: /assets/images/best-ai-agent-specialist.svg
visibility: public
review_track: blog
review_status: approved
series: agent-systems-interview
series_part: 8
article_kind: code
listed: false
feed: false
---

*Серия «Инженер агентных систем». [← Индекс серии](/vairl/blog/2026/07/10/agent-systems-interview-ru/) · практика к части 8*

Связано с [теорией](/vairl/blog/2026/07/10/agent-systems-interview-08-evolutionary-engine-design-code-ru/) и [индексом серии](/vairl/blog/2026/07/10/agent-systems-interview-ru/).

Код показывает компактный цикл поиска конфигураций.

## Задача 1

Представьте кандидата с fitness и выберите лучших родителей.
```python
from dataclasses import dataclass
@dataclass(frozen=True)
class Genome: prompt: str; temperature: float; fitness: float=0.
def select(population: list[Genome], count: int=2) -> list[Genome]:
    return sorted(population,key=lambda g:g.fitness,reverse=True)[:count]
```

## Задача 2

Сделайте детерминированную мутацию температуры внутри допустимого диапазона.
```python
def mutate(parent: Genome, delta: float) -> Genome:
    return Genome(parent.prompt, max(0.,min(2.,parent.temperature+delta)))
```

## Задача 3

Ведите MAP-Elites архив: в каждой нише остаётся лучший кандидат.
```python
def archive(items: list[Genome]) -> dict[int,Genome]:
    result: dict[int,Genome]={}
    for item in items:
        niche=int(item.temperature*2)
        if niche not in result or item.fitness>result[niche].fitness: result[niche]=item
    return result
```

## Что проверяют на собеседовании

- Функцию приспособленности и шум измерений.
- Exploration/exploitation.
- Сохранение разнообразия популяции.
