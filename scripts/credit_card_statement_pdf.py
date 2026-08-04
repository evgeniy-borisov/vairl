#!/usr/bin/env python3
"""Синтетические PDF-выписки кредитки + парсер для Ledger Agent (кейс VAIRL).

Формат выписки учебный (не копия банка): фиксированные маркеры, которые
агент ищет regex'ами. Генерация — PyMuPDF, разбор текста — pypdf.
"""

from __future__ import annotations

import argparse
import json
import re
import sys
from dataclasses import asdict, dataclass
from datetime import date, timedelta
from pathlib import Path

import fitz  # PyMuPDF
from pypdf import PdfReader

ROOT = Path(__file__).resolve().parents[1]
OUT_DIR = ROOT / "assets" / "data" / "credit-card-statements"
CYR_FONT = Path("/System/Library/Fonts/Supplemental/Arial Unicode.ttf")
# fallbacks for Linux CI / other hosts
for _candidate in (
    CYR_FONT,
    Path("/usr/share/fonts/truetype/dejavu/DejaVuSansMono.ttf"),
    Path("/usr/share/fonts/truetype/dejavu/DejaVuSans.ttf"),
):
    if _candidate.exists():
        CYR_FONT = _candidate
        break
else:
    CYR_FONT = None

# Маркеры для парсера (стабильный контракт Ledger Agent)
HDR_BANK = "BANK:"
HDR_CARD = "CARD:"
HDR_PERIOD = "STATEMENT_PERIOD:"
HDR_PAYMENT_DUE = "PAYMENT_DUE:"
HDR_GRACE_PAY = "GRACE_PAYMENT:"
HDR_MIN_PAY = "MIN_PAYMENT:"
HDR_APR = "APR_PURCHASES:"
SECTION_OPS = "=== OPERATIONS ==="
SECTION_END = "=== END ==="


@dataclass
class StatementMeta:
    bank: str
    card: str
    period_start: date
    period_end: date
    payment_due: date
    grace_payment: float
    min_payment: float
    apr_purchases: float


@dataclass
class StatementOp:
    op_date: date
    kind: str  # PURCHASE | CASH | PAYMENT
    amount: float
    description: str


def _fmt_money(x: float) -> str:
    return f"{x:,.2f}".replace(",", " ")


def build_anna_month1_sber(anchor: date | None = None) -> tuple[StatementMeta, list[StatementOp]]:
    """Первый расчётный месяц персоны Анны на СберКарте."""
    start = anchor or date(2026, 1, 1)
    end = start + timedelta(days=29)
    payment_due = end + timedelta(days=90)  # учебный якорь конца длинного грейса
    ops = [
        StatementOp(start + timedelta(days=3), "PURCHASE", 80_000.0, "Мебель / магазин"),
        StatementOp(start + timedelta(days=10), "PURCHASE", 25_000.0, "Супермаркет"),
        StatementOp(start + timedelta(days=20), "PURCHASE", 15_000.0, "Аптека и быт"),
    ]
    grace_pay = sum(o.amount for o in ops)
    meta = StatementMeta(
        bank="SBER",
        card="SberCreditCard-demo",
        period_start=start,
        period_end=end,
        payment_due=payment_due,
        grace_payment=grace_pay,
        min_payment=round(grace_pay * 0.10, 2),
        apr_purchases=0.498,
    )
    return meta, ops


def build_anna_month1_tbank(anchor: date | None = None) -> tuple[StatementMeta, list[StatementOp]]:
    start = anchor or date(2026, 1, 1)
    end = start + timedelta(days=29)
    payment_due = end + timedelta(days=25)
    ops = [
        StatementOp(start + timedelta(days=3), "PURCHASE", 80_000.0, "Мебель / магазин"),
        StatementOp(start + timedelta(days=10), "PURCHASE", 25_000.0, "Супермаркет"),
        StatementOp(start + timedelta(days=20), "PURCHASE", 15_000.0, "Аптека и быт"),
    ]
    grace_pay = sum(o.amount for o in ops)
    meta = StatementMeta(
        bank="TBANK",
        card="Platinum-demo",
        period_start=start,
        period_end=end,
        payment_due=payment_due,
        grace_payment=grace_pay,
        min_payment=max(round(grace_pay * 0.08, 2), 600.0),
        apr_purchases=0.299,
    )
    return meta, ops


def render_statement_pdf(
    path: Path,
    meta: StatementMeta,
    ops: list[StatementOp],
    title: str = "Учебная выписка по кредитной карте",
) -> Path:
    path.parent.mkdir(parents=True, exist_ok=True)
    doc = fitz.open()
    page = doc.new_page(width=595, height=842)  # A4
    fontname = "cour"
    if CYR_FONT is not None:
        fontname = "fcyrr"
        page.insert_font(fontname=fontname, fontfile=str(CYR_FONT))
    y = 50
    lines = [
        title,
        "DISCLAIMER: synthetic demo for VAIRL agent pipeline — not a bank document",
        "",
        f"{HDR_BANK} {meta.bank}",
        f"{HDR_CARD} {meta.card}",
        f"{HDR_PERIOD} {meta.period_start.isoformat()} .. {meta.period_end.isoformat()}",
        f"{HDR_PAYMENT_DUE} {meta.payment_due.isoformat()}",
        f"{HDR_GRACE_PAY} {_fmt_money(meta.grace_payment)}",
        f"{HDR_MIN_PAY} {_fmt_money(meta.min_payment)}",
        f"{HDR_APR} {meta.apr_purchases:.3%}",
        "",
        SECTION_OPS,
        "DATE       KIND      AMOUNT         DESCRIPTION",
    ]
    for op in ops:
        lines.append(
            f"{op.op_date.isoformat()}  {op.kind:<8}  {_fmt_money(op.amount):>12}  {op.description}"
        )
    lines += ["", SECTION_END, "", "Ledger Agent: parse markers above → StatementMeta + StatementOp[]"]

    for line in lines:
        if y > 800:
            page = doc.new_page(width=595, height=842)
            if CYR_FONT is not None:
                page.insert_font(fontname=fontname, fontfile=str(CYR_FONT))
            y = 50
        page.insert_text((40, y), line, fontsize=10, fontname=fontname)
        y += 14

    doc.save(path)
    doc.close()
    return path


