/**
 * 3D multi-optimizer landscape with WebXR.
 * Embeds in #gradient-descent-xr-demo or fullscreen #gradient-descent-xr-fullpage.
 */
import * as THREE from 'three';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { VRButton } from 'three/addons/webxr/VRButton.js';

const ROOT_ID = 'gradient-descent-xr-demo';
const FULLPAGE_ID = 'gradient-descent-xr-fullpage';
/** Semver визуализации — показывается в углу канваса. */
const GDX_VIS_VERSION = '1.3.3';

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

const OPTIMIZER_DEFS = [
  { id: 'sgd', label: 'SGD', color: 0xff6644, initState: () => ({}) },
  { id: 'momentum', label: 'Momentum', color: 0x66aaff, initState: () => ({ vx: 0, vy: 0 }) },
  { id: 'adam', label: 'Adam', color: 0x44dd88, initState: () => ({ mx: 0, my: 0, vx: 0, vy: 0, t: 0 }) },
  { id: 'rmsprop', label: 'RMSprop', color: 0xcc66ff, initState: () => ({ sx: 0, sy: 0 }) },
];

const HEIGHT_SCALE = 0.22;
const SURFACE_RES = 80;
const SURFACE_OPACITY = 0.38;
const PATH_OPACITY = 0.55;
const BALL_OPACITY = 0.72;
const STEP_INTERVAL_MS = 280;
const VR_PULLBACK = 2.2;
const GRAD_EPS = 1e-5;

const root = document.getElementById(ROOT_ID) || document.getElementById(FULLPAGE_ID);
if (!root) {
  // Module loaded without a mount point.
} else {
  try {
    initGradientDescent(root);
  } catch (err) {
    console.error('[gdx-vis]', err);
    showInitError(root, err);
  }
}

function showInitError(root, err) {
  const box = root.querySelector('.gdx-metrics') || root;
  const msg = document.createElement('p');
  msg.className = 'gdx-init-error';
  msg.textContent = `Не удалось загрузить 3D: ${err?.message || err}`;
  box.prepend(msg);
  const badge = document.createElement('div');
  badge.className = 'gdx-version-badge';
  badge.textContent = `gdx-vis v${GDX_VIS_VERSION} · error`;
  (root.querySelector('.gdx-canvas-wrap') || root).appendChild(badge);
}

