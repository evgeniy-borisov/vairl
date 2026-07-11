---
layout: post
title: "Tool use: практические задачи"
date: 2026-07-10 10:00:00 +0300
excerpt: "Python-задачи: typed tool registry, retry policy, sandbox dispatch."
lang: ru
image: /assets/images/best-ai-agent-specialist.svg
visibility: public
review_track: blog
review_status: approved
series: agent-systems-interview
series_part: 11
article_kind: code
listed: false
feed: false
---

*Серия «Инженер агентных систем». [← Индекс серии](/vairl/blog/2026/07/10/agent-systems-interview-ru/) · практика к части 11*

Связано с [теорией](/vairl/blog/2026/07/10/agent-systems-interview-11-tool-use-design-code-ru/) и [индексом серии](/vairl/blog/2026/07/10/agent-systems-interview-ru/).

Упражнения задают схему вызова, allowlist и адаптер инструмента.

## Задача 1

Опишите типизированный вызов инструмента и проверку обязательных аргументов.
```python
from dataclasses import dataclass
@dataclass(frozen=True)
class ToolCall: name: str; arguments: dict[str,str]
def validate(call: ToolCall, required: set[str]) -> None:
    if not required<=call.arguments.keys(): raise ValueError("missing arguments")
```

## Задача 2

Разрешайте только инструменты из allowlist; это граница безопасности перед исполнением.
```python
ALLOWED=frozenset({"search","calculator"})
def authorize(call: ToolCall) -> ToolCall:
    if call.name not in ALLOWED: raise PermissionError(call.name)
    return call
```

## Задача 3

Сделайте mock-adapter калькулятора, который возвращает строку и не выполняет произвольный код.
```python
import operator
OPS={"+":operator.add,"-":operator.sub,"*":operator.mul,"/":operator.truediv}
def calculator(call: ToolCall) -> str:
    a,b=map(float,(call.arguments["a"],call.arguments["b"]))
    return str(OPS[call.arguments["op"]](a,b))
```

## Что проверяют на собеседовании

- Контракты входов и результатов tool call.
- Авторизацию и изоляцию инструментов.
- Обработку ошибок и идемпотентность.
