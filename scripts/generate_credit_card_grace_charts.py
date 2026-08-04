#!/usr/bin/env python3
"""SVG time-series charts for credit-card grace case (Jekyll-friendly vector)."""

from __future__ import annotations

import sys
from pathlib import Path

import matplotlib

matplotlib.use("Agg")
import matplotlib.pyplot as plt
from matplotlib import font_manager
from matplotlib.ticker import FuncFormatter

# Cyrillic-capable font for SVG labels (macOS / Linux)
for _font in (
    "/System/Library/Fonts/Supplemental/Arial Unicode.ttf",
    "/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf",
):
    if Path(_font).exists():
        font_manager.fontManager.addfont(_font)
        plt.rcParams["font.family"] = font_manager.FontProperties(fname=_font).get_name()
        break
plt.rcParams["axes.unicode_minus"] = False

ROOT = Path(__file__).resolve().parents[1]
sys.path.insert(0, str(ROOT / "scripts"))

from credit_card_grace_case_sim import (  # noqa: E402
    SBER,
    TBANK,
    persona_spending,
    run_daily,
)

OUT = ROOT / "assets" / "images"
COMMON = dict(horizon=180, salary=120_000, payday_offset=5, start_cash=20_000)

POLICY_STYLE = {
    "payday_clear": {"color": "#2e7d32", "label": "payday_clear", "lw": 2.4},
    "grace_keeper": {"color": "#1565c0", "label": "grace_keeper", "lw": 2.0},
    "min_trap": {"color": "#c62828", "label": "min_trap", "lw": 2.2},
    "cash_then_min": {"color": "#ef6c00", "label": "cash_then_min", "lw": 1.8, "ls": "--"},
}


def rub_fmt(x, _pos=None):
    if abs(x) >= 1000:
        return f"{x/1000:.0f}k"
    return f"{x:.0f}"


def style_ax(ax, title: str, ylabel: str):
    ax.set_title(title, fontsize=13, pad=10, color="#1b2838")
    ax.set_xlabel("День симуляции", fontsize=10)
    ax.set_ylabel(ylabel, fontsize=10)
    ax.yaxis.set_major_formatter(FuncFormatter(rub_fmt))
    ax.grid(True, alpha=0.25, linewidth=0.8)
    ax.spines["top"].set_visible(False)
    ax.spines["right"].set_visible(False)
    ax.set_xlim(0, COMMON["horizon"] - 1)


def series_for(card, policy: str):
    return run_daily(card, persona_spending(), policy=policy, **COMMON)["daily"]


def chart_debt_policies(card, out: Path):
    fig, ax = plt.subplots(figsize=(11, 5.2), dpi=120)
    for policy, st in POLICY_STYLE.items():
        daily = series_for(card, policy)
        ax.plot(
            [d["day"] for d in daily],
            [d["debt"] for d in daily],
            color=st["color"],
            label=st["label"],
            linewidth=st["lw"],
            linestyle=st.get("ls", "-"),
        )
    style_ax(ax, f"Долг во времени — {card.label}", "Долг, руб.")
    ax.legend(frameon=False, fontsize=9, ncol=2)
    fig.tight_layout()
    fig.savefig(out, format="svg", bbox_inches="tight")
    plt.close(fig)
    print("wrote", out)


def chart_cost_cum(card, out: Path):
    fig, ax = plt.subplots(figsize=(11, 5.2), dpi=120)
    for policy, st in POLICY_STYLE.items():
        daily = series_for(card, policy)
        ax.plot(
            [d["day"] for d in daily],
            [d["client_cost_cum"] for d in daily],
            color=st["color"],
            label=st["label"],
            linewidth=st["lw"],
            linestyle=st.get("ls", "-"),
        )
    style_ax(ax, f"Накопленный client cost (%% + fees) — {card.label}", "Cost, руб.")
    ax.legend(frameon=False, fontsize=9, ncol=2)
    fig.tight_layout()
    fig.savefig(out, format="svg", bbox_inches="tight")
    plt.close(fig)
    print("wrote", out)


