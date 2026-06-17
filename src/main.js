import * as THREE from 'three';

const BASE = import.meta.env.BASE_URL;

// ── Load progress ─────────────────────────────────────────────────────────────
const TOTAL_ASSETS = 6; // HDR + GLB + 4 FBX
let assetsLoaded = 0;
const percentEl = document.getElementById('loader-percent');
const barFill   = document.getElementById('loader-bar-fill');

function onAssetLoaded() {
  assetsLoaded++;
  const pct = Math.round((assetsLoaded / TOTAL_ASSETS) * 100);
  percentEl.textContent = `${pct}%`;
  barFill.style.width   = `${pct}%`;
  if (assetsLoaded === TOTAL_ASSETS) {
    const loaderEl = document.getElementById('loader');
    loaderEl.style.opacity = '0';
    setTimeout(() => loaderEl.remove(), 400);
  }
}
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';
import { OutlineEffect } from 'three/addons/effects/OutlineEffect.js';

// ── Renderer ──────────────────────────────────────────────────────────────────
const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

const outlineEffect = new OutlineEffect(renderer, {
  defaultThickness: 0.002,
  defaultColor:     [0.2, 0.2, 0.2],
  defaultAlpha:     0.55,
  defaultKeepAlive: true,
});

// ── Scene ─────────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();

// ── Camera ────────────────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(94, window.innerWidth / window.innerHeight, 0.0001, 1000);
camera.position.set(0.23806, -0.16684, 0.96153);

// ── Orbit controls ────────────────────────────────────────────────────────────
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;
orbit.dampingFactor = 0.05;
orbit.target.set(0.30464, -0.45323, -0.28885);
orbit.update();

// ── Lighting ──────────────────────────────────────────────────────────────────
const ambient = new THREE.AmbientLight(0xfff8f0, 0.7);
scene.add(ambient);

const key = new THREE.DirectionalLight(0xffe8c8, 0.3);
key.position.set(1, 3, 3);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.radius = 20;
key.shadow.bias = -0.001;
scene.add(key);

const fill = new THREE.DirectionalLight(0xfff0e0, 0.15);
fill.position.set(-3, 2, 1);
scene.add(fill);

const rim = new THREE.DirectionalLight(0xffe0b0, 0.08);
rim.position.set(0, 2, -3);
scene.add(rim);

// ── HDRI environment ──────────────────────────────────────────────────────────
const pmremGenerator = new THREE.PMREMGenerator(renderer);
pmremGenerator.compileEquirectangularShader();
scene.backgroundRotation.y = (127 * Math.PI) / 180;
let currentEnvMap = null;

function applyLighting(preset) {
  ambient.color.setHex(preset.ambient[0]); ambient.intensity = preset.ambient[1];
  key.color.setHex(preset.key[0]);         key.intensity     = preset.key[1];
  fill.color.setHex(preset.fill[0]);       fill.intensity    = preset.fill[1];
  rim.color.setHex(preset.rim[0]);         rim.intensity     = preset.rim[1];
}

function loadHDRI(filename, onLoaded, preset) {
  new RGBELoader().load(`${BASE}${filename}`, (hdrTexture) => {
    hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
    if (scene.background && typeof scene.background.dispose === 'function') scene.background.dispose();
    if (currentEnvMap) currentEnvMap.dispose();
    scene.background = hdrTexture;
    if (preset && preset.rot != null) {
      const rad = (preset.rot * Math.PI) / 180;
      scene.backgroundRotation.y = rad;
      const rotSlider = document.getElementById('rot-slider');
      const rotLabel  = document.getElementById('rot-label');
      if (rotSlider) rotSlider.value = preset.rot;
      if (rotLabel)  rotLabel.textContent = `ROT ${preset.rot}°`;
    }
    currentEnvMap = pmremGenerator.fromEquirectangular(hdrTexture).texture;
    scene.environment = currentEnvMap;
    if (preset) applyLighting(preset);
    if (onLoaded) onLoaded();
  });
}

// ambient: [color, intensity]  key: [color, intensity]  fill: [color, intensity]  rim: [color, intensity]
const HDRIS = [
  { file: 'spooky_bamboo.hdr',            label: 'Bamboo',  rot: 127,
    ambient: [0xfff8f0, 0.70], key: [0xffe8c8, 0.30], fill: [0xfff0e0, 0.15], rim: [0xffe0b0, 0.08] },
  { file: 'bambanani_sunset_2k.hdr',      label: 'Sunset',  rot: 285,
    ambient: [0xffcc88, 0.40], key: [0xff9944, 0.22], fill: [0xffbb66, 0.08], rim: [0xff6622, 0.05] },
  { file: 'ferndale_studio_07_2k.hdr',    label: 'Studio',  rot: 127,
    ambient: [0xffffff, 0.45], key: [0xfff5ee, 0.18], fill: [0xeef5ff, 0.08], rim: [0xffffff, 0.04] },
  { file: 'peppermint_powerplant_4k.hdr', label: 'Factory', rot: 231,
    ambient: [0xddeeff, 0.25], key: [0xaaccff, 0.20], fill: [0xccddff, 0.06], rim: [0x88aadd, 0.05] },
  { file: 'rostock_laage_airport_4k.hdr', label: 'Airport', rot: 360,
    ambient: [0xf0f8ff, 0.18], key: [0xffffff, 0.10], fill: [0xe8f4ff, 0.04], rim: [0xffffff, 0.02] },
];

