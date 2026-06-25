---
layout: post
title: "Agent Evolution as a Tree — Mapping to Behavior Trees"
date: 2026-06-22
excerpt: "Visualizing the evolution of agent capabilities — from simple reactions to planning and multi-agent coordination — and mapping stages onto behavior tree node types."
lang: en
pa_nudge: agent-evolution-behavior-tree-patreon
status: draft
---

*Draft — work in progress. Extended version planned for Patreon subscribers. Tracked in PA workspace (`agent-evolution-behavior-tree-patreon`).*

AI agents are not born fully capable. Capabilities accumulate: reflexes, tool use, planning, delegation, multi-agent coordination. This post sketches how to represent that progression as an **evolution tree** and map it onto **behavior trees** (BT) — the same structures used in game AI and agent orchestration.

## Evolution tree (draft levels)

Planned levels from simple to complex:

1. **Reactive** — stimulus → action, no memory
2. **Stateful** — conditions depend on internal state
3. **Tool-using** — external APIs and instruments
4. **Planning** — explicit goals and multi-step sequences
5. **Multi-agent** — coordination, roles, shared context

Final semantics are still being fixed — this is the semantic backbone of the post.

## Behavior tree mapping

Classic BT nodes:

- **Sequence** — run children in order until one fails
- **Selector** — try children until one succeeds
- **Condition** — check a predicate
- **Action** — execute a step

Proposed mapping (TBD):

| Evolution stage | BT node type | Rationale |
|-----------------|--------------|-----------|
| Tool chain | Sequence | Ordered tool calls |
| Strategy choice | Selector | Pick among policies |
| Preconditions | Condition | Gate before action |
| Atomic step | Action | Leaf execution |

A legend on the diagram will make the mapping explicit.

## Why behavior trees?

BTs are interpretable, composable, and widely used in production agent stacks. Overlaying an evolution narrative onto BT structure helps practitioners see where their system sits — and what the next transition might require.

## Deliverables

- Mermaid or SVG diagram: evolution tree + parallel BT skeleton
- Public blog post (this draft) — overview and motivation
- Patreon release — full diagram, extended examples, export assets

## Next steps

- [ ] Fix evolution tree levels
- [ ] Agree BT mapping rules
- [ ] Generate Mermaid draft
- [ ] Patreon setup (tier, cover, subscriber text)
