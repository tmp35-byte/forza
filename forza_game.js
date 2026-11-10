// FORZA HORIZON 6 ULTRA 3D ENGINE
// Realistic Supercars, Dynamic Shaders, Skybox, Skidmarks & Motion Camera

const container = document.getElementById('game-container');
const speedValue = document.getElementById('speedValue');
const gearValue = document.getElementById('gearValue');
const nitroBar = document.getElementById('nitroBar');
const nitroPercent = document.getElementById('nitroPercent');
const driftPopup = document.getElementById('driftPopup');
const driftPoints = document.getElementById('driftPoints');
const driftMultiplier = document.getElementById('driftMultiplier');
const skillBadge = document.getElementById('skillBadge');
const driftScoreText = document.getElementById('driftScoreText');
const bestSpeedText = document.getElementById('bestSpeedText');
const xpText = document.getElementById('xpText');
const timeToggleBtn = document.getElementById('timeToggleBtn');
const viewToggleBtn = document.getElementById('viewToggleBtn');
const audioToggleBtn = document.getElementById('audioToggleBtn');
const carColorBtn = document.getElementById('carColorBtn');
const carSelectBtn = document.getElementById('carSelectBtn');
const currentCarName = document.getElementById('currentCarName');
const motionBlur = document.getElementById('motionBlur');
const rpmDots = document.querySelectorAll('.rpm-dot');

// ================= 1. RENDERER & HIGH-END POST-LIGHTING =================
const scene = new THREE.Scene();
scene.fog = new THREE.FogExp2(0xe69f70, 0.0009); // Golden Hour Horizon Atmosphere

const camera = new THREE.PerspectiveCamera(65, window.innerWidth / window.innerHeight, 0.1, 2500);
const renderer = new THREE.WebGLRenderer({ antialias: true, powerPreference: 'high-performance' });
renderer.setSize(window.innerWidth, window.innerHeight);
renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

// Tone Mapping for Forza HDR Bloom / Color Depth
renderer.toneMapping = THREE.ACESFilmicToneMapping;
renderer.toneMappingExposure = 1.25;
renderer.outputEncoding = THREE.sRGBEncoding;
renderer.shadowMap.enabled = true;
renderer.shadowMap.type = THREE.PCFSoftShadowMap;
container.appendChild(renderer.domElement);

// Lighting
const hemiLight = new THREE.HemisphereLight(0xffeedd, 0x223344, 0.75);
scene.add(hemiLight);

const sunLight = new THREE.DirectionalLight(0xffdfb3, 2.2);
sunLight.position.set(200, 240, 160);
sunLight.castShadow = true;
sunLight.shadow.mapSize.width = 2048;
sunLight.shadow.mapSize.height = 2048;
sunLight.shadow.camera.near = 10;
sunLight.shadow.camera.far = 800;
const d = 180;
sunLight.shadow.camera.left = -d;
sunLight.shadow.camera.right = d;
sunLight.shadow.camera.top = d;
sunLight.shadow.camera.bottom = -d;
sunLight.shadow.bias = -0.0002;
scene.add(sunLight);

renderer.setClearColor(0xff9966);

// ================= 2. PROCEDURAL TEXTURES (ASPHALT, DIRT, GRASS, CURBS) =================
function createAsphaltTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#1b1d22';
  ctx.fillRect(0, 0, 512, 512);

  // Road Grain & micro-noise
  for (let i = 0; i < 45000; i++) {
    const v = Math.floor(Math.random() * 45 + 18);
    ctx.fillStyle = `rgb(${v},${v},${v})`;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 1.5, 1.5);
  }

  // Asphalt skid marks
  ctx.fillStyle = 'rgba(10, 10, 12, 0.2)';
  for (let i = 0; i < 20; i++) {
    const y = Math.random() * 512;
    ctx.fillRect(0, y, 512, Math.random() * 10 + 4);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(14, 80);
  return texture;
}

function createGrassTexture() {
  const canvas = document.createElement('canvas');
  canvas.width = 512;
  canvas.height = 512;
  const ctx = canvas.getContext('2d');
  ctx.fillStyle = '#265120';
  ctx.fillRect(0, 0, 512, 512);

  for (let i = 0; i < 45000; i++) {
    const g = Math.floor(Math.random() * 65 + 65);
    const r = Math.floor(g * 0.52);
    ctx.fillStyle = `rgb(${r},${g},25)`;
    ctx.fillRect(Math.random() * 512, Math.random() * 512, 2, 2);
  }

  const texture = new THREE.CanvasTexture(canvas);
  texture.wrapS = THREE.RepeatWrapping;
  texture.wrapT = THREE.RepeatWrapping;
  texture.repeat.set(80, 80);
  return texture;
}

