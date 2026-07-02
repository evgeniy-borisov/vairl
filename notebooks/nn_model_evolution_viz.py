#!/usr/bin/env python3
"""Generate three figures for the NN evolution tree article."""
from __future__ import annotations

import math
from collections import defaultdict
from dataclasses import dataclass
from pathlib import Path

import matplotlib.pyplot as plt
import networkx as nx
import numpy as np
from sklearn.cluster import AgglomerativeClustering
from sklearn.decomposition import PCA
from sklearn.preprocessing import StandardScaler

ROOT = Path(__file__).resolve().parents[1] if "__file__" in dir() else Path(".")
OUT = Path(__import__("os").environ.get("NN_EVOLUTION_OUT", str(ROOT / "assets" / "images")))
OUT.mkdir(parents=True, exist_ok=True)

# --- Curated taxonomy (year = first influential release) ---

@dataclass(frozen=True)
class Model:
    name: str
    year: int
    family: str  # root branch label


MODELS: list[Model] = [
    Model("Perceptron", 1957, "Foundations"),
    Model("ADALINE", 1960, "Foundations"),
    Model("MLP + backprop", 1986, "Foundations"),
    Model("LeNet", 1998, "Convolutional"),
    Model("AlexNet", 2012, "Convolutional"),
    Model("VGG", 2014, "Convolutional"),
    Model("ResNet", 2015, "Convolutional"),
    Model("DenseNet", 2017, "Convolutional"),
    Model("EfficientNet", 2019, "Convolutional"),
    Model("RNN", 1986, "Sequence"),
    Model("LSTM", 1997, "Sequence"),
    Model("GRU", 2014, "Sequence"),
    Model("Seq2Seq + attention", 2014, "Sequence"),
    Model("Transformer", 2017, "Attention"),
    Model("BERT", 2018, "Attention"),
    Model("GPT-1", 2018, "Generative LM"),
    Model("GPT-2", 2019, "Generative LM"),
    Model("GPT-3", 2020, "Generative LM"),
    Model("T5", 2019, "Generative LM"),
    Model("ViT", 2020, "Vision Transformer"),
    Model("CLIP", 2021, "Multimodal"),
    Model("Diffusion (DDPM)", 2020, "Diffusion"),
    Model("Stable Diffusion", 2022, "Diffusion"),
    Model("MoE (Switch)", 2021, "Scale & MoE"),
    Model("Chinchilla", 2022, "Scale & MoE"),
    Model("LLaMA", 2023, "Open weights"),
    Model("Mixtral", 2023, "Scale & MoE"),
]

# Tree: family -> list of model names (temporal order within branch)
TREE: dict[str, list[str]] = defaultdict(list)
for m in sorted(MODELS, key=lambda x: (x.family, x.year)):
    TREE[m.family].append(m.name)

NAME_TO_MODEL = {m.name: m for m in MODELS}

# Architectural influence edges (directed)
INFLUENCE: list[tuple[str, str, str]] = [
    ("Perceptron", "MLP + backprop", "layer stacking"),
    ("MLP + backprop", "LeNet", "conv layers"),
    ("LeNet", "AlexNet", "deep CNN + GPU"),
    ("AlexNet", "VGG", "deeper stacks"),
    ("AlexNet", "ResNet", "deeper training"),
    ("ResNet", "DenseNet", "skip connections"),
    ("ResNet", "EfficientNet", "compound scaling"),
    ("RNN", "LSTM", "gating"),
    ("LSTM", "GRU", "simplified gates"),
    ("LSTM", "Seq2Seq + attention", "encoder-decoder"),
    ("Seq2Seq + attention", "Transformer", "pure attention"),
    ("Transformer", "BERT", "bidirectional MLM"),
    ("Transformer", "GPT-1", "decoder-only LM"),
    ("GPT-1", "GPT-2", "scale + zero-shot"),
    ("GPT-2", "GPT-3", "in-context learning"),
    ("Transformer", "T5", "text-to-text"),
    ("Transformer", "ViT", "patch tokens"),
    ("ViT", "CLIP", "image-text contrastive"),
    ("ResNet", "ViT", "residual ideas"),
    ("MLP + backprop", "Diffusion (DDPM)", "score matching lineage"),
    ("Diffusion (DDPM)", "Stable Diffusion", "latent diffusion"),
    ("Transformer", "MoE (Switch)", "sparse FFN"),
    ("MoE (Switch)", "Mixtral", "expert routing"),
    ("GPT-3", "Chinchilla", "compute-optimal scaling"),
    ("Chinchilla", "LLaMA", "open scaling laws"),
    ("LLaMA", "Mixtral", "MoE at scale"),
]


def _style_axes(ax, title: str):
    ax.set_title(title, fontsize=14, fontweight="bold", pad=12)
    for spine in ax.spines.values():
        spine.set_visible(False)
    ax.set_xticks([])
    ax.set_yticks([])


# --- 1. Semicircular evolution tree ---

