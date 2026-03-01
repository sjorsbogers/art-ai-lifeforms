/**
 * scene.js
 * Three.js 3D pin grid — the digital body of the AI.
 *
 * Renders 60×60 = 3600 individual pins using InstancedMesh.
 * Each pin rises from a base plate and smoothly interpolates
 * to its target height every frame.
 *
 * Emotion color layer: setEmotion(name) shifts HSL on top of
 * height-based color, with per-pin shimmer for excited/angry.
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
  let pinMesh;
  let basePlate;
  let containerEl;

  // ── Per-pin state ──────────────────────────────────────────────────

  const currentHeights = new Float32Array(TOTAL_PINS).fill(0);
  const targetHeights  = new Float32Array(TOTAL_PINS).fill(0);

  // Reusable Three.js objects (avoid GC in hot loop)
  const _matrix = new THREE.Matrix4();
  const _color  = new THREE.Color();
  const _pos    = new THREE.Vector3();
  const _scale  = new THREE.Vector3();
  const _quat   = new THREE.Quaternion();  // always identity

  // ── Emotion color state ────────────────────────────────────────────

  const EMOTION_PROPS = {
    neutral:  { hTarget: null,  hShift:  0,     sShift:  0,    lShift:  0,    shimmer: 0    },
    excited:  { hTarget: null,  hShift:  0.02,  sShift:  0.20, lShift:  0.15, shimmer: 0.05 },
    shy:      { hTarget: 0.95,  hShift:  0,     sShift:  0.15, lShift:  0.05, shimmer: 0.01 },
    proud:    { hTarget: 0.12,  hShift:  0,     sShift:  0.10, lShift:  0.25, shimmer: 0    },
    sad:      { hTarget: 0.60,  hShift:  0,     sShift: -0.10, lShift: -0.10, shimmer: 0    },
    happy:    { hTarget: 0.10,  hShift:  0,     sShift:  0.10, lShift:  0.10, shimmer: 0.02 },
    angry:    { hTarget: 0.00,  hShift:  0,     sShift:  0.30, lShift:  0,    shimmer: 0.08 },
  };

  let _emotionName      = 'neutral';
  let _emotionIntensity = 0;   // 0→1 lerped over 2 seconds

  function _clamp01(v) { return Math.max(0, Math.min(1, v)); }

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
    scene.fog = new THREE.Fog(0x080808, 65, 130);

    // Camera — angled top-down view
    const aspect = container.clientWidth / container.clientHeight;
    camera = new THREE.PerspectiveCamera(42, aspect, 0.1, 300);
    camera.position.set(0, 55, 50);
    camera.lookAt(0, 0, 0);

    // Orbit Controls
    if (THREE.OrbitControls) {
      controls = new THREE.OrbitControls(camera, renderer.domElement);
      controls.enableDamping    = true;
      controls.dampingFactor    = 0.06;
      controls.minPolarAngle    = Math.PI * 0.1;
      controls.maxPolarAngle    = Math.PI * 0.52;
      controls.minDistance      = 30;
      controls.maxDistance      = 100;
      controls.autoRotate       = true;
      controls.autoRotateSpeed  = 0.22;
      controls.target.set(0, 3, 0);
    }

    // Lighting
    _setupLights();

    // Base plate
    _buildBase();

    // Pin grid
    _buildPins();

    // Resize handler
    window.addEventListener('resize', _onResize);
  }

  // ── Lighting ───────────────────────────────────────────────────────

  function _setupLights() {
    const ambient = new THREE.AmbientLight(0x111118, 1.0);
    scene.add(ambient);

    const key = new THREE.DirectionalLight(0xfff5e0, 2.2);
    key.position.set(-12, 22, 14);
    key.castShadow = true;
    key.shadow.mapSize.set(2048, 2048);
    key.shadow.camera.near = 1;
    key.shadow.camera.far  = 150;
    key.shadow.camera.left = key.shadow.camera.bottom = -40;
    key.shadow.camera.right = key.shadow.camera.top = 40;
    scene.add(key);

    const fill = new THREE.DirectionalLight(0x8ab4ff, 0.7);
    fill.position.set(15, 10, -8);
    scene.add(fill);

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
    const geo = new THREE.BoxGeometry(PIN_WIDTH, 1.0, PIN_DEPTH);
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

    for (let i = 0; i < TOTAL_PINS; i++) {
      _updatePin(i, 0, 0);
    }

    scene.add(pinMesh);
  }

  // ── Per-pin update (matrix + colour) ──────────────────────────────

  function _updatePin(i, normHeight, shimmerOffset) {
    const row = Math.floor(i / GRID_COLS);
    const col = i % GRID_COLS;

    const height = Math.max(PIN_MIN_HEIGHT, normHeight * PIN_MAX_HEIGHT);

    const x = (col - (GRID_COLS - 1) / 2) * PIN_GAP;
    const z = (row - (GRID_ROWS - 1) / 2) * PIN_GAP;

    _pos.set(x, 0, z);
    _scale.set(1, height, 1);
    _matrix.compose(_pos, _quat, _scale);
    pinMesh.setMatrixAt(i, _matrix);

    // Base colour: interpolate HSL from low→high by height
    const t = normHeight;
    let h = COLOR_LOW_H + (COLOR_HIGH_H - COLOR_LOW_H) * t;
    let s = COLOR_LOW_S + (COLOR_HIGH_S - COLOR_LOW_S) * t;
    let l = COLOR_LOW_L + (COLOR_HIGH_L - COLOR_LOW_L) * t;

    // Emotion layer
    if (_emotionIntensity > 0 && _emotionName !== 'neutral') {
      const em = EMOTION_PROPS[_emotionName];
      if (em) {
        const intensity = _emotionIntensity;
        if (em.hTarget !== null) {
          // Blend toward target hue
          let dh = em.hTarget - h;
          // Wrap hue distance (take shortest path on the hue wheel)
          if (dh > 0.5) dh -= 1;
          if (dh < -0.5) dh += 1;
          h = (h + dh * intensity + 1) % 1;
        } else {
          h = (h + em.hShift * intensity + 1) % 1;
        }
        s = _clamp01(s + em.sShift * intensity);
        l = _clamp01(l + em.lShift * intensity);

        // Shimmer: add random lightness flicker
        if (em.shimmer > 0 && shimmerOffset !== undefined) {
          l = _clamp01(l + shimmerOffset * em.shimmer * intensity);
        }
      }
    }

    _color.setHSL(h, s, l);
    pinMesh.setColorAt(i, _color);
  }

  // ── Set target heights (called by brain each tick) ─────────────────

  function setTargets(heightArray) {
    for (let i = 0; i < TOTAL_PINS; i++) {
      targetHeights[i] = heightArray[i] || 0;
    }
  }

  // ── Emotion control ────────────────────────────────────────────────

  function setEmotion(name) {
    if (!EMOTION_PROPS[name]) return;
    _emotionName = name;
    // Intensity lerps toward 1 in render loop (0 for neutral)
  }

  // ── Render frame ───────────────────────────────────────────────────

  function render() {
    const now = Date.now();

    // Lerp emotion intensity
    const targetIntensity = _emotionName === 'neutral' ? 0 : 1;
    _emotionIntensity += (targetIntensity - _emotionIntensity) * 0.008; // ~2s blend

    const em = EMOTION_PROPS[_emotionName];
    const hasShimmer = em && em.shimmer > 0;

    for (let i = 0; i < TOTAL_PINS; i++) {
      const prev = currentHeights[i];
      const next = prev + (targetHeights[i] - prev) * PIN_LERP;
      currentHeights[i] = (Math.abs(next - prev) > 0.0001) ? next : targetHeights[i];

      // Shimmer noise: per-pin fast sine oscillation
      let shimmerOffset = 0;
      if (hasShimmer && _emotionIntensity > 0.05) {
        shimmerOffset = Math.sin(i * 127.1 + now * 0.006) * 0.5 +
                        Math.sin(i * 53.7  + now * 0.011) * 0.5;
      }

      _updatePin(i, currentHeights[i], shimmerOffset);
    }

    pinMesh.instanceMatrix.needsUpdate = true;
    pinMesh.instanceColor.needsUpdate  = true;

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

  return { init, setTargets, setEmotion, render };

})();
