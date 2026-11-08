// Configuración de Loop.
//
// Se lee de `loop.config.json` (junto a loop.exe) o de la ruta indicada en la
// variable de entorno LOOP_CONFIG. Lo que falte en el archivo
// toma el valor por defecto de abajo, así un técnico solo escribe lo que cambia
// en cada evento (normalmente las IPs).

import * as fs from 'fs';

export interface Endpoint {
  ip: string;
  port: number;
}

export interface NamedCommand {
  name: string;
  command: string;
}

export interface Flash {
  name: string;
  /** Cuelist de Onyx que se sube a 255 mientras se mantiene presionado */
  cuelist: number;
}

export interface ReaperTrack {
  number: number;
  name: string;
}

export interface Config {
  panel: {
    host: string;
    port: number;
    /** PIN para entrar al panel. Vacío = sin PIN. */
    pin: string;
  };
  onyx: Endpoint & {
    /** Cuelist que sigue la opacidad de Resolume (estrobos automáticos) */
    strobeCuelist: number;
  };
  reaper: Endpoint & {
    /** Puerto local de salida; debe ser distinto de resolume.oscPort */
    localPort: number;
    tracks: ReaperTrack[];
  };
  audio: Endpoint & {
    presets: string[];
  };
  resolume: {
    oscPort: number;
    artnetPort: number;
    /** Canal DMX (1-510) donde empieza el color R,G,B que manda Resolume */
    colorChannel: number;
  };
  /** Botones del panel que mandan un comando a Onyx (por ejemplo "GQL 1") */
  scenes: NamedCommand[];
  flashes: Flash[];
}

export const defaults: Config = {
  panel: { host: '0.0.0.0', port: 3000, pin: '' },
  onyx: { ip: '192.168.1.20', port: 3333, strobeCuelist: 5 },
  reaper: {
    ip: '127.0.0.1',
    port: 8000,
    localPort: 7001,
    tracks: [
      { number: 1, name: 'Pista 1' },
      { number: 2, name: 'Pista 2' },
      { number: 3, name: 'Pista 3' },
    ],
  },
  audio: { ip: '127.0.0.1', port: 8080, presets: [] },
  resolume: { oscPort: 7000, artnetPort: 6454, colorChannel: 1 },
  scenes: Array.from({ length: 10 }, (_, i) => ({ name: `Cue ${i + 1}`, command: `GQL ${i + 1}` })),
  flashes: [
    { name: 'Flash blanco', cuelist: 11 },
    { name: 'Flash rojo', cuelist: 12 },
    { name: 'Cegadoras', cuelist: 13 },
  ],
};

/** Error de configuración con un mensaje pensado para quien instala, no para el programador. */
export class ConfigError extends Error {}

type Json = Record<string, unknown>;

const isObject = (v: unknown): v is Json => typeof v === 'object' && v !== null && !Array.isArray(v);

/** Mezcla `override` sobre `base` por secciones; las listas se reemplazan completas. */
function merge<T>(base: T, override: unknown): T {
  if (!isObject(base) || !isObject(override)) return (override ?? base) as T;
  const out: Json = { ...base };
  for (const [key, value] of Object.entries(override)) {
    out[key] = key in out ? merge(out[key], value) : value;
  }
  return out as T;
}

function check(ok: boolean, message: string): void {
  if (!ok) throw new ConfigError(message);
}

const isPort = (n: unknown): boolean => Number.isInteger(n) && (n as number) > 0 && (n as number) < 65536;
const isText = (s: unknown): boolean => typeof s === 'string' && s.trim().length > 0;

export function validate(c: Config): Config {
  const ports: Array<[string, unknown]> = [
    ['panel.port', c.panel.port],
    ['onyx.port', c.onyx.port],
    ['reaper.port', c.reaper.port],
    ['reaper.localPort', c.reaper.localPort],
    ['audio.port', c.audio.port],
    ['resolume.oscPort', c.resolume.oscPort],
    ['resolume.artnetPort', c.resolume.artnetPort],
  ];
  for (const [name, value] of ports) check(isPort(value), `${name} debe ser un puerto entre 1 y 65535`);
  check(c.reaper.localPort !== c.resolume.oscPort, 'reaper.localPort no puede ser igual a resolume.oscPort');

  for (const [name, ip] of [['onyx.ip', c.onyx.ip], ['reaper.ip', c.reaper.ip], ['audio.ip', c.audio.ip]] as const) {
    check(isText(ip), `${name} no puede estar vacío`);
  }
  check(isText(c.panel.host), 'panel.host no puede estar vacío');
  check(typeof c.panel.pin === 'string', 'panel.pin debe ser texto (vacío para no pedir PIN)');
  check(Number.isInteger(c.onyx.strobeCuelist) && c.onyx.strobeCuelist > 0, 'onyx.strobeCuelist debe ser un número de cuelist');
  check(
    Number.isInteger(c.resolume.colorChannel) && c.resolume.colorChannel >= 1 && c.resolume.colorChannel <= 510,
    'resolume.colorChannel debe estar entre 1 y 510',
  );

  check(Array.isArray(c.reaper.tracks), 'reaper.tracks debe ser una lista');
  for (const t of c.reaper.tracks) {
    check(Number.isInteger(t.number) && t.number > 0 && isText(t.name), 'cada pista de reaper.tracks necesita "number" y "name"');
  }
  check(Array.isArray(c.audio.presets) && c.audio.presets.every(isText), 'audio.presets debe ser una lista de nombres');
  check(Array.isArray(c.scenes), 'scenes debe ser una lista');
  for (const s of c.scenes) check(isText(s.name) && isText(s.command), 'cada escena necesita "name" y "command"');
  check(Array.isArray(c.flashes), 'flashes debe ser una lista');
  for (const f of c.flashes) {
    check(isText(f.name) && Number.isInteger(f.cuelist) && f.cuelist > 0, 'cada flash necesita "name" y "cuelist"');
  }
  return c;
}

/** Carga, completa con valores por defecto y valida la configuración. */
export function loadConfig(file: string): Config {
  if (!fs.existsSync(file)) return validate(defaults);

  let parsed: unknown;
  try {
    parsed = JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (err) {
    throw new ConfigError(`No se pudo leer ${file}: ${(err as Error).message}`);
  }
  check(isObject(parsed), `${file} debe contener un objeto JSON`);
  return validate(merge(defaults, parsed));
}
