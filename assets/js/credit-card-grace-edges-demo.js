/**
 * Мультикарта + float: каждый край грейса — отдельная полоска (p5.js).
 * Данные: multicard_float в credit-card-grace-series.json.
 */
(function () {
  "use strict";

  const ROOT_ID = "cc-grace-edges-demo";
  const CANVAS_ID = "cc-grace-edges-canvas";

  const CARD_COLORS = {
    sber: [21, 101, 192],
    tbank: [106, 27, 154],
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
    const mc = data.multicard_float;
    if (!mc || !mc.series || !mc.edges) {
      root.insertAdjacentHTML(
        "beforeend",
        '<p class="cc-grace-error">Нет блока multicard_float в JSON.</p>'
      );
      return;
    }
    if (typeof p5 === "undefined") {
      root.innerHTML =
        '<p class="cc-grace-error">p5.js не загрузился — динамика недоступна.</p>';
      return;
    }
    root.dataset.initialized = "true";

    const horizon = mc.horizon || data.horizon || 180;
    let day = 0;
    let playing = true;
    let speed = 2;
    let accum = 0;
    let hoverLane = null;

    const dayEl = root.querySelector("[data-cc-day]");
    const debtEl = root.querySelector("[data-cc-debt]");
    const depEl = root.querySelector("[data-cc-deposit]");
    const floatEl = root.querySelector("[data-cc-float]");
    const costEl = root.querySelector("[data-cc-cost]");
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

    function syncNarrative() {
      if (!narrEl) return;
      const n = mc.narrative || {};
      const out = mc.outcomes || {};
      narrEl.innerHTML = `
        <div class="cc-narr-head">
          <strong>${n.title || "Мультикарта + float"}</strong>
        </div>
        <p class="cc-narr-pol">${n.summary || ""}</p>
        <p class="cc-narr-out">
          Итог день 180: %% вклада <strong>${rubFull(out.deposit_interest)}</strong>,
          cost карт <strong>${rubFull(out.client_cost)}</strong>,
          net PnL <strong>${rubFull(out.net_client_pnl)}</strong>,
          полосок (краёв): <strong>${(mc.edges || []).length}</strong>.
        </p>`;
    }

    function syncDom() {
      const row = mc.series[day] || mc.series[0] || {};
      if (dayEl) dayEl.textContent = String(day);
      if (debtEl) debtEl.textContent = rub(row.debt) + " руб.";
      if (depEl) depEl.textContent = rub(row.dep != null ? row.dep : row.cash) + " руб.";
      if (floatEl) floatEl.textContent = rub(row.dep_i != null ? row.dep_i : row.float) + " руб.";
      if (costEl) costEl.textContent = rub(row.cost) + " руб.";
      if (gleftEl) {
        gleftEl.textContent = row.gleft == null ? "—" : row.gleft + " дн.";
      }
      if (scrub && Number(scrub.value) !== day) scrub.value = String(day);
      if (playBtn) playBtn.textContent = playing ? "⏸ Пауза" : "▶ Старт";
      syncNarrative();
    }

    const sketch = (p) => {
      let W = 920;
      let H = 480;
      const pad = { l: 12, r: 16, t: 36, b: 36 };

      function measureHost() {
        const wrap = document.getElementById(CANVAS_ID);
        const n = Math.max(1, mc.edges.length);
        const edgesH = Math.max(420, Math.min(720, 56 + n * 28 + 48));
        const fs = isFullscreen();
        if (!fs) {
          W = Math.max(320, Math.min(920, (wrap && wrap.clientWidth) || 920));
          H = edgesH;
          return;
        }
        W = Math.max(320, Math.floor((wrap && wrap.clientWidth) || window.innerWidth));
        let h = wrap ? wrap.clientHeight : 0;
        if (h < 220) {
          let chrome = 0;
          Array.prototype.forEach.call(root.children, (el) => {
            if (el.id === CANVAS_ID) return;
            if (el.classList.contains("cc-grace-tooltip")) return;
            if (el.classList.contains("cc-grace-caption")) return;
            chrome += el.getBoundingClientRect().height;
          });
          h = window.innerHeight - chrome - 8;
        }
        H = Math.max(260, Math.floor(h));
      }

      resizeCanvas = function () {
        measureHost();
        p.resizeCanvas(W, H);
        if (p.canvas) {
          const fs = isFullscreen();
          if (fs) {
            p.canvas.style.setProperty("width", W + "px", "important");
            p.canvas.style.setProperty("height", H + "px", "important");
            p.canvas.style.setProperty("max-width", "100%", "important");
            p.canvas.style.setProperty("max-height", "100%", "important");
          } else {
            p.canvas.style.removeProperty("width");
            p.canvas.style.removeProperty("height");
            p.canvas.style.removeProperty("max-width");
            p.canvas.style.removeProperty("max-height");
            p.canvas.style.width = "100%";
            p.canvas.style.height = "auto";
          }
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

      function xOf(d, box) {
        return box.x0 + (d / (horizon - 1)) * box.w;
      }

      p.mouseMoved = function () {
        const box = plotBox();
        if (
          p.mouseX < box.x0 ||
          p.mouseX > box.x1 ||
          p.mouseY < box.y0 ||
          p.mouseY > box.y1
        ) {
          hoverLane = null;
          if (tipEl) tipEl.hidden = true;
          return;
        }
        const n = Math.max(1, mc.edges.length);
        const laneH = box.h / n;
        hoverLane = Math.max(
          0,
          Math.min(n - 1, Math.floor((p.mouseY - box.y0) / laneH))
        );
      };

      p.mouseOut = function () {
        hoverLane = null;
        if (tipEl) tipEl.hidden = true;
      };

      p.draw = function () {
        if (playing) {
          accum += speed / 30;
          while (accum >= 1) {
            accum -= 1;
            day = Math.min(horizon - 1, day + 1);
            if (day >= horizon - 1) playing = false;
            syncDom();
          }
        }

        p.background(252, 252, 253);
        const box = plotBox();
        const edges = mc.edges;
        const n = Math.max(1, edges.length);
        const laneH = box.h / n;
        const padY = Math.min(4, laneH * 0.12);
        const row = mc.series[day] || {};
        const liveById = {};
        (row.edges || []).forEach((e) => {
          liveById[e.id] = e;
        });

        p.noStroke();
        p.fill(45, 49, 60);
        p.textAlign(p.LEFT, p.TOP);
        p.textSize(13);
        p.textStyle(p.BOLD);
        p.text("Мультикарта · каждый край грейса — отдельная полоска", pad.l, 10);
        p.textStyle(p.NORMAL);
        p.textSize(11);
        p.fill(110, 115, 130);
        p.text("день " + day + " · синий Сбер · фиолетовый Т-Банк · красный = край", pad.l + 420, 12);

        p.stroke(230, 232, 236);
        p.strokeWeight(1);
        for (let m = 0; m <= 6; m++) {
          const d = Math.min(horizon - 1, m * 30);
          const x = xOf(d, box);
          p.line(x, box.y0, x, box.y1);
          p.noStroke();
          p.fill(110, 115, 130);
          p.textAlign(p.CENTER, p.TOP);
          p.textSize(11);
          p.text("д." + d, x, box.y1 + 8);
          p.stroke(230, 232, 236);
        }

        edges.forEach((e, i) => {
          const y0 = box.y0 + i * laneH + padY;
          const h = Math.max(8, laneH - 2 * padY);
          const col = CARD_COLORS[e.card] || [69, 90, 100];
          const opened = e.start <= day;
          const x0 = xOf(e.start, box);
          const xEnd = xOf(e.end, box);
          const xCut = xOf(Math.min(day, e.end), box);

          p.noStroke();
          p.fill(236, 239, 241);
          p.rect(box.x0, y0, box.w, h, 3);

          if (opened) {
            const past = day > e.end;
            p.fill(col[0], col[1], col[2], past ? 70 : 200);
            p.rect(x0, y0, Math.max(2, xCut - x0), h, 3);
            p.stroke(198, 40, 40, past ? 100 : 220);
            p.strokeWeight(2);
            p.line(xEnd, y0 - 1, xEnd, y0 + h + 1);
            p.noStroke();
          }

          const liveE = liveById[e.id];
          const left =
            liveE && liveE.days_left != null
              ? liveE.days_left + "д"
              : e.end >= day && opened
                ? e.end - day + "д"
                : "";
          p.fill(45, 49, 60);
          p.textAlign(p.LEFT, p.CENTER);
          p.textSize(10);
          p.text(
            (e.note || e.id).slice(0, 28) +
              " · " +
              rub(e.amount) +
              (left ? " · " + left : ""),
            box.x0 + 6,
            y0 + h / 2
          );

          if (hoverLane === i && opened) {
            p.noFill();
            p.stroke(45, 49, 60, 160);
            p.strokeWeight(1.5);
            p.rect(box.x0 + 0.5, y0, box.w - 1, h, 3);
          }
        });

        const xh = xOf(day, box);
        p.stroke(45, 49, 60, 180);
        p.strokeWeight(1.4);
        p.drawingContext.setLineDash([3, 4]);
        p.line(xh, box.y0, xh, box.y1);
        p.drawingContext.setLineDash([]);

        if (tipEl && hoverLane != null && edges[hoverLane] && edges[hoverLane].start <= day) {
          const e = edges[hoverLane];
          const liveE = liveById[e.id];
          tipEl.hidden = false;
          tipEl.innerHTML = `<strong>${e.id}</strong><br/>${e.note || ""}<br/>
            ${e.start} → ${e.end} (край грейса)<br/>
            Сумма: ${rubFull(e.amount)}
            ${
              liveE
                ? `<br/>Остаток: ${rubFull(liveE.amount)} · до края: ${liveE.days_left} дн.`
                : day > e.end
                  ? "<br/>Край пройден / погашено"
                  : ""
            }`;
          const host = document.getElementById(CANVAS_ID);
          const rect = host.getBoundingClientRect();
          const rootRect = root.getBoundingClientRect();
          const yMid = box.y0 + hoverLane * laneH + laneH / 2;
          tipEl.style.left = `${Math.min(
            root.clientWidth - 280,
            rect.left - rootRect.left + xh + 12
          )}px`;
          tipEl.style.top = `${Math.max(8, rect.top - rootRect.top + yMid - 20)}px`;
        } else if (tipEl) {
          tipEl.hidden = true;
        }
      };
    };

    playBtn?.addEventListener("click", () => {
      if (day >= horizon - 1) day = 0;
      playing = !playing;
      syncDom();
    });

    root.querySelector("[data-cc-reset]")?.addEventListener("click", () => {
      day = 0;
      accum = 0;
      playing = true;
      syncDom();
    });

    const speedInput = root.querySelector("[data-cc-speed]");
    speedInput?.addEventListener("input", () => {
      speed = parseFloat(speedInput.value) || 2;
    });

    scrub?.addEventListener("input", () => {
      day = Math.max(0, Math.min(horizon - 1, parseInt(scrub.value, 10) || 0));
      playing = false;
      syncDom();
    });

    if (scrub) {
      scrub.min = "0";
      scrub.max = String(horizon - 1);
    }

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
    const url =
      root.dataset.seriesUrl ||
      ((root.dataset.baseurl || "/vairl") + "/assets/data/credit-card-grace-series.json");
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
