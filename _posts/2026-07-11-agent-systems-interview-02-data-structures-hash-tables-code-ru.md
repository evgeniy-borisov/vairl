---
layout: post
title: "Структуры данных: практические задачи"
date: 2026-07-10 10:00:00 +0300
excerpt: "Python-задачи: LRU-кеш, топологическая сортировка DAG, индекс памяти агента."
lang: ru
image: /assets/images/best-ai-agent-specialist.svg
visibility: public
review_track: blog
review_status: approved
series: agent-systems-interview
series_part: 2
article_kind: code
listed: false
feed: false
---

*Серия «Инженер агентных систем». [← Индекс серии](/vairl/blog/2026/07/10/agent-systems-interview-ru/) · практика к части 2*

Связано с [теорией](/vairl/blog/2026/07/10/agent-systems-interview-02-data-structures-hash-tables-ru/) и [индексом серии](/vairl/blog/2026/07/10/agent-systems-interview-ru/).

Задачи моделируют кэш, дедупликацию и индекс памяти агента.

## Задача 1

Реализуйте LRU-кэш результатов инструмента с ограничением размера. Доступ должен обновлять свежесть ключа.

```python
from collections import OrderedDict
from typing import Generic, TypeVar
K = TypeVar("K"); V = TypeVar("V")
class LRU(Generic[K, V]):
    def __init__(self, capacity: int): self.capacity, self.data = capacity, OrderedDict()
    def get(self, key: K) -> V | None:
        if key not in self.data: return None
        self.data.move_to_end(key); return self.data[key]
    def put(self, key: K, value: V) -> None:
        self.data[key] = value; self.data.move_to_end(key)
        if len(self.data) > self.capacity: self.data.popitem(last=False)
```

## Задача 2

Дедуплицируйте события инструмента по составному ключу. Нужен неизменяемый ключ, пригодный для set.

```python
from dataclasses import dataclass
@dataclass(frozen=True)
class Event: run_id: str; tool: str; sequence: int
def unique(events: list[Event]) -> list[Event]:
    seen: set[Event] = set(); result: list[Event] = []
    for event in events:
        if event not in seen: seen.add(event); result.append(event)
    return result
```

## Задача 3

Постройте обратный индекс: токен запроса должен вести к идентификаторам документов. Нормализуйте регистр.

```python
from collections import defaultdict
def inverted_index(docs: dict[str, str]) -> dict[str, set[str]]:
    index: defaultdict[str, set[str]] = defaultdict(set)
    for doc_id, text in docs.items():
        for token in text.lower().split(): index[token].add(doc_id)
    return dict(index)
```

## Что проверяют на собеседовании

- Амортизированную сложность операций.
- Выбор изменяемых и хэшируемых структур.
- Политику вытеснения кэша.
