---
layout: post
title: "Agentic-паттерны: практические задачи"
date: 2026-07-10 10:00:00 +0300
excerpt: "Python-задачи: ReAct loop, self-reflection, supervisor routing."
lang: ru
image: /assets/images/best-ai-agent-specialist.svg
visibility: public
review_track: blog
review_status: approved
series: agent-systems-interview
series_part: 9
article_kind: code
listed: false
feed: false
---

*Серия «Инженер агентных систем». [← Индекс серии](/vairl/blog/2026/07/10/agent-systems-interview-ru/) · практика к части 9*

Связано с [теорией](/vairl/blog/2026/07/10/agent-systems-interview-09-agentic-patterns-design-code-ru/) и [индексом серии](/vairl/blog/2026/07/10/agent-systems-interview-ru/).

Практика демонстрирует router, planner и критика ответа.

## Задача 1

Напишите rule-based router, возвращающий тип следующего агента.
```python
from typing import Literal
Route=Literal["research","tool","answer"]
def route(text: str) -> Route:
    text=text.lower()
    return "research" if "почему" in text else "tool" if "посчитай" in text else "answer"
```

## Задача 2

Сформируйте план из атомарных действий, не позволяя пустой план.
```python
from dataclasses import dataclass
@dataclass(frozen=True)
class Plan: actions: tuple[str,...]
def plan(goal: str) -> Plan:
    actions=tuple(x.strip() for x in goal.split(" затем ") if x.strip())
    if not actions: raise ValueError("empty goal")
    return Plan(actions)
```

## Задача 3

Добавьте простого критика: ответ принимается только при наличии факта и ссылки.
```python
@dataclass(frozen=True)
class Verdict: accepted: bool; reason: str
def critique(answer: str) -> Verdict:
    ok=len(answer)>30 and "http" in answer
    return Verdict(ok, "sufficient evidence" if ok else "add evidence")
```

## Что проверяют на собеседовании

- Условия выбора паттерна.
- Проверяемость промежуточных артефактов.
- Ограничение бесконечных agent-loop.
