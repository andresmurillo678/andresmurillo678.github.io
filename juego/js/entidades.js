// =============================================================
//  👾  ENTIDADES: la nave, las balas, los enemigos, el jefe,
//  los power-ups y los efectos (partículas, textos, estrellas).
//  Cada una tiene actualizar() (lógica) y dibujar() (cómo se ve).
// =============================================================

const Util = {
  azar: (a, b) => a + Math.random() * (b - a),
  limitar: (v, a, b) => Math.max(a, Math.min(b, v)),
  choca(a, b, extra) {
    const dx = a.x - b.x;
    const dy = a.y - b.y;
    const r = a.radio + b.radio + (extra || 0);
    return dx * dx + dy * dy < r * r;
  },
  elegirPorPeso(pesos) {
    let total = 0;
    for (const k in pesos) total += pesos[k];
    let r = Math.random() * total;
    for (const k in pesos) {
      r -= pesos[k];
      if (r <= 0) return k;
    }
    return Object.keys(pesos)[0];
  },
};

// Efecto neón: un resplandor alrededor de lo que se dibuje después
function brillo(g, color, intensidad) {
  if (!CONFIG.efectos.brillo) return;
  g.shadowColor = color;
  g.shadowBlur = intensidad;
}

// ------------------------------------------------------------- Jugador
class Jugador {
  constructor() {
    const c = CONFIG.jugador;
    this.x = CONFIG.ancho / 2;
    this.y = CONFIG.alto - 120;
    this.radio = c.radio;
    this.vidas = c.vidas;
    this.nivelDisparo = 1;
    this.cooldown = 0.3;
    this.invulnerable = 0;
    this.escudo = false;
    this.rapido = 0;
    this.inclinacion = 0;
    this.t = 0;
    this.vivo = true;
  }

  actualizar(dt, j) {
    const c = CONFIG.jugador;
    this.t += dt;
    const eje = Entrada.eje();
    const arr = Entrada.tomarArrastre();
    const sens = CONFIG.controles.sensibilidadTactil;
    const antesX = this.x;

    this.x += eje.x * c.velocidad * dt + arr.x * sens;
    this.y += eje.y * c.velocidad * dt + arr.y * sens;
    this.x = Util.limitar(this.x, 16, CONFIG.ancho - 16);
    this.y = Util.limitar(this.y, CONFIG.alto * 0.3, CONFIG.alto - 30);

    // Se inclina un poco al moverse de lado
    const vx = dt > 0 ? (this.x - antesX) / dt : 0;
    this.inclinacion += (Util.limitar(vx / 500, -1, 1) - this.inclinacion) * Math.min(1, dt * 10);

    if (this.invulnerable > 0) this.invulnerable -= dt;
    if (this.rapido > 0) this.rapido -= dt;

    this.cooldown -= dt;
    if (this.cooldown <= 0) {
      this.disparar(j);
      this.cooldown += c.cadencia * (this.rapido > 0 ? 0.5 : 1);
      if (this.cooldown < 0) this.cooldown = 0;
    }

    // Estela del motor
    if (Math.random() < 0.9 * CONFIG.efectos.particulas) {
      j.particula(this.x + Util.azar(-4, 4), this.y + 15,
        Util.azar(-25, 25), Util.azar(140, 240), Util.azar(0.15, 0.35),
        this.rapido > 0 ? CONFIG.colores.acento : CONFIG.colores.jugador, Util.azar(2, 4));
    }
  }

  disparar(j) {
    const v = CONFIG.jugador.velocidadBala;
    // [desplazamiento x, ángulo] de cada bala según el nivel de disparo
    const patrones = [
      [[0, 0]],
      [[-7, 0], [7, 0]],
      [[0, 0], [-10, -0.14], [10, 0.14]],
      [[-6, 0], [6, 0], [-12, -0.2], [12, 0.2]],
      [[0, 0], [-8, -0.1], [8, 0.1], [-14, -0.25], [14, 0.25]],
    ];
    const nivel = Util.limitar(this.nivelDisparo, 1, patrones.length);
    for (const [dx, a] of patrones[nivel - 1]) {
      j.balas.push(new Bala(this.x + dx, this.y - 16, Math.sin(a) * v, -Math.cos(a) * v,
        3, CONFIG.colores.balaJugador, 1, 'linea'));
    }
    Sonido.disparo();
  }

