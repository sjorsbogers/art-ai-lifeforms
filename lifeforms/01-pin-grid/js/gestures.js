/**
 * gestures.js
 * The AI's physical vocabulary — a library of height-map generators.
 *
 * Each gesture is a function (t, params) → Float32Array(TOTAL_PINS)
 * where t = elapsed milliseconds, values in range [0, 1].
 *
 * This mirrors how the real AI built its own "body language"
 * to overcome the latency of generating code each time.
 */

const Gestures = (() => {

  const { GRID_COLS, GRID_ROWS, TOTAL_PINS } = CONFIG;
  const CX = GRID_COLS / 2;
  const CY = GRID_ROWS / 2;

  /** Helper: create a fresh Float32Array of length TOTAL_PINS */
  function blank() { return new Float32Array(TOTAL_PINS); }

  /** Helper: map row/col to flat index */
  function idx(r, c) { return r * GRID_COLS + c; }

  /** Helper: distance from grid centre */
  function distFromCenter(r, c) {
    return Math.sqrt((r - CY) ** 2 + (c - CX) ** 2);
  }

  /** Clamp value 0–1 */
  function clamp(v) { return Math.max(0, Math.min(1, v)); }

  // ─────────────────────────────────────────────────────────────────────────
  // GESTURE DEFINITIONS
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * flat — everything at rest (minimum height)
   */
  function flat() {
    return blank(); // all zeros → scene clamps to PIN_MIN_HEIGHT
  }

  /**
   * breathe — slow, full-surface sine oscillation
   * The AI's first self-discovered gesture.
   */
  function breathe(t) {
    const out = blank();
    const intensity = (Math.sin(t * 0.0018) + 1) / 2;
    const base = intensity * 0.35;
    for (let i = 0; i < TOTAL_PINS; i++) {
      out[i] = base;
    }
    return out;
  }

  /**
   * ripple — circular wave expanding from a point
   */
  function ripple(t, cx = CX, cy = CY, speed = 0.0025, frequency = 0.55) {
    const out = blank();
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const dist = Math.sqrt((r - cy) ** 2 + (c - cx) ** 2);
        const v = Math.sin(dist * frequency - t * speed) * 0.5 + 0.5;
        out[idx(r, c)] = clamp(v * 0.85);
      }
    }
    return out;
  }

  /**
   * wave — travelling plane wave (horizontal or vertical)
   */
  function wave(t, axis = 'x', speed = 0.003, frequency = 0.38) {
    const out = blank();
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const pos = axis === 'x' ? c : r;
        const v = (Math.sin(pos * frequency - t * speed) + 1) / 2;
        out[idx(r, c)] = clamp(v * 0.9);
      }
    }
    return out;
  }

  /**
   * pulse — a ring of energy expanding outward from the centre
   */
  function pulse(t, cx = CX, cy = CY) {
    const out = blank();
    const maxR = Math.sqrt(CX * CX + CY * CY);
    const radius = (t * 0.006) % (maxR * 1.1);
    const thickness = 3.5;
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const dist = Math.sqrt((r - cy) ** 2 + (c - cx) ** 2);
        const diff = Math.abs(dist - radius);
        out[idx(r, c)] = clamp(1 - diff / thickness);
      }
    }
    return out;
  }

  /**
   * spiral — rotating logarithmic spiral
   */
  function spiral(t, speed = 0.0015) {
    const out = blank();
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const dr = r - CY;
        const dc = c - CX;
        const angle = Math.atan2(dr, dc);
        const dist  = Math.sqrt(dr ** 2 + dc ** 2);
        const v = (Math.sin(angle * 4 - dist * (0.45 * 30 / CX) + t * speed) + 1) / 2;
        out[idx(r, c)] = clamp(v * 0.88);
      }
    }
    return out;
  }

  /**
   * heartbeat — concentric rings, double-pulse rhythm
   */
  function heartbeat(t) {
    const out = blank();
    const cycle = t % 1200;
    let intensity = 0;
    if      (cycle < 80)  intensity = cycle / 80;
    else if (cycle < 200) intensity = 1 - (cycle - 80)  / 120;
    else if (cycle < 280) intensity = (cycle - 200) / 80 * 0.65;
    else if (cycle < 400) intensity = 0.65 - (cycle - 280) / 120 * 0.65;

    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const dist = distFromCenter(r, c);
        const v = intensity * Math.max(0, 1 - dist / CX * 0.9);
        out[idx(r, c)] = clamp(v);
      }
    }
    return out;
  }

  /**
   * noise — slow organic Perlin-like noise via layered sines
   */
  function noise(t) {
    const out = blank();
    const s = t * 0.0006;
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const v =
          Math.sin(r * 0.7 + s * 1.1) * Math.cos(c * 0.6 + s * 0.9) * 0.4 +
          Math.sin(r * 1.3 + c * 0.8 + s * 0.7) * 0.3 +
          Math.cos(r * 0.4 - c * 1.1 + s * 1.3) * 0.3;
        out[idx(r, c)] = clamp(v * 0.5 + 0.5);
      }
    }
    return out;
  }

  /**
   * focus — spotlight: one bright pin rising from silence
   */
  function focus(t, targetR = CY, targetC = CX) {
    const out = blank();
    const progress = clamp((t % 4000) / 4000);
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const dist = Math.sqrt((r - targetR) ** 2 + (c - targetC) ** 2);
        const falloff = Math.max(0, 1 - dist / 6);
        out[idx(r, c)] = clamp(falloff * progress);
      }
    }
    return out;
  }

  /**
   * scatter — random jitter (exploration of form)
   * Uses a seeded-ish approach so it changes slowly.
   */
  function scatter(t) {
    const out = blank();
    const seed = Math.floor(t / 800);
    for (let i = 0; i < TOTAL_PINS; i++) {
      // Pseudo-random but deterministic per seed
      const h = Math.abs(Math.sin(i * 127.1 + seed * 311.7) * 43758.5453) % 1;
      out[i] = h * 0.7;
    }
    return out;
  }

  /**
   * signature — the AI's unique emergent pattern.
   * A standing wave filtered through its own grid coordinates.
   * Revealed slowly as identity forms.
   */
  function signature(t, progress = 1) {
    const out = blank();
    const s = t * 0.0008;
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const dr = (r - CY) / CY;
        const dc = (c - CX) / CX;
        const v =
          Math.sin(dr * Math.PI * 2.5 + s) *
          Math.cos(dc * Math.PI * 2.5 - s * 0.8) * 0.5 + 0.5;
        out[idx(r, c)] = clamp(v * progress * 0.95);
      }
    }
    return out;
  }

  /**
   * reflect — calm, low ripple for introspective state
   */
  function reflect(t) {
    const out = blank();
    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        const dist = distFromCenter(r, c);
        const v = Math.sin(dist * 0.35 - t * 0.0008) * 0.5 + 0.5;
        out[idx(r, c)] = clamp(v * 0.4);
      }
    }
    return out;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PARAMETRIC GESTURE (Phase 3)
  // ─────────────────────────────────────────────────────────────────────────

  /**
   * parametric — fully LLM-controlled expressive motion.
   * FORM decides every parameter; not limited to named presets.
   *
   * @param {number} t  elapsed ms
   * @param {object} p  parameter object
   *   motion:     'radial'|'linear'|'zonal'|'scatter'|'still'
   *   frequency:  0–1  (pattern density)
   *   amplitude:  0–1  (pin height scale)
   *   speed:      0–1  (rate of travel)
   *   focal_x:    0–1  (horizontal focal point, 0=left 1=right)
   *   focal_y:    0–1  (vertical focal point,   0=front 1=back)
   *   complexity: 0–1  (noise overlay amount)
   *   symmetry:   'none'|'mirror'|'radial'
   */
  function parametric(t, p = {}) {
    const motion     = p.motion     || 'radial';
    const frequency  = p.frequency  !== undefined ? Number(p.frequency)  : 0.5;
    const amplitude  = p.amplitude  !== undefined ? Number(p.amplitude)  : 0.7;
    const speed      = p.speed      !== undefined ? Number(p.speed)      : 0.5;
    const focal_x    = p.focal_x    !== undefined ? Number(p.focal_x)    : 0.5;
    const focal_y    = p.focal_y    !== undefined ? Number(p.focal_y)    : 0.5;
    const complexity = p.complexity !== undefined ? Number(p.complexity) : 0.2;
    const symmetry   = p.symmetry   || 'none';

    const out        = blank();
    const fx         = focal_x * GRID_COLS;
    const fy         = focal_y * GRID_ROWS;
    const speedFac   = speed * 0.005 + 0.0005;
    const freqFac    = frequency * 0.7 + 0.05;
    const maxDist    = Math.sqrt((GRID_ROWS / 2) ** 2 + (GRID_COLS / 2) ** 2);
    const s          = t * 0.0006;

    for (let r = 0; r < GRID_ROWS; r++) {
      for (let c = 0; c < GRID_COLS; c++) {
        // Apply symmetry: fold coordinates
        let cr = r, cc = c;
        if (symmetry === 'mirror') {
          cc = c < GRID_COLS / 2 ? c : GRID_COLS - 1 - c;
        } else if (symmetry === 'radial') {
          cr = r < GRID_ROWS / 2 ? r : GRID_ROWS - 1 - r;
          cc = c < GRID_COLS / 2 ? c : GRID_COLS - 1 - c;
        }

        let v = 0;
        if (motion === 'radial') {
          const dist = Math.sqrt((cr - fy) ** 2 + (cc - fx) ** 2);
          v = Math.sin(dist * freqFac - t * speedFac) * 0.5 + 0.5;

        } else if (motion === 'linear') {
          v = (Math.sin(cc * freqFac - t * speedFac) + 1) / 2;

        } else if (motion === 'zonal') {
          const dist = Math.sqrt((cr - fy) ** 2 + (cc - fx) ** 2);
          const zone = clamp(1 - dist / maxDist);
          v = zone * ((Math.sin(t * speedFac * 3) + 1) / 2 * 0.8 + 0.2);

        } else if (motion === 'scatter') {
          const seed = Math.floor(t * speedFac * 200);
          v = Math.abs(Math.sin((r * GRID_COLS + c) * 127.1 + seed * 311.7) * 43758.5453) % 1;

        } else { // still
          v = 0.4;
        }

        // Complexity: noise overlay
        if (complexity > 0) {
          const noiseV =
            Math.sin(r * 0.7 + s * 1.1) * Math.cos(c * 0.6 + s * 0.9) * 0.4 +
            Math.sin(r * 1.3 + c * 0.8 + s * 0.7) * 0.3 +
            Math.cos(r * 0.4 - c * 1.1 + s * 1.3) * 0.3;
          v = v * (1 - complexity * 0.6) + (noiseV * 0.5 + 0.5) * (complexity * 0.6);
        }

        out[idx(r, c)] = clamp(v * amplitude);
      }
    }
    return out;
  }

  // ─────────────────────────────────────────────────────────────────────────
  // PUBLIC API
  // ─────────────────────────────────────────────────────────────────────────

  const library = { flat, breathe, ripple, wave, pulse, spiral,
                    heartbeat, noise, focus, scatter, signature, reflect,
                    parametric };

  /**
   * compute(name, t, params) → Float32Array(TOTAL_PINS)
   * Safe lookup — falls back to flat if name is unknown.
   * 'parametric' receives params as a single object (not spread).
   */
  function compute(name, t, params = {}) {
    const fn = library[name];
    if (!fn) return flat();
    if (name === 'parametric') return fn(t, params);
    return fn(t, ...Object.values(params));
  }

  return { compute, library, names: Object.keys(library) };

})();
