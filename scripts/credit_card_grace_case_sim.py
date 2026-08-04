#!/usr/bin/env python3
"""Учебная симуляция грейса: СберКарта vs Т-Банк Платинум (кейс VAIRL).

Параметры — из публичных карточек Банки.ру (см. assets/data/...),
сведённые к упрощённой дневной модели. Не оферта и не расчёт банка.
"""

from __future__ import annotations

from dataclasses import dataclass, field
from enum import Enum
from typing import Callable


class OpKind(str, Enum):
    PURCHASE = "purchase"
    CASH = "cash"
    PAYMENT = "payment"


@dataclass
class CardModel:
    name: str
    label: str
    apr: float
    min_payment_rate: float
    min_payment_floor: float
    grace_days_fn: Callable[[int], int]
    cash_fee_rate: float
    cash_fee_fixed: float
    cycle_len: int = 30
    # день цикла, когда наступает платёжная дата (после закрытия выписки)
    payment_day_in_cycle: int = 25
    bt_grace_days: int = 0
    source: str = ""


def sber_grace_days(day_in_month: int) -> int:
    """С 1-го числа — до 120 дней: остаток месяца + 90 дней погашения."""
    return max(30 - day_in_month, 1) + 90


def tbank_grace_days(day_in_month: int) -> int:
    """До 55 дней: остаток расчётного периода + ~25 дней до платежа."""
    return max(30 - day_in_month, 1) + 25


SBER = CardModel(
    name="sber",
    label="Кредитная СберКарта",
    apr=0.498,
    min_payment_rate=0.10,
    min_payment_floor=0.0,
    grace_days_fn=sber_grace_days,
    cash_fee_rate=0.059,
    cash_fee_fixed=590.0,
    payment_day_in_cycle=0,  # у Сбера удобнее якорить min на 1-е / конец грейса — ниже отдельно
    bt_grace_days=0,
    source="https://www.banki.ru/products/creditcards/card/8481/",
)

TBANK = CardModel(
    name="tbank",
    label="Т-Банк Платинум",
    apr=0.299,
    min_payment_rate=0.08,
    min_payment_floor=600.0,
    grace_days_fn=tbank_grace_days,
    cash_fee_rate=0.049,
    cash_fee_fixed=490.0,
    payment_day_in_cycle=25,
    bt_grace_days=120,
    source="https://www.banki.ru/products/creditcards/card/675/",
)


@dataclass
class LedgerLine:
    day: int
    kind: OpKind
    amount: float
    note: str = ""


@dataclass
class Position:
    principal: float
    grace_end: int
    under_grace: bool = True
    tag: str = "purchase"


@dataclass
class SimState:
    day: int = 0
    positions: list[Position] = field(default_factory=list)
    interest_accrued: float = 0.0
    fees_paid: float = 0.0
    paid_total: float = 0.0


def daily_rate(apr: float) -> float:
    return apr / 365.0


def debt(state: SimState) -> float:
    return sum(p.principal for p in state.positions if p.principal > 0)


def accrue(state: SimState, card: CardModel) -> None:
    r = daily_rate(card.apr)
    for p in state.positions:
        if p.principal <= 0:
            continue
        if state.day > p.grace_end:
            p.under_grace = False
        if not p.under_grace:
            i = p.principal * r
            p.principal += i
            state.interest_accrued += i


def pay(state: SimState, amount: float) -> float:
    left = amount
    ordered = sorted(
        state.positions,
        key=lambda p: (p.under_grace, p.grace_end, -p.principal),
    )
    used = 0.0
    for p in ordered:
        if left <= 0:
            break
        take = min(p.principal, left)
        p.principal -= take
        left -= take
        used += take
    state.positions = [p for p in state.positions if p.principal > 0.01]
    state.paid_total += used
    return used


def add_purchase(state: SimState, card: CardModel, amount: float) -> None:
    d = state.day % card.cycle_len
    end = state.day + card.grace_days_fn(d) - 1
    state.positions.append(Position(amount, end, True, "purchase"))


def add_cash(state: SimState, card: CardModel, amount: float) -> None:
    fee = amount * card.cash_fee_rate + card.cash_fee_fixed
    state.fees_paid += fee
    state.positions.append(Position(amount + fee, state.day - 1, False, "cash"))


def min_due(state: SimState, card: CardModel) -> float:
    d = debt(state)
    if d <= 0:
        return 0.0
    return max(d * card.min_payment_rate, card.min_payment_floor)


def is_payment_day(card: CardModel, day: int) -> bool:
    return (day % card.cycle_len) == card.payment_day_in_cycle


