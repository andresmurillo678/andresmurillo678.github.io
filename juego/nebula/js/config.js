// =============================================================
//  ⚙️  CONFIGURACIÓN DEL JUEGO
//  Todo lo que está aquí lo puedes cambiar a tu gusto.
//  Guarda el archivo, recarga la página y verás el cambio.
//  (No hay forma de "romperlo" para siempre: si algo sale raro,
//   regresa el número a como estaba.)
// =============================================================
const CONFIG = {
  titulo: 'NEBULA',
  subtitulo: 'hecho a mi gusto',

  // Tamaño "virtual" del mundo. Se escala solo a la pantalla.
  ancho: 480,
  alto: 800,

  // Colores (cualquier color CSS: '#ff0000', 'red', 'hsl(200,100%,60%)'...)
  colores: {
    fondo: '#05030f',
    nebulosa1: '#3a1c8c',
    nebulosa2: '#0e5a7a',
    jugador: '#3df5ff',
    balaJugador: '#b8fbff',
    escudo: '#7dffb3',
    texto: '#ffffff',
    textoSuave: '#9a8cff',
    acento: '#ffd23d',
    balaEnemiga: '#ff6b9a',
    enemigos: {
      normal: '#ff3d81',
      tirador: '#ff9f1c',
      kamikaze: '#c86bff',
      jefe: '#ff2a2a',
    },
    powerups: {
      triple: '#3df5ff',
      rapido: '#ffd23d',
      escudo: '#7dffb3',
      vida: '#ff5c8a',
    },
  },

  jugador: {
    velocidad: 380,       // px por segundo con teclado
    radio: 12,            // tamaño de su "caja" de choque (más chico = más fácil)
    vidas: 3,
    vidasMax: 6,
    cadencia: 0.15,       // segundos entre disparos (más chico = dispara más)
    velocidadBala: 900,
    invulnerable: 2.0,    // segundos de parpadeo tras recibir daño
    nivelDisparoMax: 5,   // cuántas mejoras de disparo se pueden juntar
  },

  controles: {
    sensibilidadTactil: 1.4, // cuánto se mueve la nave al arrastrar el dedo/ratón
  },

  enemigos: {
    normal:   { vida: 1, radio: 16, velocidad: 110, puntos: 100 },
    tirador:  { vida: 3, radio: 18, velocidad: 90,  puntos: 250, cadencia: 1.6, velocidadBala: 260 },
    kamikaze: { vida: 2, radio: 14, velocidad: 170, puntos: 200, aceleracion: 380 },
  },

  jefe: {
    cadaOleadas: 5,   // aparece un jefe cada N oleadas
    vida: 120,        // vida del primer jefe (los siguientes tienen más)
    radio: 50,
    puntos: 5000,
  },

  oleadas: {
    enemigosBase: 6,
    enemigosExtraPorOleada: 2,
    intervaloAparicion: 0.7, // segundos entre enemigo y enemigo
    descanso: 2.0,           // segundos de calma entre oleadas
  },

  powerups: {
    probabilidad: 0.12,  // 0.12 = 12% de que un enemigo suelte algo
    duracionRapido: 8,   // segundos que dura el disparo rápido
    iman: 110,           // distancia a la que los power-ups vuelan hacia ti
    // Qué tan común es cada uno (más número = más común)
    pesos: { triple: 4, rapido: 3, escudo: 3, vida: 1 },
  },

  combo: {
    ventana: 1.5,       // segundos para encadenar destrucciones
    porNivel: 4,        // destrucciones seguidas para subir el multiplicador
    maximo: 8,          // multiplicador máximo
  },

  efectos: {
    sacudida: true,     // la pantalla tiembla con las explosiones
    brillo: true,       // efecto neón (apágalo si va lento en tu celular)
    particulas: 1.0,    // 0 = sin partículas, 2 = el doble
    estrellas: 90,
  },

  audio: {
    volumen: 0.35,      // 0 a 1
  },
};
