---
layout: post
title: "g3: Dialectical Autocoding and Adversarial Cooperation"
date: 2026-06-25
excerpt: "g3 is Block AI Research's reference implementation of dialectical autocoding — a coach/player agent loop that produces tested, requirements-compliant code beyond single-turn vibe coding."
lang: en
image: /assets/images/g3-dialectical-autocoding.svg
pa_source: "https://github.com/dhanji/g3"
status: draft
---

*Draft — work in progress. Based on [dhanji/g3](https://github.com/dhanji/g3) and Block AI Research paper.*

**g3** is not a model — it is a **Rust-based coding agent** and the reference implementation of **dialectical autocoding**: structured cooperation between two specialized agents (Player + Coach) inside bounded turn limits.

## Primary publication

| Resource | Link |
|----------|------|
| **Paper (Block AI Research, Dec 2025)** | [Adversarial Cooperation in Code Synthesis (PDF)](https://block.xyz/documents/adversarial-cooperation-in-code-synthesis.pdf) |
| **Reference implementation** | [github.com/dhanji/g3](https://github.com/dhanji/g3) |
| **Author** | [Dhananjay Nene (dhanji)](https://github.com/dhanji) |

The paper introduces **dialectical autocoding**: treating vibe-coding as a dialectical process — requirements, implementation, critique, refinement — but automating the human review role with a **Coach** agent.

## Core method: Coach / Player dyad

```
┌─────────────────────────────────────────────────┐
│  requirements.md  (shared, implementation-agnostic) │
└───────────────────────┬─────────────────────────┘
                        │
         ┌──────────────┴──────────────┐
         ▼                             ▼
   PLAYER agent                   COACH agent
   • implements code              • validates vs requirements
   • runs tests / shell           • finds gaps & edge cases
   • responds to feedback         • gives actionable critique
         │                             │
         └──────────► turn loop ◄──────┘
                    (bounded, ~10 turns)
                        │
                        ▼
              COACH APPROVED → done
```

**Bounded adversarial process:**

- **Turn limits** — finite coach/player exchanges (typically ~10)
- **Fresh context per turn** — new agent instance each role per turn → less context pollution
- **Shared requirements contract** — both agents start from the same goal document
- **Approval gate** — explicit Coach sign-off terminates successful runs
- **Discard player self-report** — Coach independently checks compliance (catches “I’m done!” with HTTPS bugs still open)

## How g3 differs from vibe coding / single-agent tools

| Aspect | Typical vibe coding | g3 (dialectical autocoding) |
|--------|-------------------|----------------------------|
| Review | Human must catch gaps | Coach agent reviews every turn |
| Context | One thread accumulates noise | Fresh instances + focused feedback |
| Success criteria | Open-ended | Requirements contract + Coach approval |
| Autonomy | ~5 min median turns, human present | Designed for 30–60 min unattended loops |
| Overconfidence | Player declares success early | Coach catches missing HTTPS, auth, metrics |
| Model use | One model per session | Natural rotation: different models per role/turn |

Paper case study: **Calculator API** — goose made partial progress; g3 completed requirements in a few turns **without stronger base model**, via adversarial design (Coach caught HTTPS enforcement, rounding mode, metrics gaps).

## Unique engineering solutions in g3 (implementation)

Beyond the paper’s paradigm, the Rust codebase adds:

### 1. Context window management
- **Context thinning** at 50/60/70/80% — large tool outputs → file references
- **Auto-compaction** at 80% capacity
- CLI: `/compact`, `/thinnify`, `/skinnify`, `/stats`

### 2. Modular Rust workspace
- `g3-core` — orchestration, tools, streaming parser
- `g3-providers` — Anthropic, Databricks, llama.cpp (Metal on macOS)
- `g3-execution` — planning, retries, progress
- `g3-computer-control` — mouse/keyboard, screenshots, OCR (for Coach evaluation)
- `g3-cli` — interactive + autonomous modes

### 3. Agent Skills ([agentskills.io](https://agentskills.io))
Portable `SKILL.md` packages — workspace `.g3/skills/`, global `~/.g3/skills/`, embedded skills in binary.

### 4. Syntax-aware code search
tree-sitter search across Rust, Python, JS/TS, Go, Java, C/C++.

### 5. Operating modes
- **Default: accumulative autonomous** — each user requirement triggers coach/player loop
- `--autonomous` — reads `requirements.md`
- `--planning` — requirements refinement + git commit workflow (`g3-plan/`)
- `--chat` — simple chat without autonomous loop

### 6. Honest local-model evaluation
README documents agentic benchmarks (comic repack task): dense local models vs MoE loops; cloud Opus/Gemini 3 Pro as baseline — rare transparency for coding agents.

## Empirical case studies (from paper)

| Case | Outcome | Links |
|------|---------|-------|
| Calculator API | g3 completes; goose partial | Paper § Empirical Results |
| Diff viewer (SwiftUI) | 4 coach/player turns; Claude Code/goose needed more human help | [swifty-diff](https://github.com/michaelneale/swifty-diff) |
| iOS goose client | Built from API spec; emulator control still weak | [goose-ios](https://github.com/dhanji/goose-ios) |
| Git TUI explorer | 5/5 completeness vs Cursor/Codex/OpenHands in paper table | Paper benchmark table |

## Related references

- [Terminal Bench 2.0 leaderboard](https://www.tbench.ai/leaderboard/terminal-bench/2.0) — multi-model agents on dev tasks
- [ACM: cost of context switching](https://dl.acm.org/doi/10.1145/1281700.1281702) — cited for human-in-the-loop overhead
- [OpenCode adversarial cooperation plugin](https://github.com/kishb87/opencode-adversarial-cooperation) — pattern ported to OpenCode
- Paper note: adversarial cooperation proposed as **goose** enhancement

## Connection to VAIRL / agency work

g3’s Coach/Player split rhymes with our neurosymbolic **critic loop** — implementation vs independent validation. Possible integrations:

- Coach as **PubLens / QA gate** before merge
- Player as tool-using coder; Coach as requirements + test oracle
- Parallel experiment clusters (paper: “nights and weekends problem”)

## Limits (state explicitly)

- Turn budget may be insufficient for very large tasks — failure mode is “task too complex for loop”, not necessarily “model incapable”
- iOS emulator automation weaker than desktop/web for Coach evaluation
- Local models still far behind top cloud models on complex agentic tasks
- Pattern replicable on other agents — g3 is one reference implementation, not the only way

## Next steps

- [ ] Reproduce minimal coach/player loop on a VAIRL-sized task
- [ ] Compare g3 vs single-agent on same `requirements.md`
- [ ] Link to agency peer-review gate (PubLens) as Coach analogue
