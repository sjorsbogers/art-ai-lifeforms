/**
 * config.js
 * Global constants for the AI Lifeform pin grid.
 * Mirrors the physical inFORM/neoFORM display:
 *   30 × 30 = 900 actuating pins
 */

const CONFIG = Object.freeze({
  // Grid dimensions (matches physical inFORM)
  GRID_COLS:      30,
  GRID_ROWS:      30,
  TOTAL_PINS:     900,   // 30 × 30

  // Pin geometry
  PIN_WIDTH:      0.72,  // world units
  PIN_DEPTH:      0.72,
  PIN_GAP:        1.0,   // centre-to-centre spacing
  PIN_MIN_HEIGHT: 0.05,  // never fully flat — always alive
  PIN_MAX_HEIGHT: 7.0,   // tallest a pin can extend

  // Animation
  PIN_LERP:       0.06,  // smooth interpolation speed (0–1 per frame)

  // Render loop
  FRAME_MS:       16,    // ~60 fps target

  // Brain tick (how often the AI makes decisions)
  BRAIN_TICK_MS:  80,

  // Colours (HSL components for pin height mapping)
  COLOR_LOW_H:    0.60,  // blue-grey at low height
  COLOR_LOW_S:    0.15,
  COLOR_LOW_L:    0.08,
  COLOR_HIGH_H:   0.10,  // warm gold at peak height
  COLOR_HIGH_S:   0.55,
  COLOR_HIGH_L:   0.72,
});