// Build HDRI switcher buttons
const hdriBtns = document.getElementById('hdri-btns');
HDRIS.forEach((hdri) => {
  const btn = document.createElement('button');
  btn.className = 'hdri-btn';
  btn.textContent = hdri.label;
  if (hdri.file === 'spooky_bamboo.hdr') btn.classList.add('active');
  btn.addEventListener('click', () => {
    document.querySelectorAll('.hdri-btn').forEach(b => b.classList.remove('active'));
    btn.classList.add('active');
    loadHDRI(hdri.file, null, hdri);
  });
  hdriBtns.appendChild(btn);
});

// Initial load — counts toward progress bar, apply Bamboo lighting preset
loadHDRI('spooky_bamboo.hdr', onAssetLoaded, HDRIS[0]);

// ── Animation state ───────────────────────────────────────────────────────────
const clock = new THREE.Clock();
let mixer        = null;
let currentAction = null;
const actionMap  = {};
let waveRestartTimer = null;

const HIDDEN_CLIPS = new Set(['Idle', 'Tpose', 'Kicking', 'Waving']);
const DEFAULT_ANIM  = 'Wave';
const WAVE_HOLD_MS  = 3000;
const OFF_WHITE     = new THREE.Color(0xf2ede8);

// Hardcoded from gizmo session
const MODEL_POS  = new THREE.Vector3(-0.08449, -0.98729, -0.32648);
const MODEL2_POS = new THREE.Vector3( 0.60000, -0.98729, -0.27299);
const MODEL3_POS = new THREE.Vector3( 1.06497, -0.98729,  0.02278);
const MODEL4_POS = new THREE.Vector3(-0.68989, -0.98729, -0.09474);

// ── Helpers ───────────────────────────────────────────────────────────────────
function sanitizeClipTracks(clip, displayName) {
  clip.name = displayName;
  clip.tracks.forEach(track => {
    const dot = track.name.indexOf('.');
    if (dot === -1) return;
    track.name = THREE.PropertyBinding.sanitizeNodeName(track.name.slice(0, dot))
               + track.name.slice(dot);
  });
}

function addAnimationButton(name) {
  const btn = document.createElement('button');
  btn.className = 'anim-btn';
  btn.textContent = name;
  btn.addEventListener('click', () => playAnimation(name));
  document.getElementById('anim-controls').appendChild(btn);
}

// ── Transform gizmos (one per model) ──────────────────────────────────────────
const allTransformControls = [];
let activeTC = 0; // index of currently active gizmo

function makeTransformControls(model) {
  const tc = new TransformControls(camera, renderer.domElement);
  tc.attach(model);
  tc.setMode('translate');
  tc.visible = false;
  tc.enabled = false;
  scene.add(tc);
  tc.addEventListener('dragging-changed', e => { orbit.enabled = !e.value; });
  tc.addEventListener('change', updateDataPanel);
  allTransformControls.push(tc);
  return tc;
}

function setActiveGizmo(idx) {
  activeTC = idx;
  allTransformControls.forEach((tc, i) => {
    tc.visible = (i === idx);
    tc.enabled = (i === idx);
  });
  updateDataPanel();
}

// ── Data panel ────────────────────────────────────────────────────────────────
const dataPanel = document.getElementById('data-panel');
function fmt(v) { return v.toFixed(5); }

function updateDataPanel() {
  if (!allTransformControls.length || !dataPanel) return;
  const labels = ['WAVE', 'KICK', 'JOG', 'IDLE'];
  let text = '';
  allTransformControls.forEach((tc, i) => {
    const obj = tc?.object;
    if (!obj) return;
    const active = i === activeTC ? ' ◀' : '';
    text +=
      `── MODEL ${labels[i] ?? i+1}${active} ──\n` +
      `pos  x:${fmt(obj.position.x)}  y:${fmt(obj.position.y)}  z:${fmt(obj.position.z)}\n` +
      `rot  x:${fmt(obj.rotation.x)}  y:${fmt(obj.rotation.y)}  z:${fmt(obj.rotation.z)}\n\n`;
  });
  text +=
    `── CAMERA ──\n` +
    `pos  x:${fmt(camera.position.x)}  y:${fmt(camera.position.y)}  z:${fmt(camera.position.z)}\n` +
    `target  x:${fmt(orbit.target.x)}  y:${fmt(orbit.target.y)}  z:${fmt(orbit.target.z)}\n\n` +
    `[1/2/3/4] select  [T] translate  [R] rotate  [G] gizmo`;
  dataPanel.textContent = text;
}