const asphaltTex = createAsphaltTexture();
const grassTex = createGrassTexture();

// ================= 3. VAST FORZA HORIZON OPEN WORLD =================
// Terrain Ground
const groundGeo = new THREE.PlaneGeometry(3500, 3500);
const groundMat = new THREE.MeshStandardMaterial({
  map: grassTex,
  roughness: 0.92,
  metalness: 0.04
});
const ground = new THREE.Mesh(groundGeo, groundMat);
ground.rotation.x = -Math.PI / 2;
ground.receiveShadow = true;
scene.add(ground);

// Highway Circuit Spline
const trackPoints = [
  new THREE.Vector3(0, 0.08, 0),
  new THREE.Vector3(400, 0.08, 250),
  new THREE.Vector3(850, 0.08, 140),
  new THREE.Vector3(1100, 0.08, -400),
  new THREE.Vector3(700, 0.08, -950),
  new THREE.Vector3(0, 0.08, -1100),
  new THREE.Vector3(-650, 0.08, -850),
  new THREE.Vector3(-980, 0.08, -300),
  new THREE.Vector3(-800, 0.08, 420),
  new THREE.Vector3(-350, 0.08, 500),
  new THREE.Vector3(0, 0.08, 0)
];

const trackCurve = new THREE.CatmullRomCurve3(trackPoints, true);

// Asphalt Track Surface
const trackGeo = new THREE.TubeGeometry(trackCurve, 450, 20, 2, true);
trackGeo.scale(1, 0.015, 1);
const trackMat = new THREE.MeshStandardMaterial({
  map: asphaltTex,
  roughness: 0.62,
  metalness: 0.2
});
const trackMesh = new THREE.Mesh(trackGeo, trackMat);
trackMesh.receiveShadow = true;
scene.add(trackMesh);

// Center Highway Line
const centerStripeGeo = new THREE.TubeGeometry(trackCurve, 450, 0.55, 2, true);
centerStripeGeo.scale(1, 0.025, 1);
const centerStripeMat = new THREE.MeshBasicMaterial({ color: 0xffcc00 });
const centerStripe = new THREE.Mesh(centerStripeGeo, centerStripeMat);
centerStripe.position.y = 0.1;
scene.add(centerStripe);

// Red/White Racing Rumble Curbs
const curb1Geo = new THREE.TubeGeometry(trackCurve, 450, 1.1, 2, true);
curb1Geo.scale(1, 0.032, 1);
const curbMat = new THREE.MeshStandardMaterial({ color: 0xe60000, roughness: 0.45 });
const curb1 = new THREE.Mesh(curb1Geo, curbMat);
curb1.position.set(0, 0.11, 0);
scene.add(curb1);

// Distant Mountain Ridge with Snow Peaks
function buildMountains() {
  const mGeo = new THREE.ConeGeometry(150, 280, 6);
  const mMat = new THREE.MeshStandardMaterial({ color: 0x41474d, roughness: 0.9, flatShading: true });
  const snowGeo = new THREE.ConeGeometry(65, 110, 6);
  const snowMat = new THREE.MeshStandardMaterial({ color: 0xffffff, roughness: 0.25, flatShading: true });

  for (let i = 0; i < 36; i++) {
    const angle = (i / 36) * Math.PI * 2;
    const dist = 1350 + Math.random() * 300;
    const m = new THREE.Mesh(mGeo, mMat);
    m.position.set(Math.cos(angle) * dist, 120, Math.sin(angle) * dist);
    const scale = 1.3 + Math.random() * 1.8;
    m.scale.set(scale, scale * (0.8 + Math.random() * 0.4), scale);

    const snow = new THREE.Mesh(snowGeo, snowMat);
    snow.position.set(0, 85, 0);
    m.add(snow);

    scene.add(m);
  }
}
buildMountains();

// Roadside Foliage: Detailed Pine Trees
function buildTrees() {
  const trunkGeo = new THREE.CylinderGeometry(0.6, 1.0, 5, 6);
  const trunkMat = new THREE.MeshStandardMaterial({ color: 0x3d2716, roughness: 0.9 });
  const foliageGeo1 = new THREE.ConeGeometry(4.5, 9, 7);
  const foliageGeo2 = new THREE.ConeGeometry(3.6, 8, 7);
  const foliageMat = new THREE.MeshStandardMaterial({ color: 0x1a401b, roughness: 0.8, flatShading: true });

  for (let i = 0; i < 280; i++) {
    const tree = new THREE.Group();
    const trunk = new THREE.Mesh(trunkGeo, trunkMat);
    trunk.position.y = 2.5;
    trunk.castShadow = true;
    tree.add(trunk);

    const f1 = new THREE.Mesh(foliageGeo1, foliageMat);
    f1.position.y = 7;
    f1.castShadow = true;
    const f2 = new THREE.Mesh(foliageGeo2, foliageMat);
    f2.position.y = 11;
    f2.castShadow = true;
    tree.add(f1, f2);

    const rx = (Math.random() - 0.5) * 2200;
    const rz = (Math.random() - 0.5) * 2200;
    if (Math.hypot(rx, rz) > 48) {
      tree.position.set(rx, 0, rz);
      const s = 0.8 + Math.random() * 0.7;
      tree.scale.set(s, s, s);
      scene.add(tree);
    }
  }
}
buildTrees();

