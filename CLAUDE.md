# School Photo - Robyn Art Studio

## What this is
Three.js school photo showcase with three animated character clones, an HDRI background, and a styled UI. Built for deployment on GitHub Pages.

## Tech
- Three.js r166 (GLTFLoader, FBXLoader, AnimationMixer, OrbitControls, TransformControls, SkeletonUtils, RGBELoader)
- Vite dev server on port 5174
- Google Fonts: Barrio (name cards) + DotGothic16 (all other UI)

## Models
- `public/eric_new6.glb` — the character model (Mixamo rig, exported from Blender with Z-up, rotation.x = -PI/2 applied in code)
- Three instances loaded via `SkeletonUtils.clone()`: Wave, Kick, Jog

## Animations
FBX files in `/public/`, sanitized with `PropertyBinding.sanitizeNodeName()` to fix `mixamorig:Hips` → `mixamorigHips` bone name mismatch:
- `Waving Gesture.fbx` → Wave (default, LoopOnce + 3s hold then replay)
- `Mma Kick.fbx` → Kick (LoopOnce + 3s hold then replay)
- `Jog In Circle.fbx` → Jog (LoopRepeat)
- `Swimming.fbx` → Swimming (LoopRepeat)

## Hardcoded positions (from gizmo session)
```
MODEL WAVE: pos (0, -0.98729, 0)   rot x:-1.5708
MODEL KICK: pos (0.6, -0.98729, 0) rot x:-1.5708
MODEL JOG:  pos (0.92858, -0.98729, -1.05158) rot x:-1.5708

CAMERA: pos (0.36063, -0.19254, 0.91120)
        target (0.40715, -0.55080, -0.25436)
        FOV: 90
```

## HDRI
- `public/spooky_bamboo.hdr` (spooky_bamboo_morning_4k.hdr from Poly Haven)
- Rotation hardcoded to 127° (`scene.backgroundRotation.y = (127 * Math.PI) / 180`)
- Used as both `scene.background` and `scene.environment` (PMREM for lighting)

## UI Layout
- **Top left**: Logo (200px, nudged -4px/-4px margin), "Robyn Art Studio" (DotGothic16 23px), Syllabus + About nav buttons
- **Bottom left**: Animation buttons (dynamically added, DotGothic16)
- **Right side**: 5 name cards (Barrio font, centered, 200px wide, border-radius 10px, 20px from top/right)
  - Irene Hong, Matthew Baik, Mason Park, Nathaniel Kim, Alexis Lee
- **Bottom center**: Stacked sliders — ROT (0-360°, default 127) on top, FOV (40-130°, default 90) below
- **Bottom right**: Data panel (all 3 model positions + camera) + Copy button

## Gizmo controls
- **G** — toggle active gizmo on/off
- **1 / 2 / 3** — switch between Wave / Kick / Jog model
- **T** — translate mode, **R** — rotate mode

## Ground
- `ShadowMaterial` (invisible, shadows only, opacity 0.35) hardcoded at y = -0.98729
- Blends with HDRI so it looks like standing in the studio

## GitHub deployment
- Repo: `https://github.com/JOO-K/SchoolPhotoRobynArt`
- GitHub Actions workflow at `.github/workflows/deploy.yml` — auto-builds with Vite on push to main
- `vite.config.js` base: `/SchoolPhotoRobynArt/`
- **PENDING**: Push is blocked — Git Credential Manager is broken (.NET TypeLoadException). User needs to either:
  - Install GitHub CLI: `winget install GitHub.cli` then `gh auth login`
  - Or use a PAT: `git remote set-url origin https://TOKEN@github.com/JOO-K/SchoolPhotoRobynArt.git`
- Once pushed, enable Pages at: github.com/JOO-K/SchoolPhotoRobynArt → Settings → Pages → Source → GitHub Actions
- Live URL will be: `https://joo-k.github.io/SchoolPhotoRobynArt/`

## Local dev
```
cd C:\Users\ericd\school-photo-2
npm run dev
# open http://localhost:5174
```
