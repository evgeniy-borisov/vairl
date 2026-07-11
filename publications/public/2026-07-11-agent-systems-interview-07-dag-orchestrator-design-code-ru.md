---
layout: post
title: "DAG-оркестратор: практические задачи"
date: 2026-07-10 10:00:00 +0300
excerpt: "Python-задачи: async DAG runner, retries, conditional skip."
lang: ru
image: /assets/images/best-ai-agent-specialist.svg
visibility: public
review_track: blog
review_status: approved
series: agent-systems-interview
series_part: 7
article_kind: code
listed: false
feed: false
---

*Серия «Инженер агентных систем». [← Индекс серии](/vairl/blog/2026/07/10/agent-systems-interview-ru/) · практика к части 7*

Связано с [теорией](/vairl/blog/2026/07/10/agent-systems-interview-07-dag-orchestrator-design-ru/) и [индексом серии](/vairl/blog/2026/07/10/agent-systems-interview-ru/).

Задачи покрывают порядок выполнения, циклы и передачу результатов.

## Задача 1

Получите топологический порядок шагов. Цикл должен быть обнаружен.
```python
def topo(graph: dict[str,set[str]]) -> list[str]:
    remaining={k:set(v) for k,v in graph.items()}; order=[]
    while remaining:
        ready=sorted(k for k,v in remaining.items() if not v)
        if not ready: raise ValueError("cycle")
        order.extend(ready)
        for key in ready: remaining.pop(key)
        for deps in remaining.values(): deps.difference_update(ready)
    return order
```

## Задача 2

Запустите независимые ready-узлы одновременно. Handler принимает уже готовые результаты зависимостей.
```python
import asyncio
from collections.abc import Awaitable, Callable
async def execute(nodes: list[str], handler: Callable[[str],Awaitable[str]]) -> dict[str,str]:
    results: dict[str,str]={}
    async with asyncio.TaskGroup() as tg: tasks={n:tg.create_task(handler(n)) for n in nodes}
    return {n:t.result() for n,t in tasks.items()}
```

## Задача 3

Храните состояние шага как неизменяемую запись для аудита.
```python
from dataclasses import dataclass
from datetime import datetime, UTC
@dataclass(frozen=True)
class RunState: step: str; status: str; at: datetime
def completed(step: str) -> RunState: return RunState(step,"completed",datetime.now(UTC))
```

## Что проверяют на собеседовании

- Семантику зависимостей и циклов.
- Параллелизм без гонок.
- Наблюдаемое состояние запуска.