def run(
    card: CardModel,
    ledger: list[LedgerLine],
    *,
    horizon: int,
    salary: float,
    payday_offset: int,
    start_cash: float,
    policy: str,
    collect_daily: bool = False,
) -> dict:
    """
    policy:
      - min_trap: только минималка в платёжные дни (грейс часто срывается)
      - grace_keeper: в платёжный день закрывать всё, что нужно для грейса + не меньше min
      - payday_clear: в зарплату гасить весь долг, насколько хватает денег
      - cash_then_min: снять наличные в начале, дальше min_trap
    """
    state = SimState()
    cash = start_cash
    by_day: dict[int, list[LedgerLine]] = {}
    for line in ledger:
        by_day.setdefault(line.day, []).append(line)

    paydays = {payday_offset + 30 * m for m in range(horizon // 30 + 2)}
    snapshots = []
    daily: list[dict] = []
    events: list[dict] = []
    markers: list[dict] = []  # вертикали на графике
    seen_marker_keys: set[tuple] = set()

    def add_marker(day: int, kind: str, label: str) -> None:
        key = (day, kind)
        if key in seen_marker_keys or day < 0 or day >= horizon:
            return
        seen_marker_keys.add(key)
        markers.append({"day": day, "kind": kind, "label": label})

    def add_event(day: int, kind: str, label: str, amount: float | None = None) -> None:
        ev = {"day": day, "kind": kind, "label": label}
        if amount is not None:
            ev["amount"] = round(amount, 2)
        events.append(ev)

    # календарные маркеры карты (выписка / платёжная дата)
    for d in range(horizon):
        if card.cycle_len and (d % card.cycle_len) == (card.cycle_len - 1):
            add_marker(d, "statement", "Закрытие выписки / конец расчётного периода")
        if is_payment_day(card, d):
            add_marker(d, "payment_due", "Платёжная дата (min / grace payment)")

    for day in range(horizon):
        state.day = day
        interest_before = state.interest_accrued
        fees_before = state.fees_paid
        debt_before = debt(state)

        # позиции, у которых сегодня истекает грейс
        for p in list(state.positions):
            if p.under_grace and day == p.grace_end:
                add_marker(day, "grace_end", "Конец грейса по корзине")
                add_event(
                    day,
                    "grace_end",
                    f"Грейс закончился (корзина {p.tag}), дальше капает APR",
                    p.principal,
                )

        accrue(state, card)
        interest_delta = state.interest_accrued - interest_before

        if interest_delta > 0.005:
            add_event(
                day,
                "interest",
                "Начисление процентов (долг вне грейса)",
                interest_delta,
            )

        if day in paydays:
            cash += salary
            add_event(day, "salary", "Зарплата на счёт", salary)

        day_ledger = by_day.get(day, [])
        for line in day_ledger:
            if line.kind == OpKind.PURCHASE:
                add_purchase(state, card, line.amount)
                add_event(day, "purchase", f"Покупка: {line.note or 'purchase'}", line.amount)
                # маркер конца грейса этой покупки
                pos = state.positions[-1]
                add_marker(pos.grace_end, "grace_end", "Конец грейса (покупка)")
            elif line.kind == OpKind.CASH:
                add_cash(state, card, line.amount)
                fee = state.fees_paid - fees_before
                add_event(day, "cash", "Снятие наличных (без грейса)", line.amount)
                if fee > 0:
                    add_event(day, "fee", "Комиссия за снятие", fee)
            elif line.kind == OpKind.PAYMENT:
                cash -= pay(state, line.amount)
                add_event(day, "payment", "Платёж по карте", line.amount)

        # агент / политика платежей
        payment = 0.0
        if policy == "min_trap" and is_payment_day(card, day):
            payment = min(min_due(state, card), cash)
        elif policy == "grace_keeper" and is_payment_day(card, day):
            need = 0.0
            for p in state.positions:
                if p.grace_end <= day + 5:
                    need += p.principal
            payment = min(max(need, min_due(state, card)), cash)
        elif policy == "payday_clear" and day in paydays:
            payment = min(debt(state), cash)
        elif policy == "cash_then_min":
            if day == 2 and not any(p.tag == "cash" for p in state.positions):
                add_cash(state, card, 40_000)
                add_event(day, "cash", "Снятие 40 000 (сценарий cash_then_min)", 40_000)
                fee = state.fees_paid - fees_before
                if fee > 0:
                    add_event(day, "fee", "Комиссия за снятие", fee)
            if is_payment_day(card, day):
                payment = min(min_due(state, card), cash)

        if payment > 0:
            paid = pay(state, payment)
            cash -= paid
            label = (
                "Минимальный платёж"
                if policy in ("min_trap", "cash_then_min")
                else "Платёж по политике"
            )
            if policy == "grace_keeper":
                label = "Платёж для удержания грейса"
            elif policy == "payday_clear":
                label = "Гашение в зарплату"
            add_event(day, "payment", label, paid)

        fee_delta = state.fees_paid - fees_before
        debt_after = debt(state)

        if day % 30 == 29 or day == horizon - 1:
            snapshots.append(
                {
                    "month": day // 30 + 1,
                    "day": day,
                    "debt": round(debt_after),
                    "interest": round(state.interest_accrued),
                    "fees": round(state.fees_paid),
                    "cash": round(cash),
                }
            )

        if collect_daily:
            under = sum(p.principal for p in state.positions if p.under_grace)
            over = sum(p.principal for p in state.positions if not p.under_grace)
            nearest = min((p.grace_end for p in state.positions if p.under_grace), default=None)
            day_evs = [e for e in events if e["day"] == day]
            daily.append(
                {
                    "day": day,
                    "debt": round(debt_after, 2),
                    "debt_under_grace": round(under, 2),
                    "debt_accruing": round(over, 2),
                    "interest_cum": round(state.interest_accrued, 2),
                    "fees_cum": round(state.fees_paid, 2),
                    "client_cost_cum": round(state.interest_accrued + state.fees_paid, 2),
                    "interest_delta": round(interest_delta, 2),
                    "fee_delta": round(fee_delta, 2),
                    "debt_delta": round(debt_after - debt_before, 2),
                    "cash": round(cash, 2),
                    "nearest_grace_end": nearest,
                    "days_to_grace_end": (nearest - day) if nearest is not None else None,
                    "events": [
                        {"kind": e["kind"], "label": e["label"], "amount": e.get("amount")}
                        for e in day_evs
                    ],
                }
            )

    out = {
        "card": card.name,
        "label": card.label,
        "policy": policy,
        "apr_model": card.apr,
        "final_debt": round(debt(state)),
        "interest": round(state.interest_accrued),
        "fees": round(state.fees_paid),
        "client_cost": round(state.interest_accrued + state.fees_paid),
        "paid_total": round(state.paid_total),
        "snapshots": snapshots,
        "source": card.source,
        "markers": sorted(markers, key=lambda m: (m["day"], m["kind"])),
        "events": events,
    }
    if collect_daily:
        out["daily"] = daily
    return out


def run_daily(card: CardModel, ledger: list[LedgerLine], **kwargs) -> dict:
    """То же, что run, но с дневным рядом для графиков."""
    return run(card, ledger, collect_daily=True, **kwargs)


def persona_spending() -> list[LedgerLine]:
    lines = [LedgerLine(3, OpKind.PURCHASE, 80_000, "мебель")]
    for m in range(6):
        b = m * 30
        lines.append(LedgerLine(b + 10, OpKind.PURCHASE, 25_000, "жизнь"))
        lines.append(LedgerLine(b + 20, OpKind.PURCHASE, 15_000, "жизнь"))
    return lines


def agent_rank(card: CardModel) -> list[dict]:
    ledger = persona_spending()
    common = dict(horizon=180, salary=120_000, payday_offset=5, start_cash=20_000)
    rows = []
    for policy in ("min_trap", "grace_keeper", "payday_clear", "cash_then_min"):
        rows.append(run(card, ledger, policy=policy, **common))
    rows.sort(key=lambda r: (r["client_cost"], r["final_debt"]))
    return rows


def refinance_bridge(amount: float, from_apr: float, bt_days: int = 120) -> dict:
    """Выгода BT, если на исходной карте уже капают %."""
    avoided = amount * daily_rate(from_apr) * bt_days
    return {
        "amount": amount,
        "bt_grace_days": bt_days,
        "approx_interest_avoided": round(avoided),
        "note": "если долг уже вне грейса на карте-источнике",
    }


def main() -> None:
    print("Sources:")
    print(" ", SBER.source)
    print(" ", TBANK.source)
    print()
    for card in (SBER, TBANK):
        print(f"=== {card.label} (apr model {card.apr:.1%}) ===")
        for row in agent_rank(card):
            print(
                f"  {row['policy']:14} cost={row['client_cost']:7} "
                f"interest={row['interest']:7} fees={row['fees']:6} "
                f"debt={row['final_debt']:8}"
            )
        print("  month curve (grace_keeper):")
        gk = next(r for r in agent_rank(card) if r["policy"] == "grace_keeper")
        for s in gk["snapshots"]:
            print(f"    m{s['month']}: debt={s['debt']} interest={s['interest']} cash={s['cash']}")
        print()

    print("BT what-if 150_000 @ Sber APR → T-Bank 120d:")
    print(" ", refinance_bridge(150_000, SBER.apr, TBANK.bt_grace_days))


if __name__ == "__main__":
    main()
