#!/usr/bin/env python3
"""Prepare agent-systems-interview series for VAIRL publication."""

from __future__ import annotations

import re
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOCAL = ROOT / "publications/local/agent-systems-interview"
PUBLIC = ROOT / "publications/public"
DATE = "2026-07-10"
TIME_BASE = "10:00:00 +0300"
IMAGE = "/assets/images/best-ai-agent-specialist.svg"
BLOG_PREFIX = "/vairl/blog/2026/07/10"
INDEX_SLUG = "agent-systems-interview-ru"

ARTICLES: list[tuple[str, str, int, str, str, str]] = [
    # local_name, public_name, part, title, excerpt, kind (index|theory|code)
    (
        "00-index-agent-systems-interview-ru.md",
        "2026-07-11-agent-systems-interview-ru.md",
        0,
        "Инженер агентных систем: подготовка к собеседованию",
        "Иерархический набор для подготовки к собеседованию инженера агентных систем: блиц-опрос, design-кейсы и Python-практика.",
        "index",
    ),
    (
        "01-python-async-typing-ru.md",
        "2026-07-11-agent-systems-interview-01-python-async-typing-ru.md",
        1,
        "Этап 1: Python, asyncio, typing, dataclasses, Pydantic",
        "Блиц-вопросы по Python для платформы агентных систем: asyncio, typing, Pydantic, таймауты.",
        "theory",
    ),
    (
        "01-python-async-typing-code-ru.md",
        "2026-07-11-agent-systems-interview-01-python-async-typing-code-ru.md",
        1,
        "Python, asyncio и typing: практические задачи",
        "Python-задачи: async fanout, бюджет запроса, Pydantic-контракты шагов DAG.",
        "code",
    ),
    (
        "02-data-structures-hash-tables-ru.md",
        "2026-07-11-agent-systems-interview-02-data-structures-hash-tables-ru.md",
        2,
        "Этап 1: структуры данных и хэш-таблицы",
        "Блиц-вопросы по хэш-таблицам, графам, DAG и кешам для оркестратора агентов.",
        "theory",
    ),
    (
        "02-data-structures-hash-tables-code-ru.md",
        "2026-07-11-agent-systems-interview-02-data-structures-hash-tables-code-ru.md",
        2,
        "Структуры данных: практические задачи",
        "Python-задачи: LRU-кеш, топологическая сортировка DAG, индекс памяти агента.",
        "code",
    ),
    (
        "03-ml-metrics-algorithms-ru.md",
        "2026-07-11-agent-systems-interview-03-ml-metrics-algorithms-ru.md",
        3,
        "Этап 1: ML-метрики и алгоритмы",
        "Блиц-вопросы по метрикам, валидации и мультиобъективной оценке агентных пайплайнов.",
        "theory",
    ),
    (
        "03-ml-metrics-algorithms-code-ru.md",
        "2026-07-11-agent-systems-interview-03-ml-metrics-algorithms-code-ru.md",
        3,
        "ML-метрики: практические задачи",
        "Python-задачи: F1/precision/recall, train/val split, Pareto-отбор кандидатов.",
        "code",
    ),
    (
        "04-transformers-llm-ru.md",
        "2026-07-11-agent-systems-interview-04-transformers-llm-ru.md",
        4,
        "Этап 1: трансформеры и LLM",
        "Блиц-вопросы по attention, decoding, hallucination и оценке LLM в агентных системах.",
        "theory",
    ),
    (
        "04-transformers-llm-code-ru.md",
        "2026-07-11-agent-systems-interview-04-transformers-llm-code-ru.md",
        4,
        "Трансформеры и LLM: практические задачи",
        "Python-задачи: scaled dot-product attention, greedy decode, оценка groundedness.",
        "code",
    ),
    (
        "05-docker-infra-ru.md",
        "2026-07-11-agent-systems-interview-05-docker-infra-ru.md",
        5,
        "Этап 1: Docker и инфраструктура",
        "Блиц-вопросы по контейнеризации, изоляции и reproducibility для агентных экспериментов.",
        "theory",
    ),
    (
        "05-docker-infra-code-ru.md",
        "2026-07-11-agent-systems-interview-05-docker-infra-code-ru.md",
        5,
        "Docker и инфраструктура: практические задачи",
        "Python-задачи: генерация Dockerfile, healthcheck runner, sandbox-лимиты.",
        "code",
    ),
    (
        "06-pipeline-generator-design-ru.md",
        "2026-07-11-agent-systems-interview-06-pipeline-generator-design-ru.md",
        6,
        "Этап 2: проектирование генератора агентных пайплайнов",
        "Design-кейсы: NL → исполняемый pipeline и repair-loop невалидного плана.",
        "theory",
    ),
    (
        "06-pipeline-generator-design-code-ru.md",
        "2026-07-11-agent-systems-interview-06-pipeline-generator-design-code-ru.md",
        6,
        "Генератор пайплайнов: практические задачи",
        "Python-задачи: парсинг NL-плана, валидация графа, repair-loop.",
        "code",
    ),
    (
        "07-dag-orchestrator-design-ru.md",
        "2026-07-11-agent-systems-interview-07-dag-orchestrator-design-ru.md",
        7,
        "Этап 2: проектирование DAG-оркестратора",
        "Design-кейсы: параллельное исполнение DAG, retries и отказоустойчивость.",
        "theory",
    ),
    (
        "07-dag-orchestrator-design-code-ru.md",
        "2026-07-11-agent-systems-interview-07-dag-orchestrator-design-code-ru.md",
        7,
        "DAG-оркестратор: практические задачи",
        "Python-задачи: async DAG runner, retries, conditional skip.",
        "code",
    ),
    (
        "08-evolutionary-engine-design-ru.md",
        "2026-07-11-agent-systems-interview-08-evolutionary-engine-design-ru.md",
        8,
        "Этап 2: проектирование эволюционного движка",
        "Design-кейсы: генетический поиск, MAP-Elites, острова и LLM-мутации.",
        "theory",
    ),
    (
        "08-evolutionary-engine-design-code-ru.md",
        "2026-07-11-agent-systems-interview-08-evolutionary-engine-design-code-ru.md",
        8,
        "Эволюционный движок: практические задачи",
        "Python-задачи: мутация промптов, MAP-Elites grid, multi-objective отбор.",
        "code",
    ),
    (
        "09-agentic-patterns-design-ru.md",
        "2026-07-11-agent-systems-interview-09-agentic-patterns-design-ru.md",
        9,
        "Этап 2: проектирование agentic-паттернов",
        "Design-кейсы: ReAct, рефлексия, супервайзер и мультиагентные дебаты.",
        "theory",
    ),
    (
        "09-agentic-patterns-design-code-ru.md",
        "2026-07-11-agent-systems-interview-09-agentic-patterns-design-code-ru.md",
        9,
        "Agentic-паттерны: практические задачи",
        "Python-задачи: ReAct loop, self-reflection, supervisor routing.",
        "code",
    ),
    (
        "10-memory-rag-design-ru.md",
        "2026-07-11-agent-systems-interview-10-memory-rag-design-ru.md",
        10,
        "Этап 2: проектирование памяти и RAG",
        "Design-кейсы: гибридная память и production RAG с groundedness.",
        "theory",
    ),
    (
        "10-memory-rag-design-code-ru.md",
        "2026-07-11-agent-systems-interview-10-memory-rag-design-code-ru.md",
        10,
        "Память и RAG: практические задачи",
        "Python-задачи: session memory, hybrid retrieval, citation check.",
        "code",
    ),
    (
        "11-tool-use-design-ru.md",
        "2026-07-11-agent-systems-interview-11-tool-use-design-ru.md",
        11,
        "Этап 2: проектирование tool use слоя",
        "Design-кейсы: типобезопасный tool layer и retries/fallback.",
        "theory",
    ),
    (
        "11-tool-use-design-code-ru.md",
        "2026-07-11-agent-systems-interview-11-tool-use-design-code-ru.md",
        11,
        "Tool use: практические задачи",
        "Python-задачи: typed tool registry, retry policy, sandbox dispatch.",
        "code",
    ),
    (
        "12-evaluation-benchmarking-design-ru.md",
        "2026-07-11-agent-systems-interview-12-evaluation-benchmarking-design-ru.md",
        12,
        "Этап 2: проектирование evaluation и benchmarking",
        "Design-кейсы: benchmark-контур, release gates и Pareto-анализ.",
        "theory",
    ),
    (
        "12-evaluation-benchmarking-design-code-ru.md",
        "2026-07-11-agent-systems-interview-12-evaluation-benchmarking-design-code-ru.md",
        12,
        "Evaluation: практические задачи",
        "Python-задачи: benchmark runner, token cost tracker, release gate.",
        "code",
    ),
]