  dibujar(g) {
    // Parpadea mientras es invulnerable
    if (this.invulnerable > 0 && Math.floor(this.invulnerable * 14) % 2 === 0) return;
    const col = CONFIG.colores.jugador;

    g.save();
    g.translate(this.x, this.y);
    g.rotate(this.inclinacion * 0.3);

    // Llama del motor
    const llama = 8 + Math.sin(this.t * 40) * 3;
    g.globalAlpha = 0.8;
    g.fillStyle = this.rapido > 0 ? CONFIG.colores.acento : col;
    g.beginPath();
    g.moveTo(-5, 10);
    g.lineTo(0, 12 + llama);
    g.lineTo(5, 10);
    g.closePath();
    g.fill();

    // Cuerpo
    brillo(g, col, 18);
    g.globalAlpha = 0.18;
    g.fillStyle = col;
    g.beginPath();
    g.moveTo(0, -20);
    g.lineTo(15, 14);
    g.lineTo(5, 9);
    g.lineTo(0, 13);
    g.lineTo(-5, 9);
    g.lineTo(-15, 14);
    g.closePath();
    g.fill();
    g.globalAlpha = 1;
    g.strokeStyle = col;
    g.lineWidth = 2.5;
    g.lineJoin = 'round';
    g.stroke();

    // Cabina
    g.fillStyle = '#ffffff';
    g.beginPath();
    g.arc(0, -3, 3, 0, Math.PI * 2);
    g.fill();
    g.restore();

    if (this.escudo) {
      g.save();
      brillo(g, CONFIG.colores.escudo, 14);
      g.strokeStyle = CONFIG.colores.escudo;
      g.globalAlpha = 0.55 + Math.sin(this.t * 6) * 0.25;
      g.lineWidth = 2;
      g.beginPath();
      g.arc(this.x, this.y, 26, 0, Math.PI * 2);
      g.stroke();
      g.restore();
    }
  }
}

// ------------------------------------------------------------- Bala
class Bala {
  constructor(x, y, vx, vy, radio, color, dano, estilo) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.radio = radio;
    this.color = color;
    this.dano = dano;
    this.estilo = estilo; // 'linea' (jugador) u 'orbe' (enemigos)
    this.vivo = true;
  }

  actualizar(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    if (this.y < -30 || this.y > CONFIG.alto + 30 || this.x < -30 || this.x > CONFIG.ancho + 30) {
      this.vivo = false;
    }
  }

  dibujar(g) {
    if (this.estilo === 'linea') {
      g.strokeStyle = this.color;
      g.lineWidth = this.radio;
      g.lineCap = 'round';
      g.beginPath();
      g.moveTo(this.x, this.y);
      g.lineTo(this.x - this.vx * 0.018, this.y - this.vy * 0.018);
      g.stroke();
    } else {
      g.fillStyle = this.color;
      g.beginPath();
      g.arc(this.x, this.y, this.radio, 0, Math.PI * 2);
      g.fill();
      g.fillStyle = '#ffffff';
      g.beginPath();
      g.arc(this.x, this.y, this.radio * 0.45, 0, Math.PI * 2);
      g.fill();
    }
  }
}

