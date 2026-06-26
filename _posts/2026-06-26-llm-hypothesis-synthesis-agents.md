---
layout: post
title: "Local LLM Hypothesis Synthesis for Agent Quality"
date: 2026-06-26
excerpt: "A Colab pipeline to generate testable hypotheses for improving LLM agents with a local model, ChromaDB storage, and hypothesis-space visualization."
lang: en
---

Improving agents is not a single trick — it is a **hypothesis space**: changes to planning, tool use, memory, reflection, and error recovery. This post describes a practical pipeline you can run in [Google Colab](https://colab.research.google.com/github/evgeniy-borisov/vairl/blob/main/notebooks/hypothesis-synthesis-agents.ipynb) without external APIs.

[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/evgeniy-borisov/vairl/blob/main/notebooks/hypothesis-synthesis-agents.ipynb)

## Why hypothesis synthesis?

When tuning an agent, we often try isolated ideas: chain-of-thought, ReAct, a critic module, tool caching. Without an explicit **hypothesis** object, it is easy to:

- repeat semantically similar ideas;
- lose track of what is actually being tested;
- disconnect configuration changes from metrics.

In our pipeline, a hypothesis is a structured object: claim, mechanism, quality axis, experiment variables, metric, prediction, and falsification criterion.

## Pipeline architecture

```
Task context
    → local LLM (Qwen2.5-7B GGUF on T4)
    → JSON hypotheses along agent quality axes
    → ChromaDB (embeddings + deduplication)
    → fast scoring (heuristic / benchmark)
    → iterative refine with top candidates
    → space visualization (PCA / PaCMAP)
```

### Agent quality axes

| Axis | What changes |
|------|----------------|
| `tool_use` | Tool call reliability and argument validity |
| `planning` | Goal decomposition and multi-step plans |
| `memory` | Context retention in long sessions |
| `reflection` | Self-check and critic passes |
| `error_recovery` | Behavior after API/tool failures |
| `latency_tradeoff` | Speed vs. quality balance |

## Local LLM in Colab

The model runs **on the Colab VM GPU** — no data leaves to a third-party API. On a T4 (~16 GB VRAM), a quantized 7B model via `llama-cpp-python` is a practical default.

Without a GPU, the notebook falls back to **demo mode** with template hypotheses so the full pipeline (ChromaDB, scoring, visualization) still runs end to end.

## ChromaDB and deduplication

Each hypothesis is embedded (`multilingual-e5-small`). Before insertion we check cosine similarity against existing entries to avoid near-duplicate ideas in later rounds.

## Iterative refine

After the first batch, top hypotheses by score are injected into the next LLM prompt. The model sees what was already proposed and explores **new** directions — similar to guided search in NAS or evolutionary methods.

## Scoring: from heuristic to benchmark

The notebook ships with a placeholder `score_hypothesis`. In production, replace it with:

- agent runs using hypothesis `variables` on a fixed episode set;
- metrics: `task_success_rate`, `tool_call_success_rate`, `recovery_rate`, `hallucination_rate`;
- statistical thresholds for accept/reject.

## Link to hypothesis spaces

This pipeline extends the idea from [Hypothesis Spaces and PaCMAP](/vairl/blog/2026/06/24/hypothesis-space-pacmap/): accumulate candidates first, then project to 2D to interpret clusters and unexplored regions.

## Limitations

- A local 7B model is weaker than top cloud models — use strict JSON schema and a critic.
- Heuristic scores do not replace real benchmarks.
- Colab sessions are time-limited; mount Google Drive for long runs.

## Try it

Open the notebook in Colab, set **Runtime → T4 GPU**, and run cells top to bottom:

**[hypothesis-synthesis-agents.ipynb](https://colab.research.google.com/github/evgeniy-borisov/vairl/blob/main/notebooks/hypothesis-synthesis-agents.ipynb)**

Source code lives in the VAIRL repo under `notebooks/`.