// Festival Arches
function createFestivalArch(x, z, rotY) {
  const arch = new THREE.Group();
  const trussMat = new THREE.MeshStandardMaterial({ color: 0x1f2026, metalness: 0.95, roughness: 0.15 });
  const neonMat = new THREE.MeshBasicMaterial({ color: 0xff007f });

  const p1 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 18, 1.6), trussMat);
  p1.position.set(-20, 9, 0);
  const p2 = new THREE.Mesh(new THREE.BoxGeometry(1.6, 18, 1.6), trussMat);
  p2.position.set(20, 9, 0);

  const top = new THREE.Mesh(new THREE.BoxGeometry(42, 3.2, 2.2), trussMat);
  top.position.set(0, 18, 0);

  const banner = new THREE.Mesh(new THREE.BoxGeometry(36, 2.2, 0.4), neonMat);
  banner.position.set(0, 18, 1.2);

  arch.add(p1, p2, top, banner);
  arch.position.set(x, 0, z);
  arch.rotation.y = rotY;
  scene.add(arch);
}
createFestivalArch(0, 0, 0);
createFestivalArch(850, 140, Math.PI / 4);
createFestivalArch(0, -1100, 0);

// ================= 4. NEXT-GEN SUPERCARS FLEET =================
const car = new THREE.Group();
car.position.set(0, 0, 0);
scene.add(car);

// Paint Finish Library
const CAR_PAINTS = [
  { name: 'Forza Horizon Magenta', color: 0xff0055, metal: 0.92, rough: 0.12 },
  { name: 'Nardo Grey', color: 0x686c73, metal: 0.85, rough: 0.18 },
  { name: 'Giallo Midas Gold', color: 0xffcc00, metal: 0.95, rough: 0.1 },
  { name: 'Blu Cepheus Cyan', color: 0x00d8ff, metal: 0.9, rough: 0.14 },
  { name: 'Rosso Corsa Red', color: 0xd90429, metal: 0.88, rough: 0.12 },
  { name: 'Onyx Carbon Pearl', color: 0x101216, metal: 0.98, rough: 0.08 }
];
let currentPaintIdx = 0;

const carPaintMat = new THREE.MeshPhysicalMaterial({
  color: CAR_PAINTS[0].color,
  metalness: CAR_PAINTS[0].metal,
  roughness: CAR_PAINTS[0].rough,
  clearcoat: 1.0,
  clearcoatRoughness: 0.06,
  reflectivity: 1.0
});

const carbonMat = new THREE.MeshStandardMaterial({ color: 0x121316, roughness: 0.35, metalness: 0.85 });
const glassMat = new THREE.MeshPhysicalMaterial({
  color: 0x07090e,
  metalness: 0.98,
  roughness: 0.02,
  transmission: 0.35,
  transparent: true,
  opacity: 0.92
});
const ledWhite = new THREE.MeshBasicMaterial({ color: 0xf0faff });
const ledRed = new THREE.MeshBasicMaterial({ color: 0xff002b });

// Car Wheel Setup
const tireGeo = new THREE.CylinderGeometry(0.48, 0.48, 0.48, 24);
tireGeo.rotateZ(Math.PI / 2);
const tireMat = new THREE.MeshStandardMaterial({ color: 0x16171a, roughness: 0.85 });
const rimMat = new THREE.MeshStandardMaterial({ color: 0xdfb126, metalness: 0.98, roughness: 0.12 });
const caliperMat = new THREE.MeshBasicMaterial({ color: 0xff0022 });

let wheels = [];
let flameL, flameR;

// 3 Distinct Horizon Supercars:
// 0: Koenigsegg Jesko (Track Hypercar)
// 1: Lamborghini Terzo (Futuristic Concept)
// 2: Porsche 911 GT3 RS (Iconic Widebody)
const SUPERCAR_SPECS = [
  { name: 'KOENIGSEGG JESKO', maxSpeed: 235, accel: 0.78, driftGrip: 2.6 },
  { name: 'LAMBORGHINI TERZO', maxSpeed: 225, accel: 0.84, driftGrip: 2.8 },
  { name: 'PORSCHE 911 GT3 RS', maxSpeed: 210, accel: 0.72, driftGrip: 2.4 }
];
let currentCarIdx = 0;