// ------------------------------------------------------------- Enemigo
class Enemigo {
  constructor(tipo, x, y, oleada) {
    const c = CONFIG.enemigos[tipo];
    this.tipo = tipo;
    this.x = x;
    this.y = y;
    this.baseX = x;
    this.radio = c.radio;
    this.vida = c.vida + (tipo === 'normal' ? 0 : Math.floor(oleada / 6));
    this.velocidad = c.velocidad * (1 + Math.min(oleada, 20) * 0.03);
    this.puntos = c.puntos;
    this.color = CONFIG.colores.enemigos[tipo];
    this.t = 0;
    this.fase = Util.azar(0, Math.PI * 2);
    this.amplitud = Util.azar(25, 60);
    this.vx = 0;
    this.vy = this.velocidad;
    this.golpe = 0;
    this.cooldown = Util.azar(0.6, c.cadencia || 1);
    this.objetivoY = Util.azar(90, CONFIG.alto * 0.38);
    this.lanzado = false;
    this.vivo = true;
  }

  actualizar(dt, j) {
    this.t += dt;
    if (this.golpe > 0) this.golpe -= dt;
    const p = j.jugador && j.jugador.vivo ? j.jugador : null;

    if (this.tipo === 'normal') {
      // Baja haciendo zig-zag suave
      this.y += this.velocidad * dt;
      this.x = this.baseX + Math.sin(this.t * 2 + this.fase) * this.amplitud;
    } else if (this.tipo === 'tirador') {
      // Baja hasta su posición, se queda disparando y luego se va
      if (this.y < this.objetivoY) {
        this.y += this.velocidad * dt;
      } else {
        this.y += (this.t > 9 ? 70 : 8) * dt;
      }
      this.x = this.baseX + Math.sin(this.t * 0.8 + this.fase) * 70;
      this.cooldown -= dt;
      if (this.cooldown <= 0 && this.y > 20 && p) {
        const c = CONFIG.enemigos.tirador;
        const a = Math.atan2(p.y - this.y, p.x - this.x);
        const v = c.velocidadBala * (1 + Math.min(j.oleada, 20) * 0.02);
        j.balasEnemigas.push(new Bala(this.x, this.y + 10, Math.cos(a) * v, Math.sin(a) * v,
          6, CONFIG.colores.balaEnemiga, 1, 'orbe'));
        this.cooldown = c.cadencia * Util.azar(0.8, 1.2);
        Sonido.disparoEnemigo();
      }
    } else if (this.tipo === 'kamikaze') {
      // Te sigue un momento y luego se lanza en línea recta
      if (!this.lanzado) {
        this.y += this.velocidad * 0.55 * dt;
        if (p) this.x += Util.limitar(p.x - this.x, -90, 90) * dt;
        if (this.t > 1.3) {
          this.lanzado = true;
          const a = p ? Math.atan2(p.y - this.y, p.x - this.x) : Math.PI / 2;
          this.vx = Math.cos(a) * this.velocidad;
          this.vy = Math.sin(a) * this.velocidad;
        }
      } else {
        const v = Math.hypot(this.vx, this.vy) || 1;
        const nueva = v + CONFIG.enemigos.kamikaze.aceleracion * dt;
        this.vx = this.vx / v * nueva;
        this.vy = this.vy / v * nueva;
        this.x += this.vx * dt;
        this.y += this.vy * dt;
        if (Math.random() < 0.6 * CONFIG.efectos.particulas) {
          j.particula(this.x, this.y, -this.vx * 0.2, -this.vy * 0.2, 0.25, this.color, 2.5);
        }
      }
    }

    if (this.tipo !== 'kamikaze') {
      this.x = Util.limitar(this.x, this.radio, CONFIG.ancho - this.radio);
    }
    if (this.y > CONFIG.alto + 50 || this.x < -60 || this.x > CONFIG.ancho + 60 || this.y < -200) {
      this.vivo = false; // se escapó
    }
  }

