// =============================================================
//  🎯  RAYO (¿a qué bloque estoy mirando?)
//  Desde tus ojos se lanza una línea hacia donde ves y se avanza
//  de cuadrito en cuadrito (como en una cuadrícula) hasta tocar
//  un bloque. Devuelve el bloque y la cara que tocó: esa cara
//  dice dónde va el bloque nuevo cuando pones uno.
//  El agua del mar nunca se señala. El agua que tú pusiste sí,
//  menos cuando tienes la cabeza dentro del agua (así puedes
//  romper el fondo de tu alberca nadando).
// =============================================================
import { APUNTABLE, DIBUJO, DIBUJO_AGUA } from './bloques.js';

export function lanzarRayo(mundo, ox, oy, oz, dx, dy, dz, alcance) {
  let x = Math.floor(ox), y = Math.floor(oy), z = Math.floor(oz);
  const pasoX = dx > 0 ? 1 : dx < 0 ? -1 : 0;
  const pasoY = dy > 0 ? 1 : dy < 0 ? -1 : 0;
  const pasoZ = dz > 0 ? 1 : dz < 0 ? -1 : 0;
  const deltaX = pasoX ? Math.abs(1 / dx) : Infinity;
  const deltaY = pasoY ? Math.abs(1 / dy) : Infinity;
  const deltaZ = pasoZ ? Math.abs(1 / dz) : Infinity;
  let maxX = pasoX > 0 ? (x + 1 - ox) * deltaX : pasoX < 0 ? (ox - x) * deltaX : Infinity;
  let maxY = pasoY > 0 ? (y + 1 - oy) * deltaY : pasoY < 0 ? (oy - y) * deltaY : Infinity;
  let maxZ = pasoZ > 0 ? (z + 1 - oz) * deltaZ : pasoZ < 0 ? (oz - z) * deltaZ : Infinity;
  let nx = 0, ny = 0, nz = 0, t = 0;
  const desdeAgua = DIBUJO[mundo.obtener(x, y, z)] === DIBUJO_AGUA;

  for (let i = 0; i < 200 && t <= alcance; i++) {
    const id = mundo.obtener(x, y, z);
    if (APUNTABLE[id] && !(desdeAgua && DIBUJO[id] === DIBUJO_AGUA)) return { x, y, z, id, nx, ny, nz, distancia: t };
    if (maxX < maxY && maxX < maxZ) {
      x += pasoX; t = maxX; maxX += deltaX; nx = -pasoX; ny = 0; nz = 0;
    } else if (maxY < maxZ) {
      y += pasoY; t = maxY; maxY += deltaY; nx = 0; ny = -pasoY; nz = 0;
    } else {
      z += pasoZ; t = maxZ; maxZ += deltaZ; nx = 0; ny = 0; nz = -pasoZ;
    }
  }
  return null;
}
