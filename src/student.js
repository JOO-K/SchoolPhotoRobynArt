import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';
import { EffectComposer } from 'three/addons/postprocessing/EffectComposer.js';
import { RenderPass } from 'three/addons/postprocessing/RenderPass.js';
import { OutlinePass } from 'three/addons/postprocessing/OutlinePass.js';
import { OutputPass } from 'three/addons/postprocessing/OutputPass.js';

const BASE = import.meta.env.BASE_URL;

// ── Student data ──────────────────────────────────────────────────────────────
const STUDENTS = [
  { id: 0, name: 'Irene Hong',    accent: '#2a9d8f' },
  { id: 1, name: 'Matthew Baik',  accent: '#457b9d' },
  { id: 2, name: 'Mason Park',    accent: '#ef476f' },
  { id: 3, name: 'Nathaniel Kim', accent: '#f4a261' },
];

const params    = new URLSearchParams(window.location.search);
const studentId = Math.max(0, Math.min(3, parseInt(params.get('id') ?? '0', 10)));
const student   = STUDENTS[studentId];

document.getElementById('student-name-display').textContent = student.name;
document.title = `${student.name} — Robyn Art Studio`;
document.documentElement.style.setProperty('--accent', student.accent);

document.querySelectorAll('.name-card').forEach((card, i) => {
  if (i === studentId) card.classList.add('active');
});

// ── Editable fields (localStorage) ───────────────────────────────────────────
['student-desc', 'field-age', 'field-favorites', 'field-dislikes', 'field-family', 'field-dream'].forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  const key = `student_${studentId}_${id}`;
  const saved = localStorage.getItem(key);
  if (saved) el.textContent = saved;
  el.addEventListener('blur', () => localStorage.setItem(key, el.textContent));
  el.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); el.blur(); } });
});

// ── Loader ────────────────────────────────────────────────────────────────────
let assetsLoaded = 0;
const TOTAL_ASSETS = 2;
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

// ── Renderer ──────────────────────────────────────────────────────────────────
const canvas = document.getElementById('canvas');
const renderer = new THREE.WebGLRenderer({ canvas, antialias: true });
renderer.setPixelRatio(Math.min(devicePixelRatio, 2));
renderer.setSize(innerWidth, innerHeight);
renderer.shadowMap.enabled = true;
renderer.shadowMap.type    = THREE.PCFSoftShadowMap;
renderer.outputColorSpace  = THREE.SRGBColorSpace;
renderer.toneMapping       = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.1;

// ── Scene + Camera ────────────────────────────────────────────────────────────
const scene = new THREE.Scene();
scene.background = new THREE.Color(0xeeeeee);

const camera = new THREE.PerspectiveCamera(55, innerWidth / innerHeight, 0.01, 100);
camera.position.set(0, -0.1, 1.5);

const orbit = new OrbitControls(camera, canvas);
orbit.enableDamping = true;
orbit.dampingFactor = 0.06;
orbit.target.set(0, -0.5, 0);
orbit.update();

// ── Post-processing (OutlinePass — works on skinned meshes) ───────────────────
const composer = new EffectComposer(renderer);
composer.addPass(new RenderPass(scene, camera));

const outlinePass = new OutlinePass(new THREE.Vector2(innerWidth, innerHeight), scene, camera);
outlinePass.edgeStrength  = 5;
outlinePass.edgeThickness = 1.5;
outlinePass.edgeGlow      = 0;
outlinePass.pulsePeriod   = 0;
outlinePass.visibleEdgeColor.set('#111111');
outlinePass.hiddenEdgeColor.set('#111111');
composer.addPass(outlinePass);
composer.addPass(new OutputPass());

// ── Lighting ──────────────────────────────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffffff, 0.9));

const key = new THREE.DirectionalLight(0xfff6e8, 1.6);
key.position.set(1.5, 3, 2.5);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.radius = 12;
key.shadow.bias   = -0.001;
scene.add(key);

scene.add(Object.assign(new THREE.DirectionalLight(0xe8f2ff, 0.6), { position: new THREE.Vector3(-2, 1, 1) }));
scene.add(Object.assign(new THREE.DirectionalLight(0xffffff, 0.35), { position: new THREE.Vector3(0, 2, -2) }));

// ── White studio backdrop ─────────────────────────────────────────────────────
const bgMat = new THREE.MeshLambertMaterial({ color: 0xeeeeee });

const backWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 8), bgMat);
backWall.position.set(0, 1.5, -1.8);
scene.add(backWall);

const shadowFloor = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20),
  new THREE.ShadowMaterial({ opacity: 0.18 })
);
shadowFloor.rotation.x = -Math.PI / 2;
shadowFloor.position.y = -0.98729;
shadowFloor.receiveShadow = true;
scene.add(shadowFloor);

const floorFill = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), bgMat);
floorFill.rotation.x = -Math.PI / 2;
floorFill.position.y = -0.989;
scene.add(floorFill);

// ── Copy button ───────────────────────────────────────────────────────────────
document.getElementById('copy-btn').addEventListener('click', () => {
  const p = camera.position, t = orbit.target;
  const txt =
    `camera.position.set(${p.x.toFixed(5)}, ${p.y.toFixed(5)}, ${p.z.toFixed(5)});\n` +
    `orbit.target.set(${t.x.toFixed(5)}, ${t.y.toFixed(5)}, ${t.z.toFixed(5)});\n` +
    `camera.fov = ${Math.round(camera.fov)};`;
  navigator.clipboard.writeText(txt).then(() => {
    const btn = document.getElementById('copy-btn');
    btn.textContent = 'Copied!';
    setTimeout(() => { btn.textContent = '⎘ Copy Cam'; }, 1500);
  });
});

// ── Model + animation ─────────────────────────────────────────────────────────
let mixer;

new GLTFLoader().load(`${BASE}eric_new6.glb`, (gltf) => {
  onAssetLoaded();

  const model = gltf.scene;
  model.rotation.x = -Math.PI / 2;
  model.position.set(0, -0.98729, 0);

  // Materials
  const meshes = [];
  model.traverse(n => { if (n.isMesh) meshes.push(n); });
  meshes.forEach(n => {
    n.castShadow    = true;
    n.receiveShadow = true;
    n.material = new THREE.MeshStandardMaterial({
      color: new THREE.Color(0xf2ede8),
      roughness: 0.75,
      metalness: 0.0,
    });
  });

  scene.add(model);

  // OutlinePass targets the model root — works on skinned meshes
  outlinePass.selectedObjects = [model];

  mixer = new THREE.AnimationMixer(model);

  new FBXLoader().load(`${BASE}Waving%20Gesture.fbx`, (fbx) => {
    onAssetLoaded();
    if (!fbx.animations.length) return;
    const clip = fbx.animations[0];
    clip.tracks.forEach(track => {
      const dot = track.name.indexOf('.');
      if (dot === -1) return;
      track.name = THREE.PropertyBinding.sanitizeNodeName(track.name.slice(0, dot))
                 + track.name.slice(dot);
    });
    mixer.clipAction(clip).setLoop(THREE.LoopRepeat, Infinity).play();
  }, undefined, err => console.warn('FBX load error:', err));

}, undefined, err => console.error('GLB load error:', err));

// ── Resize ────────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
  composer.setSize(innerWidth, innerHeight);
  outlinePass.resolution.set(innerWidth, innerHeight);
});

// ── Render loop ───────────────────────────────────────────────────────────────
const clock = new THREE.Clock();
(function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  if (mixer) mixer.update(dt);
  orbit.update();
  composer.render();
})();
