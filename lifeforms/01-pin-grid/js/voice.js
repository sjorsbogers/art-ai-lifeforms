/**
 * voice.js
 * ElevenLabs Conversational AI session manager for FORM.
 *
 * Fetches a signed URL from /api/voice-session (which injects soul/identity),
 * starts a conversation session, and registers client tools that map directly
 * to Brain.* calls.
 *
 * Exports window.Voice so non-module scripts (main.js) can access it.
 *
 * Usage (from main.js):
 *   Voice.onConnect    = fn
 *   Voice.onDisconnect = fn
 *   Voice.onModeChange = fn  // 'listening' | 'speaking'
 *   Voice.start()
 *   Voice.stop()
 */

import { Conversation } from 'https://esm.sh/@elevenlabs/client';

const Voice = {
  _conversation: null,

  // Callbacks set by main.js
  onConnect:    null,
  onDisconnect: null,
  onModeChange: null,

  async start() {
    if (this._conversation) return; // already active

    // 1. Get signed URL (includes soul/identity override from KV)
    let signedUrl;
    try {
      const res = await fetch('/api/voice-session');
      if (!res.ok) {
        const err = await res.json().catch(() => ({ error: res.statusText }));
        throw new Error(err.error || res.statusText);
      }
      const data = await res.json();
      signedUrl = data.signedUrl;
    } catch (err) {
      console.error('[Voice] Failed to get signed URL:', err);
      if (this.onDisconnect) this.onDisconnect(err.message);
      return;
    }

    // 2. Request microphone permission explicitly (shows browser prompt)
    try {
      await navigator.mediaDevices.getUserMedia({ audio: true });
    } catch (err) {
      console.error('[Voice] Microphone permission denied:', err);
      if (this.onDisconnect) this.onDisconnect('Microphone permission denied');
      return;
    }

    // 3. Register client tools — these are called by the ElevenLabs agent
    const clientTools = {

      // setMotion: parametric pin grid wave
      setMotion: ({ motion, frequency, amplitude, speed, focal_x, focal_y, complexity, symmetry }) => {
        Brain.setParametricGesture({
          motion:     motion     || 'radial',
          frequency:  frequency  ?? 0.5,
          amplitude:  amplitude  ?? 0.8,
          speed:      speed      ?? 0.5,
          focal_x:    focal_x    ?? 0.5,
          focal_y:    focal_y    ?? 0.5,
          complexity: complexity ?? 0.5,
          symmetry:   symmetry   || 'none',
        });
      },

      // setEmotion: color + shimmer layer
      setEmotion: ({ emotion }) => {
        if (emotion) Brain.setEmotion(emotion);
      },

      // setDisplay: text / CLOCK / DATE / EMOJI:<name>
      setDisplay: ({ content }) => {
        if (content) Brain.setDisplay(content);
      },

      // setGesture: named gesture from library
      setGesture: ({ name }) => {
        if (name) Brain.setGestureFromLLM(name);
      },
    };

    // 4. Start session
    try {
      this._conversation = await Conversation.startSession({
        signedUrl,
        clientTools,

        onConnect: () => {
          console.log('[Voice] Connected');
          if (this.onConnect) this.onConnect();
        },

        onDisconnect: () => {
          console.log('[Voice] Disconnected');
          this._conversation = null;
          if (this.onDisconnect) this.onDisconnect();
        },

        onModeChange: ({ mode }) => {
          // mode: 'listening' | 'speaking'
          if (this.onModeChange) this.onModeChange(mode);
        },

        onError: (err) => {
          console.error('[Voice] Session error:', err);
        },
      });
    } catch (err) {
      console.error('[Voice] Failed to start session:', err);
      this._conversation = null;
      if (this.onDisconnect) this.onDisconnect(err.message);
    }
  },

  async stop() {
    if (!this._conversation) return;
    try {
      await this._conversation.endSession();
    } catch (_) { /* ignore */ }
    this._conversation = null;
  },

  isActive() {
    return this._conversation !== null;
  },
};

// Expose to non-module scripts
window.Voice = Voice;
