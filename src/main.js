import * as THREE from 'three';

const BASE = import.meta.env.BASE_URL;
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/examples/jsm/loaders/FBXLoader.js';
import { OrbitControls } from 'three/examples/jsm/controls/OrbitControls.js';
import { TransformControls } from 'three/examples/jsm/controls/TransformControls.js';
import { RGBELoader } from 'three/examples/jsm/loaders/RGBELoader.js';
import * as SkeletonUtils from 'three/examples/jsm/utils/SkeletonUtils.js';

// ── Renderer ──────────────────────────────────────────────────────────────────
const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(window.devicePixelRatio);
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
renderer.outputColorSpace = THREE.SRGBColorSpace;

// ── Scene ─────────────────────────────────────────────────────────────────────
const scene = new THREE.Scene();

// ── Camera ────────────────────────────────────────────────────────────────────
const camera = new THREE.PerspectiveCamera(90, window.innerWidth / window.innerHeight, 0.0001, 1000);
camera.position.set(0.36063, -0.19254, 0.91120);

// ── Orbit controls ────────────────────────────────────────────────────────────
const orbit = new OrbitControls(camera, renderer.domElement);
orbit.enableDamping = true;
orbit.dampingFactor = 0.05;
orbit.target.set(0.40715, -0.55080, -0.25436);
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

new RGBELoader().load(`${BASE}spooky_bamboo.hdr`, (hdrTexture) => {
  hdrTexture.mapping = THREE.EquirectangularReflectionMapping;
  scene.background = hdrTexture;
  scene.backgroundRotation.y = (127 * Math.PI) / 180;
  const envMap = pmremGenerator.fromEquirectangular(hdrTexture).texture;
  scene.environment = envMap;
  pmremGenerator.dispose();
});

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
const MODEL_POS  = new THREE.Vector3(0.00000, -0.98729, 0.00000);
const MODEL2_POS = new THREE.Vector3(0.60000, -0.98729, 0.00000);
const MODEL3_POS = new THREE.Vector3(0.92858, -0.98729, -1.05158);

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
  if (!allTransformControls.length) return;
  const labels = ['WAVE', 'KICK', 'JOG'];
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
    `[1/2/3] select  [T] translate  [R] rotate  [G] gizmo`;
  dataPanel.textContent = text;
}

// Keyboard shortcuts
window.addEventListener('keydown', e => {
  if (e.key === '1') setActiveGizmo(0);
  if (e.key === '2') setActiveGizmo(1);
  if (e.key === '3') setActiveGizmo(2);
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

// ── Apply materials + outline to a model ─────────────────────────────────────
function applyMaterials(model) {
  const meshes = [];
  model.traverse(n => { if (n.isMesh) meshes.push(n); });
  meshes.forEach(n => {
    n.castShadow = true;
    n.receiveShadow = true;
    n.material = new THREE.MeshStandardMaterial({ color: OFF_WHITE, roughness: 0.75, metalness: 0.0 });
    const outline = new THREE.Mesh(
      n.geometry,
      new THREE.MeshBasicMaterial({ color: 0x888888, side: THREE.BackSide })
    );
    outline.scale.setScalar(1.04);
    n.add(outline);
  });
}

// ── Load model ────────────────────────────────────────────────────────────────
new GLTFLoader().load(`${BASE}eric_new6.glb`, (gltf) => {

  // Three model instances
  const model1 = gltf.scene;
  const model2 = SkeletonUtils.clone(gltf.scene);
  const model3 = SkeletonUtils.clone(gltf.scene);
  const models = [model1, model2, model3];

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

  // Main model at saved position; extra models staggered nearby (user will reposition)
  model1.position.copy(MODEL_POS);
  model2.position.copy(MODEL2_POS);
  model3.position.copy(MODEL3_POS);

  // Ground
  const ground = new THREE.Mesh(
    new THREE.PlaneGeometry(maxDim * 30, maxDim * 30),
    new THREE.ShadowMaterial({ opacity: 0.35 })
  );
  ground.rotation.x = -Math.PI / 2;
  ground.position.y = -0.98729;
  ground.receiveShadow = true;
  scene.add(ground);

  // Fit near/far
  camera.near = maxDim / 1000;
  camera.far  = maxDim * 100;
  camera.updateProjectionMatrix();

  // Transform controls for each model (G to toggle, 1/2/3 to select)
  models.forEach(m => makeTransformControls(m));
  updateDataPanel();

  // ── Three mixers ───────────────────────────────────────────────────────────
  const mixer1 = new THREE.AnimationMixer(model1);
  const mixer2 = new THREE.AnimationMixer(model2);
  const mixer3 = new THREE.AnimationMixer(model3);
  const mixers = [mixer1, mixer2, mixer3];
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
      if (!fbx.animations.length) return;
      const clip = fbx.animations[0];
      sanitizeClipTracks(clip, name);

      // Model1 (wave) — all controls
      actionMap[name] = mixer1.clipAction(clip);
      if (!HIDDEN_CLIPS.has(name)) addAnimationButton(name);
      if (name === DEFAULT_ANIM) playAnimation(DEFAULT_ANIM);

      // Model2 → auto-play Kick with 3s hold at end then replay
      if (name === 'Kick') {
        const a = mixer2.clipAction(clip);
        a.setLoop(THREE.LoopOnce, 1);
        a.clampWhenFinished = true;
        a.play();
        mixer2.addEventListener('finished', e => {
          if (e.action !== a) return;
          setTimeout(() => { a.reset().play(); }, WAVE_HOLD_MS);
        });
      }
      // Model3 → auto-play Jog
      if (name === 'Jog') {
        const a = mixer3.clipAction(clip);
        a.setLoop(THREE.LoopRepeat, Infinity);
        a.play();
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

  // Patch render loop to update all three mixers
  window._extraMixers = [mixer2, mixer3];

  const loaderEl = document.getElementById('loader');
  loaderEl.style.opacity = '0';
  setTimeout(() => loaderEl.remove(), 400);

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

// ── Render loop ───────────────────────────────────────────────────────────────
function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  if (mixer) mixer.update(dt);
  if (window._extraMixers) window._extraMixers.forEach(m => m.update(dt));
  orbit.update();
  renderer.render(scene, camera);
  updateDataPanel();
}
animate();
