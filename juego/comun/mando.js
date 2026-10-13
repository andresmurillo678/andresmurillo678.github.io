// =============================================================
//  🎮  MANDO — control de consola, compartido por todos los juegos
//  Funciona con controles de Xbox, PlayStation, Switch Pro y genéricos
//  conectados por USB o Bluetooth (API Gamepad del navegador).
//
//  Uso en un juego:
//    Mando.actualizar()       → llamar UNA vez al inicio de cada cuadro
//    Mando.conectado          → true si hay un control conectado
//    Mando.eje('IX')          → stick izquierdo X  (-1..1)
//              'IY'           → stick izquierdo Y  (-1 arriba .. 1 abajo)
//              'DX', 'DY'     → stick derecho
//    Mando.boton('A')         → true mientras esté apretado
//    Mando.pulso('A')         → true solo en el cuadro en que se apretó
//    Mando.solto('A')         → true solo en el cuadro en que se soltó
//    Mando.gatillo('RT')      → 0..1 (LT / RT son analógicos)
//    Mando.algunPulso()       → true si se apretó cualquier botón
//    Mando.vibrar(fuerza, ms) → vibración (si el control la soporta)
//    Mando.nombre('A')        → texto del botón para mostrar en pantalla
//                               ('A' en Xbox, '✕' en PlayStation, etc.)
//
//  Botones (distribución estándar): A B X Y LB RB LT RT SELECT START
//  L3 R3 ARRIBA ABAJO IZQ DER HOME. "A" es siempre el botón de abajo
//  (✕ en PlayStation), "B" el de la derecha (○), "X" el de la izquierda
//  (□) y "Y" el de arriba (△).
// =============================================================
(function () {
  'use strict';

  const BOTONES = ['A', 'B', 'X', 'Y', 'LB', 'RB', 'LT', 'RT', 'SELECT', 'START',
    'L3', 'R3', 'ARRIBA', 'ABAJO', 'IZQ', 'DER', 'HOME'];
  const INDICE = {};
  BOTONES.forEach((b, i) => { INDICE[b] = i; });

  const ZONA_MUERTA = 0.18;   // movimientos más chicos que esto se ignoran
  const UMBRAL_GATILLO = 0.35; // a partir de aquí LT/RT cuentan como "apretado"

  const NOMBRES_PS = { A: '✕', B: '○', X: '□', Y: '△', LB: 'L1', RB: 'R1', LT: 'L2', RT: 'R2',
    SELECT: 'SHARE', START: 'OPTIONS', L3: 'L3', R3: 'R3' };
  const NOMBRES_SWITCH = { A: 'B', B: 'A', X: 'Y', Y: 'X', LB: 'L', RB: 'R', LT: 'ZL', RT: 'ZR',
    SELECT: '−', START: '+', L3: 'L3', R3: 'R3' };
  const NOMBRES_XBOX = { SELECT: 'VIEW', START: 'MENU' };

  let indiceActivo = -1;
  let tipo = 'xbox';
  let actual = new Array(BOTONES.length).fill(false);
  let anterior = new Array(BOTONES.length).fill(false);
  let gatillos = { LT: 0, RT: 0 };
  let ejes = { IX: 0, IY: 0, DX: 0, DY: 0 };
  let huboPulso = false;

  function detectarTipo(id) {
    const s = (id || '').toLowerCase();
    if (/054c|playstation|dualshock|dualsense|wireless controller/.test(s)) return 'ps';
    if (/057e|nintendo|switch|pro controller|joy-con/.test(s)) return 'switch';
    return 'xbox';
  }

  // Zona muerta circular: el stick en reposo nunca mueve nada,
  // y fuera de la zona el valor se reescala para empezar en 0.
  function zonaMuerta(x, y) {
    const m = Math.hypot(x, y);
    if (m < ZONA_MUERTA) return [0, 0];
    const k = Math.min(1, (m - ZONA_MUERTA) / (1 - ZONA_MUERTA)) / m;
    return [x * k, y * k];
  }

  function lista() {
    try {
      return navigator.getGamepads ? Array.from(navigator.getGamepads()) : [];
    } catch (e) {
      return [];
    }
  }

  function presionado(b) {
    if (!b) return false;
    return typeof b === 'object' ? (b.pressed || b.value > 0.5) : b > 0.5;
  }

  // Usa el control que se tocó más recientemente
  function elegirActivo(pads) {
    let mejor = -1;
    for (const p of pads) {
      if (!p || !p.connected) continue;
      if (mejor === -1) mejor = p.index;
      const algo = p.buttons.some(presionado) || p.axes.some((a) => Math.abs(a) > 0.5);
      if (algo) { mejor = p.index; break; }
    }
    if (indiceActivo !== -1 && pads[indiceActivo] && pads[indiceActivo].connected) {
      const p = pads[mejor];
      const otroActivo = p && p.index !== indiceActivo &&
        (p.buttons.some(presionado) || p.axes.some((a) => Math.abs(a) > 0.5));
      return otroActivo ? mejor : indiceActivo;
    }
    return mejor;
  }

  function actualizar() {
    const pads = lista();
    indiceActivo = elegirActivo(pads);
    const pad = indiceActivo >= 0 ? pads[indiceActivo] : null;

    const tmp = anterior;
    anterior = actual;
    actual = tmp;
    huboPulso = false;

    if (!pad) {
      actual.fill(false);
      gatillos.LT = gatillos.RT = 0;
      ejes.IX = ejes.IY = ejes.DX = ejes.DY = 0;
      Mando.conectado = false;
      return;
    }

    Mando.conectado = true;
    tipo = detectarTipo(pad.id);

    for (let i = 0; i < BOTONES.length; i++) actual[i] = presionado(pad.buttons[i]);

    const val = (i) => {
      const b = pad.buttons[i];
      if (!b) return 0;
      return typeof b === 'object' ? (b.value || (b.pressed ? 1 : 0)) : b;
    };
    gatillos.LT = val(INDICE.LT);
    gatillos.RT = val(INDICE.RT);
    actual[INDICE.LT] = gatillos.LT > UMBRAL_GATILLO;
    actual[INDICE.RT] = gatillos.RT > UMBRAL_GATILLO;

    const a = pad.axes;
    const [ix, iy] = zonaMuerta(a[0] || 0, a[1] || 0);
    const [dx, dy] = zonaMuerta(a[2] || 0, a[3] || 0);
    ejes.IX = ix; ejes.IY = iy; ejes.DX = dx; ejes.DY = dy;

    // Algunos controles sin mapeo estándar mandan la cruceta como eje 9
    if (pad.mapping !== 'standard' && a.length > 9 && Math.abs(a[9]) <= 1.01) {
      const h = a[9];
      if (h > -1.1 && h < -0.9) actual[INDICE.ARRIBA] = true;
      else if (h > -0.5 && h < -0.3) actual[INDICE.DER] = true;
      else if (h > 0.05 && h < 0.25) actual[INDICE.ABAJO] = true;
      else if (h > 0.6 && h < 0.8) actual[INDICE.IZQ] = true;
    }

    for (let i = 0; i < BOTONES.length; i++) {
      if (actual[i] && !anterior[i]) { huboPulso = true; break; }
    }
  }

  function vibrar(fuerza, ms) {
    const pad = indiceActivo >= 0 ? lista()[indiceActivo] : null;
    if (!pad) return;
    const f = Math.max(0, Math.min(1, fuerza == null ? 0.5 : fuerza));
    const dur = ms || 150;
    try {
      if (pad.vibrationActuator && pad.vibrationActuator.playEffect) {
        const pr = pad.vibrationActuator.playEffect('dual-rumble',
          { startDelay: 0, duration: dur, strongMagnitude: f, weakMagnitude: Math.min(1, f * 1.2) });
        if (pr && pr.catch) pr.catch(() => {});
      } else if (pad.hapticActuators && pad.hapticActuators[0]) {
        const pr = pad.hapticActuators[0].pulse(f, dur);
        if (pr && pr.catch) pr.catch(() => {});
      }
    } catch (e) { /* el control no vibra */ }
  }

  function nombre(b) {
    if (tipo === 'ps') return NOMBRES_PS[b] || b;
    if (tipo === 'switch') return NOMBRES_SWITCH[b] || b;
    return NOMBRES_XBOX[b] || b;
  }

  // Avisito en pantalla al conectar o desconectar
  function aviso(texto) {
    if (!Mando.avisos || !document.body) return;
    let el = document.getElementById('mando-aviso');
    if (!el) {
      el = document.createElement('div');
      el.id = 'mando-aviso';
      el.style.cssText = 'position:fixed;left:50%;top:14px;transform:translateX(-50%);z-index:99999;' +
        'padding:8px 16px;border-radius:999px;background:rgba(10,8,30,0.85);color:#fff;' +
        'font:600 14px system-ui,-apple-system,Segoe UI,Roboto,sans-serif;pointer-events:none;' +
        'border:1px solid rgba(255,255,255,0.25);transition:opacity .3s;opacity:0';
      document.body.appendChild(el);
    }
    el.textContent = texto;
    el.style.opacity = '1';
    clearTimeout(aviso.t);
    aviso.t = setTimeout(() => { el.style.opacity = '0'; }, 2500);
  }

  window.addEventListener('gamepadconnected', (e) => {
    tipo = detectarTipo(e.gamepad && e.gamepad.id);
    aviso('🎮 Control conectado');
  });
  window.addEventListener('gamepaddisconnected', () => aviso('🎮 Control desconectado'));

  const Mando = {
    conectado: false,
    avisos: true, // pon false si tu juego muestra su propio aviso
    actualizar,
    eje: (n) => ejes[n] || 0,
    boton: (b) => !!actual[INDICE[b]],
    pulso: (b) => !!actual[INDICE[b]] && !anterior[INDICE[b]],
    solto: (b) => !actual[INDICE[b]] && !!anterior[INDICE[b]],
    gatillo: (b) => gatillos[b] || 0,
    algunPulso: () => huboPulso,
    vibrar,
    nombre,
    get tipo() { return tipo; },
  };

  window.Mando = Mando;
})();