// Keyboard shortcuts
window.addEventListener('keydown', e => {
  if (e.key === '1') setActiveGizmo(0);
  if (e.key === '2') setActiveGizmo(1);
  if (e.key === '3') setActiveGizmo(2);
  if (e.key === '4') setActiveGizmo(3);
  const tc = allTransformControls[activeTC];
  if (!tc) return;
  if (e.key === 't' || e.key === 'T') tc.setMode('translate');
  if (e.key === 'r' || e.key === 'R') tc.setMode('rotate');
  if (e.key === 'g' || e.key === 'G') {
    const next = !tc.visible;
    allTransformControls.forEach(t => { t.visible = false; t.enabled = false; });
    tc.visible = next;
    tc.enabled = next;
  }
});

// ── Apply materials to a model ────────────────────────────────────────────────
function applyMaterials(model) {
  const meshes = [];
  model.traverse(n => { if (n.isMesh) meshes.push(n); });
  meshes.forEach(n => {
    n.castShadow = true;
    n.receiveShadow = true;
    n.material = new THREE.MeshStandardMaterial({ color: OFF_WHITE, roughness: 0.75, metalness: 0.0 });
    n.material.userData.outlineParameters = { thickness: 0.002, color: [0.2, 0.2, 0.2], alpha: 0.55 };
  });
}

// ── Load model ────────────────────────────────────────────────────────────────
new GLTFLoader().load(`${BASE}eric_new6.glb`, (gltf) => {
  onAssetLoaded();

  // Four model instances with standard Z-up correction
  const model1 = gltf.scene;
  const model2 = SkeletonUtils.clone(gltf.scene);
  const model3 = SkeletonUtils.clone(gltf.scene);
  const model4 = SkeletonUtils.clone(gltf.scene);
  const models = [model1, model2, model3, model4];

  models.forEach(m => {
    applyMaterials(m);
    m.rotation.x = -Math.PI / 2;
    scene.add(m);
  });

  // Bounding box from model1 at origin
  model1.updateWorldMatrix(true, true);
  const box0   = new THREE.Box3().setFromObject(model1);
  const size0  = box0.getSize(new THREE.Vector3());
  const maxDim = Math.max(size0.x, size0.y, size0.z);

  // Positions
  model1.position.copy(MODEL_POS);  model1.rotation.z =  0.26127;
  model2.position.copy(MODEL2_POS); model2.rotation.z = -0.39975;
  model3.position.copy(MODEL3_POS); model3.rotation.z = -0.80775;
  model4.position.copy(MODEL4_POS); model4.rotation.z =  1.06297;

  // Ground
  const groundMat = new THREE.ShadowMaterial({ opacity: 0.35 });
  groundMat.userData = { outlineParameters: { visible: false } };
  const ground = new THREE.Mesh(new THREE.PlaneGeometry(maxDim * 30, maxDim * 30), groundMat);
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.98729;
  ground.receiveShadow = true;
  scene.add(ground);

  // Fit near/far
  camera.near = maxDim / 1000;
  camera.far  = maxDim * 100;
  camera.updateProjectionMatrix();

  // Transform controls for all four models
  models.forEach(m => makeTransformControls(m));
  updateDataPanel();

  // ── Four mixers ────────────────────────────────────────────────────────────
  const mixer1 = new THREE.AnimationMixer(model1);
  const mixer2 = new THREE.AnimationMixer(model2);
  const mixer3 = new THREE.AnimationMixer(model3);
  const mixer4 = new THREE.AnimationMixer(model4);
  mixer = mixer1; // keep global ref for clock.getDelta loop (updated below)

  // GLB clips → mixer1 (Wave model)
  gltf.animations.forEach(clip => {
    actionMap[clip.name] = mixer1.clipAction(clip);
    if (!HIDDEN_CLIPS.has(clip.name)) addAnimationButton(clip.name);
  });

  const fbxAnims = [
    { file: `${BASE}Swimming.fbx`,          name: 'Swimming' },
    { file: `${BASE}Waving%20Gesture.fbx`,  name: 'Wave'     },
    { file: `${BASE}Mma%20Kick.fbx`,        name: 'Kick'     },
    { file: `${BASE}Jog%20In%20Circle.fbx`, name: 'Jog'      },
  ];

  const fbxLoader = new FBXLoader();
  let fbxLoaded = 0;
  fbxAnims.forEach(({ file, name }) => {
    fbxLoader.load(file, fbx => {
      onAssetLoaded();
      if (!fbx.animations.length) return;
      const clip = fbx.animations[0];
      sanitizeClipTracks(clip, name);

      // Model1 (wave) — all controls
      actionMap[name] = mixer1.clipAction(clip);
      if (!HIDDEN_CLIPS.has(name)) addAnimationButton(name);
      if (name === DEFAULT_ANIM) playAnimation(DEFAULT_ANIM);

      // Models 2/3/4 → staggered Wave via preroll (no T-pose on reveal)
      if (name === 'Wave') {
        const dur = clip.duration;
        [[mixer2, 0.30], [mixer3, 0.58], [mixer4, 0.82]].forEach(([mx, offset]) => {
          const a = mx.clipAction(clip);
          a.setLoop(THREE.LoopOnce, 1);
          a.clampWhenFinished = true;
          a.play();
          mx.update(dur * offset); // advance mixer so model is mid-wave on reveal
          mx.addEventListener('finished', e => {
            if (e.action !== a) return;
            setTimeout(() => { a.reset().play(); }, WAVE_HOLD_MS);
          });
        });
      }

      fbxLoaded++;
    }, undefined, err => console.warn(`FBX failed: ${file}`, err));
  });

  // Wave hold-then-replay
  mixer1.addEventListener('finished', e => {
    if (e.action !== actionMap[DEFAULT_ANIM]) return;
    clearTimeout(waveRestartTimer);
    waveRestartTimer = setTimeout(() => {
      if (currentAction === actionMap[DEFAULT_ANIM]) actionMap[DEFAULT_ANIM].reset().play();
    }, WAVE_HOLD_MS);
  });

  // Patch render loop to update all four mixers
  window._extraMixers = [mixer2, mixer3, mixer4];

}, undefined, err => console.error('GLB error:', err));