  dibujar(g) {
    const col = this.golpe > 0 ? '#ffffff' : this.color;
    const r = this.radio;
    g.save();
    g.translate(this.x, this.y);
    brillo(g, this.color, 14);
    g.strokeStyle = col;
    g.fillStyle = col;
    g.lineWidth = 2.5;
    g.lineJoin = 'round';

    if (this.tipo === 'normal') {
      // Rombo con alas que aletean
      const aleteo = Math.sin(this.t * 10) * 3;
      g.beginPath();
      g.moveTo(0, r);
      g.lineTo(r * 0.75, 0);
      g.lineTo(0, -r * 0.8);
      g.lineTo(-r * 0.75, 0);
      g.closePath();
      g.globalAlpha = 0.2;
      g.fill();
      g.globalAlpha = 1;
      g.stroke();
      g.beginPath();
      g.moveTo(r * 0.75, 0);
      g.lineTo(r * 1.25, -r * 0.5 + aleteo);
      g.moveTo(-r * 0.75, 0);
      g.lineTo(-r * 1.25, -r * 0.5 + aleteo);
      g.stroke();
      g.beginPath();
      g.arc(0, 0, 3, 0, Math.PI * 2);
      g.fill();
    } else if (this.tipo === 'tirador') {
      // Hexágono que gira con un cañón apuntando abajo
      g.save();
      g.rotate(this.t * 0.8);
      g.beginPath();
      for (let i = 0; i < 6; i++) {
        const a = i / 6 * Math.PI * 2;
        g.lineTo(Math.cos(a) * r, Math.sin(a) * r);
      }
      g.closePath();
      g.globalAlpha = 0.2;
      g.fill();
      g.globalAlpha = 1;
      g.stroke();
      g.restore();
      g.fillRect(-3, r * 0.3, 6, r * 0.8);
      g.beginPath();
      g.arc(0, 0, r * 0.35, 0, Math.PI * 2);
      g.stroke();
    } else {
      // Flecha que apunta hacia donde va
      const a = this.lanzado ? Math.atan2(this.vy, this.vx) : Math.PI / 2;
      g.rotate(a - Math.PI / 2);
      g.beginPath();
      g.moveTo(0, r * 1.2);
      g.lineTo(r * 0.8, -r * 0.8);
      g.lineTo(0, -r * 0.3);
      g.lineTo(-r * 0.8, -r * 0.8);
      g.closePath();
      g.globalAlpha = 0.25;
      g.fill();
      g.globalAlpha = 1;
      g.stroke();
    }
    g.restore();
  }
}

// ------------------------------------------------------------- Jefe
class Jefe {
  constructor(numero) {
    const c = CONFIG.jefe;
    this.numero = numero;
    this.x = CONFIG.ancho / 2;
    this.y = -90;
    this.radio = c.radio;
    this.vidaMax = Math.round(c.vida * (1 + (numero - 1) * 0.6));
    this.vida = this.vidaMax;
    this.puntos = c.puntos * numero;
    this.color = CONFIG.colores.enemigos.jefe;
    this.t = 0;
    this.entrando = true;
    this.patron = 0;
    this.tiempoPatron = 0;
    this.cooldown = 1;
    this.angulo = 0;
    this.golpe = 0;
    this.vivo = true;
  }

