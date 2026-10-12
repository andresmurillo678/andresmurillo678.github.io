// =============================================================
//  🔺  MALLADOR (convierte bloques en triángulos)
//  La tarjeta de video no sabe qué es un "bloque": solo dibuja
//  triángulos. Aquí recorremos un chunk y, por cada cara de bloque
//  que da al aire (o a algo transparente), agregamos un cuadrito
//  (2 triángulos). Las caras tapadas NO se dibujan: así el juego
//  va rápido.
//  También oscurecemos un poquito las esquinas pegadas a otros
//  bloques ("oclusión ambiental"): da sensación de profundidad.
// =============================================================
import {
  B, DIBUJO, OPACO, SOMBREA, TEXTURA_CARA,
  DIBUJO_RECORTE, DIBUJO_AGUA, DIBUJO_PLANTA,
} from './bloques.js';
import { LISTA_TEXTURAS, uvTextura } from './texturas.js';

// El "volumen" que recibe el mallador es el chunk con 1 bloque de
// sus vecinos alrededor: 18 x 18 de ancho y (alto + 2) de alto.
export const P = 18;
export const PCAPA = P * P;

const UV = new Float32Array(LISTA_TEXTURAS.length * 4);
LISTA_TEXTURAS.forEach((_, i) => UV.set(uvTextura(i), i * 4));

// Las 6 caras: hacia dónde miran, sus 4 esquinas (abajo-izq, abajo-der,
// arriba-der, arriba-izq) y qué tan iluminadas están.
const CARAS = [
  { n: [1, 0, 0], v: [[1, 0, 1], [1, 0, 0], [1, 1, 0], [1, 1, 1]], luz: 0.72 },  // +X
  { n: [-1, 0, 0], v: [[0, 0, 0], [0, 0, 1], [0, 1, 1], [0, 1, 0]], luz: 0.72 }, // -X
  { n: [0, 1, 0], v: [[0, 1, 1], [1, 1, 1], [1, 1, 0], [0, 1, 0]], luz: 1.0 },   // arriba
  { n: [0, -1, 0], v: [[0, 0, 0], [1, 0, 0], [1, 0, 1], [0, 0, 1]], luz: 0.55 }, // abajo
  { n: [0, 0, 1], v: [[0, 0, 1], [1, 0, 1], [1, 1, 1], [0, 1, 1]], luz: 0.86 },  // +Z
  { n: [0, 0, -1], v: [[1, 0, 0], [0, 0, 0], [0, 1, 0], [1, 1, 0]], luz: 0.86 }, // -Z
];
const desplazar = (d) => d[0] + d[2] * P + d[1] * PCAPA;
const VECINO = CARAS.map((c) => desplazar(c.n));

// Para cada cara y esquina: los 3 vecinos que pueden hacerle sombra
const AO = new Int32Array(6 * 4 * 3);
CARAS.forEach((c, f) => {
  const ejes = [0, 1, 2].filter((e) => c.n[e] === 0);
  c.v.forEach((v, k) => {
    const s1 = c.n.slice(), s2 = c.n.slice(), esq = c.n.slice();
    const d1 = v[ejes[0]] ? 1 : -1, d2 = v[ejes[1]] ? 1 : -1;
    s1[ejes[0]] += d1;
    s2[ejes[1]] += d2;
    esq[ejes[0]] += d1;
    esq[ejes[1]] += d2;
    AO.set([desplazar(s1), desplazar(s2), desplazar(esq)], (f * 4 + k) * 3);
  });
});
const NIVEL_AO = [0.45, 0.62, 0.8, 1.0];

// Lo mismo pero como (dx, dy, dz), para saber qué tan "bajo techo" está cada esquina
const AO_D = new Int8Array(6 * 4 * 3 * 3);
CARAS.forEach((c, f) => {
  const ejes = [0, 1, 2].filter((e) => c.n[e] === 0);
  c.v.forEach((v, k) => {
    const d1 = v[ejes[0]] ? 1 : -1, d2 = v[ejes[1]] ? 1 : -1;
    const celdas = [c.n.slice(), c.n.slice(), c.n.slice()];
    celdas[0][ejes[0]] += d1;
    celdas[1][ejes[1]] += d2;
    celdas[2][ejes[0]] += d1;
    celdas[2][ejes[1]] += d2;
    celdas.forEach((d, i) => AO_D.set(d, ((f * 4 + k) * 3 + i) * 3));
  });
});