def chart_grace_split(card, policy: str, out: Path):
    daily = series_for(card, policy)
    days = [d["day"] for d in daily]
    fig, ax = plt.subplots(figsize=(11, 5.2), dpi=120)
    ax.fill_between(
        days,
        [d["debt_under_grace"] for d in daily],
        color="#66bb6a",
        alpha=0.55,
        label="под грейсом",
    )
    ax.fill_between(
        days,
        [d["debt_under_grace"] for d in daily],
        [d["debt_under_grace"] + d["debt_accruing"] for d in daily],
        color="#ef5350",
        alpha=0.65,
        label="уже капают %",
    )
    style_ax(ax, f"Структура долга — {card.label} / {policy}", "руб.")
    ax.legend(frameon=False, fontsize=9)
    fig.tight_layout()
    fig.savefig(out, format="svg", bbox_inches="tight")
    plt.close(fig)
    print("wrote", out)


def chart_banks_min_trap(out: Path):
    fig, axes = plt.subplots(1, 2, figsize=(12, 4.8), dpi=120, sharey=True)
    for ax, card in zip(axes, (SBER, TBANK)):
        for metric, color, label in (
            ("debt", "#455a64", "долг"),
            ("client_cost_cum", "#c62828", "cost %%+fees"),
        ):
            daily = series_for(card, "min_trap")
            ax.plot(
                [d["day"] for d in daily],
                [d[metric] for d in daily],
                color=color,
                label=label,
                linewidth=2.0,
            )
        style_ax(ax, f"min_trap — {card.label}", "руб.")
        ax.legend(frameon=False, fontsize=9)
    fig.suptitle("Один ledger, два календаря грейса: политика «только минималка»", fontsize=13, y=1.02)
    fig.tight_layout()
    fig.savefig(out, format="svg", bbox_inches="tight")
    plt.close(fig)
    print("wrote", out)


POLICY_NARRATIVES = {
    "min_trap": {
        "title": "Только минималка",
        "summary": (
            "В платёжные дни агент вносит лишь минимальный платёж. "
            "Грейс по покупкам срывается: долг остаётся, и после grace_end каждый день капает APR. "
            "Это ловушка «всё в порядке, просрочки нет» — штрафа нет, но проценты уже идут."
        ),
        "what_happens": [
            "Выписка закрывается — фиксируется задолженность периода",
            "В платёжную дату уходит только min payment",
            "Корзины покупок доживают до конца грейса и начинают начислять %",
            "Client cost растёт за счёт процентов, долг почти не гасится",
        ],
    },
    "grace_keeper": {
        "title": "Удержать грейс",
        "summary": (
            "К платёжной дате агент закрывает корзины с близким grace_end "
            "(и не меньше минимума). Цель — не дать долгу выйти в зону APR, "
            "насколько хватает кэша."
        ),
        "what_happens": [
            "Следит за ближайшими концами грейса",
            "В платёжную дату доплачивает сумму «под угрозой %»",
            "Новые траты снова получают свой грейс",
            "Cost почти нулевой, если денег хватает на закрытие корзин",
        ],
    },
    "payday_clear": {
        "title": "Гашение в зарплату",
        "summary": (
            "В день зарплаты агент направляет свободный кэш на полное гашение долга. "
            "Между зарплатами может копить траты, но проценты обычно не успевают развернуться."
        ),
        "what_happens": [
            "5-е число каждого цикла — приход зарплаты",
            "Сразу после — попытка обнулить долг",
            "Грейс часто не доживает до срыва, потому что долг короткоживущий",
            "Лучший client cost в учебной модели (≈ 0)",
        ],
    },
    "cash_then_min": {
        "title": "Наличные + минималка",
        "summary": (
            "В начале снимает 40 000 ₽ наличными (комиссия + % с дня 0, без грейса), "
            "дальше ведёт себя как min_trap. Худший сценарий для клиента."
        ),
        "what_happens": [
            "День 2: cash advance → fee сразу",
            "На сумму снятия APR капает с первого дня",
            "Покупки живут по обычному грейсу, но минималка его не спасает",
            "Client cost = комиссии + проценты — максимум среди политик",
        ],
    },
}