  actualizar(dt, j) {
    this.t += dt;
    if (this.golpe > 0) this.golpe -= dt;
    const W = CONFIG.ancho;

    if (this.entrando) {
      this.y += 70 * dt;
      if (this.y >= 150) {
        this.y = 150;
        this.entrando = false;
        this.t = 0;
      }
      return;
    }

    this.x = W / 2 + Math.sin(this.t * 0.55) * (W / 2 - this.radio - 20);
    this.y = 150 + Math.sin(this.t * 1.3) * 25;

    this.tiempoPatron += dt;
    if (this.tiempoPatron > 6) {
      this.tiempoPatron = 0;
      this.patron = (this.patron + 1) % 3;
      this.cooldown = 0.8; // un respiro al cambiar de ataque
    }

    const furia = this.vida < this.vidaMax * 0.4 ? 1.4 : 1;
    const col = CONFIG.colores.balaEnemiga;
    const disparar = (a, v, r) => j.balasEnemigas.push(
      new Bala(this.x + Math.cos(a) * 30, this.y + Math.sin(a) * 30, Math.cos(a) * v, Math.sin(a) * v, r || 6, col, 1, 'orbe'));

    this.cooldown -= dt;
    if (this.cooldown > 0) return;

    const p = j.jugador && j.jugador.vivo ? j.jugador : { x: this.x, y: CONFIG.alto };
    if (this.patron === 0) {
      // Abanico hacia la nave
      const a0 = Math.atan2(p.y - this.y, p.x - this.x);
      const n = 2 + Math.min(this.numero, 3);
      for (let i = -n; i <= n; i++) disparar(a0 + i * 0.16, 240);
      this.cooldown = 1.1 / furia;
      Sonido.disparoEnemigo();
    } else if (this.patron === 1) {
      // Espiral
      this.angulo += 0.32;
      for (let k = 0; k < 3; k++) disparar(this.angulo + k * Math.PI * 2 / 3, 190, 5);
      this.cooldown = 0.13 / furia;
    } else {
      // Anillo completo
      const n = 14 + this.numero * 2;
      const desfase = Util.azar(0, Math.PI);
      for (let i = 0; i < n; i++) disparar(desfase + i / n * Math.PI * 2, 165);
      this.cooldown = 1.4 / furia;
      Sonido.disparoEnemigo();
    }
  }

  dibujar(g) {
    const col = this.golpe > 0 ? '#ffffff' : this.color;
    const r = this.radio;
    g.save();
    g.translate(this.x, this.y);
    brillo(g, this.color, 24);
    g.strokeStyle = col;
    g.fillStyle = col;
    g.lineWidth = 3;
    g.lineJoin = 'round';

    // Anillo exterior que gira
    g.save();
    g.rotate(this.t * 0.6);
    g.beginPath();
    for (let i = 0; i < 8; i++) {
      const a = i / 8 * Math.PI * 2;
      const rr = i % 2 === 0 ? r : r * 0.78;
      g.lineTo(Math.cos(a) * rr, Math.sin(a) * rr);
    }
    g.closePath();
    g.globalAlpha = 0.15;
    g.fill();
    g.globalAlpha = 1;
    g.stroke();
    g.restore();

    // Núcleo que late (más rápido cuando está enojado)
    const enojo = this.vida < this.vidaMax * 0.4;
    const latido = 1 + Math.sin(this.t * (enojo ? 14 : 6)) * 0.12;
    g.save();
    g.rotate(-this.t * 1.2);
    g.beginPath();
    for (let i = 0; i < 6; i++) {
      const a = i / 6 * Math.PI * 2;
      g.lineTo(Math.cos(a) * r * 0.45 * latido, Math.sin(a) * r * 0.45 * latido);
    }
    g.closePath();
    g.stroke();
    g.restore();

    g.fillStyle = this.golpe > 0 ? '#ffffff' : (enojo ? CONFIG.colores.acento : '#ffffff');
    g.beginPath();
    g.arc(0, 0, r * 0.18 * latido, 0, Math.PI * 2);
    g.fill();
    g.restore();
  }
}

// ------------------------------------------------------------- Power-up
const POWERUPS = {
  triple: { simbolo: '+', texto: '¡MÁS DISPAROS!' },
  rapido: { simbolo: 'R', texto: '¡DISPARO RÁPIDO!' },
  escudo: { simbolo: 'E', texto: '¡ESCUDO!' },
  vida:   { simbolo: '♥', texto: '¡+1 VIDA!' },
};

class PowerUp {
  constructor(x, y, tipo) {
    this.x = x;
    this.y = y;
    this.tipo = tipo;
    this.radio = 13;
    this.color = CONFIG.colores.powerups[tipo];
    this.t = Util.azar(0, 5);
    this.vivo = true;
  }

