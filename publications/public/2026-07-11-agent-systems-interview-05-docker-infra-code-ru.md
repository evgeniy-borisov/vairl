---
layout: post
title: "Docker и инфраструктура: практические задачи"
date: 2026-07-10 10:00:00 +0300
excerpt: "Python-задачи: генерация Dockerfile, healthcheck runner, sandbox-лимиты."
lang: ru
image: /assets/images/best-ai-agent-specialist.svg
visibility: public
review_track: blog
review_status: approved
series: agent-systems-interview
series_part: 5
article_kind: code
listed: false
feed: false
---

*Серия «Инженер агентных систем». [← Индекс серии](/vairl/blog/2026/07/10/agent-systems-interview-ru/) · практика к части 5*

Связано с [теорией](/vairl/blog/2026/07/10/agent-systems-interview-05-docker-infra-ru/) и [индексом серии](/vairl/blog/2026/07/10/agent-systems-interview-ru/).

Упражнения описывают безопасную упаковку и запуск агентного worker.

## Задача 1

Сгенерируйте воспроизводимый Dockerfile для Python-сервиса. Базовый образ и порт должны быть параметрами.
```python
from dataclasses import dataclass
@dataclass(frozen=True)
class ImageSpec: base: str="python:3.12-slim"; port: int=8080
def dockerfile(s: ImageSpec) -> str:
    return f'''FROM {s.base}
WORKDIR /app
COPY . .
RUN pip install --no-cache-dir -r requirements.txt
USER 10001
EXPOSE {s.port}
CMD ["python", "app.py"]
'''
```

## Задача 2

Соберите безопасную команду docker run для sandbox. Ограничьте память, CPU и запретите сеть.
```python
from pathlib import Path
def run_command(image: str, workdir: Path) -> list[str]:
    return ["docker","run","--rm","--network","none","--memory","512m","--cpus","1",
            "--read-only","-v",f"{workdir.resolve()}:/work:ro",image]
```

## Задача 3

Проверьте health endpoint без внешнего Docker SDK. Ошибка процесса должна стать исключением.
```python
import subprocess
def health(container: str) -> str:
    result=subprocess.run(["docker","inspect","--format","{{.State.Health.Status}}",container],
                          text=True,capture_output=True,check=True)
    return result.stdout.strip()
```

## Что проверяют на собеседовании

- Воспроизводимость образа и непривилегированный пользователь.
- Лимиты и изоляцию недоверенного кода.
- Наблюдаемость и health checks.
