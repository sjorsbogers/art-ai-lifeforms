/**
 * scene.js
 * Three.js 3D pin grid — the digital body of the AI.
 *
 * Renders 30×30 = 900 individual pins using InstancedMesh
 * for performance. Each pin rises from a base plate and
 * smoothly interpolates to its target height every frame.
 *
 * Camera orbits slowly; user can also drag to explore.
 */

const Scene = (() => {

  const {
    GRID_COLS, GRID_ROWS, TOTAL_PINS,
    PIN_WIDTH, PIN_DEPTH, PIN_GAP,
    PIN_MIN_HEIGHT, PIN_MAX_HEIGHT,
    PIN_LERP,
    COLOR_LOW_H, COLOR_LOW_S, COLOR_LOW_L,
    COLOR_HIGH_H, COLOR_HIGH_S, COLOR_HIGH_L,
  } = CONFIG;

  // ── Three.js core objects ──────────────────────────────────────────

  let renderer, scene, camera, controls;
  let pinMesh;            // InstancedMesh
  let basePlate;          // flat platform the pins rise from
  let containerEl;

  // ── Per-pin state ──────────────────────────────────────────────────

  // currentHeights: what's actually rendered right now (lerped)
  const currentHeights = new Float32Array(TOTAL_PINS).fill(0);
  // targetHeights: what the brain wants (set each brain tick)
  const targetHeights  = new Float32Array(TOTAL_PINS).fill(0);

  // Reusable Three.js objects (avoid GC in hot loop)
  const _matrix = new THREE.Matrix4();
  const _color  = new THREE.Color();
  const _pos    = new THREE.Vector3();
  const _scale  = new THREE.Vector3();
  const _quat   = new THREE.Quaternion();  // always identity

  // ── Init ───────────────────────────────────────────────────────────

  function init(container) {
    containerEl = container;

    // Renderer
    renderer = new THREE.WebGLRenderer({ antialias: true, alpha: false });
    renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    renderer.setSize(container.clientWidth, container.clientHeight);
    renderer.setClearColor(0x080808, 1);
    renderer.shadowMap.enabled = true;
    renderer.shadowMap.type = THREE.PCFSoftShadowMap;
    container.appendChild(renderer.domElement);

    // Scene
    scene = new THREE.Scene();
    scene.fog = new THREE.Fog(0x080808, 35, 75);

    // Camera — angled top-down view
    const aspect = container.clientWidth / container.clientHeight;
    camera = new THREE.PerspectiveCamera(42, aspect, 0.1, 200);
    camera.position.set(0, 28, 26);
    camera.lookAt(0, 0, 0);

    // Orbit Controls
    if (THREE.OrbitControls) {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping    = true;
      controls.dampingFactor    = 0.06;
      controls.minPolarAngle    = Math.PI * 0.1;
      controls.maxPolarAngle    = Math.PI * 0.52;
      controls.minDistance      = 18;
      controls.maxDistance      = 55;
      controls.autoRotate       = true;
      controls.autoRotateSpeed  = 0.22;
      controls.target.set(0, 3, 0);
    }

    // Lighting
    _setupLights();

    // Base plate (the physical table the pins rise from)
    _buildBase();

    // Pin grid
    _buildPins();

    // Resize handler
    window.addEventListener('resize', _onResize);
  }

  // ── Lighting ───────────────────────────────────────────────────────

  function _setupLights() {
    // Ambient — very dark, lets pins glow relative to height
    const ambient = new THREE.AmbientLight(0x111118, 1.0);
    scene.add(ambient);

    // Key light — slightly warm, from upper-left
    const key = new THREE.DirectionalLight(0xfff5e0, 2.2);
    key.position.set(-12, 22, 14);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 1;
    key.shadow.camera.far  = 80;
    key.shadow.camera.left = key.shadow.camera.bottom = -20;
    key.shadow.camera.right = key.shadow.camera.top = 20;
    scene.add(key);

    // Fill — cool blue from the right
    const fill = new THREE.DirectionalLight(0x8ab4ff, 0.7);
    fill.position.set(15, 10, -8);
    scene.add(fill);

    // Rim — from below-back for dramatic silhouette
    const rim = new THREE.DirectionalLight(0xffaa44, 0.4);
    rim.position.set(0, -6, -20);
    scene.add(rim);
  }

  // ── Base plate ─────────────────────────────────────────────────────

  function _buildBase() {
    const w = GRID_COLS * PIN_GAP + 2;
    const d = GRID_ROWS * PIN_GAP + 2;
    const geo = new THREE.BoxGeometry(w, 0.3, d);
    const mat = new THREE.MeshPhongMaterial({
      color:     0x111111,
      specular:  0x222222,
      shininess: 8,
    });
    basePlate = new THREE.Mesh(geo, mat);
    basePlate.position.y = -0.15;
    basePlate.receiveShadow = true;
    scene.add(basePlate);
  }

  // ── Pin grid ───────────────────────────────────────────────────────

  function _buildPins() {
    // Single BoxGeometry — unit height; we scale Y per instance
    const geo = new THREE.BoxGeometry(PIN_WIDTH, 1.0, PIN_DEPTH);
    // Shift pivot to bottom so scaling grows upward
    geo.translate(0, 0.5, 0);

    const mat = new THREE.MeshPhongMaterial({
      vertexColors: false,
      shininess:    60,
      specular:     new THREE.Color(0x888888),
    });

    pinMesh = new THREE.InstancedMesh(geo, mat, TOTAL_PINS);
    pinMesh.castShadow    = true;
    pinMesh.receiveShadow = true;
    pinMesh.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    // Initialise all pins flat
    for (let i = 0; i < TOTAL_PINS; i++) {
      _updatePin(i, 0);
    }

    scene.add(pinMesh);
  }

  // ── Per-pin update (matrix + colour) ──────────────────────────────

  function _updatePin(i, normHeight) {
    const row = Math.floor(i / GRID_COLS);
    const col = i % GRID_COLS;

    const height = Math.max(PIN_MIN_HEIGHT, normHeight * PIN_MAX_HEIGHT);

    // Position: centred on grid
    const x = (col - (GRID_COLS - 1) / 2) * PIN_GAP;
    const z = (row - (GRID_ROWS - 1) / 2) * PIN_GAP;

    _pos.set(x, 0, z);
    _scale.set(1, height, 1);

    _matrix.compose(_pos, _quat, _scale);
    pinMesh.setMatrixAt(i, _matrix);

    // Colour: interpolate HSL between low and high endpoints
    const t = normHeight;
    const h = COLOR_LOW_H + (COLOR_HIGH_H - COLOR_LOW_H) * t;
    const s = COLOR_LOW_S + (COLOR_HIGH_S - COLOR_LOW_S) * t;
    const l = COLOR_LOW_L + (COLOR_HIGH_L - COLOR_LOW_L) * t;
    _color.setHSL(h, s, l);
    pinMesh.setColorAt(i, _color);
  }

  // ── Set target heights (called by brain each tick) ─────────────────

  function setTargets(heightArray) {
    for (let i = 0; i < TOTAL_PINS; i++) {
      targetHeights[i] = heightArray[i] || 0;
    }
  }

  // ── Render frame ───────────────────────────────────────────────────

  function render() {
    let dirty = false;

    for (let i = 0; i < TOTAL_PINS; i++) {
      const prev = currentHeights[i];
      const next = prev + (targetHeights[i] - prev) * PIN_LERP;
      if (Math.abs(next - prev) > 0.0001) {
        currentHeights[i] = next;
        dirty = true;
      } else {
        currentHeights[i] = targetHeights[i];
      }
      _updatePin(i, currentHeights[i]);
    }

    if (dirty || true) {   // always mark dirty for colour updates
      pinMesh.instanceMatrix.needsUpdate = true;
      pinMesh.instanceColor.needsUpdate  = true;
    }

    if (controls) controls.update();
    renderer.render(scene, camera);
  }

  // ── Resize ─────────────────────────────────────────────────────────

  function _onResize() {
    const w = containerEl.clientWidth;
    const h = containerEl.clientHeight;
    camera.aspect = w / h;
    camera.updateProjectionMatrix();
    renderer.setSize(w, h);
  }

  // ── Public API ─────────────────────────────────────────────────────

  return { init, setTargets, render };

})();
