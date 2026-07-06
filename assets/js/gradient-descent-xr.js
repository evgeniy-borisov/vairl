/**
 * 3D gradient descent landscape with WebXR (inline + immersive-vr).
 * Embeds in #gradient-descent-xr-demo or fullscreen #gradient-descent-xr-fullpage.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';

const ROOT_ID = 'gradient-descent-xr-demo';
const FULLPAGE_ID = 'gradient-descent-xr-fullpage';

const FUNCTIONS = {
  bowl: {
    label: 'x² + y²',
    domain: { xMin: -2.5, xMax: 2.5, yMin: -2.5, yMax: 2.5 },
    start: { x: 2.2, y: 2.0 },
    f(x, y) {
      return x * x + y * y;
    },
    grad(x, y) {
      return { x: 2 * x, y: 2 * y };
    },
  },
  ripple: {
    label: 'x² + y² + 0.4·sin(3x)·sin(3y)',
    domain: { xMin: -2.5, xMax: 2.5, yMin: -2.5, yMax: 2.5 },
    start: { x: 2.3, y: -2.1 },
    f(x, y) {
      return x * x + y * y + 0.4 * Math.sin(3 * x) * Math.sin(3 * y);
    },
    grad(x, y) {
      return {
        x: 2 * x + 1.2 * Math.cos(3 * x) * Math.sin(3 * y),
        y: 2 * y + 1.2 * Math.sin(3 * x) * Math.cos(3 * y),
      };
    },
  },
  rosenbrock: {
    label: 'Розенброк',
    domain: { xMin: -2, xMax: 2, yMin: -1, yMax: 3 },
    start: { x: -1.5, y: 2.5 },
    f(x, y) {
      return (1 - x) ** 2 + 10 * (y - x * x) ** 2;
    },
    grad(x, y) {
      return {
        x: -2 * (1 - x) - 40 * x * (y - x * x),
        y: 20 * (y - x * x),
      };
    },
  },
  saddle: {
    label: 'x² − y²',
    domain: { xMin: -2.5, xMax: 2.5, yMin: -2.5, yMax: 2.5 },
    start: { x: 2.0, y: 2.0 },
    f(x, y) {
      return x * x - y * y;
    },
    grad(x, y) {
      return { x: 2 * x, y: -2 * y };
    },
  },
};

const HEIGHT_SCALE = 0.22;
const SURFACE_RES = 80;
const STEP_INTERVAL_MS = 280;

const root = document.getElementById(ROOT_ID) || document.getElementById(FULLPAGE_ID);
if (!root) {
  // Module loaded without a mount point.
} else {
  const fullpage = root.id === FULLPAGE_ID;
  const $ = (sel) => root.querySelector(sel);

  const canvasHost = $('.gdx-canvas');
  const fnSelect = $('#gdx-fn-select');
  const lrRange = $('#gdx-lr-range');
  const lrValue = $('#gdx-lr-value');
  const btnPlay = $('#gdx-btn-play');
  const btnStep = $('#gdx-btn-step');
  const btnReset = $('#gdx-btn-reset');
  const metricsEl = $('.gdx-metrics');
  const vrSlot = $('.gdx-vr-slot');

  let fnKey = fnSelect.value;
  let learningRate = Number(lrRange.value);
  let running = true;
  let lastStepAt = 0;
  let pos = { x: 0, y: 0 };
  let path = [];
  let stepCount = 0;

  function sceneColors() {
    const dark = document.documentElement.getAttribute('data-theme') !== 'light';
    return {
      bg: dark ? 0x0a0a0f : 0xf0f2f8,
      fog: dark ? 0x0a0a0f : 0xf0f2f8,
    };
  }

  const colors = sceneColors();
  const scene = new THREE.Scene();
  scene.background = new THREE.Color(colors.bg);
  scene.fog = new THREE.Fog(colors.fog, 8, 22);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.05, 100);
  camera.position.set(4.2, 3.4, 4.8);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  renderer.xr.enabled = true;
  canvasHost.appendChild(renderer.domElement);

  const vrButton = VRButton.createButton(renderer);
  vrButton.classList.add('gdx-vr-button');
  (vrSlot || root).appendChild(vrButton);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.target.set(0, 0.8, 0);
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.minDistance = 2;
  controls.maxDistance = 14;

  scene.add(new THREE.AmbientLight(0x6677aa, 0.45));
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.1);
  keyLight.position.set(5, 9, 4);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  scene.add(keyLight);
  scene.add(new THREE.HemisphereLight(0x8899ff, 0x111118, 0.35));

  const world = new THREE.Group();
  scene.add(world);

  let surfaceMesh = null;
  let wireMesh = null;
  let gridHelper = null;
  let pathLine = null;
  let gradArrow = null;
  let ball = null;
  let minMarker = null;
  let axisLabels = [];

  function currentFn() {
    return FUNCTIONS[fnKey];
  }

  function heightAt(x, y) {
    return currentFn().f(x, y) * HEIGHT_SCALE;
  }

  function toWorld(x, y) {
    return new THREE.Vector3(x, heightAt(x, y) + 0.03, y);
  }

  function colorForHeight(t) {
    const c = new THREE.Color();
    c.setHSL(0.62 - t * 0.48, 0.72, 0.38 + t * 0.18);
    return c;
  }

  function buildSurface() {
    if (surfaceMesh) {
      world.remove(surfaceMesh);
      surfaceMesh.geometry.dispose();
      surfaceMesh.material.dispose();
    }
    if (wireMesh) {
      world.remove(wireMesh);
      wireMesh.geometry.dispose();
      wireMesh.material.dispose();
    }

    const spec = currentFn();
    const { xMin, xMax, yMin, yMax } = spec.domain;
    const geo = new THREE.PlaneGeometry(xMax - xMin, yMax - yMin, SURFACE_RES, SURFACE_RES);
    geo.rotateX(-Math.PI / 2);

    const posAttr = geo.attributes.position;
    let fMin = Infinity;
    let fMax = -Infinity;
    const heights = [];

    for (let i = 0; i < posAttr.count; i++) {
      const lx = posAttr.getX(i);
      const lz = posAttr.getZ(i);
      const x = lx + (xMin + xMax) / 2;
      const y = lz + (yMin + yMax) / 2;
      const h = heightAt(x, y);
      heights.push(h);
      fMin = Math.min(fMin, h);
      fMax = Math.max(fMax, h);
      posAttr.setY(i, h);
    }

    const colorBuf = [];
    for (let i = 0; i < heights.length; i++) {
      const t = fMax === fMin ? 0.5 : (heights[i] - fMin) / (fMax - fMin);
      const c = colorForHeight(t);
      colorBuf.push(c.r, c.g, c.b);
    }
    geo.setAttribute('color', new THREE.Float32BufferAttribute(colorBuf, 3));
    geo.computeVertexNormals();

    surfaceMesh = new THREE.Mesh(
      geo,
      new THREE.MeshStandardMaterial({
        vertexColors: true,
        roughness: 0.55,
        metalness: 0.08,
        side: THREE.DoubleSide,
      }),
    );
    surfaceMesh.receiveShadow = true;
    world.add(surfaceMesh);

    wireMesh = new THREE.Mesh(
      geo.clone(),
      new THREE.MeshBasicMaterial({
        color: 0x334466,
        wireframe: true,
        transparent: true,
        opacity: 0.14,
      }),
    );
    world.add(wireMesh);

    if (gridHelper) world.remove(gridHelper);
    const span = Math.max(xMax - xMin, yMax - yMin);
    gridHelper = new THREE.GridHelper(span, 16, 0x3a3a55, 0x222233);
    gridHelper.position.y = -0.01;
    world.add(gridHelper);

    rebuildAxisLabels();
    placeMinimumMarker();
  }

  function rebuildAxisLabels() {
    axisLabels.forEach((s) => {
      world.remove(s);
      s.material.map.dispose();
      s.material.dispose();
    });
    axisLabels = [];

    const spec = currentFn();
    const { xMin, xMax, yMin, yMax } = spec.domain;
    const labels = [
      { text: 'x', pos: new THREE.Vector3((xMin + xMax) / 2, 0.02, yMin - 0.35) },
      { text: 'y', pos: new THREE.Vector3(xMax + 0.35, 0.02, (yMin + yMax) / 2) },
      { text: 'f(x,y)', pos: new THREE.Vector3(xMin - 0.5, 1.8, yMin - 0.35) },
    ];

    labels.forEach(({ text, pos: labelPos }) => {
      const sprite = makeTextSprite(text);
      sprite.position.copy(labelPos);
      world.add(sprite);
      axisLabels.push(sprite);
    });
  }

  function makeTextSprite(text) {
    const canvas = document.createElement('canvas');
    canvas.width = 128;
    canvas.height = 64;
    const ctx = canvas.getContext('2d');
    ctx.clearRect(0, 0, canvas.width, canvas.height);
    ctx.font = 'bold 28px sans-serif';
    ctx.fillStyle = '#9898b8';
    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.fillText(text, canvas.width / 2, canvas.height / 2);

    const texture = new THREE.CanvasTexture(canvas);
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true });
    const sprite = new THREE.Sprite(material);
    sprite.scale.set(0.9, 0.45, 1);
    return sprite;
  }

  function placeMinimumMarker() {
    if (minMarker) world.remove(minMarker);
    const spec = currentFn();
    let best = { x: spec.start.x, y: spec.start.y, v: spec.f(spec.start.x, spec.start.y) };
    const { xMin, xMax, yMin, yMax } = spec.domain;
    const samples = 40;
    for (let i = 0; i <= samples; i++) {
      for (let j = 0; j <= samples; j++) {
        const x = xMin + ((xMax - xMin) * i) / samples;
        const y = yMin + ((yMax - yMin) * j) / samples;
        const v = spec.f(x, y);
        if (v < best.v) best = { x, y, v };
      }
    }

    const ring = new THREE.Mesh(
      new THREE.RingGeometry(0.12, 0.18, 32),
      new THREE.MeshBasicMaterial({
        color: 0x44ff99,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(toWorld(best.x, best.y));
    ring.position.y += 0.02;
    minMarker = ring;
    world.add(minMarker);
  }

  function ensureMarkers() {
    if (!ball) {
      ball = new THREE.Mesh(
        new THREE.SphereGeometry(0.09, 24, 24),
        new THREE.MeshStandardMaterial({ color: 0xff6644, emissive: 0x441100, roughness: 0.35 }),
      );
      ball.castShadow = true;
      world.add(ball);
    }

    if (!pathLine) {
      pathLine = new THREE.Line(
        new THREE.BufferGeometry(),
        new THREE.LineBasicMaterial({ color: 0xffaa66 }),
      );
      world.add(pathLine);
    }

    if (!gradArrow) {
      gradArrow = new THREE.ArrowHelper(new THREE.Vector3(1, 0, 0), new THREE.Vector3(), 0.6, 0x66aaff, 0.14, 0.08);
      world.add(gradArrow);
    }
  }

  function resetOptimizer() {
    const spec = currentFn();
    pos = { ...spec.start };
    path = [toWorld(pos.x, pos.y).clone()];
    stepCount = 0;
    lastStepAt = performance.now();
    updateMarkers();
    updateMetrics();
  }

  function gradientStep() {
    const spec = currentFn();
    const g = spec.grad(pos.x, pos.y);
    const gNorm = Math.hypot(g.x, g.y);
    if (gNorm < 1e-5) {
      running = false;
      btnPlay.textContent = 'Старт';
      btnPlay.classList.remove('active');
      return;
    }

    pos.x -= learningRate * g.x;
    pos.y -= learningRate * g.y;

    const { xMin, xMax, yMin, yMax } = spec.domain;
    pos.x = THREE.MathUtils.clamp(pos.x, xMin, xMax);
    pos.y = THREE.MathUtils.clamp(pos.y, yMin, yMax);

    path.push(toWorld(pos.x, pos.y).clone());
    stepCount += 1;
    updateMarkers();
    updateMetrics();
  }

  function updateMarkers() {
    ensureMarkers();
    const w = toWorld(pos.x, pos.y);
    ball.position.copy(w);
    pathLine.geometry.setFromPoints(path.map((p) => p.clone()));

    const g = currentFn().grad(pos.x, pos.y);
    const gLen = Math.hypot(g.x, g.y);
    if (gLen > 1e-6) {
      const dir = new THREE.Vector3(-g.x, 0, -g.y).normalize();
      const arrowLen = Math.min(1.2, 0.25 + gLen * 0.15);
      gradArrow.setDirection(dir);
      gradArrow.position.copy(w);
      gradArrow.setLength(arrowLen, arrowLen * 0.22, arrowLen * 0.14);
      gradArrow.visible = true;
    } else {
      gradArrow.visible = false;
    }
  }

  function updateMetrics() {
    const spec = currentFn();
    const value = spec.f(pos.x, pos.y);
    const g = spec.grad(pos.x, pos.y);
    metricsEl.textContent =
      `f = ${spec.label}\n` +
      `x = ${pos.x.toFixed(4)}  y = ${pos.y.toFixed(4)}\n` +
      `f(x,y) = ${value.toFixed(5)}\n` +
      `∇f = (${g.x.toFixed(3)}, ${g.y.toFixed(3)})\n` +
      `шаг: ${stepCount}`;
  }

  function resize() {
    const w = canvasHost.clientWidth;
    const h = canvasHost.clientHeight || (fullpage ? window.innerHeight : 420);
    if (w < 1 || h < 1) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  fnSelect.addEventListener('change', () => {
    fnKey = fnSelect.value;
    buildSurface();
    resetOptimizer();
  });

  lrRange.addEventListener('input', () => {
    learningRate = Number(lrRange.value);
    lrValue.textContent = learningRate.toFixed(2);
  });

  btnPlay.addEventListener('click', () => {
    running = !running;
    btnPlay.textContent = running ? 'Пауза' : 'Старт';
    btnPlay.classList.toggle('active', running);
    lastStepAt = performance.now();
  });

  btnStep.addEventListener('click', () => gradientStep());

  btnReset.addEventListener('click', () => {
    resetOptimizer();
    if (!running) {
      running = true;
      btnPlay.textContent = 'Пауза';
      btnPlay.classList.add('active');
    }
  });

  const ro = new ResizeObserver(resize);
  ro.observe(canvasHost);
  if (fullpage) window.addEventListener('resize', resize);

  new MutationObserver(() => {
    const next = sceneColors();
    scene.background.set(next.bg);
    scene.fog.color.set(next.fog);
  }).observe(document.documentElement, { attributes: true, attributeFilter: ['data-theme'] });

  renderer.setAnimationLoop((time) => {
    if (running && time - lastStepAt >= STEP_INTERVAL_MS) {
      gradientStep();
      lastStepAt = time;
    }
    if (minMarker) minMarker.rotation.z += 0.012;
    controls.update();
    renderer.render(scene, camera);
  });

  buildSurface();
  resetOptimizer();
  resize();
}
