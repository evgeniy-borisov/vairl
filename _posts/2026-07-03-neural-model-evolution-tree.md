---
layout: post
title: "AI model evolution is a tree, not a timeline"
date: 2026-07-03 10:00:00 +0300
excerpt: "Neural network history branches and cross-pollinates—not a single line. Three Python visualizations: semicircular phylogeny, architectural influence graph, and time-ordered clusters."
lang: en
image: /assets/images/neural-model-evolution-tree.svg
---

The story “from Perceptron to GPT-4” is great for slides but **misleading**: ideas **branch**, **merge**, and get **reused**. ResNet informs ViT; LSTM leads to Transformer; DDPM leads to Stable Diffusion. That is closer to a **phylogenetic tree** than to one timeline.

This post gives a conceptual frame plus **three Python visualizations** (matplotlib, networkx, sklearn):

1. **Semicircular circular tree** of model families  
2. **Influence graph** — who borrowed architecture from whom  
3. **Feature clustering** with **clusters ordered by mean year**

[![Open In Colab](https://colab.research.google.com/assets/colab-badge.svg)](https://colab.research.google.com/github/evgeniy-borisov/vairl/blob/main/notebooks/nn-model-evolution-tree.ipynb)

Related: [NAS introduction](/vairl/blog/2026/01/15/neural-architecture-search/), [agent fundamentals](/vairl/blog/2026/07/02/agent-fundamentals-rag-mcp-landscape/), [hypothesis space / PaCMAP](/vairl/blog/2026/06/24/hypothesis-space-pacmap/).

---

## Why not a single line

| Linear narrative | Tree model |
|------------------|------------|
| One “main” branch of progress | Parallel families (CNN, RNN, Transformer, Diffusion) |
| Each model replaces the last | Models **coexist** (LSTM in production, CNN on edge) |
| Time is the only axis | Time + **idea kinship** + **component reuse** |

Biological evolution is not a chain from amoeba to human—it is a **tree** with extinct and parallel branches. Architectures behave similarly.

---

## 1. Semicircle phylogeny (circular tree)

Root at the bottom of the arc; families as internal nodes; leaves are models with release year. Angles span a semicircle (polar θ ∈ [0°, 180°]).

![Semicircular evolution tree](/assets/images/nn-evolution-semicircle-tree.png)

Layout: uniform leaf angles, family angle = mean of children, radius increases toward leaves. Standard phylogenetic **circular tree** style (cf. icytree), on a **semicircle** for wide layouts.

---

## 2. Architectural influence graph

Directed edges: `A → B` means B explicitly builds on an idea from A.

![Influence graph](/assets/images/nn-evolution-influence-graph.png)

X-axis ≈ year; color = family. Transformer acts as a hub (BERT, GPT, ViT, MoE, …).

---

## 3. Clustering + temporal ordering

Each model → feature vector (year, architecture flags, branch depth). Pipeline: scale → PCA → Ward clustering → sort clusters by **mean year**.

![Time-ordered clusters](/assets/images/nn-evolution-time-clusters.png)

Left: similarity geometry. Right: same clusters ordered left-to-right by time—linking **unsupervised structure** to **chronology**.

---

## Run the code

**[nn-model-evolution-tree.ipynb](https://colab.research.google.com/github/evgeniy-borisov/vairl/blob/main/notebooks/nn-model-evolution-tree.ipynb)**

Local:

```bash
pip install matplotlib networkx scikit-learn numpy
python notebooks/nn_model_evolution_viz.py
```

Outputs: `assets/images/nn-evolution-*.png`

---

## Summary

Model development is an **evolutionary tree with cross-borrowing**, not one line. One notebook, three complementary views: **phylogeny**, **borrow graph**, **time-ordered clusters**.
