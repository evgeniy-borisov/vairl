/**
 * p5.js: текст → гиперфазоры → Kuramoto → SRA wave → phase-locked clusters
 * Embeds in .oscillatory-network-widget (blog) or #oscillatory-network-fullpage.
 */
(function () {
  "use strict";

  const WIDGET_SEL = ".oscillatory-network-widget";
  const FULLPAGE_ID = "oscillatory-network-fullpage";

  const PALETTE = [
    [34, 211, 238],
    [52, 211, 153],
    [167, 139, 250],
    [245, 158, 11],
    [239, 68, 68],
    [99, 102, 241],
    [236, 72, 153],
    [20, 184, 166],
  ];

  function hashStr(s) {
    let h = 0;
    for (let i = 0; i < s.length; i++) h = (h * 31 + s.charCodeAt(i)) | 0;
    return Math.abs(h);
  }

  function tokenize(text) {
    return text
      .toLowerCase()
      .replace(/[^\p{L}\p{N}\s-]/gu, "")
      .split(/\s+/)
      .filter(Boolean)
      .slice(0, 14);
  }

  function makeOscillator(word) {
    const h = hashStr(word);
    return {
      word,
      omega: 0.6 + ((h % 1000) / 1000) * 2.2,
      theta: ((h >> 4) % 628) / 100,
      r: 0.15,
      targetR: 0.55 + ((h % 7) / 7) * 0.55,
      activation: 0,
      injected: false,
      cluster: -1,
      x: 0,
      y: 0,
      colorIdx: h % PALETTE.length,
    };
  }

  function couplingStrength(a, b, i, j) {
    let k = 0.15;
    if (Math.abs(i - j) === 1) k += 0.55;
    if (a.word[0] === b.word[0]) k += 0.35;
    if (a.word.length === b.word.length) k += 0.2;
    if (Math.abs(a.omega - b.omega) < 0.4) k += 0.25;
    return k;
  }

  function resonance(a, b) {
    return a.r * b.r * Math.cos(a.theta - b.theta);
  }

  function kuramotoStep(oscs, dt, K) {
    const n = oscs.length;
    if (n === 0) return;
    const dthetas = new Array(n).fill(0);
    for (let i = 0; i < n; i++) {
      if (oscs[i].activation < 0.2) continue;
      let sum = oscs[i].omega;
      for (let j = 0; j < n; j++) {
        if (i === j || oscs[j].activation < 0.2) continue;
        const kij = couplingStrength(oscs[i], oscs[j], i, j);
        sum += K * kij * oscs[j].r * Math.sin(oscs[j].theta - oscs[i].theta);
      }
      dthetas[i] = sum;
    }
    for (let i = 0; i < n; i++) {
      if (oscs[i].activation < 0.2) continue;
      oscs[i].theta += dthetas[i] * dt;
      oscs[i].r += (oscs[i].targetR * oscs[i].activation - oscs[i].r) * 0.08;
    }
  }

  function findClusters(oscs) {
    const n = oscs.length;
    const parent = oscs.map((_, i) => i);
    function find(x) {
      while (parent[x] !== x) {
        parent[x] = parent[parent[x]];
        x = parent[x];
      }
      return x;
    }
    function unite(a, b) {
      const ra = find(a);
      const rb = find(b);
      if (ra !== rb) parent[rb] = ra;
    }
    for (let i = 0; i < n; i++) {
      for (let j = i + 1; j < n; j++) {
        if (oscs[i].activation < 0.5 || oscs[j].activation < 0.5) continue;
        if (resonance(oscs[i], oscs[j]) > 0.42) unite(i, j);
      }
    }
    const groups = new Map();
    for (let i = 0; i < n; i++) {
      if (oscs[i].activation < 0.5) continue;
      const root = find(i);
      if (!groups.has(root)) groups.set(root, []);
      groups.get(root).push(i);
    }
    const clusters = [...groups.values()];
    clusters.forEach((g, ci) => g.forEach((idx) => (oscs[idx].cluster = ci)));
    return clusters;
  }

  function initWidget(root) {
    if (root.dataset.onnInit === "1") return;
    if (typeof p5 === "undefined") return;

    const host = root.querySelector(".onn-sketch-host");
    const input = root.querySelector("[data-onn-input]");
    const preset = root.querySelector("[data-onn-preset]");
    const btnPlay = root.querySelector("[data-onn-play]");
    const btnReset = root.querySelector("[data-onn-reset]");
    const kRange = root.querySelector("[data-onn-k]");
    const kVal = root.querySelector("[data-onn-k-val]");
    const speedRange = root.querySelector("[data-onn-speed]");
    const pipelineLabels = root.querySelectorAll("[data-onn-stage]");

    if (!host || !input) return;
    root.dataset.onnInit = "1";

    const state = {
      text: input.value || "нейросеть синхронизирует фазы слов",
      tokens: [],
      playing: true,
      K: kRange ? parseFloat(kRange.value) : 1.4,
      speed: speedRange ? parseFloat(speedRange.value) : 1,
      injectIdx: 0,
      injectTimer: 0,
      waveT: 0,
      hoverIdx: -1,
      clusters: [],
    };

    function rebuildTokens() {
      state.tokens = tokenize(state.text).map((w) => makeOscillator(w));
      state.injectIdx = 0;
      state.injectTimer = 0;
      state.waveT = 0;
      state.clusters = [];
      setPipelineStage(0);
    }

    function setPipelineStage(s) {
      pipelineLabels.forEach((el, i) => el.classList.toggle("onn-stage-on", i <= s));
    }

    function injectStep(dt) {
      const oscs = state.tokens;
      if (state.injectIdx >= oscs.length) return;
      state.injectTimer += dt;
      if (state.injectTimer > 0.55 / state.speed) {
        state.injectTimer = 0;
        const o = oscs[state.injectIdx];
        o.injected = true;
        o.activation = 0.01;
        state.injectIdx++;
        setPipelineStage(state.injectIdx > 0 ? 1 : 0);
      }
      oscs.forEach((o) => {
        if (o.injected && o.activation < 1) {
          o.activation = Math.min(1, o.activation + dt * 1.8 * state.speed);
        }
      });
    }

    input.addEventListener("change", () => {
      state.text = input.value;
      rebuildTokens();
    });
    input.addEventListener("keydown", (e) => {
      if (e.key === "Enter") {
        state.text = input.value;
        rebuildTokens();
      }
    });
    preset?.addEventListener("change", () => {
      if (!preset.value) return;
      input.value = preset.value;
      state.text = preset.value;
      rebuildTokens();
      preset.value = "";
    });
    btnPlay?.addEventListener("click", () => {
      state.playing = !state.playing;
      btnPlay.textContent = state.playing ? "⏸ Пауза" : "▶ Поток";
      btnPlay.classList.toggle("active", state.playing);
    });
    btnReset?.addEventListener("click", () => {
      rebuildTokens();
      state.playing = true;
      if (btnPlay) {
        btnPlay.textContent = "⏸ Пауза";
        btnPlay.classList.add("active");
      }
    });
    kRange?.addEventListener("input", () => {
      state.K = parseFloat(kRange.value);
      if (kVal) kVal.textContent = state.K.toFixed(1);
    });
    speedRange?.addEventListener("input", () => {
      state.speed = parseFloat(speedRange.value);
    });

    const zones = {
      tokens: { y0: 52, y1: 200 },
      coupling: { y0: 210, y1: 340 },
      wave: { y0: 350, y1: 470 },
      output: { y0: 480, y1: 600 },
    };

    let W = 900;
    const H = 620;

    const sketch = (p) => {
      p.setup = function () {
        W = Math.min(1100, host.clientWidth || 900);
        const cnv = p.createCanvas(W, H);
        cnv.parent(host);
        p.pixelDensity(Math.min(2, window.devicePixelRatio || 1));
        rebuildTokens();
      };

      p.windowResized = function () {
        W = Math.min(1100, host.clientWidth || 900);
        p.resizeCanvas(W, H);
      };

      p.draw = function () {
        const dt = Math.min(p.deltaTime / 1000, 0.05) * state.speed;
        p.background(10, 15, 26);

        if (state.playing) {
          injectStep(dt);
          const active = state.tokens.filter((o) => o.activation > 0.2);
          if (active.length > 1) {
            kuramotoStep(state.tokens, dt, state.K);
            setPipelineStage(2);
          }
          if (state.injectIdx >= state.tokens.length && active.length > 0) {
            state.waveT += dt;
            setPipelineStage(3);
          }
          if (state.injectIdx >= state.tokens.length) {
            state.clusters = findClusters(state.tokens);
            if (state.clusters.some((c) => c.length >= 2)) setPipelineStage(4);
          }
        }

        drawZoneLabels(p);
        layoutTokens();
        drawTokenRow(p);
        drawCouplingWeb(p);
        drawSraWave(p);
        drawOutputClusters(p);
        drawHoverPhasor(p);
      };

      function layoutTokens() {
        const oscs = state.tokens;
        const n = oscs.length;
        if (n === 0) return;
        const margin = 50;
        const span = W - margin * 2;
        const cy = (zones.tokens.y0 + zones.tokens.y1) / 2;
        oscs.forEach((o, i) => {
          o.x = margin + (n === 1 ? span / 2 : (i / (n - 1)) * span);
          o.y = cy;
        });
      }

      function drawZoneLabels(p) {
        p.textFont("system-ui, sans-serif");
        p.textSize(11);
        p.fill(100, 116, 139);
        p.noStroke();
        [
          [zones.tokens, "Гиперфазоры z = r·e^{iθ} — каждое слово"],
          [zones.coupling, "Coupling Курамото · резонанс cos(Δθ)"],
          [zones.wave, "SRA: волновое распространение вдоль последовательности"],
          [zones.output, "Phase-locked кластеры (Abelian merge)"],
        ].forEach(([z, t]) => p.text(t, 14, z.y0 - 8));
        p.stroke(42, 53, 80);
        p.strokeWeight(1);
        p.line(10, zones.tokens.y0 - 2, W - 10, zones.tokens.y0 - 2);
      }

      function drawTokenRow(p) {
        state.hoverIdx = -1;
        state.tokens.forEach((o, i) => {
          const [cr, cg, cb] = PALETTE[o.colorIdx];
          const rad = 28 + o.r * 18;
          const alpha = 40 + o.activation * 180;

          p.noFill();
          p.stroke(cr, cg, cb, o.activation * 120);
          p.strokeWeight(2);
          p.circle(o.x, o.y, rad * 2 + 12 * (1 - o.activation));

          p.fill(cr, cg, cb, alpha);
          p.noStroke();
          p.circle(o.x, o.y, rad * 2);

          if (o.activation > 0.15) {
            const len = rad * 0.85;
            p.stroke(245, 158, 11, 180 + o.activation * 75);
            p.strokeWeight(2.5);
            p.line(o.x, o.y, o.x + Math.cos(o.theta) * len, o.y + Math.sin(o.theta) * len);
            p.fill(245, 158, 11);
            p.noStroke();
            p.circle(o.x + Math.cos(o.theta) * len, o.y + Math.sin(o.theta) * len, 5);
          }

          p.fill(226, 232, 240, 100 + o.activation * 155);
          p.noStroke();
          p.textAlign(p.CENTER, p.TOP);
          p.textSize(10);
          p.text(o.word, o.x, o.y + rad + 6);

          if (o.activation > 0.4) {
            p.textSize(8);
            p.fill(148, 163, 184);
            p.text("θ=" + ((o.theta % (2 * Math.PI)) / Math.PI).toFixed(2) + "π", o.x, o.y + rad + 20);
          }

          if (p.dist(p.mouseX, p.mouseY, o.x, o.y) < rad + 8) state.hoverIdx = i;
        });
      }

      function drawCouplingWeb(p) {
        const oscs = state.tokens.filter((o) => o.activation > 0.25);
        const midY = (zones.coupling.y0 + zones.coupling.y1) / 2;

        for (let i = 0; i < oscs.length; i++) {
          for (let j = i + 1; j < oscs.length; j++) {
            const res = resonance(oscs[i], oscs[j]);
            if (res < 0.08) continue;
            const col = res > 0.35 ? [52, 211, 153] : [99, 102, 241];
            p.stroke(col[0], col[1], col[2], 30 + Math.abs(res) * 160);
            p.strokeWeight(0.5 + Math.abs(res) * 3);
            p.line(oscs[i].x, oscs[i].y + 32, oscs[j].x, midY);
            p.line(oscs[i].x, midY, oscs[j].x, oscs[j].y + 32);
            if (res > 0.35) {
              p.fill(52, 211, 153, 100);
              p.noStroke();
              p.textSize(8);
              p.textAlign(p.CENTER);
              p.text(res.toFixed(2), (oscs[i].x + oscs[j].x) / 2, midY - 4);
            }
          }
        }

        if (state.injectIdx > 0 && oscs.length > 0) {
          const span = oscs[oscs.length - 1].x - oscs[0].x + 1;
          const pulseX = oscs[0].x + (state.waveT * 120) % span;
          p.noFill();
          p.stroke(34, 211, 238, 160);
          p.strokeWeight(2);
          p.line(pulseX, zones.coupling.y0 + 4, pulseX, zones.coupling.y1 - 4);
        }
      }

      function drawSraWave(p) {
        const oscs = state.tokens.filter((o) => o.activation > 0.3);
        if (oscs.length < 2) return;

        const y0 = zones.wave.y0 + 20;
        const y1 = zones.wave.y1 - 15;
        const mid = (y0 + y1) / 2;
        const amp = (y1 - y0) * 0.38;

        p.noFill();
        p.stroke(167, 139, 250, 200);
        p.strokeWeight(2);
        p.beginShape();
        for (let x = 12; x < W - 12; x += 3) {
          let sum = 0;
          oscs.forEach((o, i) => {
            const envelope = Math.exp(-Math.abs(x - o.x) * 0.012);
            sum += o.r * envelope * Math.sin(o.theta + state.waveT * 2.5 + i * 0.4);
          });
          p.vertex(x, mid + (sum / Math.sqrt(oscs.length)) * amp);
        }
        p.endShape();

        p.stroke(52, 211, 153, 90);
        p.strokeWeight(1);
        p.beginShape();
        for (let x = 12; x < W - 12; x += 4) {
          let energy = 0;
          oscs.forEach((o) => {
            energy += o.r * o.r * Math.exp(-Math.abs(x - o.x) * 0.018);
          });
          p.vertex(x, y1 - energy * 12);
        }
        p.endShape();

        p.fill(148, 163, 184);
        p.noStroke();
        p.textSize(9);
        p.textAlign(p.LEFT);
        p.text("Σᵢ rᵢ·sin(θᵢ + kx)  —  линейная память, без n×n attention", 14, y1 + 2);
      }

      function drawOutputClusters(p) {
        const y0 = zones.output.y0 + 16;
        p.textAlign(p.LEFT, p.TOP);
        p.textSize(11);
        p.fill(148, 163, 184);
        p.text("Выход reasoning loop (phase-locked группы):", 14, y0);

        if (state.clusters.length === 0) {
          p.fill(100, 116, 139);
          p.textSize(10);
          p.text("Запустите поток — слова по одному активируют осцилляторы…", 14, y0 + 22);
          return;
        }

        let x = 14;
        const rowY = y0 + 24;
        state.clusters.forEach((group, gi) => {
          const words = group.map((i) => state.tokens[i].word).join(" + ");
          const [cr, cg, cb] = PALETTE[gi % PALETTE.length];
          const tw = p.textWidth(words) + 24;
          if (x + tw > W - 14) return;

          p.fill(cr, cg, cb, 35);
          p.stroke(cr, cg, cb, 120);
          p.strokeWeight(1);
          p.rect(x, rowY, tw, 28, 6);
          p.fill(226, 232, 240);
          p.noStroke();
          p.textSize(10);
          p.text(words, x + 12, rowY + 8);
          if (group.length >= 2) {
            p.fill(52, 211, 153);
            p.textSize(8);
            p.text("LOCK", x + tw - 32, rowY + 10);
          }
          x += tw + 10;
        });

        p.fill(100, 116, 139);
        p.textSize(9);
        p.text("Abelian merge: порядок слов в кластере не меняет интерференционную картину", 14, zones.output.y1 - 12);
      }

      function drawHoverPhasor(p) {
        if (state.hoverIdx < 0) return;
        const o = state.tokens[state.hoverIdx];
        if (!o || o.activation < 0.2) return;

        const px = Math.min(W - 130, o.x + 40);
        const py = Math.max(zones.tokens.y0 + 10, o.y - 70);
        const R = 36;

        p.fill(20, 27, 46, 230);
        p.stroke(42, 53, 80);
        p.strokeWeight(1);
        p.rect(px - 8, py - 8, 116, 100, 8);

        p.push();
        p.translate(px + R, py + R);
        p.noFill();
        p.stroke(71, 85, 105);
        p.circle(0, 0, R * 2);
        p.line(-R, 0, R, 0);
        p.line(0, -R, 0, R);
        const [cr, cg, cb] = PALETTE[o.colorIdx];
        p.stroke(cr, cg, cb);
        p.strokeWeight(2);
        p.line(0, 0, Math.cos(o.theta) * R * o.r, Math.sin(o.theta) * R * o.r);
        p.fill(245, 158, 11);
        p.noStroke();
        p.textSize(9);
        p.textAlign(p.LEFT);
        p.text("r=" + o.r.toFixed(2), R + 6, -4);
        p.text("ω=" + o.omega.toFixed(2), R + 6, 10);
        p.pop();
      }
    };

    // eslint-disable-next-line no-new
    new p5(sketch, host);

    if (typeof ResizeObserver !== "undefined") {
      const ro = new ResizeObserver(() => {
        W = Math.min(1100, host.clientWidth || 900);
      });
      ro.observe(host);
    }
  }

  function init() {
    document.querySelectorAll(WIDGET_SEL).forEach(initWidget);
    const full = document.getElementById(FULLPAGE_ID);
    if (full) initWidget(full);
  }

  if (document.readyState === "loading") {
    document.addEventListener("DOMContentLoaded", init);
  } else {
    init();
  }
})();
