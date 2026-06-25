---
layout: post
title: "Building a Local Agent on Gemma 3 (G3)"
date: 2026-06-26
excerpt: "Why Gemma 3 is a practical backbone for a local multimodal agent: architecture, QLoRA fine-tuning, inference trade-offs, and integration with a model registry."
lang: en
pa_nudge: explore-google-gemma-line-performance
status: draft
---

*Draft — work in progress. Tracked in PA workspace (`explore-google-gemma-line-performance`).*

Gemma 3 is Google's open-weight multimodal line (4B / 12B / 27B) — a strong candidate for a **local G3 agent**: vision + language in one stack, fine-tunable with QLoRA, runnable on modest GPU hardware.

## Why Gemma 3 for an agent?

Compared to API-only VLMs, Gemma 3 offers:

- **Open weights** — local inference, custom adapters, reproducible experiments
- **Multimodality** — SigLIP vision encoder + language model in one pipeline
- **Efficient attention** — Grouped-Query Attention (GQA), long context (up to 128K)
- **QLoRA-friendly** — 4-bit quantization + low-rank adapters fit consumer GPUs

Typical agent roles on G3:

| Role | Example |
|------|---------|
| Perception | Image → structured description, OCR, VQA |
| Reasoning | Plan next step from visual + text context |
| Tool grounding | Map observation to tool calls (with guardrails) |

## Architecture (sketch)

```
[ User: text / image / file ]
              │
              ▼
   Gemma 3 VLM (4B–27B)
   • SigLIP encodes image → tokens
   • Decoder with GQA + RoPE
              │
              ▼
   [ Agent loop ]
   system prompt → tool schema → response / action
              │
              ▼
   Optional: QLoRA adapter (domain-specific)
```

**Key design choice:** separate the **model** (Gemma 3) from the **agent loop** (tools, memory, critic). The model grounds observations; the loop enforces constraints — same principle as neurosymbolic pipelines elsewhere in VAIRL.

## Fine-tuning path (QLoRA)

From our CV course pipeline — minimal recipe for a specialized G3 agent:

1. **Base model:** `google/gemma-3-4b-pt` (or 12B if VRAM allows)
2. **Quantization:** 4-bit NF4 via BitsAndBytes (`load_in_4bit`, bfloat16 compute)
3. **LoRA:** rank 8–16 on attention projections (`q/k/v/o_proj`, `gate/up/down_proj`)
4. **Training:** SFTTrainer (TRL), small domain dataset in chat format
5. **Example domain:** LaTeX-OCR — image of equation → LaTeX code (demonstrates VLM + structured output)

This is not full RL agent training — it is **adapter SFT** for a narrower task inside a larger agent.

## Local vs cloud inference

| Mode | When to use | Notes |
|------|-------------|-------|
| Local 4B + QLoRA | Prototyping, privacy, fixed workload | ~16 GB VRAM with 4-bit |
| Local 12B/27B | Higher quality perception | Needs stronger GPU or quantization |
| Vertex / AI Studio API | Burst traffic, no hardware | Track in ModelWatch registry |

Before claiming performance numbers — verify on **your** hardware and log results in `models_registry.yaml` (repro: command, commit, latency, memory).

## ModelWatch checklist (from PA)

1. Model card on [ai.google.dev/gemma](https://ai.google.dev/gemma) — sizes, context, license
2. Benchmarks on public leaderboards (Open LLM Leaderboard, task-specific VLM benches)
3. Compare to previous Gemma generation and nearest open-weight peers
4. Update `cloud_foundation_models` / `local_models` in the agency registry
5. Short release note if a new generation ships

## Agent integration ideas

- **Agency analytics:** G3 as perception module before symbolic planning (PDDL pipeline)
- **Try-on / CV bots:** image understanding + prompt consistency (see AG-UI nudges in PA)
- **Course demos:** LaTeX-OCR, document VQA, captioning — each as a tool behind one agent

## Limits (state explicitly)

- Gemma Terms license — review before commercial redistribution
- No native video in Gemma 3 out of the box — use Qwen2.5-VL or API if video is required
- Tool use quality depends on prompt/schema design, not model size alone
- Hallucinated visual details — always verify with a critic or second pass

## Next steps

- [ ] Pick agent demo domain (OCR, VQA, or document QA)
- [ ] Run smoke test: `google/gemma-3-4b-pt` local inference
- [ ] Log latency/memory in ModelWatch registry
- [ ] Peer-review gate before publication