_AMOUNT_RE = re.compile(r"([\d ]+[.,]\d{2})")


def _parse_amount(s: str) -> float:
    m = _AMOUNT_RE.search(s)
    if not m:
        raise ValueError(f"amount not found: {s}")
    return float(m.group(1).replace(" ", "").replace(",", "."))


def extract_text(pdf_path: Path) -> str:
    reader = PdfReader(str(pdf_path))
    return "\n".join(page.extract_text() or "" for page in reader.pages)


def parse_statement_pdf(pdf_path: Path) -> dict:
    """Ledger Agent: PDF → структурированная выписка."""
    text = extract_text(pdf_path)
    def field(prefix: str) -> str:
        for line in text.splitlines():
            if line.startswith(prefix):
                return line[len(prefix) :].strip()
        raise KeyError(prefix)

    period = field(HDR_PERIOD)
    start_s, end_s = [p.strip() for p in period.split("..")]
    ops: list[dict] = []
    in_ops = False
    op_re = re.compile(
        r"(\d{4}-\d{2}-\d{2})\s+(PURCHASE|CASH|PAYMENT)\s+([\d ]+[.,]\d{2})\s+(.+)"
    )
    for line in text.splitlines():
        if SECTION_OPS in line:
            in_ops = True
            continue
        if SECTION_END in line:
            break
        if not in_ops:
            continue
        m = op_re.match(line.strip())
        if m:
            ops.append(
                {
                    "date": m.group(1),
                    "kind": m.group(2).lower(),
                    "amount": float(m.group(3).replace(" ", "").replace(",", ".")),
                    "description": m.group(4).strip(),
                }
            )

    meta = {
        "bank": field(HDR_BANK),
        "card": field(HDR_CARD),
        "period_start": start_s,
        "period_end": end_s,
        "payment_due": field(HDR_PAYMENT_DUE),
        "grace_payment": _parse_amount(field(HDR_GRACE_PAY)),
        "min_payment": _parse_amount(field(HDR_MIN_PAY)),
        "apr_purchases": float(field(HDR_APR).strip().rstrip("%")) / 100.0,
    }
    return {"source_pdf": str(pdf_path.name), "meta": meta, "operations": ops, "raw_chars": len(text)}


def ops_to_sim_ledger(parsed: dict, epoch: date | None = None) -> list[dict]:
    """Преобразует операции выписки в относительные дни симуляции."""
    epoch = epoch or date.fromisoformat(parsed["meta"]["period_start"])
    out = []
    for op in parsed["operations"]:
        d = date.fromisoformat(op["date"])
        out.append(
            {
                "day": (d - epoch).days,
                "kind": op["kind"],
                "amount": op["amount"],
                "note": op["description"],
            }
        )
    return out


def generate_demo_bundle(out_dir: Path = OUT_DIR) -> dict:
    out_dir.mkdir(parents=True, exist_ok=True)
    bundle = {}
    for name, builder in (
        ("anna-month1-sber.pdf", build_anna_month1_sber),
        ("anna-month1-tbank.pdf", build_anna_month1_tbank),
    ):
        meta, ops = builder()
        path = out_dir / name
        render_statement_pdf(path, meta, ops)
        parsed = parse_statement_pdf(path)
        json_path = path.with_suffix(".parsed.json")
        json_path.write_text(json.dumps(parsed, ensure_ascii=False, indent=2), encoding="utf-8")
        ledger_path = path.with_suffix(".ledger.json")
        ledger_path.write_text(
            json.dumps(ops_to_sim_ledger(parsed), ensure_ascii=False, indent=2),
            encoding="utf-8",
        )
        bundle[name] = {
            "pdf": str(path.relative_to(ROOT)),
            "parsed": str(json_path.relative_to(ROOT)),
            "ledger": str(ledger_path.relative_to(ROOT)),
            "n_ops": len(parsed["operations"]),
            "grace_payment": parsed["meta"]["grace_payment"],
            "payment_due": parsed["meta"]["payment_due"],
        }
        print(f"wrote {path} → {len(parsed['operations'])} ops, due {parsed['meta']['payment_due']}")
    index = out_dir / "index.json"
    index.write_text(json.dumps(bundle, ensure_ascii=False, indent=2), encoding="utf-8")
    return bundle


def main(argv: list[str] | None = None) -> int:
    p = argparse.ArgumentParser(description=__doc__)
    p.add_argument("command", choices=["generate", "parse"], help="generate demo PDFs or parse a PDF")
    p.add_argument("--pdf", type=Path, help="path for parse")
    args = p.parse_args(argv)
    if args.command == "generate":
        generate_demo_bundle()
        return 0
    if not args.pdf:
        print("--pdf required for parse", file=sys.stderr)
        return 2
    print(json.dumps(parse_statement_pdf(args.pdf), ensure_ascii=False, indent=2))
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
