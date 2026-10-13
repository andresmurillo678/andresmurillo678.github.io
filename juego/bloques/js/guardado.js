// =============================================================
//  💾  GUARDADO
//  Tu mundo se guarda en el navegador (localStorage). No se guarda
//  el mundo entero (sería enorme): solo la semilla y los bloques
//  que tú cambiaste. Con eso se puede volver a armar igualito.
//  Si el navegador no deja guardar (modo incógnito, por ejemplo),
//  el juego sigue funcionando, solo que no recordará nada.
// =============================================================
import { CONFIG } from './config.js';

const CLAVE = CONFIG.guardado.clave;
const CLAVE_OPCIONES = 'bloques_opciones';

export function cargarPartida() {
  try {
    const texto = localStorage.getItem(CLAVE);
    if (!texto) return null;
    const d = JSON.parse(texto);
    if (!d || typeof d !== 'object' || !Number.isFinite(d.semilla)) return null;
    return d;
  } catch (e) {
    return null;
  }
}

export function guardarPartida(datos) {
  try {
    localStorage.setItem(CLAVE, JSON.stringify(datos));
    return true;
  } catch (e) {
    return false;
  }
}

export function borrarPartida() {
  try { localStorage.removeItem(CLAVE); } catch (e) { /* nada */ }
}

export function cargarOpciones() {
  try {
    const t = localStorage.getItem(CLAVE_OPCIONES);
    const o = t ? JSON.parse(t) : null;
    return o && typeof o === 'object' ? o : {};
  } catch (e) {
    return {};
  }
}

export function guardarOpciones(o) {
  try { localStorage.setItem(CLAVE_OPCIONES, JSON.stringify(o)); } catch (e) { /* nada */ }
}