INDEX_URL = f"{BLOG_PREFIX}/{INDEX_SLUG}/"


def slug_from_public(public_name: str) -> str:
    return public_name.replace("2026-07-11-", "").replace(".md", "")


def public_url(public_name: str) -> str:
    return f"{BLOG_PREFIX}/{slug_from_public(public_name)}/"


def strip_front_matter(text: str) -> tuple[dict[str, str], str]:
    if not text.startswith("---"):
        return {}, text
    end = text.find("\n---", 3)
    if end == -1:
        return {}, text
    fm_block = text[3:end].strip()
    body = text[end + 4 :].lstrip("\n")
    meta: dict[str, str] = {}
    for line in fm_block.splitlines():
        m = re.match(r"^([a-zA-Z0-9_]+):\s*(.*)$", line)
        if m:
            meta[m.group(1)] = m.group(2).strip().strip('"').strip("'")
    return meta, body


def build_front_matter(title: str, excerpt: str, part: int, kind: str) -> str:
    lines = [
        "---",
        "layout: post",
        f'title: "{title}"',
        f"date: {DATE} {TIME_BASE}",
        f'excerpt: "{excerpt}"',
        "lang: ru",
        f"image: {IMAGE}",
        "visibility: public",
        "review_track: blog",
        "review_status: approved",
        "series: agent-systems-interview",
        f"series_part: {part}",
        f"article_kind: {kind}",
    ]
    if kind == "index":
        lines.append("listed: true")
    else:
        lines.extend(["listed: false", "feed: false"])
    lines.append("---")
    return "\n".join(lines)


