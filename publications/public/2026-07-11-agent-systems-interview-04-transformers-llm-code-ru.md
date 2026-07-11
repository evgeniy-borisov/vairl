---
layout: post
title: "Трансформеры и LLM: практические задачи"
date: 2026-07-10 10:00:00 +0300
excerpt: "Python-задачи: scaled dot-product attention, greedy decode, оценка groundedness."
lang: ru
image: /assets/images/best-ai-agent-specialist.svg
visibility: public
review_track: blog
review_status: approved
series: agent-systems-interview
series_part: 4
article_kind: code
listed: false
feed: false
---

*Серия «Инженер агентных систем». [← Индекс серии](/vairl/blog/2026/07/10/agent-systems-interview-ru/) · практика к части 4*

Связано с [теорией](/vairl/blog/2026/07/10/agent-systems-interview-04-transformers-llm-ru/) и [индексом серии](/vairl/blog/2026/07/10/agent-systems-interview-ru/).

Код показывает механику скоринга без зависимости от тяжёлых ML-библиотек.

## Задача 1

Реализуйте stable softmax для логитов следующего токена. Вероятности должны суммироваться в единицу.

```python
import math
def softmax(logits: list[float]) -> list[float]:
    pivot=max(logits); values=[math.exp(x-pivot) for x in logits]; total=sum(values)
    return [x/total for x in values]
```

## Задача 2

Выберите следующий токен с temperature и top-k. При нулевой температуре берите argmax.

```python
def sample_token(logits: dict[str,float], temperature: float=1., top_k: int=3) -> str:
    ranked=sorted(logits.items(), key=lambda x:x[1], reverse=True)[:top_k]
    if temperature <= 0: return ranked[0][0]
    probs=softmax([score/temperature for _,score in ranked])
    return max(zip((token for token,_ in ranked),probs), key=lambda x:x[1])[0]
```

## Задача 3

Соберите prompt из сообщений, ограничив историю бюджетом символов. Системное сообщение всегда сохраняется.

```python
from dataclasses import dataclass
@dataclass(frozen=True)
class Message: role: str; content: str
def compact(messages: list[Message], limit: int) -> list[Message]:
    system=[m for m in messages if m.role=="system"][:1]; kept=system[:]; used=sum(len(m.content) for m in kept)
    for m in reversed(messages):
        if m.role!="system" and used+len(m.content)<=limit: kept.insert(len(system),m); used+=len(m.content)
    return kept
```

## Что проверяют на собеседовании

- Численную устойчивость softmax.
- Влияние decoding-параметров.
- Управление контекстным окном.
