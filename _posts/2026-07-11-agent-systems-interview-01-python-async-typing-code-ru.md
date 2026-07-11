---
layout: post
title: "Python, asyncio и typing: практические задачи"
date: 2026-07-10 10:00:00 +0300
excerpt: "Python-задачи: async fanout, бюджет запроса, Pydantic-контракты шагов DAG."
lang: ru
image: /assets/images/best-ai-agent-specialist.svg
visibility: public
review_track: blog
review_status: approved
series: agent-systems-interview
series_part: 1
article_kind: code
listed: false
feed: false
---

*Серия «Инженер агентных систем». [← Индекс серии](/vairl/blog/2026/07/10/agent-systems-interview-ru/) · практика к части 1*

Связано с [теорией](/vairl/blog/2026/07/10/agent-systems-interview-01-python-async-typing-code-ru/) и [индексом серии](/vairl/blog/2026/07/10/agent-systems-interview-ru/).

Небольшие упражнения проверяют безопасную конкуррентность и ясные контракты данных.

## Задача 1

Параллельно запросить несколько mock-моделей. У каждой операции должен быть собственный таймаут, а результат — типизированным.

```python
import asyncio
from dataclasses import dataclass

@dataclass(frozen=True)
class Reply: model: str; text: str
async def ask(model: str, prompt: str) -> Reply:
    await asyncio.sleep(0.01); return Reply(model, f"{prompt}: ok")
async def fanout(prompt: str) -> list[Reply]:
    async with asyncio.TaskGroup() as tg:
        tasks = [tg.create_task(asyncio.wait_for(ask(m, prompt), 1)) for m in ("a", "b")]
    return [task.result() for task in tasks]
```

## Задача 2

Сделайте неизменяемый бюджет запроса. Он не должен позволять отрицательные лимиты.

```python
from dataclasses import dataclass
@dataclass(frozen=True, slots=True)
class Budget:
    tokens: int; seconds: float
    def __post_init__(self) -> None:
        if self.tokens < 0 or self.seconds <= 0: raise ValueError("invalid budget")
    def spend(self, tokens: int) -> "Budget":
        if tokens > self.tokens: raise RuntimeError("budget exceeded")
        return Budget(self.tokens - tokens, self.seconds)
```

## Задача 3

Организуйте отменяемый retry для нестабильного инструмента. После последней попытки исходная ошибка должна быть видна вызывающему коду.

```python
import asyncio
from collections.abc import Awaitable, Callable
async def retry[T](fn: Callable[[], Awaitable[T]], attempts: int = 3) -> T:
    for i in range(attempts):
        try: return await fn()
        except OSError:
            if i == attempts - 1: raise
            await asyncio.sleep(0.1 * (2 ** i))
    raise AssertionError("unreachable")
```

## Что проверяют на собеседовании

- Структурированную конкуррентность и отмену задач.
- Границы таймаутов и retry.
- Типы как контракт между шагами.