function buildCarModel(typeIdx) {
  // Clear previous car parts
  while (car.children.length > 0) {
    car.remove(car.children[0]);
  }
  wheels = [];

  const bodyGroup = new THREE.Group();

  if (typeIdx === 0) {
    // ================= KOENIGSEGG JESKO =================
    // Sleek Monocoque Chassis
    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.52, 5.2), carPaintMat);
    lowerBody.position.y = 0.55;
    lowerBody.castShadow = true;
    bodyGroup.add(lowerBody);

    // Aerodynamic Sloped Nose & Front Splitter
    const nose = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.28, 1.6), carPaintMat);
    nose.position.set(0, 0.46, -2.1);
    const splitter = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.08, 0.8), carbonMat);
    splitter.position.set(0, 0.28, -2.5);
    bodyGroup.add(nose, splitter);

    // Teardrop Fighter Jet Canopy
    const cockpit = new THREE.Mesh(new THREE.CylinderGeometry(0.85, 1.0, 2.4, 8), glassMat);
    cockpit.rotateX(Math.PI / 2);
    cockpit.scale.set(1.15, 1, 0.55);
    cockpit.position.set(0, 1.05, -0.2);
    cockpit.castShadow = true;
    bodyGroup.add(cockpit);

    // Top-Mounted Boomerang GT Active Wing
    const wingBlade = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.1, 0.8), carbonMat);
    wingBlade.position.set(0, 1.48, 2.3);
    const wingPillar = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.7, 0.3), carbonMat);
    wingPillar.position.set(0, 1.2, 2.1);
    bodyGroup.add(wingBlade, wingPillar);

    // Headlights
    const hl1 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.1), ledWhite);
    hl1.position.set(-0.85, 0.65, -2.6);
    const hl2 = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.1, 0.1), ledWhite);
    hl2.position.set(0.85, 0.65, -2.6);
    bodyGroup.add(hl1, hl2);

    // Center Hex Exhaust
    const exhaust = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.25, 0.2), carbonMat);
    exhaust.position.set(0, 0.75, 2.6);
    bodyGroup.add(exhaust);

  } else if (typeIdx === 1) {
    // ================= LAMBORGHINI TERZO MILLENNIO =================
    // Ultra Low-Slung Stealth Chassis
    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(2.45, 0.42, 5.0), carPaintMat);
    lowerBody.position.y = 0.5;
    lowerBody.castShadow = true;
    bodyGroup.add(lowerBody);

    // Angular Stealth Hood
    const hood = new THREE.Mesh(new THREE.ConeGeometry(1.6, 2.2, 4), carPaintMat);
    hood.rotateX(Math.PI / 2);
    hood.rotateY(Math.PI / 4);
    hood.scale.set(1.4, 0.3, 1);
    hood.position.set(0, 0.58, -1.8);
    bodyGroup.add(hood);

    // Angular Low-Profile Canopy
    const cockpit = new THREE.Mesh(new THREE.BoxGeometry(1.7, 0.5, 2.2), glassMat);
    cockpit.position.set(0, 0.95, -0.1);
    bodyGroup.add(cockpit);

    // Y-Shaped LED Headlights
    const yLight1 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.1), ledWhite);
    yLight1.rotation.z = Math.PI / 6;
    yLight1.position.set(-0.9, 0.56, -2.52);
    const yLight2 = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.12, 0.1), ledWhite);
    yLight2.rotation.z = -Math.PI / 6;
    yLight2.position.set(0.9, 0.56, -2.52);
    bodyGroup.add(yLight1, yLight2);

    // Massive Dual Tunnel Diffusers
    const diff1 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.4, 0.8), carbonMat);
    diff1.position.set(-0.7, 0.4, 2.3);
    const diff2 = new THREE.Mesh(new THREE.BoxGeometry(0.9, 0.4, 0.8), carbonMat);
    diff2.position.set(0.7, 0.4, 2.3);
    bodyGroup.add(diff1, diff2);

  } else {
    // ================= PORSCHE 911 GT3 RS =================
    // Classic Widebody Curves
    const lowerBody = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.58, 4.9), carPaintMat);
    lowerBody.position.y = 0.58;
    lowerBody.castShadow = true;
    bodyGroup.add(lowerBody);

    // Front Fender Flares & Hood Nostrils
    const fenderL = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 1.4), carPaintMat);
    fenderL.position.set(-1.08, 0.72, -1.5);
    const fenderR = new THREE.Mesh(new THREE.BoxGeometry(0.35, 0.35, 1.4), carPaintMat);
    fenderR.position.set(1.08, 0.72, -1.5);
    bodyGroup.add(fenderL, fenderR);

    // Classic 911 Bubble Roof
    const cockpit = new THREE.Mesh(new THREE.BoxGeometry(1.8, 0.62, 2.5), glassMat);
    cockpit.position.set(0, 1.15, 0.0);
    bodyGroup.add(cockpit);

    // Massive Swan-Neck GT3 RS Rear Wing
    const wingBlade = new THREE.Mesh(new THREE.BoxGeometry(2.5, 0.1, 0.9), carbonMat);
    wingBlade.position.set(0, 1.42, 2.15);
    const neck1 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 0.3), carbonMat);
    neck1.position.set(-0.8, 1.15, 2.15);
    const neck2 = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.6, 0.3), carbonMat);
    neck2.position.set(0.8, 1.15, 2.15);
    bodyGroup.add(wingBlade, neck1, neck2);

    // Round Iconic Headlights
    const h1 = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.1, 16), ledWhite);
    h1.rotateX(Math.PI / 2);
    h1.position.set(-0.85, 0.74, -2.46);
    const h2 = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.22, 0.1, 16), ledWhite);
    h2.rotateX(Math.PI / 2);
    h2.position.set(0.85, 0.74, -2.46);
    bodyGroup.add(h1, h2);
  }

  // Full-Width Sleek Red Neon Taillight Bar (Across all supercars)
  const tailLight = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.1, 0.1), ledRed);
  tailLight.position.set(0, 0.8, 2.54);
  bodyGroup.add(tailLight);

  // Wheels
  const wheelPositions = [
    { x: -1.24, y: 0.48, z: -1.5, isFront: true },
    { x: 1.24, y: 0.48, z: -1.5, isFront: true },
    { x: -1.24, y: 0.48, z: 1.5, isFront: false },
    { x: 1.24, y: 0.48, z: 1.5, isFront: false }
  ];

  wheelPositions.forEach((pos) => {
    const wGroup = new THREE.Group();
    const tire = new THREE.Mesh(tireGeo, tireMat);
    tire.castShadow = true;

    const rim = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.49, 14), rimMat);
    rim.rotateZ(Math.PI / 2);

    const caliper = new THREE.Mesh(new THREE.BoxGeometry(0.1, 0.22, 0.2), caliperMat);
    caliper.position.set(pos.x < 0 ? -0.15 : 0.15, 0.15, 0);

    wGroup.add(tire, rim, caliper);
    wGroup.position.set(pos.x, pos.y, pos.z);
    car.add(wGroup);
    wheels.push({ mesh: wGroup, isFront: pos.isFront });
  });

  // Twin Blue NOS Burners
  const nosFlameGeo = new THREE.ConeGeometry(0.24, 2.2, 10);
  nosFlameGeo.rotateX(-Math.PI / 2);
  const nosFlameMat = new THREE.MeshBasicMaterial({ color: 0x00f0ff });
  flameL = new THREE.Mesh(nosFlameGeo, nosFlameMat);
  flameL.position.set(-0.45, 0.46, 3.2);
  flameL.visible = false;
  flameR = new THREE.Mesh(nosFlameGeo, nosFlameMat);
  flameR.position.set(0.45, 0.46, 3.2);
  flameR.visible = false;
  car.add(flameL, flameR);

  car.add(bodyGroup);
  currentCarName.textContent = SUPERCAR_SPECS[typeIdx].name;
}