// "Luz del cielo": si un lugar tiene bloques encima (cuevas, bajo los
// árboles), se ve más oscuro. Entre más hondo, más oscuro.
const LUZ_CIELO = new Float32Array(300);
for (let d = 0; d < LUZ_CIELO.length; d++) LUZ_CIELO[d] = d <= 0 ? 1 : 0.3 + 0.7 * Math.exp(-d * 0.14);
let CIMA = null; // altura del bloque más alto que da sombra, por columna (18 x 18)

function luzEn(x, y, z) {
  const hondo = CIMA[(z + 1) * P + (x + 1)] - y;
  return hondo <= 0 ? 1 : LUZ_CIELO[hondo < 299 ? hondo : 299];
}

// ----------------------------------------------------------- Listas de vértices
class Lista {
  constructor() {
    this.cap = 8192;
    this.pos = new Float32Array(this.cap * 3);
    this.uv = new Float32Array(this.cap * 2);
    this.col = new Uint8Array(this.cap * 3);
    this.ind = new Uint32Array(this.cap * 1.5);
    this.nv = 0;
    this.ni = 0;
  }
  reiniciar() { this.nv = 0; this.ni = 0; }
  asegurar(extra) {
    if (this.nv + extra <= this.cap) return;
    let cap = this.cap;
    while (this.nv + extra > cap) cap *= 2;
    const crecer = (viejo, n) => { const a = new viejo.constructor(n); a.set(viejo); return a; };
    this.pos = crecer(this.pos, cap * 3);
    this.uv = crecer(this.uv, cap * 2);
    this.col = crecer(this.col, cap * 3);
    this.ind = crecer(this.ind, cap * 1.5);
    this.cap = cap;
  }
  vertice(x, y, z, u, v, brillo) {
    const i = this.nv++;
    this.pos[i * 3] = x; this.pos[i * 3 + 1] = y; this.pos[i * 3 + 2] = z;
    this.uv[i * 2] = u; this.uv[i * 2 + 1] = v;
    const c = Math.round(brillo * 255);
    this.col[i * 3] = c; this.col[i * 3 + 1] = c; this.col[i * 3 + 2] = c;
  }
  // Cuadrito con los 4 últimos vértices. "girar" cambia la diagonal.
  cuadro(girar) {
    const b = this.nv - 4;
    const t = this.ind;
    let n = this.ni;
    if (girar) {
      t[n++] = b; t[n++] = b + 1; t[n++] = b + 3;
      t[n++] = b + 1; t[n++] = b + 2; t[n++] = b + 3;
    } else {
      t[n++] = b; t[n++] = b + 1; t[n++] = b + 2;
      t[n++] = b; t[n++] = b + 2; t[n++] = b + 3;
    }
    this.ni = n;
  }
  resultado() {
    if (this.nv === 0) return null;
    const indices = this.nv > 65535 ? this.ind.slice(0, this.ni) : Uint16Array.from(this.ind.subarray(0, this.ni));
    return {
      pos: this.pos.slice(0, this.nv * 3),
      uv: this.uv.slice(0, this.nv * 2),
      col: this.col.slice(0, this.nv * 3),
      ind: indices,
    };
  }
}

const solido = new Lista();
const recorte = new Lista();
const agua = new Lista();

// ¿Se ve la cara del bloque "b" que da hacia el vecino "n"?
function seVe(b, n, hojasDetalladas) {
  if (n === B.AIRE) return true;
  if (OPACO[n]) return false;
  if (n === b) return hojasDetalladas && b === B.HOJAS;
  return true;
}

