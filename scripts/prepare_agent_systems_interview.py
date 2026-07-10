#!/usr/bin/env python3
"""Prepare agent-systems-interview series for VAIRL publication."""

from __future__ import annotations

import re
import shutil
from pathlib import Path

ROOT = Path(__file__).resolve().parents[1]
LOCAL = ROOT / "publications/local/agent-systems-interview"
PUBLIC = ROOT / "publications/public"
DATE = "2026-07-10"
TIME_BASE = "10:00:00 +0300"
IMAGE = "/assets/images/best-ai-agent-specialist.svg"
INDEX_SLUG = "agent-systems-interview-ru"

FILES = [
    (
        "00-index-agent-systems-interview-ru.md",
        "2026-07-11-agent-systems-interview-ru.md",
        0,
        "Инженер агентных систем: подготовка к собеседованию",
        "Иерархический набор для подготовки к собеседованию инженера агентных систем: блиц-опрос и design-кейсы по пайплайнам, оркестрации, эволюции, памяти и evaluation.",
    ),
    (
        "01-python-async-typing-ru.md",
        "2026-07-11-agent-systems-interview-01-python-async-typing-ru.md",
        1,
        "Этап 1: Python, asyncio, typing, dataclasses, Pydantic",
        "Блиц-вопросы по Python для платформы агентных систем: asyncio, typing, Pydantic, таймауты.",
    ),
    (
        "02-data-structures-hash-tables-ru.md",
        "2026-07-11-agent-systems-interview-02-data-structures-hash-tables-ru.md",
        2,
        "Этап 1: структуры данных и хэш-таблицы",
        "Блиц-вопросы по хэш-таблицам, графам, DAG и кешам для оркестратора агентов.",
    ),
    (
        "03-ml-metrics-algorithms-ru.md",
        "2026-07-11-agent-systems-interview-03-ml-metrics-algorithms-ru.md",
        3,
        "Этап 1: ML-метрики и алгоритмы",
        "Блиц-вопросы по метрикам, валидации и мультиобъективной оценке агентных пайплайнов.",
    ),
    (
        "04-transformers-llm-ru.md",
        "2026-07-11-agent-systems-interview-04-transformers-llm-ru.md",
        4,
        "Этап 1: трансформеры и LLM",
        "Блиц-вопросы по attention, decoding, hallucination и оценке LLM в агентных системах.",
    ),
    (
        "05-docker-infra-ru.md",
        "2026-07-11-agent-systems-interview-05-docker-infra-ru.md",
        5,
        "Этап 1: Docker и инфраструктура",
        "Блиц-вопросы по контейнеризации, изоляции и reproducibility для агентных экспериментов.",
    ),
    (
        "06-pipeline-generator-design-ru.md",
        "2026-07-11-agent-systems-interview-06-pipeline-generator-design-ru.md",
        6,
        "Этап 2: проектирование генератора агентных пайплайнов",
        "Design-кейсы: NL → исполняемый pipeline и repair-loop невалидного плана.",
    ),
    (
        "07-dag-orchestrator-design-ru.md",
        "2026-07-11-agent-systems-interview-07-dag-orchestrator-design-ru.md",
        7,
        "Этап 2: проектирование DAG-оркестратора",
        "Design-кейсы: параллельное исполнение DAG, retries и отказоустойчивость.",
    ),
    (
        "08-evolutionary-engine-design-ru.md",
        "2026-07-11-agent-systems-interview-08-evolutionary-engine-design-ru.md",
        8,
        "Этап 2: проектирование эволюционного движка",
        "Design-кейсы: генетический поиск, MAP-Elites, острова и LLM-мутации.",
    ),
    (
        "09-agentic-patterns-design-ru.md",
        "2026-07-11-agent-systems-interview-09-agentic-patterns-design-ru.md",
        9,
        "Этап 2: проектирование agentic-паттернов",
        "Design-кейсы: ReAct, рефлексия, супервайзер и мультиагентные дебаты.",
    ),
    (
        "10-memory-rag-design-ru.md",
        "2026-07-11-agent-systems-interview-10-memory-rag-design-ru.md",
        10,
        "Этап 2: проектирование памяти и RAG",
        "Design-кейсы: гибридная память и production RAG с groundedness.",
    ),
    (
        "11-tool-use-design-ru.md",
        "2026-07-11-agent-systems-interview-11-tool-use-design-ru.md",
        11,
        "Этап 2: проектирование tool use слоя",
        "Design-кейсы: типобезопасный tool layer и retries/fallback.",
    ),
    (
        "12-evaluation-benchmarking-design-ru.md",
        "2026-07-11-agent-systems-interview-12-evaluation-benchmarking-design-ru.md",
        12,
        "Этап 2: проектирование evaluation и benchmarking",
        "Design-кейсы: benchmark-контур, release gates и Pareto-анализ.",
    ),
]