// Initial Car Build
buildCarModel(0);

// Switch Car Button / Shortcut
function switchCar() {
  currentCarIdx = (currentCarIdx + 1) % SUPERCAR_SPECS.length;
  buildCarModel(currentCarIdx);
}
carSelectBtn.addEventListener('click', switchCar);

// ================= 5. REALISTIC VEHICLE DYNAMICS (2D LATERAL MOMENTUM / FORZA SIM-CADE) =================
const keys = { w: false, s: false, a: false, d: false, space: false, shift: false };

window.addEventListener('keydown', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'w' || e.key === 'ArrowUp') keys.w = true;
  if (k === 's' || e.key === 'ArrowDown') keys.s = true;
  if (k === 'a' || e.key === 'ArrowLeft') keys.a = true;
  if (k === 'd' || e.key === 'ArrowRight') keys.d = true;
  if (e.code === 'Space') { keys.space = true; e.preventDefault(); }
  if (e.key === 'Shift') keys.shift = true;
  if (k === 'r') resetCar();
  if (k === 'c') toggleCamera();
  if (k === 'v') switchCar();

  forzaAudio.init();
});

window.addEventListener('keyup', (e) => {
  const k = e.key.toLowerCase();
  if (k === 'w' || e.key === 'ArrowUp') keys.w = false;
  if (k === 's' || e.key === 'ArrowDown') keys.s = false;
  if (k === 'a' || e.key === 'ArrowLeft') keys.a = false;
  if (k === 'd' || e.key === 'ArrowRight') keys.d = false;
  if (e.code === 'Space') keys.space = false;
  if (e.key === 'Shift') keys.shift = false;
});