CARD_NARRATIVES = {
    "sber": {
        "title": "Кредитная СберКарта",
        "summary": (
            "Длинный грейс: остаток месяца покупок + ~90 дней. "
            "Выписка/цикл — календарный месяц; платёжная дата в модели — 1-е число цикла. "
            "APR модели 49.8%. Больше «воздуха» до первого процента, но min_trap всё равно дорогой."
        ),
    },
    "tbank": {
        "title": "Т-Банк Платинум",
        "summary": (
            "Короткий грейс на покупки: остаток расчётного периода + ~25 дней до платежа (до ~55). "
            "Платёжная дата в модели — 25-й день цикла. APR 29.9%. "
            "Проценты при min_trap стартуют раньше, чем у Сбера, при тех же тратах."
        ),
    },
}


def series_bundle(card, policy: str):
    return run_daily(card, persona_spending(), policy=policy, **COMMON)


def export_series_json(out: Path) -> None:
    """Данные для p5.js-демо: дневные ряды, маркеры, события, нарративы."""
    payload = {
        "horizon": COMMON["horizon"],
        "persona": {
            "salary": COMMON["salary"],
            "payday_offset": COMMON["payday_offset"],
            "start_cash": COMMON["start_cash"],
        },
        "policies": list(POLICY_STYLE.keys()),
        "policy_narratives": POLICY_NARRATIVES,
        "card_narratives": CARD_NARRATIVES,
        "marker_legend": {
            "statement": "Закрытие выписки / конец расчётного периода",
            "payment_due": "Платёжная дата",
            "grace_end": "Конец грейса по корзине",
        },
        "cards": {},
    }
    for card in (SBER, TBANK):
        card_block = {
            "name": card.name,
            "label": card.label,
            "apr": card.apr,
            "cycle_len": card.cycle_len,
            "payment_day_in_cycle": card.payment_day_in_cycle,
            "series": {},
            "markers": {},
        }
        for policy in POLICY_STYLE:
            bundle = series_bundle(card, policy)
            card_block["series"][policy] = [
                {
                    "d": row["day"],
                    "debt": row["debt"],
                    "under": row["debt_under_grace"],
                    "accr": row["debt_accruing"],
                    "cost": row["client_cost_cum"],
                    "cash": row["cash"],
                    "gleft": row["days_to_grace_end"],
                    "idlt": row.get("interest_delta", 0),
                    "fdlt": row.get("fee_delta", 0),
                    "ddlt": row.get("debt_delta", 0),
                    "ev": [
                        {
                            "k": e["kind"],
                            "l": e["label"],
                            **({"a": e["amount"]} if e.get("amount") is not None else {}),
                        }
                        for e in row.get("events", [])
                    ],
                }
                for row in bundle["daily"]
            ]
            card_block["markers"][policy] = bundle.get("markers", [])
            # итог для описания
            card_block.setdefault("outcomes", {})[policy] = {
                "client_cost": bundle["client_cost"],
                "final_debt": bundle["final_debt"],
                "interest": bundle["interest"],
                "fees": bundle["fees"],
            }
        payload["cards"][card.name] = card_block
    out.parent.mkdir(parents=True, exist_ok=True)
    out.write_text(
        __import__("json").dumps(payload, ensure_ascii=False, separators=(",", ":")),
        encoding="utf-8",
    )
    print("wrote", out, "bytes", out.stat().st_size)


def main() -> None:
    OUT.mkdir(parents=True, exist_ok=True)
    chart_debt_policies(SBER, OUT / "credit-card-grace-debt-sber.svg")
    chart_debt_policies(TBANK, OUT / "credit-card-grace-debt-tbank.svg")
    chart_cost_cum(SBER, OUT / "credit-card-grace-cost-sber.svg")
    chart_cost_cum(TBANK, OUT / "credit-card-grace-cost-tbank.svg")
    chart_grace_split(SBER, "min_trap", OUT / "credit-card-grace-split-sber-min.svg")
    chart_grace_split(TBANK, "min_trap", OUT / "credit-card-grace-split-tbank-min.svg")
    chart_banks_min_trap(OUT / "credit-card-grace-min-trap-compare.svg")
    export_series_json(ROOT / "assets" / "data" / "credit-card-grace-series.json")


if __name__ == "__main__":
    main()
