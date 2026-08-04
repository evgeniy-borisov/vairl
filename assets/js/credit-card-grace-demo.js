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

  function rub(n) {
    if (n == null || Number.isNaN(n)) return "—";
    const abs = Math.abs(n);
    if (abs >= 1000) return (n / 1000).toFixed(abs >= 10000 ? 0 : 1) + "k";
    return String(Math.round(n));
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

    const dayEl = root.querySelector("[data-cc-day]");
    const debtEl = root.querySelector("[data-cc-debt]");
    const costEl = root.querySelector("[data-cc-cost]");
    const underEl = root.querySelector("[data-cc-under]");
    const accrEl = root.querySelector("[data-cc-accr]");
    const gleftEl = root.querySelector("[data-cc-gleft]");
    const playBtn = root.querySelector("[data-cc-play]");
    const scrub = root.querySelector("[data-cc-scrub]");
    const fsBtn = root.querySelector("[data-cc-fullscreen]");

    let resizeCanvas = null;

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

    function enterCssFullscreen() {
      root.classList.add("cc-fs-fallback", "cc-is-fullscreen");
      document.documentElement.classList.add("cc-fs-lock");
      document.body.classList.add("cc-fs-lock");
      syncFsButton();
      requestAnimationFrame(() => {
        if (typeof resizeCanvas === "function") resizeCanvas();
      });
    }

    function exitCssFullscreen() {
      root.classList.remove("cc-fs-fallback", "cc-is-fullscreen");
      document.documentElement.classList.remove("cc-fs-lock");
      document.body.classList.remove("cc-fs-lock");
      syncFsButton();
      requestAnimationFrame(() => {
        if (typeof resizeCanvas === "function") resizeCanvas();
      });
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

    function enterNativeFullscreen() {
      const req =
        root.requestFullscreen ||
        root.webkitRequestFullscreen ||
        root.webkitRequestFullScreen ||
        root.msRequestFullscreen;
      if (!req) return Promise.reject(new Error("no fullscreen API"));
      try {
        const ret = req.call(root);
        return ret && typeof ret.then === "function" ? ret : Promise.resolve();
      } catch (err) {
        return Promise.reject(err);
      }
    }

    function toggleFullscreen(ev) {
      if (ev) {
        ev.preventDefault();
        ev.stopPropagation();
      }
      if (isFullscreen()) {
        if (root.classList.contains("cc-fs-fallback")) exitCssFullscreen();
        else exitNativeFullscreen();
        return;
      }
      // CSS overlay first — надёжно на Safari/iOS и при блокировке Fullscreen API.
      // Native API пробуем параллельно, если доступен (доп. системный chrome).
      const req =
        root.requestFullscreen ||
        root.webkitRequestFullscreen ||
        root.webkitRequestFullScreen ||
        root.msRequestFullscreen;
      const canNative =
        typeof req === "function" &&
        !/iPad|iPhone|iPod/.test(navigator.userAgent) &&
        !("ontouchend" in document && /Mac/.test(navigator.userAgent)); // iPadOS desktop UA

      if (!canNative) {
        enterCssFullscreen();
        return;
      }

      enterNativeFullscreen()
        .then(() => {
          // если браузер не перешёл — подстраховываем CSS
          setTimeout(() => {
            if (!nativeFsElement()) enterCssFullscreen();
            else {
              syncFsButton();
              if (typeof resizeCanvas === "function") resizeCanvas();
            }
          }, 120);
        })
        .catch(() => enterCssFullscreen());
    }

    function onFullscreenChange() {
      // left native FS without our fallback
      if (!nativeFsElement() && root.classList.contains("cc-is-fullscreen") && !root.classList.contains("cc-fs-fallback")) {
        root.classList.remove("cc-is-fullscreen");
      }
      syncFsButton();
      requestAnimationFrame(() => {
        requestAnimationFrame(() => {
          if (typeof resizeCanvas === "function") resizeCanvas();
        });
      });
    }

    function onFsKey(e) {
      if (e.key === "Escape" && root.classList.contains("cc-fs-fallback")) {
        exitCssFullscreen();
      }
    }

    function series() {
      return data.cards[cardKey].series[policy];
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
    }

    const sketch = (p) => {
      let W = 920;
      let H = 420;
      const pad = { l: 56, r: 18, t: 36, b: 42 };

      function measureHost() {
        const wrap = document.getElementById(CANVAS_ID);
        const fs = isFullscreen();
        const maxW = fs ? Math.max(window.innerWidth, (wrap && wrap.clientWidth) || 0) : 920;
        W = Math.max(320, Math.min(maxW, (wrap && wrap.clientWidth) || maxW));
        if (fs) {
          const top = wrap ? wrap.getBoundingClientRect().top : 120;
          const caption = root.querySelector(".cc-grace-caption");
          const cap = caption ? Math.min(caption.offsetHeight || 40, 56) : 24;
          H = Math.max(320, Math.floor(window.innerHeight - top - cap - 8));
        } else {
          H = 420;
        }
      }

      resizeCanvas = function () {
        measureHost();
        p.resizeCanvas(W, H);
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
        p.text("долг / структура грейса · день " + day, pad.l + 280, 12);

        drawGrid(box, vmax);
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
        ];
        let lx = box.x0;
        const ly = box.y0 - 2;
        p.textAlign(p.LEFT, p.BOTTOM);
        p.textSize(11);
        for (const item of legend) {
          p.fill(...item.c);
          p.rect(lx, ly - 10, 10, 10, 2);
          p.fill(80, 85, 100);
          p.text(item.t, lx + 14, ly);
          lx += p.textWidth(item.t) + 36;
        }
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