LINK_MAP = {
    "./01-python-async-typing-ru.md": f"/vairl/blog/2026/07/10/agent-systems-interview-01-python-async-typing-ru/",
    "./02-data-structures-hash-tables-ru.md": f"/vairl/blog/2026/07/10/agent-systems-interview-02-data-structures-hash-tables-ru/",
    "./03-ml-metrics-algorithms-ru.md": f"/vairl/blog/2026/07/10/agent-systems-interview-03-ml-metrics-algorithms-ru/",
    "./04-transformers-llm-ru.md": f"/vairl/blog/2026/07/10/agent-systems-interview-04-transformers-llm-ru/",
    "./05-docker-infra-ru.md": f"/vairl/blog/2026/07/10/agent-systems-interview-05-docker-infra-ru/",
    "./06-pipeline-generator-design-ru.md": f"/vairl/blog/2026/07/10/agent-systems-interview-06-pipeline-generator-design-ru/",
    "./07-dag-orchestrator-design-ru.md": f"/vairl/blog/2026/07/10/agent-systems-interview-07-dag-orchestrator-design-ru/",
    "./08-evolutionary-engine-design-ru.md": f"/vairl/blog/2026/07/10/agent-systems-interview-08-evolutionary-engine-design-ru/",
    "./09-agentic-patterns-design-ru.md": f"/vairl/blog/2026/07/10/agent-systems-interview-09-agentic-patterns-design-ru/",
    "./10-memory-rag-design-ru.md": f"/vairl/blog/2026/07/10/agent-systems-interview-10-memory-rag-design-ru/",
    "./11-tool-use-design-ru.md": f"/vairl/blog/2026/07/10/agent-systems-interview-11-tool-use-design-ru/",
    "./12-evaluation-benchmarking-design-ru.md": f"/vairl/blog/2026/07/10/agent-systems-interview-12-evaluation-benchmarking-design-ru/",
}

INDEX_URL = f"/vairl/blog/2026/07/10/{INDEX_SLUG}/"


def strip_front_matter(text: str) -> str:
    if not text.startswith("---"):
        return text
    end = text.find("\n---", 3)
    if end == -1:
        return text
    return text[end + 4 :].lstrip("\n")


def build_front_matter(title: str, excerpt: str, part: int) -> str:
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
    ]
    if part == 0:
        lines.append("listed: true")
    else:
        lines.extend(["listed: false", "feed: false"])
    lines.append("---")
    return "\n".join(lines)


def main() -> None:
    PUBLIC.mkdir(parents=True, exist_ok=True)
    for src_name, dest_name, part, title, excerpt in FILES:
        src = LOCAL / src_name
        body = strip_front_matter(src.read_text(encoding="utf-8"))
        if part == 0:
            for old, new in LINK_MAP.items():
                body = body.replace(old, new)
        else:
            body = (
                f"*Серия «Инженер агентных систем». "
                f"[← Индекс серии]({INDEX_URL}) · часть {part} из 12*\n\n"
                + body
            )
        out = build_front_matter(title, excerpt, part) + "\n\n" + body
        dest = PUBLIC / dest_name
        dest.write_text(out, encoding="utf-8")
        print(f"Prepared: {dest.relative_to(ROOT)}")


if __name__ == "__main__":
    main()
