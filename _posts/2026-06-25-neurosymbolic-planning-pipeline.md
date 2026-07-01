---
layout: post
title: "Neurosymbolic Planning: LLM/VLM → PDDL/STRIPS → Critic"
date: 2026-06-25
excerpt: "A pipeline where neural modules translate observations into symbols, a classical planner builds verifiable plans, and a critic closes the loop with the real world."
lang: en
image: /assets/images/neurosymbolic-planning-pipeline.svg
pa_nudge: pub-neurosymbolic-planning-pipeline
status: draft
---

*Draft — work in progress. Tracked in PA workspace (`pub-neurosymbolic-planning-pipeline`).*

Modern agents often plan in free-form natural language. That is flexible, but hard to verify. This post outlines a neurosymbolic architecture where a neural module extracts predicates and goals, a classical planner produces a checkable action sequence, and a critic replans when the world diverges from expectations.

## Motivation

Pure LLM planning struggles with:

- Hallucinated preconditions and actions
- No guarantee of logical consistency
- Weak feedback when execution fails

Neurosymbolic pipelines separate **perception/grounding** (neural) from **reasoning over constraints** (symbolic). The planner enforces what is physically and logically possible; the neural part only proposes structured state descriptions.

## Architecture

```
[ Real world / Text / Task ]
              │
              ▼
   1. NEURAL MODULE (LLM / VLM)
   • Extract world-state predicates
   • Formulate the goal
              │
              ▼
   [ Symbolic representation ]
   (objects, predicates, init, goal)
              │
              ▼
   2. SYMBOLIC ENGINE (PDDL / STRIPS)
   • Enforce physical and logical constraints
   • Build a mathematically precise plan
              │
              ▼
   3. CRITIC / NEURAL HEURISTIC
   • Score cost and feasibility
   • Replan on failure or world mismatch
              │
              ▼
     [ Action plan ]
```

**Key idea:** the neural network does not “plan in prose.” It translates observations into symbols. The planner returns a verifiable sequence; the critic closes the loop with reality.

## Demo domain (TBD)

One concrete domain will anchor the post — e.g. tabletop robotics, office assistant, or Blocks World. The domain fixes the predicate vocabulary and action set.

Planned deliverables:

1. Predicate schema and goal format — explicit contract between neural module and planner
2. Minimal `domain.pddl` + `problem.pddl` with a 3–5 step plan
3. Critic loop: when to replan vs. re-extract predicates (failed precondition, timeout, VLM mismatch)

## Claims and limits

We will state clearly where neurosymbolic planning wins over pure LLM planning — and where it breaks (hallucinated predicates, scale, partial observability).

## Connection to multi-agent analytics

This pipeline is a conceptual backbone for a multi-disciplinary analytics agency: specialists as agents, symbolic constraints as governance, critics as quality gates. Optional follow-up: mapping solver output onto behavior trees as an execution layer.

## Next steps

- [ ] Choose demo domain
- [ ] Fix predicate schema
- [ ] Run peer-review gate before publication (PubLens)
