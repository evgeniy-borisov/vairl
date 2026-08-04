/**
 * Кейс грейса кредитки — динамическая визуализация на p5.js.
 * Данные: assets/data/credit-card-grace-series.json (из Python-симулятора).
 */
(function () {
  "use strict";

  const ROOT_ID = "cc-grace-demo";
  const CANVAS_ID = "cc-grace-canvas";
  const DATA_URL = (function () {
    const el = document.getElementById(ROOT_ID);
    const custom = el && el.dataset.seriesUrl;
    if (custom) return custom;
    const base = document.querySelector('meta[name="baseurl"]');
    const prefix = (base && base.content) || "";
    // Jekyll relative_url usually injected via data-attr on root
    return (
      (el && el.dataset.baseurl ? el.dataset.baseurl : "/vairl") +
      "/assets/data/credit-card-grace-series.json"
    );
  })();

  const POLICY_LABELS = {
    payday_clear: "payday_clear",
    grace_keeper: "grace_keeper",
    min_trap: "min_trap",
    cash_then_min: "cash_then_min",
  };

  const POLICY_COLORS = {
    payday_clear: [46, 125, 50],
    grace_keeper: [21, 101, 192],
    min_trap: [198, 40, 40],
    cash_then_min: [239, 108, 0],
  };

  const MARKER_STYLE = {
    statement: { color: [96, 125, 139], dash: [2, 6], label: "выписка" },
    payment_due: { color: [25, 118, 210], dash: [6, 5], label: "платёж" },
    grace_end: { color: [198, 40, 40], dash: [8, 4], label: "конец грейса" },
  };

  function rub(n) {
    if (n == null || Number.isNaN(n)) return "—";
    const abs = Math.abs(n);
    if (abs >= 1000) return (n / 1000).toFixed(abs >= 10000 ? 0 : 1) + "k";
    return String(Math.round(n));
  }

  function rubFull(n) {
    if (n == null || Number.isNaN(n)) return "—";
    return Math.round(n).toLocaleString("ru-RU") + " руб.";
  }

  function init(data) {
    const root = document.getElementById(ROOT_ID);
    if (!root || root.dataset.initialized === "true") return;
    if (typeof p5 === "undefined") {
      root.innerHTML =
        '<p class="cc-grace-error">p5.js не загрузился — динамика недоступна.</p>';
      return;
    }
    root.dataset.initialized = "true";

    let cardKey = "sber";
    let policy = "min_trap";
    let day = 0;
    let playing = true;
    let speed = 2; // дней за тик (примерно)
    let accum = 0;
    let overlayCompare = true;
    let hoverDay = null;

    const dayEl = root.querySelector("[data-cc-day]");
    const debtEl = root.querySelector("[data-cc-debt]");
    const costEl = root.querySelector("[data-cc-cost]");
    const underEl = root.querySelector("[data-cc-under]");
    const accrEl = root.querySelector("[data-cc-accr]");
    const gleftEl = root.querySelector("[data-cc-gleft]");
    const playBtn = root.querySelector("[data-cc-play]");
    const scrub = root.querySelector("[data-cc-scrub]");
    const fsBtn = root.querySelector("[data-cc-fullscreen]");
    const narrEl = root.querySelector("[data-cc-narrative]");
    const tipEl = root.querySelector("[data-cc-tooltip]");

    let resizeCanvas = null;
    let fsPlaceholder = null;

    function nativeFsElement() {
      return (
        document.fullscreenElement ||
        document.webkitFullscreenElement ||
        document.msFullscreenElement ||
        null
      );
    }

    function isFullscreen() {
      return nativeFsElement() === root || root.classList.contains("cc-fs-fallback");
    }

    function syncFsButton() {
      const on = isFullscreen();
      root.classList.toggle("cc-is-fullscreen", on);
      if (!fsBtn) return;
      fsBtn.classList.toggle("active", on);
      fsBtn.title = on ? "Выйти из полноэкранного режима" : "Полный экран";
      fsBtn.setAttribute("aria-label", fsBtn.title);
      fsBtn.textContent = on ? "✕" : "⛶";
    }

    function scheduleResize() {
      const run = () => {
        if (typeof resizeCanvas === "function") resizeCanvas();
      };
      run();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          run();
          setTimeout(run, 60);
          setTimeout(run, 200);
        });
      });
    }

    function enterCssFullscreen() {
      if (!fsPlaceholder) {
        fsPlaceholder = document.createElement("div");
        fsPlaceholder.className = "cc-fs-placeholder";
        fsPlaceholder.setAttribute("aria-hidden", "true");
      }
      fsPlaceholder.style.height = root.offsetHeight + "px";
      if (!fsPlaceholder.parentNode && root.parentNode) {
        root.parentNode.insertBefore(fsPlaceholder, root);
      }
      root.classList.add("cc-fs-fallback", "cc-is-fullscreen");
      document.documentElement.classList.add("cc-fs-lock");
      document.body.classList.add("cc-fs-lock");
      if (tipEl) tipEl.hidden = true;
      syncFsButton();
      scheduleResize();
    }

    function exitCssFullscreen() {
      root.classList.remove("cc-fs-fallback", "cc-is-fullscreen");
      document.documentElement.classList.remove("cc-fs-lock");
      document.body.classList.remove("cc-fs-lock");
      if (fsPlaceholder && fsPlaceholder.parentNode) {
        fsPlaceholder.parentNode.removeChild(fsPlaceholder);
      }
      syncFsButton();
      scheduleResize();
    }

    function exitNativeFullscreen() {
      const exit =
        document.exitFullscreen ||
        document.webkitExitFullscreen ||
        document.webkitCancelFullScreen ||
        document.msExitFullscreen;
      if (exit) {
        try {
          const ret = exit.call(document);
          if (ret && typeof ret.catch === "function") ret.catch(() => {});
        } catch (_) {
          /* ignore */
        }
      }
    }

    function toggleFullscreen(ev) {
      if (ev) {
        ev.preventDefault();
        ev.stopPropagation();
      }
      if (isFullscreen()) {
        if (nativeFsElement() === root) exitNativeFullscreen();
        exitCssFullscreen();
        return;
      }
      enterCssFullscreen();
    }

    function onFullscreenChange() {
      if (
        !nativeFsElement() &&
        root.classList.contains("cc-is-fullscreen") &&
        !root.classList.contains("cc-fs-fallback")
      ) {
        root.classList.remove("cc-is-fullscreen");
      }
      syncFsButton();
      scheduleResize();
    }

    function onFsKey(e) {
      if (e.key === "Escape" && root.classList.contains("cc-fs-fallback")) {
        exitCssFullscreen();
      }
    }

    function series() {
      return data.cards[cardKey].series[policy];
    }

    function markers() {
      const m = data.cards[cardKey].markers;
      return (m && m[policy]) || [];
    }

    function syncNarrative() {
      if (!narrEl) return;
      const polN = (data.policy_narratives && data.policy_narratives[policy]) || {};
      const cardN = (data.card_narratives && data.card_narratives[cardKey]) || {};
      const out =
        (data.cards[cardKey].outcomes && data.cards[cardKey].outcomes[policy]) || {};
      const steps = (polN.what_happens || [])
        .map((s) => `<li>${s}</li>`)
        .join("");
      narrEl.innerHTML = `
        <div class="cc-narr-head">
          <strong>${cardN.title || data.cards[cardKey].label}</strong>
          <span class="cc-narr-sep">·</span>
          <strong>${polN.title || policy}</strong>
        </div>
        <p class="cc-narr-card">${cardN.summary || ""}</p>
        <p class="cc-narr-pol">${polN.summary || ""}</p>
        <ul class="cc-narr-steps">${steps}</ul>
        <p class="cc-narr-out">
          Итог на день 180:
          cost <strong>${rubFull(out.client_cost)}</strong>,
          долг <strong>${rubFull(out.final_debt)}</strong>
          (%% ${rubFull(out.interest)}, fees ${rubFull(out.fees)}).
        </p>`;
    }

    function eventLines(row) {
      const lines = [];
      if (!row) return lines;
      const kinds = new Set((row.ev || []).map((e) => e.k));
      if (row.idlt > 0.5 && !kinds.has("interest")) {
        lines.push(`Начисление процентов: +${rubFull(row.idlt)}`);
      }
      if (row.fdlt > 0.5 && !kinds.has("fee")) {
        lines.push(`Комиссия: +${rubFull(row.fdlt)}`);
      }
      (row.ev || []).forEach((e) => {
        const amt = e.a != null ? ` (${rubFull(e.a)})` : "";
        lines.push(`${e.l}${amt}`);
      });
      if (!lines.length) {
        if (row.ddlt > 0.5) lines.push(`Рост долга: +${rubFull(row.ddlt)}`);
        else if (row.ddlt < -0.5) lines.push(`Снижение долга: ${rubFull(row.ddlt)}`);
        else lines.push("Спокойный день: без покупок, платежей и начислений");
      }
      if (row.accr > 0) {
        lines.push(`Уже вне грейса: ${rubFull(row.accr)}`);
      }
      if (row.under > 0) {
        lines.push(`Ещё под грейсом: ${rubFull(row.under)}`);
      }
      return lines;
    }

    function syncDom() {
      const row = series()[day] || series()[0];
      if (dayEl) dayEl.textContent = String(day);
      if (debtEl) debtEl.textContent = rub(row.debt) + " руб.";
      if (costEl) costEl.textContent = rub(row.cost) + " руб.";
      if (underEl) underEl.textContent = rub(row.under) + " руб.";
      if (accrEl) accrEl.textContent = rub(row.accr) + " руб.";
      if (gleftEl) {
        gleftEl.textContent =
          row.gleft == null ? "—" : row.gleft + " дн.";
      }
      if (scrub && Number(scrub.value) !== day) scrub.value = String(day);
      if (playBtn) playBtn.textContent = playing ? "⏸ Пауза" : "▶ Старт";
      syncNarrative();
    }

    const sketch = (p) => {
      let W = 920;
      let H = 420;
      const pad = { l: 56, r: 18, t: 36, b: 42 };

      function measureHost() {
        const wrap = document.getElementById(CANVAS_ID);
        const fs = isFullscreen();
        if (!fs) {
          W = Math.max(320, Math.min(920, (wrap && wrap.clientWidth) || 920));
          H = 420;
          return;
        }
        // В fullscreen canvas — flex:1; берём фактический box после layout.
        W = Math.max(320, Math.floor((wrap && wrap.clientWidth) || window.innerWidth));
        let h = wrap ? wrap.clientHeight : 0;
        if (h < 220) {
          let chrome = 0;
          Array.prototype.forEach.call(root.children, (el) => {
            if (el.id === CANVAS_ID) return;
            if (el.classList.contains("cc-grace-tooltip")) return;
            if (el.classList.contains("cc-grace-caption")) return; // скрыт в FS
            chrome += el.getBoundingClientRect().height;
          });
          h = window.innerHeight - chrome - 8;
        }
        H = Math.max(260, Math.floor(h));
      }

      resizeCanvas = function () {
        measureHost();
        p.resizeCanvas(W, H);
        // Не даём CSS растягивать bitmap (иначе «ломаный» fullscreen).
        if (p.canvas) {
          p.canvas.style.width = W + "px";
          p.canvas.style.height = H + "px";
          p.canvas.style.maxWidth = "100%";
          p.canvas.style.display = "block";
        }
      };

      p.setup = function () {
        measureHost();
        const cnv = p.createCanvas(W, H);
        cnv.parent(CANVAS_ID);
        p.textFont("system-ui, -apple-system, sans-serif");
        p.frameRate(30);
        syncDom();
      };

      p.windowResized = function () {
        resizeCanvas();
      };

      function plotBox() {
        return {
          x0: pad.l,
          y0: pad.t,
          x1: W - pad.r,
          y1: H - pad.b,
          w: W - pad.l - pad.r,
          h: H - pad.t - pad.b,
        };
      }

      function maxDebtVisible() {
        let m = 1;
        const keys = overlayCompare
          ? Object.keys(data.cards[cardKey].series)
          : [policy];
        for (const pol of keys) {
          const s = data.cards[cardKey].series[pol];
          for (let i = 0; i <= day; i++) {
            if (s[i]) m = Math.max(m, s[i].debt, s[i].cost);
          }
        }
        return m * 1.08;
      }

      function xOf(d, box, horizon) {
        return box.x0 + (d / (horizon - 1)) * box.w;
      }

      function yOf(v, box, vmax) {
        return box.y1 - (v / vmax) * box.h;
      }

      function drawGrid(box, vmax) {
        p.stroke(230, 232, 236);
        p.strokeWeight(1);
        for (let i = 0; i <= 4; i++) {
          const y = box.y0 + (box.h * i) / 4;
          p.line(box.x0, y, box.x1, y);
          const val = vmax * (1 - i / 4);
          p.noStroke();
          p.fill(110, 115, 130);
          p.textAlign(p.RIGHT, p.CENTER);
          p.textSize(11);
          p.text(rub(val), box.x0 - 8, y);
          p.stroke(230, 232, 236);
        }
        // month ticks
        for (let m = 0; m <= 6; m++) {
          const d = Math.min(data.horizon - 1, m * 30);
          const x = xOf(d, box, data.horizon);
          p.line(x, box.y0, x, box.y1);
          p.noStroke();
          p.fill(110, 115, 130);
          p.textAlign(p.CENTER, p.TOP);
          p.textSize(11);
          p.text("д." + d, x, box.y1 + 8);
          p.stroke(230, 232, 236);
        }
      }

      function drawAreaUnderAccr(s, box, vmax) {
        // stacked: under (green) + accr (red) up to current day
        p.noStroke();
        p.beginShape();
        p.fill(102, 187, 106, 90);
        for (let i = 0; i <= day; i++) {
          p.vertex(xOf(i, box, data.horizon), yOf(s[i].under, box, vmax));
        }
        for (let i = day; i >= 0; i--) p.vertex(xOf(i, box, data.horizon), box.y1);
        p.endShape(p.CLOSE);

        p.beginShape();
        p.fill(239, 83, 80, 120);
        for (let i = 0; i <= day; i++) {
          const top = s[i].under + s[i].accr;
          p.vertex(xOf(i, box, data.horizon), yOf(top, box, vmax));
        }
        for (let i = day; i >= 0; i--) {
          p.vertex(xOf(i, box, data.horizon), yOf(s[i].under, box, vmax));
        }
        p.endShape(p.CLOSE);
      }

      function drawLine(s, key, color, box, vmax, upto) {
        p.noFill();
        p.stroke(...color);
        p.strokeWeight(2.2);
        p.beginShape();
        for (let i = 0; i <= upto; i++) {
          p.vertex(xOf(i, box, data.horizon), yOf(s[i][key], box, vmax));
        }
        p.endShape();
      }

      function drawMarkers(box) {
        const list = markers().filter((m) => m.day <= day);
        for (const m of list) {
          const st = MARKER_STYLE[m.kind] || MARKER_STYLE.statement;
          const x = xOf(m.day, box, data.horizon);
          p.stroke(...st.color, 160);
          p.strokeWeight(1.3);
          p.drawingContext.setLineDash(st.dash);
          p.line(x, box.y0, x, box.y1);
          p.drawingContext.setLineDash([]);
        }
      }

      function drawTooltip(box, vmax, s) {
        if (hoverDay == null || hoverDay < 0 || hoverDay > day) {
          if (tipEl) tipEl.hidden = true;
          return;
        }
        const row = s[hoverDay];
        if (!row) return;
        const x = xOf(hoverDay, box, data.horizon);
        const y = yOf(row.debt, box, vmax);
        p.stroke(45, 49, 60, 100);
        p.strokeWeight(1);
        p.drawingContext.setLineDash([2, 3]);
        p.line(x, box.y0, x, box.y1);
        p.drawingContext.setLineDash([]);
        p.noStroke();
        p.fill(...POLICY_COLORS[policy]);
        p.circle(x, y, 11);
        p.fill(255);
        p.circle(x, y, 5);

        const lines = eventLines(row);
        const markHit = markers().filter((m) => m.day === hoverDay);
        markHit.forEach((m) => {
          lines.unshift(`▸ ${m.label}`);
        });

        if (tipEl) {
          tipEl.hidden = false;
          tipEl.innerHTML = `<strong>День ${hoverDay}</strong><br/>Долг: ${rubFull(
            row.debt
          )} · cost: ${rubFull(row.cost)}<ul>${lines
            .map((l) => `<li>${l}</li>`)
            .join("")}</ul>`;
          // позиция относительно canvas host
          const host = document.getElementById(CANVAS_ID);
          const rect = host.getBoundingClientRect();
          const rootRect = root.getBoundingClientRect();
          let left = rect.left - rootRect.left + x + 14;
          let top = rect.top - rootRect.top + Math.max(y - 20, 8);
          if (left + 280 > root.clientWidth) left = left - 300;
          tipEl.style.left = `${Math.max(8, left)}px`;
          tipEl.style.top = `${Math.max(8, top)}px`;
        }
      }

      p.mouseMoved = function () {
        const box = plotBox();
        if (
          p.mouseX < box.x0 ||
          p.mouseX > box.x1 ||
          p.mouseY < box.y0 ||
          p.mouseY > box.y1
        ) {
          hoverDay = null;
          if (tipEl) tipEl.hidden = true;
          return;
        }
        const t = (p.mouseX - box.x0) / box.w;
        hoverDay = Math.max(
          0,
          Math.min(day, Math.round(t * (data.horizon - 1)))
        );
      };

      p.mouseOut = function () {
        hoverDay = null;
        if (tipEl) tipEl.hidden = true;
      };

      p.draw = function () {
        if (playing) {
          accum += speed / 30;
          while (accum >= 1) {
            accum -= 1;
            day = Math.min(data.horizon - 1, day + 1);
            if (day >= data.horizon - 1) playing = false;
            syncDom();
          }
        }

        p.background(252, 252, 253);
        const box = plotBox();
        const vmax = maxDebtVisible();
        const s = series();
        const card = data.cards[cardKey];

        p.noStroke();
        p.fill(45, 49, 60);
        p.textAlign(p.LEFT, p.TOP);
        p.textSize(13);
        p.textStyle(p.BOLD);
        p.text(card.label + " · " + POLICY_LABELS[policy], pad.l, 10);
        p.textStyle(p.NORMAL);
        p.textSize(11);
        p.fill(110, 115, 130);
        p.text("наведите на кривую долга · день " + day, pad.l + 280, 12);

        drawGrid(box, vmax);
        drawMarkers(box);
        drawAreaUnderAccr(s, box, vmax);

        if (overlayCompare) {
          for (const pol of Object.keys(data.cards[cardKey].series)) {
            if (pol === policy) continue;
            const col = POLICY_COLORS[pol];
            p.drawingContext.setLineDash([5, 5]);
            p.stroke(col[0], col[1], col[2], 120);
            p.strokeWeight(1.6);
            p.noFill();
            p.beginShape();
            const s2 = data.cards[cardKey].series[pol];
            for (let i = 0; i <= day; i++) {
              p.vertex(xOf(i, box, data.horizon), yOf(s2[i].debt, box, vmax));
            }
            p.endShape();
            p.drawingContext.setLineDash([]);
          }
        }

        drawLine(s, "debt", POLICY_COLORS[policy], box, vmax, day);
        drawLine(s, "cost", [123, 31, 162], box, vmax, day);

        // playhead
        const xh = xOf(day, box, data.horizon);
        p.stroke(45, 49, 60, 160);
        p.strokeWeight(1.2);
        p.drawingContext.setLineDash([3, 4]);
        p.line(xh, box.y0, xh, box.y1);
        p.drawingContext.setLineDash([]);
        const row = s[day];
        p.noStroke();
        p.fill(...POLICY_COLORS[policy]);
        p.circle(xh, yOf(row.debt, box, vmax), 8);
        p.fill(123, 31, 162);
        p.circle(xh, yOf(row.cost, box, vmax), 7);

        // legend
        const legend = [
          { c: [102, 187, 106], t: "под грейсом" },
          { c: [239, 83, 80], t: "уже %" },
          { c: POLICY_COLORS[policy], t: "долг" },
          { c: [123, 31, 162], t: "cost" },
          { c: [96, 125, 139], t: "выписка ┈" },
          { c: [25, 118, 210], t: "плат.дата ┈" },
          { c: [198, 40, 40], t: "конец грейса ┈" },
        ];
        let lx = box.x0;
        const ly = box.y0 - 2;
        p.textAlign(p.LEFT, p.BOTTOM);
        p.textSize(10);
        for (const item of legend) {
          p.fill(...item.c);
          p.rect(lx, ly - 9, 9, 9, 2);
          p.fill(80, 85, 100);
          p.text(item.t, lx + 12, ly);
          lx += p.textWidth(item.t) + 28;
        }

        drawTooltip(box, vmax, s);
      };
    };

    // controls
    root.querySelectorAll("[data-cc-card]").forEach((btn) => {
      btn.addEventListener("click", () => {
        cardKey = btn.dataset.ccCard;
        root.querySelectorAll("[data-cc-card]").forEach((b) =>
          b.classList.toggle("active", b === btn)
        );
        day = Math.min(day, data.horizon - 1);
        syncDom();
      });
    });

    root.querySelectorAll("[data-cc-policy]").forEach((btn) => {
      btn.addEventListener("click", () => {
        policy = btn.dataset.ccPolicy;
        root.querySelectorAll("[data-cc-policy]").forEach((b) =>
          b.classList.toggle("active", b === btn)
        );
        syncDom();
      });
    });

    playBtn?.addEventListener("click", () => {
      if (day >= data.horizon - 1) day = 0;
      playing = !playing;
      syncDom();
    });

    root.querySelector("[data-cc-reset]")?.addEventListener("click", () => {
      day = 0;
      accum = 0;
      playing = true;
      syncDom();
    });

    root.querySelector("[data-cc-compare]")?.addEventListener("click", (e) => {
      overlayCompare = !overlayCompare;
      e.currentTarget.classList.toggle("active", overlayCompare);
      e.currentTarget.textContent = overlayCompare
        ? "Сравнение политик: вкл"
        : "Сравнение политик: выкл";
    });

    const speedInput = root.querySelector("[data-cc-speed]");
    speedInput?.addEventListener("input", () => {
      speed = parseFloat(speedInput.value) || 2;
    });

    scrub?.addEventListener("input", () => {
      day = Math.max(0, Math.min(data.horizon - 1, parseInt(scrub.value, 10) || 0));
      playing = false;
      syncDom();
    });

    fsBtn?.addEventListener("click", toggleFullscreen);
    document.addEventListener("fullscreenchange", onFullscreenChange);
    document.addEventListener("webkitfullscreenchange", onFullscreenChange);
    document.addEventListener("keydown", onFsKey);

    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => {
        if (typeof resizeCanvas === "function") resizeCanvas();
      });
      ro.observe(root);
    }

    // eslint-disable-next-line no-new
    new p5(sketch);
  }

  function boot() {
    const root = document.getElementById(ROOT_ID);
    if (!root) return;
    const url = root.dataset.seriesUrl || DATA_URL;
    fetch(url)
      .then((r) => {
        if (!r.ok) throw new Error("HTTP " + r.status);
        return r.json();
      })
      .then(init)
      .catch((err) => {
        console.error(err);
        root.insertAdjacentHTML(
          "beforeend",
          '<p class="cc-grace-error">Не удалось загрузить ряды симуляции.</p>'
        );
      });
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", boot);
  } else {
    boot();
  }
})();