// ── Crossfade ─────────────────────────────────────────────────────────────────
function playAnimation(name) {
  const next = actionMap[name];
  if (!next) return;
  document.querySelectorAll('.anim-btn').forEach(b =>
    b.classList.toggle('active', b.textContent === name)
  );
  if (currentAction === next) return;
  clearTimeout(waveRestartTimer);
  if (currentAction) currentAction.fadeOut(0.3);
  if (name === DEFAULT_ANIM) {
    next.setLoop(THREE.LoopOnce, 1);
    next.clampWhenFinished = true;
  } else {
    next.setLoop(THREE.LoopRepeat, Infinity);
    next.clampWhenFinished = false;
  }
  next.reset().fadeIn(0.3).play();
  currentAction = next;
}

// ── Resize ────────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

const fovSlider = document.getElementById('fov-slider');
const fovLabel  = document.getElementById('fov-label');
fovSlider.addEventListener('input', () => {
  camera.fov = Number(fovSlider.value);
  camera.updateProjectionMatrix();
  fovLabel.textContent = `FOV ${fovSlider.value}°`;
});

const rotSlider = document.getElementById('rot-slider');
const rotLabel  = document.getElementById('rot-label');
rotSlider.addEventListener('input', () => {
  const deg = Number(rotSlider.value);
  scene.backgroundRotation.y = (deg * Math.PI) / 180;
  rotLabel.textContent = `ROT ${deg}°`;
});

// ── About panel ───────────────────────────────────────────────────────────────
const ABOUT_TEXT =
`Robyn Art Studio — Summer 2026

A class in 3D modeling and printing basics.
Students design and build their own characters, learn to print them in 3D, and finish the course with a school photo — portraits taken with their own digital creations.

Taught by Eric Joo
ericjoodesign@gmail.com

This website is a memorialization of the experience.`;

const aboutBtn   = document.getElementById('about-btn');
const aboutPanel = document.getElementById('about-panel');
const aboutClose = document.getElementById('about-close');
const aboutTextEl = document.getElementById('about-text');
let twTimer = null;

function runTypewriter(text) {
  aboutTextEl.textContent = '';
  let i = 0;
  clearInterval(twTimer);
  twTimer = setInterval(() => {
    aboutTextEl.textContent += text[i++];
    if (i >= text.length) clearInterval(twTimer);
  }, 8);
}

aboutBtn.addEventListener('click', () => {
  const rect = aboutBtn.getBoundingClientRect();
  aboutPanel.style.top  = (rect.bottom + 10) + 'px';
  aboutPanel.style.left = rect.left + 'px';
  aboutPanel.classList.add('visible');
  runTypewriter(ABOUT_TEXT);
});

aboutClose.addEventListener('click', () => {
  aboutPanel.classList.remove('visible');
  clearInterval(twTimer);
});

// ── Render loop ───────────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  if (mixer) mixer.update(dt);
  if (window._extraMixers) window._extraMixers.forEach(m => m.update(dt));
  orbit.update();
  outlineEffect.render(scene, camera);
  updateDataPanel();
}
animate();
