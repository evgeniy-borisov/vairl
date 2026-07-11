---
layout: post
title: "Генератор пайплайнов: практические задачи"
date: 2026-07-10 10:00:00 +0300
excerpt: "Python-задачи: парсинг NL-плана, валидация графа, repair-loop."
lang: ru
image: /assets/images/best-ai-agent-specialist.svg
visibility: public
review_track: blog
review_status: approved
series: agent-systems-interview
series_part: 6
article_kind: code
listed: false
feed: false
---

*Серия «Инженер агентных систем». [← Индекс серии](/vairl/blog/2026/07/10/agent-systems-interview-ru/) · практика к части 6*

Связано с [теорией](/vairl/blog/2026/07/10/agent-systems-interview-06-pipeline-generator-design-code-ru/) и [индексом серии](/vairl/blog/2026/07/10/agent-systems-interview-ru/).

Здесь NL-намерение превращается в проверяемый план.

## Задача 1

Опишите шаг пайплайна и соберите минимальный план для исследовательского запроса.
```python
from dataclasses import dataclass
@dataclass(frozen=True)
class Step: id: str; tool: str; needs: tuple[str,...]=()
def research_plan() -> list[Step]:
    return [Step("search","web"), Step("extract","reader",("search",)), Step("answer","llm",("extract",))]
```

## Задача 2

Провалидируйте ссылки зависимостей до исполнения. Неизвестный идентификатор — ошибка компиляции плана.
```python
def validate(steps: list[Step]) -> None:
    ids={s.id for s in steps}
    if len(ids)!=len(steps): raise ValueError("duplicate step")
    for step in steps:
        if set(step.needs)-ids: raise ValueError(f"unknown dependency: {step.id}")
```

## Задача 3

Разрешите простой intent через локальный классификатор, который легко заменить LLM.
```python
def generate(request: str) -> list[Step]:
    if any(word in request.lower() for word in ("найди","исследуй","search")): return research_plan()
    return [Step("answer","llm")]
```

## Что проверяют на собеседовании

- Явные контракты плана.
- Дешёвую валидацию до запуска.
- Разделение генерации и исполнения.
