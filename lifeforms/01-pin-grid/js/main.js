/**
 * main.js
 * Entry point — wires together Brain, Scene, and Identity.
 *
 * Loop:
 *   1. Brain.getHeightMap(now) → Float32Array(900)
 *   2. Scene.setTargets(heightMap)
 *   3. Scene.render()          ← lerps pins toward targets, redraws
 *   4. Identity panel updated every 500 ms
 *   5. HUD uptime updated every second
 */

(function () {

  // ── DOM refs ─────────────────────────────────────────────────────────

  const canvasContainer = document.getElementById('canvas-container');
  const identityEl      = document.getElementById('identity-content');
  const soulEl          = document.getElementById('soul-content');
  const logEl           = document.getElementById('log-content');
  const uptimeEl        = document.getElementById('uptime-value');
  const gestureEl       = document.getElementById('gesture-value');
  const stateEl         = document.getElementById('state-value');

  // ── Boot ─────────────────────────────────────────────────────────────

  function boot() {
    // 1. Mount identity panel
    Identity.mount(identityEl, soulEl, logEl);

    // 2. Start brain (sets startTime, fires first log entries)
    Brain.init();

    // 3. Initialise Three.js scene
    Scene.init(canvasContainer);

    // 4. Kick off the render loop
    requestAnimationFrame(loop);
  }

  // ── Main loop ─────────────────────────────────────────────────────────

  let lastUptimeUpdate  = 0;

  function loop(timestamp) {
    requestAnimationFrame(loop);

    const now = Date.now();

    // Get current target heights from the brain
    const heights = Brain.getHeightMap(now);

    // Push targets to scene (lerp handled inside scene.render)
    Scene.setTargets(heights);

    // Draw frame
    Scene.render();

    // Update uptime every second
    if (now - lastUptimeUpdate > 1000) {
      lastUptimeUpdate = now;
      uptimeEl.textContent = Brain.getUptimeString(now);
    }
  }

  // ── Start ─────────────────────────────────────────────────────────────

  if (document.readyState === 'loading') {
    document.addEventListener('DOMContentLoaded', boot);
  } else {
    boot();
  }

})();