// Forza Horizon Sim-Cade Physics State
const physics = {
  // Speed & Velocity Vector (allows realistic sliding/drifting inertia)
  velocity: new THREE.Vector3(0, 0, 0),
  speed: 0,           // Forward speed along car heading
  lateralSpeed: 0,    // Sideways drift slip speed
  slipAngle: 0,       // Angle between heading and velocity
  reverseMax: -50,
  brake: 1.4,
  drag: 0.992,

  // Steering & Counter-steering
  steerInput: 0,
  wheelAngle: 0,
  maxWheelAngle: 0.58, // Radians (~33 degrees)

  // Nitro
  nitro: 100,
  isNitro: false,
  isDrifting: false,

  // Horizon Progression
  gear: 1,
  totalDriftScore: 0,
  currentDriftCombo: 0,
  driftTimer: 0,
  comboMultiplier: 1.0,
  bestSpeed: 0,
  xp: 0
};

function resetCar() {
  car.position.set(0, 0, 0);
  car.rotation.set(0, 0, 0);
  physics.velocity.set(0, 0, 0);
  physics.speed = 0;
  physics.lateralSpeed = 0;
  physics.wheelAngle = 0;
}

// Camera Modes: Horizon Dynamic Chase, Close Action, Hood Cam
let cameraMode = 0;
function toggleCamera() {
  cameraMode = (cameraMode + 1) % 3;
}
viewToggleBtn.addEventListener('click', toggleCamera);

// Paint Switcher
carColorBtn.addEventListener('click', () => {
  currentPaintIdx = (currentPaintIdx + 1) % CAR_PAINTS.length;
  const p = CAR_PAINTS[currentPaintIdx];
  carPaintMat.color.setHex(p.color);
  carPaintMat.metalness = p.metal;
  carPaintMat.roughness = p.rough;
});

// Audio Toggle
audioToggleBtn.addEventListener('click', () => {
  const on = forzaAudio.toggle();
  audioToggleBtn.textContent = on ? '🔊 AUDIO' : '🔇 MUTED';
});

// Golden Hour / Night Switcher
let isNight = false;
timeToggleBtn.addEventListener('click', () => {
  isNight = !isNight;
  if (isNight) {
    timeToggleBtn.textContent = '🌙 NIGHT';
    renderer.setClearColor(0x04060d);
    scene.fog.color.setHex(0x04060d);
    hemiLight.intensity = 0.22;
    sunLight.intensity = 0.25;
  } else {
    timeToggleBtn.textContent = '🌅 DUSK';
    renderer.setClearColor(0xff9966);
    scene.fog.color.setHex(0xe69f70);
    hemiLight.intensity = 0.75;
    sunLight.intensity = 2.2;
  }
});

// ================= 6. MAIN ENGINE ANIMATION LOOP =================
const clock = new THREE.Clock();

