// =============================================================
//  🔊  SONIDO
//  Todos los sonidos se generan con código (no hay archivos de audio).
//  Cambia las frecuencias (números grandes) para que suenen distinto.
// =============================================================
const Sonido = (() => {
  let ctx = null;
  let maestro = null;
  let bufferRuido = null;
  let silenciado = false;
  const ultimaVez = {};

  try { silenciado = localStorage.getItem('nebula_silencio') === '1'; } catch (e) { /* sin almacenamiento */ }

  // El navegador solo deja sonar audio después de que el jugador toca algo.
  function iniciar() {
    if (ctx) {
      if (ctx.state === 'suspended') ctx.resume();
      return;
    }
    const AC = window.AudioContext || window.webkitAudioContext;
    if (!AC) return;
    ctx = new AC();
    maestro = ctx.createGain();
    maestro.gain.value = CONFIG.audio.volumen;
    maestro.connect(ctx.destination);
  }

  // Evita que un mismo sonido se repita demasiado seguido
  function permitido(nombre, espera) {
    if (!ctx || silenciado || ctx.state !== 'running') return false;
    const t = ctx.currentTime;
    if (ultimaVez[nombre] !== undefined && t - ultimaVez[nombre] < espera) return false;
    ultimaVez[nombre] = t;
    return true;
  }

  function tono(freq, dur, tipo, vol, freqFin, retraso) {
    const t = ctx.currentTime + (retraso || 0);
    const o = ctx.createOscillator();
    const g = ctx.createGain();
    o.type = tipo || 'square';
    o.frequency.setValueAtTime(freq, t);
    if (freqFin) o.frequency.exponentialRampToValueAtTime(freqFin, t + dur);
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    o.connect(g);
    g.connect(maestro);
    o.start(t);
    o.stop(t + dur + 0.02);
  }

  function ruido(dur, vol, filtro) {
    if (!bufferRuido) {
      bufferRuido = ctx.createBuffer(1, ctx.sampleRate, ctx.sampleRate);
      const datos = bufferRuido.getChannelData(0);
      for (let i = 0; i < datos.length; i++) datos[i] = Math.random() * 2 - 1;
    }
    const t = ctx.currentTime;
    const fuente = ctx.createBufferSource();
    fuente.buffer = bufferRuido;
    const f = ctx.createBiquadFilter();
    f.type = 'lowpass';
    f.frequency.setValueAtTime(filtro, t);
    f.frequency.exponentialRampToValueAtTime(80, t + dur);
    const g = ctx.createGain();
    g.gain.setValueAtTime(vol, t);
    g.gain.exponentialRampToValueAtTime(0.0001, t + dur);
    fuente.connect(f);
    f.connect(g);
    g.connect(maestro);
    fuente.start(t, 0, Math.min(dur, 1));
  }

  return {
    iniciar,
    get silenciado() { return silenciado; },

    alternar() {
      silenciado = !silenciado;
      try { localStorage.setItem('nebula_silencio', silenciado ? '1' : '0'); } catch (e) { /* nada */ }
      return silenciado;
    },

    disparo() {
      if (permitido('disparo', 0.05)) tono(880, 0.06, 'square', 0.035, 440);
    },
    disparoEnemigo() {
      if (permitido('disparoEnemigo', 0.08)) tono(320, 0.12, 'sawtooth', 0.04, 140);
    },
    golpe() {
      if (permitido('golpe', 0.04)) tono(180, 0.05, 'square', 0.04, 120);
    },
    explosion(grande) {
      if (!permitido(grande ? 'explosionG' : 'explosion', grande ? 0.1 : 0.03)) return;
      ruido(grande ? 0.9 : 0.3, grande ? 0.6 : 0.25, grande ? 2200 : 1500);
      tono(grande ? 90 : 140, grande ? 0.6 : 0.25, 'sine', grande ? 0.35 : 0.18, 35);
    },
    powerup() {
      if (!permitido('powerup', 0.05)) return;
      tono(523, 0.08, 'square', 0.07);
      tono(659, 0.08, 'square', 0.07, null, 0.07);
      tono(1047, 0.16, 'square', 0.07, null, 0.14);
    },
    escudoRoto() {
      if (permitido('escudo', 0.1)) tono(900, 0.3, 'triangle', 0.15, 200);
    },
    dano() {
      if (!permitido('dano', 0.2)) return;
      tono(240, 0.45, 'sawtooth', 0.15, 50);
      ruido(0.35, 0.3, 1200);
    },
    alarma() {
      if (!permitido('alarma', 1)) return;
      for (let i = 0; i < 3; i++) {
        tono(440, 0.18, 'square', 0.08, null, i * 0.4);
        tono(330, 0.18, 'square', 0.08, null, i * 0.4 + 0.2);
      }
    },
    inicio() {
      if (!permitido('inicio', 0.3)) return;
      [392, 523, 659, 784].forEach((f, i) => tono(f, 0.12, 'square', 0.06, null, i * 0.08));
    },
    oleada() {
      if (permitido('oleada', 0.5)) tono(600, 0.25, 'triangle', 0.08, 900);
    },
    finJuego() {
      if (!permitido('fin', 1)) return;
      [523, 440, 349, 262].forEach((f, i) => tono(f, 0.3, 'triangle', 0.1, null, i * 0.22));
    },
    victoria() {
      if (!permitido('victoria', 1)) return;
      [523, 659, 784, 1047, 784, 1047].forEach((f, i) => tono(f, 0.15, 'square', 0.07, null, i * 0.1));
    },
  };
})();