  actualizar(dt, j) {
    this.t += dt;
    const p = j.jugador;
    const iman = CONFIG.powerups.iman;
    if (p && p.vivo && Math.hypot(p.x - this.x, p.y - this.y) < iman) {
      // Imán: vuela hacia la nave
      const a = Math.atan2(p.y - this.y, p.x - this.x);
      this.x += Math.cos(a) * 420 * dt;
      this.y += Math.sin(a) * 420 * dt;
    } else {
      this.y += 85 * dt;
      this.x += Math.sin(this.t * 3) * 25 * dt;
    }
    if (this.y > CONFIG.alto + 20) this.vivo = false;
  }

  dibujar(g) {
    const pulso = 1 + Math.sin(this.t * 6) * 0.1;
    g.save();
    g.translate(this.x, this.y);
    brillo(g, this.color, 16);
    g.strokeStyle = this.color;
    g.lineWidth = 2.5;
    g.globalAlpha = 0.2;
    g.fillStyle = this.color;
    g.beginPath();
    g.arc(0, 0, this.radio * pulso, 0, Math.PI * 2);
    g.fill();
    g.globalAlpha = 1;
    g.stroke();
    g.fillStyle = '#ffffff';
    g.font = 'bold 15px Orbitron, ui-monospace, monospace';
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(POWERUPS[this.tipo].simbolo, 0, 1);
    g.restore();
  }
}

// ------------------------------------------------------------- Efectos
class Particula {
  constructor(x, y, vx, vy, vida, color, tam) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.vida = vida;
    this.vidaMax = vida;
    this.color = color;
    this.tam = tam || 2;
    this.vivo = true;
  }

  actualizar(dt) {
    this.x += this.vx * dt;
    this.y += this.vy * dt;
    const freno = Math.max(0, 1 - 2.2 * dt);
    this.vx *= freno;
    this.vy *= freno;
    this.vida -= dt;
    if (this.vida <= 0) this.vivo = false;
  }

  dibujar(g) {
    const k = Math.max(0, this.vida / this.vidaMax);
    g.globalAlpha = k;
    g.fillStyle = this.color;
    const s = this.tam * (0.5 + k * 0.5);
    g.fillRect(this.x - s / 2, this.y - s / 2, s, s);
  }
}

class TextoFlotante {
  constructor(x, y, texto, color, tam) {
    this.x = x;
    this.y = y;
    this.texto = texto;
    this.color = color;
    this.tam = tam || 16;
    this.vida = 1;
    this.vivo = true;
  }

  actualizar(dt) {
    this.y -= 40 * dt;
    this.vida -= dt;
    if (this.vida <= 0) this.vivo = false;
  }

  dibujar(g) {
    g.globalAlpha = Math.max(0, Math.min(1, this.vida * 2));
    g.fillStyle = this.color;
    g.font = `800 ${this.tam}px Orbitron, ui-monospace, monospace`;
    g.textAlign = 'center';
    g.textBaseline = 'middle';
    g.fillText(this.texto, this.x, this.y);
  }
}

class Estrellas {
  constructor(cantidad) {
    this.lista = [];
    for (let i = 0; i < cantidad; i++) {
      this.lista.push({
        x: Math.random() * CONFIG.ancho,
        y: Math.random() * CONFIG.alto,
        z: Math.random(), // profundidad: 0 = lejos, 1 = cerca
      });
    }
    this.velocidad = 1;
  }

  actualizar(dt) {
    for (const e of this.lista) {
      e.y += (20 + e.z * 140) * this.velocidad * dt;
      if (e.y > CONFIG.alto) {
        e.y -= CONFIG.alto;
        e.x = Math.random() * CONFIG.ancho;
      }
    }
  }

  dibujar(g) {
    g.fillStyle = '#ffffff';
    for (const e of this.lista) {
      g.globalAlpha = 0.25 + e.z * 0.7;
      const s = 1 + e.z * 1.5;
      const largo = s + Math.max(0, this.velocidad - 1) * e.z * 10;
      g.fillRect(e.x, e.y, s, largo);
    }
    g.globalAlpha = 1;
  }
}