function initGradientDescent(root) {
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
  let stepCount = 0;
  let pendingVrPose = null;
  let inVr = false;
  let pointerInside = false;
  let vrLookDrag = false;
  let vrPanDrag = false;
  let vrMouseActive = false;
  let lastPointer = { x: 0, y: 0 };
  let orbitDragged = false;

  const versionBadge = document.createElement('div');
  versionBadge.className = 'gdx-version-badge';
  versionBadge.setAttribute('aria-label', `Версия визуализации ${GDX_VIS_VERSION}`);
  (canvasHost.parentElement || canvasHost).appendChild(versionBadge);

  function refreshVersionBadge() {
    const mouseHint = inVr && vrMouseActive ? ' · mouse VR' : '';
    versionBadge.textContent = `gdx-vis v${GDX_VIS_VERSION}${mouseHint}`;
    versionBadge.classList.toggle('gdx-mouse-on', inVr && vrMouseActive);
  }
  refreshVersionBadge();

  const raycaster = new THREE.Raycaster();
  const pointerNdc = new THREE.Vector2();
  const IPD = 0.064;

  /** @type {Array<{id:string,label:string,color:number,pos:{x:number,y:number},path:THREE.Vector3[],state:object,ball:THREE.Mesh|null,pathLine:THREE.Line|null,done:boolean}>} */
  let optimizers = [];

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
  scene.fog = new THREE.Fog(colors.fog, 10, 28);

  const sceneRoot = new THREE.Group();
  scene.add(sceneRoot);

  const camera = new THREE.PerspectiveCamera(55, 1, 0.05, 100);
  camera.position.set(5.4, 4.0, 5.8);

  const renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
  renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
  renderer.shadowMap.enabled = true;
  const xrAvailable = typeof navigator !== 'undefined' && 'xr' in navigator;
  if (xrAvailable) renderer.xr.enabled = true;
  canvasHost.appendChild(renderer.domElement);

  let vrButton;
  if (xrAvailable) {
    vrButton = VRButton.createButton(renderer);
  } else {
    vrButton = document.createElement('button');
    vrButton.type = 'button';
    vrButton.textContent = 'VR NOT SUPPORTED';
    vrButton.disabled = true;
  }
  vrButton.classList.add('gdx-vr-button');
  vrButton.title = 'Сначала настройте обзор мышью';
  (vrSlot || root).appendChild(vrButton);

  const controls = new OrbitControls(camera, renderer.domElement);
  controls.enableDamping = true;
  controls.dampingFactor = 0.06;
  controls.target.set(0, 0.8, 0);
  controls.maxPolarAngle = Math.PI * 0.48;
  controls.minDistance = 3;
  controls.maxDistance = 16;

  scene.add(new THREE.AmbientLight(0x6677aa, 0.5));
  const keyLight = new THREE.DirectionalLight(0xffffff, 1.0);
  keyLight.position.set(5, 9, 4);
  keyLight.castShadow = true;
  keyLight.shadow.mapSize.set(1024, 1024);
  scene.add(keyLight);
  scene.add(new THREE.HemisphereLight(0x8899ff, 0x111118, 0.35));

  const world = new THREE.Group();
  sceneRoot.add(world);

  const pointerRig = new THREE.Group();
  scene.add(pointerRig);

  const laserGeom = new THREE.BufferGeometry().setFromPoints([new THREE.Vector3(), new THREE.Vector3()]);
  const laserLine = new THREE.Line(
    laserGeom,
    new THREE.LineBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.35, depthWrite: false }),
  );
  pointerRig.add(laserLine);

  function makeReticle(color) {
    return new THREE.Mesh(
      new THREE.RingGeometry(0.028, 0.042, 24),
      new THREE.MeshBasicMaterial({
        color,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: 0.85,
        depthWrite: false,
      }),
    );
  }

  const stereoCursors = new THREE.Group();
  const leftReticle = makeReticle(0x66ccff);
  const rightReticle = makeReticle(0xff8866);
  const hitReticle = new THREE.Mesh(
    new THREE.RingGeometry(0.05, 0.07, 32),
    new THREE.MeshBasicMaterial({
      color: 0xffffff,
      side: THREE.DoubleSide,
      transparent: true,
      opacity: 0.55,
      depthWrite: false,
    }),
  );
  const hitDot = new THREE.Mesh(
    new THREE.SphereGeometry(0.022, 16, 16),
    new THREE.MeshBasicMaterial({ color: 0xffffff, transparent: true, opacity: 0.7, depthWrite: false }),
  );
  stereoCursors.add(leftReticle, rightReticle, hitReticle, hitDot);
  pointerRig.add(stereoCursors);
  pointerRig.visible = false;

  let surfaceMesh = null;
  let wireMesh = null;
  let gridHelper = null;
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

  function gradNorm(x, y) {
    const g = currentFn().grad(x, y);
    return Math.hypot(g.x, g.y);
  }

  function clampPos(pos) {
    const { xMin, xMax, yMin, yMax } = currentFn().domain;
    pos.x = THREE.MathUtils.clamp(pos.x, xMin, xMax);
    pos.y = THREE.MathUtils.clamp(pos.y, yMin, yMax);
  }

  function colorForHeight(t) {
    const c = new THREE.Color();
    c.setHSL(0.62 - t * 0.48, 0.72, 0.38 + t * 0.18);
    return c;
  }

  function hexColor(hex) {
    return `#${hex.toString(16).padStart(6, '0')}`;
  }

  function getActiveCamera() {
    if (inVr && renderer.xr.isPresenting) return renderer.xr.getCamera();
    return camera;
  }

  function getRaycastCamera() {
    const cam = getActiveCamera();
    if (cam.isArrayCamera && cam.cameras?.length) return cam.cameras[0];
    return cam;
  }

  function updatePointerNdc(event) {
    const rect = renderer.domElement.getBoundingClientRect();
    pointerNdc.x = ((event.clientX - rect.left) / rect.width) * 2 - 1;
    pointerNdc.y = -((event.clientY - rect.top) / rect.height) * 2 + 1;
  }

  function pickSurfaceHit() {
    if (!surfaceMesh) return null;
    const cam = getRaycastCamera();
    cam.updateMatrixWorld(true);
    raycaster.setFromCamera(pointerNdc, cam);
    const hits = raycaster.intersectObject(surfaceMesh, false);
    return hits[0] || null;
  }

  function setStartFromHit(hit) {
    const local = world.worldToLocal(hit.point.clone());
    const start = { x: local.x, y: local.z };
    clampPos(start);
    FUNCTIONS[fnKey].start = { ...start };
    resetOptimizers();
  }

  function updateStereoCursor() {
    if (!pointerInside || !surfaceMesh) {
      pointerRig.visible = false;
      return;
    }

    const hit = pickSurfaceHit();
    if (!hit || !hit.face?.normal) {
      pointerRig.visible = false;
      return;
    }

    const cam = getRaycastCamera();
    cam.updateMatrixWorld(true);
    const camPos = new THREE.Vector3();
    const camQuat = new THREE.Quaternion();
    cam.getWorldPosition(camPos);
    cam.getWorldQuaternion(camQuat);

    const pt = hit.point.clone();
    surfaceMesh.updateWorldMatrix(true, false);
    const normal = hit.face.normal.clone().transformDirection(surfaceMesh.matrixWorld).normalize();

    pointerRig.visible = true;
    laserGeom.setFromPoints([camPos, pt]);
    laserGeom.attributes.position.needsUpdate = true;

    hitReticle.position.copy(pt);
    hitReticle.quaternion.setFromUnitVectors(new THREE.Vector3(0, 0, 1), normal);
    hitDot.position.copy(pt).addScaledVector(normal, 0.025);

    const camRight = new THREE.Vector3(1, 0, 0).applyQuaternion(camQuat);
    const dist = Math.max(camPos.distanceTo(pt), 0.5);
    const halfIpd = (IPD * 0.5) * Math.min(dist / 3.5, 1.35);

    leftReticle.position.copy(pt).addScaledVector(camRight, -halfIpd);
    rightReticle.position.copy(pt).addScaledVector(camRight, halfIpd);
    leftReticle.quaternion.copy(hitReticle.quaternion);
    rightReticle.quaternion.copy(hitReticle.quaternion);

    const stereoActive = inVr && renderer.xr.isPresenting;
    leftReticle.visible = stereoActive;
    rightReticle.visible = stereoActive;
    hitReticle.visible = true;
    hitDot.visible = !stereoActive;
  }

  function getViewQuaternion() {
    const q = new THREE.Quaternion();
    getActiveCamera().getWorldQuaternion(q);
    return q;
  }

  function vrDolly(delta) {
    const fwd = new THREE.Vector3(0, 0, -1).applyQuaternion(getViewQuaternion());
    sceneRoot.position.addScaledVector(fwd, delta);
  }

  function vrPanScreen(dx, dy) {
    const q = getViewQuaternion();
    const right = new THREE.Vector3(1, 0, 0).applyQuaternion(q);
    const up = new THREE.Vector3(0, 1, 0).applyQuaternion(q);
    sceneRoot.position.addScaledVector(right, -dx * 0.005);
    sceneRoot.position.addScaledVector(up, dy * 0.005);
  }

  function vrRotateScreen(dx, dy) {
    sceneRoot.rotation.y -= dx * 0.004;
    sceneRoot.rotation.x = THREE.MathUtils.clamp(sceneRoot.rotation.x - dy * 0.004, -0.85, 0.85);
  }

  function isMouseLikePointer(event) {
    return event.pointerType === 'mouse' || event.pointerType === 'pen';
  }

  function noteVrMouse(event) {
    if (inVr && isMouseLikePointer(event)) {
      vrMouseActive = true;
      refreshVersionBadge();
    }
  }

  function updatePointerFromClient(clientX, clientY) {
    const rect = renderer.domElement.getBoundingClientRect();
    const w = rect.width || window.innerWidth;
    const h = rect.height || window.innerHeight;
    pointerNdc.x = ((clientX - rect.left) / w) * 2 - 1;
    pointerNdc.y = -((clientY - rect.top) / h) * 2 + 1;
  }

  function handlePointerMove(event) {
    noteVrMouse(event);
    updatePointerNdc(event);
    const dx = event.clientX - lastPointer.x;
    const dy = event.clientY - lastPointer.y;

    if (inVr) {
      if (vrLookDrag && (event.buttons & 1)) vrRotateScreen(dx, dy);
      if (vrPanDrag && (event.buttons & 2 || event.buttons & 4)) vrPanScreen(dx, dy);
    }

    lastPointer.x = event.clientX;
    lastPointer.y = event.clientY;
  }

  function handleWheel(event) {
    if (!inVr) return;
    noteVrMouse(event);
    event.preventDefault();
    event.stopPropagation();
    const delta = event.deltaY * (event.deltaMode === 1 ? 24 : 1);
    if (event.shiftKey) {
      const s = THREE.MathUtils.clamp(sceneRoot.scale.x - delta * 0.0015, 0.35, 2.5);
      sceneRoot.scale.setScalar(s);
    } else {
      vrDolly(delta * 0.003);
    }
  }

  function onWindowMouseMove(event) {
    if (!inVr) return;
    vrMouseActive = true;
    refreshVersionBadge();
    pointerInside = true;
    updatePointerFromClient(event.clientX, event.clientY);
    const dx = event.clientX - lastPointer.x;
    const dy = event.clientY - lastPointer.y;
    if (vrLookDrag && (event.buttons & 1)) vrRotateScreen(dx, dy);
    if (vrPanDrag && (event.buttons & 2 || event.buttons & 4)) vrPanScreen(dx, dy);
    lastPointer.x = event.clientX;
    lastPointer.y = event.clientY;
  }

  function onWindowMouseDown(event) {
    if (!inVr) return;
    vrMouseActive = true;
    refreshVersionBadge();
    updatePointerFromClient(event.clientX, event.clientY);
    lastPointer.x = event.clientX;
    lastPointer.y = event.clientY;
    vrLookDrag = event.button === 0;
    vrPanDrag = event.button === 1 || event.button === 2;
    event.preventDefault();
  }

  function onWindowMouseUp() {
    vrLookDrag = false;
    vrPanDrag = false;
  }

  function attachVrMouseListeners() {
    window.addEventListener('pointermove', handlePointerMove, { passive: true });
    window.addEventListener('pointerdown', handlePointerDown, { capture: true });
    window.addEventListener('pointerup', handlePointerUp, { capture: true });
    window.addEventListener('pointercancel', handlePointerUp, { capture: true });
    window.addEventListener('wheel', handleWheel, { passive: false, capture: true });
    window.addEventListener('mousemove', onWindowMouseMove, { passive: true });
    window.addEventListener('mousedown', onWindowMouseDown, { capture: true });
    window.addEventListener('mouseup', onWindowMouseUp, { capture: true });
    window.addEventListener('contextmenu', preventContextInVr, { capture: true });
  }

  function detachVrMouseListeners() {
    window.removeEventListener('pointermove', handlePointerMove);
    window.removeEventListener('pointerdown', handlePointerDown, { capture: true });
    window.removeEventListener('pointerup', handlePointerUp, { capture: true });
    window.removeEventListener('pointercancel', handlePointerUp, { capture: true });
    window.removeEventListener('wheel', handleWheel, { capture: true });
    window.removeEventListener('mousemove', onWindowMouseMove);
    window.removeEventListener('mousedown', onWindowMouseDown, { capture: true });
    window.removeEventListener('mouseup', onWindowMouseUp, { capture: true });
    window.removeEventListener('contextmenu', preventContextInVr, { capture: true });
  }

  function preventContextInVr(event) {
    if (inVr) event.preventDefault();
  }

  function handlePointerDown(event) {
    updatePointerNdc(event);
    lastPointer.x = event.clientX;
    lastPointer.y = event.clientY;
    orbitDragged = false;
    if (event.shiftKey) controls.enabled = false;
    if (inVr) {
      noteVrMouse(event);
      vrLookDrag = event.button === 0;
      vrPanDrag = event.button === 1 || event.button === 2;
      event.preventDefault();
    }
  }

  function handlePointerUp() {
    vrLookDrag = false;
    vrPanDrag = false;
    if (!inVr) controls.enabled = true;
  }

  function buildOptimizers() {
    optimizers.forEach((opt) => {
      if (opt.ball) {
        world.remove(opt.ball);
        opt.ball.geometry.dispose();
        opt.ball.material.dispose();
      }
      if (opt.pathLine) {
        world.remove(opt.pathLine);
        opt.pathLine.geometry.dispose();
        opt.pathLine.material.dispose();
      }
    });

    const spec = currentFn();
    optimizers = OPTIMIZER_DEFS.map((def) => {
      const pos = { ...spec.start };
      const ball = new THREE.Mesh(
        new THREE.SphereGeometry(0.075, 20, 20),
        new THREE.MeshStandardMaterial({
          color: def.color,
          emissive: def.color,
          emissiveIntensity: 0.15,
          roughness: 0.35,
          transparent: true,
          opacity: BALL_OPACITY,
          depthWrite: false,
        }),
      );
      ball.castShadow = false;
      world.add(ball);

      const pathLine = new THREE.Line(
        new THREE.BufferGeometry(),
        new THREE.LineBasicMaterial({
          color: def.color,
          transparent: true,
          opacity: PATH_OPACITY,
          depthWrite: false,
        }),
      );
      world.add(pathLine);

      return {
        id: def.id,
        label: def.label,
        color: def.color,
        pos,
        path: [toWorld(pos.x, pos.y).clone()],
        state: def.initState(),
        ball,
        pathLine,
        done: false,
      };
    });
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
        metalness: 0.06,
        side: THREE.DoubleSide,
        transparent: true,
        opacity: SURFACE_OPACITY,
        depthWrite: false,
      }),
    );
    surfaceMesh.renderOrder = 1;
    world.add(surfaceMesh);

    wireMesh = new THREE.Mesh(
      geo.clone(),
      new THREE.MeshBasicMaterial({
        color: 0x4466aa,
        wireframe: true,
        transparent: true,
        opacity: 0.1,
        depthWrite: false,
      }),
    );
    wireMesh.renderOrder = 2;
    world.add(wireMesh);

    if (gridHelper) world.remove(gridHelper);
    const span = Math.max(xMax - xMin, yMax - yMax);
    gridHelper = new THREE.GridHelper(Math.max(xMax - xMin, yMax - yMin), 16, 0x3a3a55, 0x222233);
    gridHelper.position.y = -0.01;
    const gridMats = Array.isArray(gridHelper.material) ? gridHelper.material : [gridHelper.material];
    gridMats.forEach((m) => {
      m.transparent = true;
      m.opacity = 0.35;
    });
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
    const material = new THREE.SpriteMaterial({ map: texture, transparent: true, opacity: 0.75 });
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
        opacity: 0.5,
        depthWrite: false,
      }),
    );
    ring.rotation.x = -Math.PI / 2;
    ring.position.copy(toWorld(best.x, best.y));
    ring.position.y += 0.02;
    minMarker = ring;
    world.add(minMarker);
  }

  function stepSGD(opt, g, lr) {
    opt.pos.x -= lr * g.x;
    opt.pos.y -= lr * g.y;
  }

  function stepMomentum(opt, g, lr) {
    const beta = 0.9;
    opt.state.vx = beta * opt.state.vx + g.x;
    opt.state.vy = beta * opt.state.vy + g.y;
    opt.pos.x -= lr * opt.state.vx;
    opt.pos.y -= lr * opt.state.vy;
  }

  function stepAdam(opt, g, lr) {
    const b1 = 0.9;
    const b2 = 0.999;
    const eps = 1e-8;
    opt.state.t += 1;
    opt.state.mx = b1 * opt.state.mx + (1 - b1) * g.x;
    opt.state.my = b1 * opt.state.my + (1 - b1) * g.y;
    opt.state.vx = b2 * opt.state.vx + (1 - b2) * g.x * g.x;
    opt.state.vy = b2 * opt.state.vy + (1 - b2) * g.y * g.y;
    const t = opt.state.t;
    const mxHat = opt.state.mx / (1 - b1 ** t);
    const myHat = opt.state.my / (1 - b1 ** t);
    const vxHat = opt.state.vx / (1 - b2 ** t);
    const vyHat = opt.state.vy / (1 - b2 ** t);
    opt.pos.x -= (lr * mxHat) / (Math.sqrt(vxHat) + eps);
    opt.pos.y -= (lr * myHat) / (Math.sqrt(vyHat) + eps);
  }

  function stepRMSprop(opt, g, lr) {
    const decay = 0.9;
    const eps = 1e-8;
    opt.state.sx = decay * opt.state.sx + (1 - decay) * g.x * g.x;
    opt.state.sy = decay * opt.state.sy + (1 - decay) * g.y * g.y;
    opt.pos.x -= (lr * g.x) / (Math.sqrt(opt.state.sx) + eps);
    opt.pos.y -= (lr * g.y) / (Math.sqrt(opt.state.sy) + eps);
  }

  const STEP_FN = {
    sgd: stepSGD,
    momentum: stepMomentum,
    adam: stepAdam,
    rmsprop: stepRMSprop,
  };

  function optimizerStep(opt) {
    if (opt.done) return false;
    const spec = currentFn();
    const g = spec.grad(opt.pos.x, opt.pos.y);
    const gNorm = Math.hypot(g.x, g.y);
    if (gNorm < GRAD_EPS) {
      opt.done = true;
      return false;
    }
    STEP_FN[opt.id](opt, g, learningRate);
    clampPos(opt.pos);
    opt.path.push(toWorld(opt.pos.x, opt.pos.y).clone());
    return true;
  }

  function updateMarkers() {
    optimizers.forEach((opt) => {
      const w = toWorld(opt.pos.x, opt.pos.y);
      opt.ball.position.copy(w);
      opt.pathLine.geometry.setFromPoints(opt.path.map((p) => p.clone()));
      opt.ball.material.opacity = opt.done ? BALL_OPACITY * 0.45 : BALL_OPACITY;
    });
  }

  function resetOptimizers() {
    buildOptimizers();
    stepCount = 0;
    lastStepAt = performance.now();
    updateMarkers();
    updateMetrics();
  }

  function simulationStep() {
    let anyMoved = false;
    optimizers.forEach((opt) => {
      if (optimizerStep(opt)) anyMoved = true;
    });
    if (!anyMoved) {
      running = false;
      btnPlay.textContent = 'Старт';
      btnPlay.classList.remove('active');
    }
    stepCount += 1;
    updateMarkers();
    updateMetrics();
  }

  function updateMetrics() {
    const spec = currentFn();
    const lines = optimizers.map((opt) => {
      const f = spec.f(opt.pos.x, opt.pos.y);
      const mark = opt.done ? ' ✓' : '';
      return `${opt.label.padEnd(9)} f=${f.toFixed(4)}  (${opt.pos.x.toFixed(2)}, ${opt.pos.y.toFixed(2)})${mark}`;
    });
    metricsEl.textContent = `шаг ${stepCount}  ·  α=${learningRate.toFixed(2)}  ·  ${spec.label}\n${lines.join('\n')}`;
  }

  function captureVrPose() {
    camera.updateMatrixWorld();
    pendingVrPose = {
      position: camera.position.clone(),
      quaternion: camera.quaternion.clone(),
    };
  }

  function applyVrView() {
    if (!pendingVrPose) return;

    const poseMatrix = new THREE.Matrix4();
    poseMatrix.compose(
      pendingVrPose.position,
      pendingVrPose.quaternion,
      new THREE.Vector3(1, 1, 1),
    );
    const inv = poseMatrix.clone().invert();
    sceneRoot.matrix.copy(inv);
    sceneRoot.matrix.decompose(sceneRoot.position, sceneRoot.quaternion, sceneRoot.scale);

    const back = new THREE.Vector3(0, 0, VR_PULLBACK);
    back.applyQuaternion(pendingVrPose.quaternion);
    sceneRoot.position.add(back);
  }

  function resetVrView() {
    sceneRoot.position.set(0, 0, 0);
    sceneRoot.quaternion.set(0, 0, 0, 1);
    sceneRoot.scale.set(1, 1, 1);
    sceneRoot.matrix.identity();
    pendingVrPose = null;
  }

  function resize() {
    const w = canvasHost.clientWidth;
    const h = canvasHost.clientHeight || (fullpage ? window.innerHeight : 420);
    if (w < 1 || h < 1) return;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h, false);
  }

  vrButton.addEventListener('pointerdown', captureVrPose);

  if (renderer.xr?.addEventListener) {
    renderer.xr.addEventListener('sessionstart', () => {
      inVr = true;
      controls.enabled = false;
      applyVrView();
      renderer.domElement.classList.add('gdx-vr-active');
      attachVrMouseListeners();
      refreshVersionBadge();
    });

    renderer.xr.addEventListener('sessionend', () => {
      inVr = false;
      controls.enabled = true;
      resetVrView();
      renderer.domElement.classList.remove('gdx-vr-active');
      vrLookDrag = false;
      vrPanDrag = false;
      vrMouseActive = false;
      detachVrMouseListeners();
      refreshVersionBadge();
    });
  }

  const canvasEl = renderer.domElement;
  canvasEl.classList.add('gdx-scene-canvas');

  canvasEl.addEventListener('pointerenter', () => {
    pointerInside = true;
  });
  canvasEl.addEventListener('pointerleave', () => {
    if (!inVr) {
      pointerInside = false;
      pointerRig.visible = false;
    }
    vrLookDrag = false;
    vrPanDrag = false;
  });
  canvasEl.addEventListener('pointermove', handlePointerMove);
  canvasEl.addEventListener('pointerdown', handlePointerDown);
  canvasEl.addEventListener('pointerup', handlePointerUp);
  canvasEl.addEventListener('pointercancel', handlePointerUp);
  if (typeof controls.addEventListener === 'function') {
    controls.addEventListener('start', () => {
      orbitDragged = true;
    });
  }
  canvasEl.addEventListener('click', (event) => {
    if (orbitDragged || vrLookDrag || vrPanDrag) return;
    if (!event.shiftKey) return;
    updatePointerNdc(event);
    const hit = pickSurfaceHit();
    if (hit) setStartFromHit(hit);
  });

  fnSelect.addEventListener('change', () => {
    fnKey = fnSelect.value;
    buildSurface();
    resetOptimizers();
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

  btnStep.addEventListener('click', () => simulationStep());

  btnReset.addEventListener('click', () => {
    resetOptimizers();
    if (!running) {
      running = true;
      btnPlay.textContent = 'Пауза';
      btnPlay.classList.add('active');
    }
  });

  root.querySelectorAll('.gdx-leg').forEach((el) => {
    const id = el.dataset.opt;
    const def = OPTIMIZER_DEFS.find((d) => d.id === id);
    if (def) el.style.color = hexColor(def.color);
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
      simulationStep();
      lastStepAt = time;
    }
    if (minMarker) minMarker.rotation.z += 0.012;
    if (!inVr) controls.update();
    updateStereoCursor();
    renderer.render(scene, camera);
  });

  buildSurface();
  buildOptimizers();
  updateMarkers();
  updateMetrics();
  resize();
}