def replace_local_links(body: str, url_by_local: dict[str, str]) -> str:
    for local_name, url in sorted(url_by_local.items(), key=lambda x: -len(x[0])):
        body = body.replace(f"](./{local_name})", f"]({url})")
        body = body.replace(f"](./{local_name.replace('-code', '')})", f"]({url})")
    return body


def main() -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)
    url_by_local = {
        local: public_url(public)
        for local, public, *_ in ARTICLES
    }

    for local_name, public_name, part, title, excerpt, kind in ARTICLES:
        src = LOCAL / local_name
        if not src.exists():
            raise FileNotFoundError(f"Missing local article: {src}")
        _, body = strip_front_matter(src.read_text(encoding="utf-8"))
        body = replace_local_links(body, url_by_local)

        if kind == "index":
            pass
        elif kind == "theory":
            body = (
                f"*Серия «Инженер агентных систем». "
                f"[← Индекс серии]({INDEX_URL}) · часть {part} из 12*\n\n"
                + body
            )
        else:
            body = (
                f"*Серия «Инженер агентных систем». "
                f"[← Индекс серии]({INDEX_URL}) · практика к части {part}*\n\n"
                + body
            )

        out = build_front_matter(title, excerpt, part, kind) + "\n\n" + body
        dest = PUBLIC / public_name
        dest.write_text(out, encoding="utf-8")
        print(f"Prepared: {dest.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
