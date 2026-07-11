---
layout: post
title: "Память и RAG: практические задачи"
date: 2026-07-10 10:00:00 +0300
excerpt: "Python-задачи: session memory, hybrid retrieval, citation check."
lang: ru
image: /assets/images/best-ai-agent-specialist.svg
visibility: public
review_track: blog
review_status: approved
series: agent-systems-interview
series_part: 10
article_kind: code
listed: false
feed: false
---

*Серия «Инженер агентных систем». [← Индекс серии](/vairl/blog/2026/07/10/agent-systems-interview-ru/) · практика к части 10*

Связано с [теорией](/vairl/blog/2026/07/10/agent-systems-interview-10-memory-rag-design-ru/) и [индексом серии](/vairl/blog/2026/07/10/agent-systems-interview-ru/).

Здесь локальная память и retrieval реализованы без внешнего vector store.

## Задача 1

Разбейте документ на перекрывающиеся чанки с валидацией размера.
```python
def chunks(text: str, size: int=100, overlap: int=20) -> list[str]:
    if not 0<=overlap<size: raise ValueError("bad overlap")
    return [text[i:i+size] for i in range(0,len(text),size-overlap)]
```

## Задача 2

Ранжируйте документы по Jaccard similarity токенов запроса.
```python
def retrieve(query: str, docs: dict[str,str], k: int=3) -> list[str]:
    q=set(query.lower().split())
    score=lambda text: len(q & set(text.lower().split()))/max(1,len(q | set(text.lower().split())))
    return [key for key,_ in sorted(docs.items(),key=lambda x:score(x[1]),reverse=True)[:k]]
```

## Задача 3

Сохраните короткую память диалога с лимитом записей.
```python
from collections import deque
from dataclasses import dataclass, field
@dataclass
class Memory:
    limit: int=5; turns: deque[str]=field(default_factory=deque)
    def add(self, turn: str) -> None:
        self.turns.append(turn)
        while len(self.turns)>self.limit: self.turns.popleft()
```

## Что проверяют на собеседовании

- Chunking и влияние overlap.
- Качество retrieval и метрики.
- Политику хранения и удаления памяти.