function animate() {
  requestAnimationFrame(animate);
  const delta = Math.min(clock.getDelta(), 0.1);

  const carSpec = SUPERCAR_SPECS[currentCarIdx];

  // --- 1. ACCELERATION & NOS DYNAMICS ---
  let targetAccel = carSpec.accel;
  physics.isNitro = false;

  if (keys.shift && physics.nitro > 2 && keys.w) {
    physics.isNitro = true;
    physics.nitro = Math.max(0, physics.nitro - delta * 32);
    targetAccel *= 1.95;
    if (flameL && flameR) {
      flameL.visible = true;
      flameR.visible = true;
      flameL.scale.set(1 + Math.random() * 0.4, 1 + Math.random() * 0.6, 1);
      flameR.scale.set(1 + Math.random() * 0.4, 1 + Math.random() * 0.6, 1);
    }
    motionBlur.classList.add('active');
  } else {
    if (flameL && flameR) {
      flameL.visible = false;
      flameR.visible = false;
    }
    physics.nitro = Math.min(100, physics.nitro + delta * 11);
    motionBlur.classList.remove('active');
  }

  nitroBar.style.width = physics.nitro + '%';
  nitroPercent.textContent = Math.round(physics.nitro) + '%';

  // Longitudinal acceleration
  if (keys.w) {
    physics.speed += targetAccel;
  } else if (keys.s) {
    if (physics.speed > 2) {
      physics.speed -= physics.brake;
    } else {
      physics.speed -= 0.55; // Reverse
    }
  } else {
    physics.speed *= physics.drag;
  }

  // Top speed limiter
  const currentMax = physics.isNitro ? carSpec.maxSpeed * 1.25 : carSpec.maxSpeed;
  physics.speed = Math.max(physics.reverseMax, Math.min(physics.speed, currentMax));

  // --- 2. SPEED-SENSITIVE STEERING & MOMENTUM PHYSICS ---
  // High speed reduces max lock angle to prevent twitching; low speed allows sharp cornering
  const speedRatio = Math.min(1.0, Math.abs(physics.speed) / 120);
  const effectiveMaxLock = physics.maxWheelAngle * (1.0 - speedRatio * 0.52);

  // Smooth progressive steering with quick return-to-center
  if (keys.a) {
    physics.steerInput = Math.min(physics.steerInput + delta * 5.5, 1.0);
  } else if (keys.d) {
    physics.steerInput = Math.max(physics.steerInput - delta * 5.5, -1.0);
  } else {
    physics.steerInput *= 0.72; // Snappy centering
  }

  physics.wheelAngle = physics.steerInput * effectiveMaxLock;

  // Wheel visualization (steer front wheels)
  wheels.forEach(w => {
    if (w.isFront) {
      w.mesh.rotation.y = physics.wheelAngle;
    }
    // Spin wheels relative to vehicle speed
    w.mesh.children[0].rotation.x += physics.speed * 0.08;
    w.mesh.children[1].rotation.x += physics.speed * 0.08;
  });

  // --- 3. DRIFT, LATERAL GRIP & YAW PHYSICS ---
  const isMoving = Math.abs(physics.speed) > 2.0;
  const forwardHeading = new THREE.Vector3(0, 0, -1).applyAxisAngle(new THREE.Vector3(0, 1, 0), car.rotation.y);
  const rightHeading = new THREE.Vector3(1, 0, 0).applyAxisAngle(new THREE.Vector3(0, 1, 0), car.rotation.y);

  // Grip levels (Handbrake reduces lateral rear grip)
  physics.isDrifting = false;
  let tireLateralGrip = 0.88; // Default sticky tarmac grip

  if (keys.space && isMoving) {
    // Handbrake: Break traction, initiate drift rotation
    physics.isDrifting = true;
    tireLateralGrip = 0.32; // Tires break loose into slide
    physics.speed *= 0.988; // Scrub longitudinal speed
  } else if (Math.abs(physics.lateralSpeed) > 12) {
    // Sustained power drift
    physics.isDrifting = true;
    tireLateralGrip = 0.55;
  }

  // Yaw rotation speed based on steering input and speed
  if (isMoving) {
    const steerDir = physics.speed >= 0 ? 1 : -1;
    let yawSpeed = (physics.wheelAngle * 2.8) * steerDir * (Math.abs(physics.speed) / 55);

    // Oversteer drift whip
    if (physics.isDrifting) {
      yawSpeed *= 1.6;
    }

    car.rotation.y += yawSpeed * delta;
  }

  // Decompose velocity into forward and lateral slip components
  const targetForwardVel = forwardHeading.clone().multiplyScalar(physics.speed * 0.44);
  const targetLateralVel = rightHeading.clone().multiplyScalar(physics.lateralSpeed * 0.44);

  // Apply grip recovery to eliminate sideways sliding over time
  physics.lateralSpeed = THREE.MathUtils.lerp(physics.lateralSpeed, 0, tireLateralGrip * delta * 8);

  // Introduce lateral slide force when turning hard at speed
  if (isMoving && (physics.isDrifting || Math.abs(physics.wheelAngle) > 0.15)) {
    const centrifugalForce = -physics.wheelAngle * (physics.speed * 0.8);
    physics.lateralSpeed += centrifugalForce * (1.0 - tireLateralGrip) * delta * 25;
  }

  // Combine forward drive and lateral drift momentum
  const movement = targetForwardVel.add(rightHeading.clone().multiplyScalar(physics.lateralSpeed * 0.28 * delta));
  car.position.add(movement);

  // Chassis roll (body-lean into turns and pitch during hard acceleration/braking)
  const rollTarget = -physics.wheelAngle * (physics.speed / 50);
  const pitchTarget = keys.w ? 0.025 : (keys.s ? -0.04 : 0);
  const chassisMesh = car.children[car.children.length - 1];
  if (chassisMesh) {
    chassisMesh.rotation.z += (rollTarget - chassisMesh.rotation.z) * 0.18;
    chassisMesh.rotation.x += (pitchTarget - chassisMesh.rotation.x) * 0.15;
  }

  // --- 4. DRIFT COMBO SCORING CHAIN ---
  if (physics.isDrifting && Math.abs(physics.speed) > 25 && Math.abs(physics.wheelAngle) > 0.08) {
    physics.comboMultiplier = Math.min(5.0, physics.comboMultiplier + delta * 0.8);
    physics.currentDriftCombo += Math.floor((Math.abs(physics.speed) + Math.abs(physics.lateralSpeed)) * 0.35 * physics.comboMultiplier);
    physics.driftTimer = 45;
    driftPopup.classList.remove('hidden');

    if (physics.comboMultiplier > 3.5) skillBadge.textContent = 'DAREDEVIL DRIFT!';
    else if (physics.comboMultiplier > 2.0) skillBadge.textContent = 'ULTIMATE DRIFT!';
    else skillBadge.textContent = 'GREAT DRIFT!';

    driftPoints.textContent = '+' + physics.currentDriftCombo.toLocaleString();
    driftMultiplier.textContent = 'x ' + physics.comboMultiplier.toFixed(1);
  } else {
    if (physics.driftTimer > 0) {
      physics.driftTimer--;
      if (physics.driftTimer === 0) {
        physics.totalDriftScore += physics.currentDriftCombo;
        physics.xp += Math.floor(physics.currentDriftCombo / 100);
        physics.currentDriftCombo = 0;
        physics.comboMultiplier = 1.0;
        driftPopup.classList.add('hidden');
      }
    }
  }

  // --- 5. AUDIO & RPM GAUGE ---
  const displaySpeed = Math.abs(Math.round(physics.speed));
  const rpmRatio = (displaySpeed % 38) / 38;
  forzaAudio.update(rpmRatio, physics.isDrifting, physics.isNitro);

  // Light up RPM dots
  const activeDotCount = Math.floor(rpmRatio * rpmDots.length);
  rpmDots.forEach((dot, idx) => {
    dot.classList.toggle('active', idx < activeDotCount);
  });

  // Gear Calculation
  let currentGear = 1;
  if (displaySpeed > 175) currentGear = 6;
  else if (displaySpeed > 135) currentGear = 5;
  else if (displaySpeed > 95) currentGear = 4;
  else if (displaySpeed > 55) currentGear = 3;
  else if (displaySpeed > 25) currentGear = 2;
  else if (physics.speed < -0.5) currentGear = 'R';

  if (currentGear !== physics.gear) {
    physics.gear = currentGear;
    forzaAudio.playBackfire();
  }

  // --- 6. HUD DASHBOARD UPDATES ---
  speedValue.textContent = displaySpeed;
  gearValue.textContent = physics.gear;
  driftScoreText.textContent = physics.totalDriftScore.toLocaleString() + ' PTS';
  xpText.textContent = 'LVL ' + (1 + Math.floor(physics.xp / 10));

  if (displaySpeed > physics.bestSpeed) {
    physics.bestSpeed = displaySpeed;
    bestSpeedText.textContent = physics.bestSpeed + ' MPH';
  }

  // --- 7. DYNAMIC HORIZON CHASE CAMERA ---
  let camOffset;
  let lookOffset;

  if (cameraMode === 0) {
    // Horizon Dynamic Chase Cam (Slight elastic lag)
    camOffset = new THREE.Vector3(0, 3.8, 8.5).applyAxisAngle(new THREE.Vector3(0, 1, 0), car.rotation.y);
    lookOffset = new THREE.Vector3(0, 1.2, -6).applyAxisAngle(new THREE.Vector3(0, 1, 0), car.rotation.y);
  } else if (cameraMode === 1) {
    // Close Action Cam
    camOffset = new THREE.Vector3(0, 2.5, 5.5).applyAxisAngle(new THREE.Vector3(0, 1, 0), car.rotation.y);
    lookOffset = new THREE.Vector3(0, 1.0, -5).applyAxisAngle(new THREE.Vector3(0, 1, 0), car.rotation.y);
  } else {
    // Hood Cam
    camOffset = new THREE.Vector3(0, 1.35, -0.7).applyAxisAngle(new THREE.Vector3(0, 1, 0), car.rotation.y);
    lookOffset = new THREE.Vector3(0, 1.1, -15).applyAxisAngle(new THREE.Vector3(0, 1, 0), car.rotation.y);
  }

  const targetCamPos = car.position.clone().add(camOffset);
  camera.position.lerp(targetCamPos, 0.18);
  camera.lookAt(car.position.clone().add(lookOffset));

  // Sun Light follows car
  sunLight.position.set(car.position.x + 100, 200, car.position.z + 80);
  sunLight.target = car;

  renderer.render(scene, camera);
}

// Window resize handler
window.addEventListener('resize', () => {
  camera.aspect = window.innerWidth / window.innerHeight;
  camera.updateProjectionMatrix();
  renderer.setSize(window.innerWidth, window.innerHeight);
});

// Start loop
animate();
