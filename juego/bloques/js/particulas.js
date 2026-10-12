// =============================================================
//  ✨  CHISPITAS (cuando rompes un bloque)
//  Son cuadritos del color del bloque que saltan y caen.
//  Todas viven en un solo objeto de "puntos" para que sea rápido.
// =============================================================
import * as THREE from '../lib/three.module.min.js';
import { SOLIDO } from './bloques.js';

const MAX = 400;

export class Particulas {
  constructor(escena) {
    this.pos = new Float32Array(MAX * 3);
    this.col = new Float32Array(MAX * 3);
    this.vel = new Float32Array(MAX * 3);
    this.vida = new Float32Array(MAX);
    this.n = 0;
    const g = new THREE.BufferGeometry();
    this.atribPos = new THREE.BufferAttribute(this.pos, 3);
    this.atribCol = new THREE.BufferAttribute(this.col, 3);
    this.atribPos.setUsage(THREE.DynamicDrawUsage);
    this.atribCol.setUsage(THREE.DynamicDrawUsage);
    g.setAttribute('position', this.atribPos);
    g.setAttribute('color', this.atribCol);
    g.setDrawRange(0, 0);
    this.material = new THREE.PointsMaterial({ size: 0.13, vertexColors: true, sizeAttenuation: true });
    this.puntos = new THREE.Points(g, this.material);
    this.puntos.frustumCulled = false;
    escena.add(this.puntos);
  }

  // Lanza chispitas desde el bloque (x, y, z) con su color
  explotar(x, y, z, color, cuantas = 18) {
    for (let i = 0; i < cuantas; i++) {
      if (this.n >= MAX) return;
      const k = this.n++;
      this.pos[k * 3] = x + 0.15 + Math.random() * 0.7;
      this.pos[k * 3 + 1] = y + 0.15 + Math.random() * 0.7;
      this.pos[k * 3 + 2] = z + 0.15 + Math.random() * 0.7;
      this.vel[k * 3] = (Math.random() - 0.5) * 4;
      this.vel[k * 3 + 1] = 1.5 + Math.random() * 3.5;
      this.vel[k * 3 + 2] = (Math.random() - 0.5) * 4;
      const v = 0.75 + Math.random() * 0.35;
      this.col[k * 3] = color[0] * v;
      this.col[k * 3 + 1] = color[1] * v;
      this.col[k * 3 + 2] = color[2] * v;
      this.vida[k] = 0.5 + Math.random() * 0.5;
    }
  }

  actualizar(dt, mundo) {
    let i = 0;
    while (i < this.n) {
      this.vida[i] -= dt;
      if (this.vida[i] <= 0) {
        // la última ocupa su lugar
        const u = --this.n;
        for (let c = 0; c < 3; c++) {
          this.pos[i * 3 + c] = this.pos[u * 3 + c];
          this.vel[i * 3 + c] = this.vel[u * 3 + c];
          this.col[i * 3 + c] = this.col[u * 3 + c];
        }
        this.vida[i] = this.vida[u];
        continue;
      }
      const k = i * 3;
      this.vel[k + 1] -= 22 * dt;
      const nx = this.pos[k] + this.vel[k] * dt;
      const ny = this.pos[k + 1] + this.vel[k + 1] * dt;
      const nz = this.pos[k + 2] + this.vel[k + 2] * dt;
      if (SOLIDO[mundo.obtener(Math.floor(nx), Math.floor(ny), Math.floor(nz))]) {
        this.vel[k] *= 0.3; this.vel[k + 1] = 0; this.vel[k + 2] *= 0.3;
      } else {
        this.pos[k] = nx; this.pos[k + 1] = ny; this.pos[k + 2] = nz;
      }
      i++;
    }
    this.puntos.geometry.setDrawRange(0, this.n);
    this.atribPos.needsUpdate = true;
    this.atribCol.needsUpdate = true;
  }
}