def plot_semicircle_tree(path: Path):
    families = list(TREE.keys())
    n_leaves = sum(len(v) for v in TREE.values())

    # Assign angles to leaves along semicircle [0.08*pi, 0.92*pi]
    leaf_angles: dict[str, float] = {}
    idx = 0
    for fam in families:
        for name in TREE[fam]:
            t = (idx + 0.5) / n_leaves
            leaf_angles[name] = math.pi * (0.08 + 0.84 * t)
            idx += 1

    family_angles = {
        fam: float(np.mean([leaf_angles[n] for n in names]))
        for fam, names in TREE.items()
    }
    root_angle = math.pi / 2

    fig, ax = plt.subplots(figsize=(14, 8), subplot_kw={"projection": "polar"})
    ax.set_theta_zero_location("E")
    ax.set_theta_direction(-1)
    ax.set_thetamin(0)
    ax.set_thetamax(180)
    ax.set_ylim(0, 1.05)
    ax.set_yticks([])
    ax.set_xticks([])

    cmap = plt.colormaps["tab10"].resampled(len(families))
    fam_color = {fam: cmap(i) for i, fam in enumerate(families)}

    # Root
    ax.scatter([root_angle], [0.0], s=120, c=["#333"], zorder=5)
    ax.text(root_angle, -0.06, "Neural architectures", ha="center", va="top", fontsize=11, fontweight="bold")

    for fi, fam in enumerate(families):
        fa = family_angles[fam]
        color = fam_color[fam]
        ax.plot([root_angle, fa], [0.0, 0.35], color=color, lw=2.2, alpha=0.85, zorder=2)
        ax.scatter([fa], [0.35], s=60, c=[color], zorder=4)
        ax.text(fa, 0.40, fam, ha="center", va="bottom", fontsize=9, fontweight="bold", color=color)

        for name in TREE[fam]:
            la = leaf_angles[name]
            m = NAME_TO_MODEL[name]
            ax.plot([fa, la], [0.35, 0.72], color=color, lw=1.2, alpha=0.7, zorder=1)
            ax.scatter([la], [0.82], s=45, c=[color], edgecolors="white", linewidths=0.6, zorder=4)
            ax.text(
                la,
                0.90,
                f"{name}\n({m.year})",
                ha="center",
                va="center",
                fontsize=6.5,
                rotation=math.degrees(la - math.pi / 2) * 0.35,
            )

    ax.set_title("Semicircular phylogeny of neural model families", fontsize=15, fontweight="bold", pad=24)
    fig.savefig(path, dpi=160, bbox_inches="tight", facecolor="white")
    plt.close(fig)


# --- 2. Influence graph ---

def plot_influence_graph(path: Path):
    G = nx.DiGraph()
    for src, dst, label in INFLUENCE:
        G.add_edge(src, dst, label=label)

    # Layer by approximate year (longest path layering + year)
    year = {n: NAME_TO_MODEL[n].year for n in G.nodes}
    for n in G.nodes:
        G.nodes[n]["year"] = year[n]
        G.nodes[n]["family"] = NAME_TO_MODEL[n].family

    pos = {}
    layers: dict[int, list[str]] = defaultdict(list)
    for n in sorted(G.nodes, key=lambda x: year[x]):
        layers[year[n]].append(n)

    xs = sorted(layers.keys())
    xmin, xmax = min(xs), max(xs)
    for yv, nodes in layers.items():
        nodes = sorted(nodes, key=lambda n: G.in_degree(n))
        x = 0.05 + 0.9 * (yv - xmin) / max(1, xmax - xmin)
        for i, n in enumerate(nodes):
            pos[n] = (x, (i + 1) / (len(nodes) + 1))

    fig, ax = plt.subplots(figsize=(16, 10))
    families = sorted({NAME_TO_MODEL[n].family for n in G.nodes})
    cmap = plt.colormaps["tab10"].resampled(len(families))
    fcolor = {f: cmap(i) for i, f in enumerate(families)}

    nx.draw_networkx_nodes(
        G,
        pos,
        node_color=[fcolor[G.nodes[n]["family"]] for n in G.nodes],
        node_size=900,
        alpha=0.92,
        ax=ax,
    )
    nx.draw_networkx_labels(G, pos, font_size=7, font_weight="bold", ax=ax)

    edges = list(G.edges())
    for u, v in edges:
        x1, y1 = pos[u]
        x2, y2 = pos[v]
        ax.annotate(
            "",
            xy=(x2, y2),
            xytext=(x1, y1),
            arrowprops=dict(arrowstyle="-|>", color="#666", lw=1.1, shrinkA=12, shrinkB=12, alpha=0.65),
        )

    # Sample edge labels (avoid clutter)
    for u, v, d in G.edges(data=True):
        if d["label"] in {"pure attention", "decoder-only LM", "skip connections", "latent diffusion", "MoE at scale"}:
            x1, y1 = pos[u]
            x2, y2 = pos[v]
            ax.text((x1 + x2) / 2, (y1 + y2) / 2, d["label"], fontsize=6, color="#444", ha="center")

    ax.text(0.02, 0.02, "x-axis ≈ time  |  arrows = architectural borrowing", transform=ax.transAxes, fontsize=9, color="#666")
    _style_axes(ax, "Graph of architectural influence between models")
    fig.savefig(path, dpi=160, bbox_inches="tight", facecolor="white")
    plt.close(fig)


