// ============================================================
//  src/config.ts  –  Configuración centralizada y tipada
// ============================================================

/** Configuración principal del middleware Loop */
export const config = {
  /** PC con software Onyx (receptor de comandos DMX por UDP) */
  onyx: {
    ip: '192.168.1.20',
    port: 3333,
  },

  /** PC de audio (Voicemeeter / Reaper) */
  audio: {
    ip: '127.0.0.1',
    port: 8080,
  },

  /** Servidor OSC local (recibe datos desde Resolume Arena) */
  osc: {
    localAddress: '0.0.0.0',
    localPort: 7000,
  },

  /** Receptor Art-Net (color de video desde Resolume) */
  artnet: {
    port: 6454,
    address: '0.0.0.0',
    /** Número de bytes desde el inicio del paquete Art-Net donde empiezan los datos DMX */
    dmxDataOffset: 18,
    /** Milisegundos mínimos entre emisiones de color al dashboard (~30fps) */
    emitThrottleMs: 33,
  },

  /** Servidor web / dashboard de control */
  web: {
    port: 3000,
    /** Ruta relativa al build del dashboard (React/Vite) */
    staticPath: 'dashboard/dist',
  },
} as const;

export type Config = typeof config;