function planta(lista, x, y, z, b) {
  const t = TEXTURA_CARA[b * 6] * 4;
  const u0 = UV[t], v0 = UV[t + 1], u1 = UV[t + 2], v1 = UV[t + 3];
  const a = 0.15, c = 0.85, brillo = 0.92 * luzEn(x, y, z);
  const planos = [[x + a, z + a, x + c, z + c], [x + a, z + c, x + c, z + a]];
  for (const [xa, za, xb, zb] of planos) {
    lista.asegurar(8);
    // de frente
    lista.vertice(xa, y, za, u0, v0, brillo);
    lista.vertice(xb, y, zb, u1, v0, brillo);
    lista.vertice(xb, y + 1, zb, u1, v1, brillo);
    lista.vertice(xa, y + 1, za, u0, v1, brillo);
    lista.cuadro(false);
    // y por detrás
    lista.vertice(xb, y, zb, u0, v0, brillo);
    lista.vertice(xa, y, za, u1, v0, brillo);
    lista.vertice(xa, y + 1, za, u1, v1, brillo);
    lista.vertice(xb, y + 1, zb, u0, v1, brillo);
    lista.cuadro(false);
  }
}

// Recorre el volumen y devuelve los datos de 3 mallas: sólida, con huecos y agua.
// "cima" dice, por columna, la altura del bloque más alto que da sombra.
export function mallar(vol, cima, yMax, hojasDetalladas) {
  solido.reiniciar();
  recorte.reiniciar();
  agua.reiniciar();
  CIMA = cima;
  const brillo = [0, 0, 0, 0];

  for (let y = 0; y <= yMax; y++) {
    for (let z = 0; z < 16; z++) {
      let vi = (y + 1) * PCAPA + (z + 1) * P + 1;
      for (let x = 0; x < 16; x++, vi++) {
        const b = vol[vi];
        if (b === B.AIRE) continue;
        const dib = DIBUJO[b];
        if (dib === DIBUJO_PLANTA) { planta(recorte, x, y, z, b); continue; }
        const lista = dib === DIBUJO_AGUA ? agua : dib === DIBUJO_RECORTE ? recorte : solido;
        // el agua de hasta arriba queda un poquito más bajita
        const tope = dib === DIBUJO_AGUA && vol[vi + PCAPA] !== b ? 0.875 : 1;

        for (let f = 0; f < 6; f++) {
          if (!seVe(b, vol[vi + VECINO[f]], hojasDetalladas)) continue;
          const t = TEXTURA_CARA[b * 6 + f] * 4;
          const u0 = UV[t], v0 = UV[t + 1], u1 = UV[t + 2], v1 = UV[t + 3];
          const cara = CARAS[f];
          const n = cara.n;
          const fx = x + n[0], fy = y + n[1], fz = z + n[2];
          const luzFrente = luzEn(fx, fy, fz);
          if (dib === DIBUJO_AGUA) {
            brillo[0] = brillo[1] = brillo[2] = brillo[3] = cara.luz * luzFrente;
          } else {
            for (let k = 0; k < 4; k++) {
              const o = (f * 4 + k) * 3;
              const s1 = SOMBREA[vol[vi + AO[o]]];
              const s2 = SOMBREA[vol[vi + AO[o + 1]]];
              const se = SOMBREA[vol[vi + AO[o + 2]]];
              const ao = s1 && s2 ? 0 : 3 - (s1 + s2 + se);
              // luz del cielo: promedio de las celdas libres alrededor de la esquina
              let suma = luzFrente, cuenta = 1;
              for (let c = 0; c < 3; c++) {
                if ((c === 0 && s1) || (c === 1 && s2) || (c === 2 && (se || (s1 && s2)))) continue;
                const q = (o + c) * 3;
                suma += luzEn(x + AO_D[q], y + AO_D[q + 1], z + AO_D[q + 2]);
                cuenta++;
              }
              brillo[k] = cara.luz * NIVEL_AO[ao] * (suma / cuenta);
            }
          }
          lista.asegurar(4);
          const v = cara.v;
          lista.vertice(x + v[0][0], y + v[0][1] * tope, z + v[0][2], u0, v0, brillo[0]);
          lista.vertice(x + v[1][0], y + v[1][1] * tope, z + v[1][2], u1, v0, brillo[1]);
          lista.vertice(x + v[2][0], y + v[2][1] * tope, z + v[2][2], u1, v1, brillo[2]);
          lista.vertice(x + v[3][0], y + v[3][1] * tope, z + v[3][2], u0, v1, brillo[3]);
          lista.cuadro(brillo[0] + brillo[2] > brillo[1] + brillo[3]);
        }
      }
    }
  }
  return [solido.resultado(), recorte.resultado(), agua.resultado()];
}
