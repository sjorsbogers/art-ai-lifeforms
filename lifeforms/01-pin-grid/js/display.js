/**
 * display.js
 * Generates Float32Array(3600) bitmaps for visual content on the 60×60 pin grid.
 *
 * Capabilities:
 *   - 5×7 pixel font for A–Z, 0–9, space, and punctuation
 *   - 13×13 emoji bitmaps (8 types)
 *   - renderWord(text)          → static display of up to 10 chars
 *   - renderEmoji(name)         → emoji centred on grid
 *   - renderClock()             → current time as HH MM
 *   - renderDate()              → current date as DD MM
 *
 * Each character is 5 cols wide; gap between chars = 1 col → 6 cols/char.
 * On 60-wide grid: 10 chars per row max.
 * Characters are vertically centred in 60 rows (font height = 7 rows).
 */

const Display = (() => {

  const { GRID_COLS, GRID_ROWS, TOTAL_PINS } = CONFIG;

  // Character size + spacing
  const CHAR_W    = 5;
  const CHAR_H    = 7;
  const CHAR_GAP  = 1;  // gap column between chars
  const CHAR_STEP = CHAR_W + CHAR_GAP;  // 6 cols per character slot

  // Vertical centre: place 7-row font centred in 60 rows
  const ROW_START = Math.floor((GRID_ROWS - CHAR_H) / 2);  // row 26

  // ── 5×7 Pixel Font ────────────────────────────────────────────────────
  // Each character: array of 7 strings, each string = 5 chars ('0' or '1')
  // Row 0 = top, col 0 = left.

  const FONT = {
    ' ': [
      '00000',
      '00000',
      '00000',
      '00000',
      '00000',
      '00000',
      '00000',
    ],
    'A': [
      '01110',
      '10001',
      '10001',
      '11111',
      '10001',
      '10001',
      '10001',
    ],
    'B': [
      '11110',
      '10001',
      '10001',
      '11110',
      '10001',
      '10001',
      '11110',
    ],
    'C': [
      '01110',
      '10001',
      '10000',
      '10000',
      '10000',
      '10001',
      '01110',
    ],
    'D': [
      '11100',
      '10010',
      '10001',
      '10001',
      '10001',
      '10010',
      '11100',
    ],
    'E': [
      '11111',
      '10000',
      '10000',
      '11110',
      '10000',
      '10000',
      '11111',
    ],
    'F': [
      '11111',
      '10000',
      '10000',
      '11110',
      '10000',
      '10000',
      '10000',
    ],
    'G': [
      '01110',
      '10001',
      '10000',
      '10111',
      '10001',
      '10001',
      '01110',
    ],
    'H': [
      '10001',
      '10001',
      '10001',
      '11111',
      '10001',
      '10001',
      '10001',
    ],
    'I': [
      '01110',
      '00100',
      '00100',
      '00100',
      '00100',
      '00100',
      '01110',
    ],
    'J': [
      '00111',
      '00010',
      '00010',
      '00010',
      '00010',
      '10010',
      '01100',
    ],
    'K': [
      '10001',
      '10010',
      '10100',
      '11000',
      '10100',
      '10010',
      '10001',
    ],
    'L': [
      '10000',
      '10000',
      '10000',
      '10000',
      '10000',
      '10000',
      '11111',
    ],
    'M': [
      '10001',
      '11011',
      '10101',
      '10001',
      '10001',
      '10001',
      '10001',
    ],
    'N': [
      '10001',
      '11001',
      '10101',
      '10011',
      '10001',
      '10001',
      '10001',
    ],
    'O': [
      '01110',
      '10001',
      '10001',
      '10001',
      '10001',
      '10001',
      '01110',
    ],
    'P': [
      '11110',
      '10001',
      '10001',
      '11110',
      '10000',
      '10000',
      '10000',
    ],
    'Q': [
      '01110',
      '10001',
      '10001',
      '10001',
      '10101',
      '10010',
      '01101',
    ],
    'R': [
      '11110',
      '10001',
      '10001',
      '11110',
      '10100',
      '10010',
      '10001',
    ],
    'S': [
      '01110',
      '10001',
      '10000',
      '01110',
      '00001',
      '10001',
      '01110',
    ],
    'T': [
      '11111',
      '00100',
      '00100',
      '00100',
      '00100',
      '00100',
      '00100',
    ],
    'U': [
      '10001',
      '10001',
      '10001',
      '10001',
      '10001',
      '10001',
      '01110',
    ],
    'V': [
      '10001',
      '10001',
      '10001',
      '10001',
      '01010',
      '01010',
      '00100',
    ],
    'W': [
      '10001',
      '10001',
      '10001',
      '10101',
      '10101',
      '11011',
      '10001',
    ],
    'X': [
      '10001',
      '10001',
      '01010',
      '00100',
      '01010',
      '10001',
      '10001',
    ],
    'Y': [
      '10001',
      '10001',
      '01010',
      '00100',
      '00100',
      '00100',
      '00100',
    ],
    'Z': [
      '11111',
      '00001',
      '00010',
      '00100',
      '01000',
      '10000',
      '11111',
    ],
    '0': [
      '01110',
      '10001',
      '10011',
      '10101',
      '11001',
      '10001',
      '01110',
    ],
    '1': [
      '00100',
      '01100',
      '00100',
      '00100',
      '00100',
      '00100',
      '01110',
    ],
    '2': [
      '01110',
      '10001',
      '00001',
      '00110',
      '01000',
      '10000',
      '11111',
    ],
    '3': [
      '01110',
      '10001',
      '00001',
      '00110',
      '00001',
      '10001',
      '01110',
    ],
    '4': [
      '00010',
      '00110',
      '01010',
      '10010',
      '11111',
      '00010',
      '00010',
    ],
    '5': [
      '11111',
      '10000',
      '10000',
      '11110',
      '00001',
      '00001',
      '11110',
    ],
    '6': [
      '01110',
      '10000',
      '10000',
      '11110',
      '10001',
      '10001',
      '01110',
    ],
    '7': [
      '11111',
      '00001',
      '00010',
      '00100',
      '01000',
      '01000',
      '01000',
    ],
    '8': [
      '01110',
      '10001',
      '10001',
      '01110',
      '10001',
      '10001',
      '01110',
    ],
    '9': [
      '01110',
      '10001',
      '10001',
      '01111',
      '00001',
      '00001',
      '01110',
    ],
    '!': [
      '00100',
      '00100',
      '00100',
      '00100',
      '00100',
      '00000',
      '00100',
    ],
    '?': [
      '01110',
      '10001',
      '00001',
      '00110',
      '00100',
      '00000',
      '00100',
    ],
    '.': [
      '00000',
      '00000',
      '00000',
      '00000',
      '00000',
      '00000',
      '00100',
    ],
    ',': [
      '00000',
      '00000',
      '00000',
      '00000',
      '00100',
      '00100',
      '01000',
    ],
    '-': [
      '00000',
      '00000',
      '00000',
      '11111',
      '00000',
      '00000',
      '00000',
    ],
    ':': [
      '00000',
      '00100',
      '00000',
      '00000',
      '00000',
      '00100',
      '00000',
    ],
    '/': [
      '00001',
      '00010',
      '00010',
      '00100',
      '01000',
      '01000',
      '10000',
    ],
  };

  // ── 13×13 Emoji Bitmaps ───────────────────────────────────────────────
  // Each emoji: array of 13 strings, each 13 chars ('0'=flat, '1'=raised).

  const EMOJI = {
    happy: [
      '0000111110000',
      '0011000001100',
      '0100000000010',
      '1000000000001',
      '1001000010001',
      '1000000000001',
      '1000000000001',
      '1010000000101',
      '1001000010001',
      '0100111110010',
      '0010000000100',
      '0001100001100',
      '0000011110000',
    ],
    sad: [
      '0000111110000',
      '0011000001100',
      '0100000000010',
      '1000000000001',
      '1001000010001',
      '1000000000001',
      '1000000000001',
      '1000111110001',
      '1001000010001',
      '0100000000010',
      '0010000000100',
      '0001100001100',
      '0000011110000',
    ],
    surprise: [
      '0000111110000',
      '0011000001100',
      '0100000000010',
      '1001000010001',
      '1001000010001',
      '1000000000001',
      '1000011000001',
      '1000100010001',
      '1000100010001',
      '0100011000010',
      '0010000000100',
      '0001100001100',
      '0000011110000',
    ],
    heart: [
      '0000000000000',
      '0011100111000',
      '0111111111100',
      '1111111111110',
      '1111111111110',
      '1111111111110',
      '0111111111100',
      '0011111111000',
      '0001111110000',
      '0000111100000',
      '0000011000000',
      '0000010000000',
      '0000000000000',
    ],
    star: [
      '0000001000000',
      '0000001000000',
      '0001001001000',
      '0000111110000',
      '0011111111100',
      '0001111111000',
      '0010111110100',
      '0100001000010',
      '1000001000001',
      '0000011100000',
      '0000100010000',
      '0001000001000',
      '0000000000000',
    ],
    fire: [
      '0000001000000',
      '0000011100000',
      '0000111100000',
      '0001110010000',
      '0011100011000',
      '0111110111100',
      '0111111111100',
      '1111111111110',
      '1111111111110',
      '1111111111110',
      '0111111111100',
      '0011111111000',
      '0000111110000',
    ],
    wave: [
      '0000000000000',
      '0000000000000',
      '0011000000000',
      '0111000001100',
      '1111100011110',
      '1111110111111',
      '0111111111110',
      '0011111111100',
      '0001111111000',
      '0000011110000',
      '0000001100000',
      '0000000000000',
      '0000000000000',
    ],
    sparkle: [
      '0000001000000',
      '0000001000000',
      '0010001000100',
      '0001010101000',
      '0000101010000',
      '1111101011111',
      '0000101010000',
      '0001010101000',
      '0010001000100',
      '0000001000000',
      '0000001000000',
      '0000000000000',
      '0000000000000',
    ],
  };

  // ── Helpers ───────────────────────────────────────────────────────────

  function blank() {
    return new Float32Array(TOTAL_PINS);
  }

  function setPin(out, row, col, value) {
    if (row < 0 || row >= GRID_ROWS || col < 0 || col >= GRID_COLS) return;
    out[row * GRID_COLS + col] = value;
  }

  /**
   * Render a single character into the output array.
   * @param {Float32Array} out   output buffer
   * @param {string} ch          single character
   * @param {number} startRow    top row in the grid
   * @param {number} startCol    leftmost column in the grid
   */
  function _renderChar(out, ch, startRow, startCol) {
    const glyph = FONT[ch.toUpperCase()] || FONT[' '];
    for (let r = 0; r < CHAR_H; r++) {
      const rowStr = glyph[r] || '00000';
      for (let c = 0; c < CHAR_W; c++) {
        if (rowStr[c] === '1') {
          setPin(out, startRow + r, startCol + c, 1.0);
        }
      }
    }
  }

  // ── Public renderers ──────────────────────────────────────────────────

  /**
   * renderWord(text) → Float32Array(3600)
   * Renders up to 10 characters, horizontally centred, vertically centred.
   * All letters shown simultaneously.
   */
  function renderWord(text) {
    const out  = blank();
    const chars = text.toUpperCase().split('').slice(0, 10);
    const totalW = chars.length * CHAR_STEP - CHAR_GAP;  // no trailing gap
    const startCol = Math.floor((GRID_COLS - totalW) / 2);

    for (let i = 0; i < chars.length; i++) {
      _renderChar(out, chars[i], ROW_START, startCol + i * CHAR_STEP);
    }
    return out;
  }

  /**
   * renderSingleLetter(ch) → Float32Array(3600)
   * One letter, large, centred on the grid.
   */
  function renderSingleLetter(ch) {
    const out = blank();
    const startCol = Math.floor((GRID_COLS - CHAR_W) / 2);
    _renderChar(out, ch, ROW_START, startCol);
    return out;
  }

  /**
   * renderEmoji(name) → Float32Array(3600)
   * 13×13 emoji centred on the 60×60 grid.
   */
  function renderEmoji(name) {
    const out    = blank();
    const bitmap = EMOJI[name] || EMOJI['happy'];
    const SIZE   = 13;
    const startRow = Math.floor((GRID_ROWS - SIZE) / 2);
    const startCol = Math.floor((GRID_COLS - SIZE) / 2);

    for (let r = 0; r < SIZE; r++) {
      const rowStr = bitmap[r] || '0000000000000';
      for (let c = 0; c < SIZE; c++) {
        if (rowStr[c] === '1') {
          setPin(out, startRow + r, startCol + c, 1.0);
        }
      }
    }
    return out;
  }

  /**
   * renderClock() → Float32Array(3600)
   * Current local time as "HH MM" (no colon — gap column separates).
   */
  function renderClock() {
    const now = new Date();
    const hh  = String(now.getHours()).padStart(2, '0');
    const mm  = String(now.getMinutes()).padStart(2, '0');
    return renderWord(`${hh} ${mm}`);
  }

  /**
   * renderDate() → Float32Array(3600)
   * Current date as "DD MM" (short form to fit 60-wide grid with 5 chars).
   */
  function renderDate() {
    const now = new Date();
    const dd  = String(now.getDate()).padStart(2, '0');
    const mo  = String(now.getMonth() + 1).padStart(2, '0');
    return renderWord(`${dd} ${mo}`);
  }

  // ── Public API ────────────────────────────────────────────────────────

  return {
    renderWord,
    renderSingleLetter,
    renderEmoji,
    renderClock,
    renderDate,
    emojiNames: Object.keys(EMOJI),
  };

})();
