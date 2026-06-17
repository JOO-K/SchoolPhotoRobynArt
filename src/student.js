import * as THREE from 'three';
import { GLTFLoader } from 'three/addons/loaders/GLTFLoader.js';
import { FBXLoader } from 'three/addons/loaders/FBXLoader.js';
import { OrbitControls } from 'three/addons/controls/OrbitControls.js';

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

// Populate static name
document.getElementById('student-name-display').textContent = student.name;
document.title = `${student.name} — Robyn Art Studio`;

// Apply accent color to CSS variable
document.documentElement.style.setProperty('--accent', student.accent);

// Highlight active ribbon
document.querySelectorAll('.name-card').forEach((card, i) => {
  if (i === studentId) card.classList.add('active');
});

// ── Editable fields with localStorage persistence ─────────────────────────────
const EDITABLE_IDS = ['student-desc', 'field-age', 'field-favorites', 'field-dislikes', 'field-family', 'field-dream'];
EDITABLE_IDS.forEach(id => {
  const el = document.getElementById(id);
  if (!el) return;
  const key = `student_${studentId}_${id}`;
  const saved = localStorage.getItem(key);
  if (saved) el.textContent = saved;
  el.addEventListener('blur', () => localStorage.setItem(key, el.textContent));
  el.addEventListener('keydown', e => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); el.blur(); } });
});

// ── Loader tracking ───────────────────────────────────────────────────────────
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

const camera = new THREE.PerspectiveCamera(45, innerWidth / innerHeight, 0.01, 100);
camera.position.set(0, -0.2, 0.82);

const orbit = new OrbitControls(camera, canvas);
orbit.enableDamping   = true;
orbit.dampingFactor   = 0.06;
orbit.target.set(0, -0.52, 0);
orbit.update();

// ── Lighting (studio portrait setup) ─────────────────────────────────────────
scene.add(new THREE.AmbientLight(0xffffff, 0.9));

const key = new THREE.DirectionalLight(0xfff6e8, 1.6);
key.position.set(1.5, 3, 2.5);
key.castShadow = true;
key.shadow.mapSize.set(1024, 1024);
key.shadow.radius = 12;
key.shadow.bias   = -0.001;
scene.add(key);

const fill = new THREE.DirectionalLight(0xe8f2ff, 0.6);
fill.position.set(-2, 1, 1);
scene.add(fill);

const rim = new THREE.DirectionalLight(0xffffff, 0.35);
rim.position.set(0, 2, -2);
scene.add(rim);

// ── White backdrop (studio cyclorama) ────────────────────────────────────────
const bgMat = new THREE.MeshLambertMaterial({ color: 0xeeeeee });

// back wall
const backWall = new THREE.Mesh(new THREE.PlaneGeometry(12, 8), bgMat);
backWall.position.set(0, 1.5, -1.8);
scene.add(backWall);

// floor (receives shadows)
const shadowFloor = new THREE.Mesh(
  new THREE.PlaneGeometry(20, 20),
  new THREE.ShadowMaterial({ opacity: 0.18 })
);
shadowFloor.rotation.x = -Math.PI / 2;
shadowFloor.position.y = -0.98729;
shadowFloor.receiveShadow = true;
scene.add(shadowFloor);

// floor fill (white plane under shadow layer)
const floorFill = new THREE.Mesh(new THREE.PlaneGeometry(20, 20), bgMat);
floorFill.rotation.x = -Math.PI / 2;
floorFill.position.y = -0.989;
scene.add(floorFill);

// ── Model + animation ─────────────────────────────────────────────────────────
let mixer;

new GLTFLoader().load(`${BASE}eric_new6.glb`, (gltf) => {
  onAssetLoaded();

  const model = gltf.scene;
  model.rotation.x = -Math.PI / 2;
  model.position.set(0, -0.98729, 0);

  // Collect meshes first — adding children inside traverse causes infinite recursion
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
    // Inverted-hull outline — dark, 6% larger, backfaces only
    const outline = new THREE.Mesh(
      n.geometry,
      new THREE.MeshBasicMaterial({ color: 0x111111, side: THREE.BackSide })
    );
    outline.scale.setScalar(1.06);
    n.add(outline);
  });

  scene.add(model);
  mixer = new THREE.AnimationMixer(model);

  // Load Wave animation (loop repeat for portrait page)
  new FBXLoader().load(`${BASE}Waving%20Gesture.fbx`, (fbx) => {
    onAssetLoaded();
    if (!fbx.animations.length) return;
    const clip = fbx.animations[0];
    // Sanitize Mixamo bone names
    clip.tracks.forEach(track => {
      const dot = track.name.indexOf('.');
      if (dot === -1) return;
      track.name = THREE.PropertyBinding.sanitizeNodeName(track.name.slice(0, dot))
                 + track.name.slice(dot);
    });
    const action = mixer.clipAction(clip);
    action.setLoop(THREE.LoopRepeat, Infinity);
    action.play();
  }, undefined, err => console.warn('FBX load error:', err));

}, undefined, err => console.error('GLB load error:', err));

// ── Resize ────────────────────────────────────────────────────────────────────
window.addEventListener('resize', () => {
  camera.aspect = innerWidth / innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(innerWidth, innerHeight);
});

// ── Render loop ───────────────────────────────────────────────────────────────
const clock = new THREE.Clock();
(function animate() {
  requestAnimationFrame(animate);
  const dt = clock.getDelta();
  if (mixer) mixer.update(dt);
  orbit.update();
  renderer.render(scene, camera);
})();