# --- 3. Clustering + temporal ordering of clusters ---

FEATURE_NAMES = ["year", "is_cnn", "is_seq", "is_attn", "is_gen", "is_diff", "is_moe", "is_vit", "depth_proxy"]


def _features(m: Model) -> np.ndarray:
    n = m.name.lower()
    return np.array(
        [
            m.year,
            1.0 if m.family == "Convolutional" or "lenet" in n else 0.0,
            1.0 if m.family == "Sequence" else 0.0,
            1.0 if "transformer" in n or m.family == "Attention" else 0.0,
            1.0 if "gpt" in n or m.family == "Generative LM" else 0.0,
            1.0 if "diffusion" in n.lower() else 0.0,
            1.0 if "moe" in n.lower() or "mixtral" in n.lower() or "switch" in n.lower() else 0.0,
            1.0 if "vit" in n.lower() or "clip" in n.lower() else 0.0,
            float(list(TREE[m.family]).index(m.name) + 1),
        ],
        dtype=float,
    )


def plot_time_ordered_clusters(path: Path, n_clusters: int = 5):
    names = [m.name for m in MODELS]
    X = np.vstack([_features(m) for m in MODELS])
    Xs = StandardScaler().fit_transform(X)

    pca = PCA(n_components=2, random_state=0)
    Z = pca.fit_transform(Xs)

    cl = AgglomerativeClustering(n_clusters=n_clusters, linkage="ward")
    labels = cl.fit_predict(Xs)

    cluster_years = {}
    for c in range(n_clusters):
        yrs = [MODELS[i].year for i, lb in enumerate(labels) if lb == c]
        cluster_years[c] = float(np.mean(yrs))

    order = sorted(range(n_clusters), key=lambda c: cluster_years[c])
    rank = {c: i for i, c in enumerate(order)}

    fig, axes = plt.subplots(1, 2, figsize=(15, 6))

    # Left: raw PCA colored by cluster
    ax = axes[0]
    cmap = plt.colormaps["Set2"].resampled(n_clusters)
    for i, m in enumerate(MODELS):
        c = labels[i]
        ax.scatter(Z[i, 0], Z[i, 1], s=80, c=[cmap(c)], edgecolors="#333", linewidths=0.4, zorder=3)
        ax.annotate(m.name, (Z[i, 0], Z[i, 1]), fontsize=6, xytext=(4, 4), textcoords="offset points")
    ax.set_xlabel(f"PC1 ({pca.explained_variance_ratio_[0]:.0%} var)")
    ax.set_ylabel(f"PC2 ({pca.explained_variance_ratio_[1]:.0%} var)")
    _style_axes(ax, "PCA projection + clustering")

    # Right: clusters ordered by mean year (time axis)
    ax = axes[1]
    jitter = 0.08
    rng = np.random.default_rng(0)
    for i, m in enumerate(MODELS):
        c = labels[i]
        x = rank[c] + rng.uniform(-jitter, jitter)
        y = m.year
        ax.scatter(x, y, s=90, c=[cmap(c)], edgecolors="#333", linewidths=0.4, zorder=3)
        ax.annotate(m.name, (x, y), fontsize=6, ha="center", va="bottom")

    for c in order:
        x = rank[c]
        ax.axvspan(x - 0.45, x + 0.45, color=cmap(c), alpha=0.12, zorder=0)
        ax.text(x, 1955, f"C{rank[c]+1}\nμ={int(cluster_years[c])}", ha="center", va="bottom", fontsize=8, fontweight="bold")

    ax.set_xlabel("Clusters ordered by mean year →")
    ax.set_ylabel("Release year")
    ax.set_xlim(-0.6, n_clusters - 0.4)
    ax.set_ylim(1952, 2026)
    ax.grid(axis="y", alpha=0.25)
    _style_axes(ax, "Temporal ordering of clusters")

    fig.suptitle("Architecture feature clustering with time-ordered cluster axis", fontsize=14, fontweight="bold", y=1.02)
    fig.savefig(path, dpi=160, bbox_inches="tight", facecolor="white")
    plt.close(fig)


def main():
    plt.rcParams.update({"font.family": "sans-serif", "figure.facecolor": "white"})
    plot_semicircle_tree(OUT / "nn-evolution-semicircle-tree.png")
    plot_influence_graph(OUT / "nn-evolution-influence-graph.png")
    plot_time_ordered_clusters(OUT / "nn-evolution-time-clusters.png")
    print("Saved to", OUT)


if __name__ == "__main__":
    main()
