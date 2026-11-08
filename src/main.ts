// Punto de entrada: carga la configuración, conecta los equipos con el show y abre el panel.

import * as os from 'os';
import * as path from 'path';
import * as readline from 'readline';
import { ConfigError, loadConfig } from './config';
import { AudioPc } from './devices/audioPc';
import { Onyx } from './devices/onyx';
import { Reaper } from './devices/reaper';
import { Resolume } from './devices/resolume';
import { log } from './log';
import { PanelServer } from './panel/server';
import { Show } from './show';

/** Carpeta del programa: junto a loop.exe si está empaquetado, o la raíz del proyecto. */
function appDir(): string {
  try {
    if (require('node:sea').isSea()) return path.dirname(process.execPath);
  } catch {
    // versión de Node sin ejecutables únicos: no está empaquetado
  }
  return path.resolve(__dirname, '..');
}

function panelUrls(port: number): string[] {
  const ips = Object.values(os.networkInterfaces())
    .flat()
    .filter((n) => n && n.family === 'IPv4' && !n.internal)
    .map((n) => n!.address);
  return ['localhost', ...ips].map((ip) => `http://${ip}:${port}`);
}

async function main(): Promise<void> {
  const dir = appDir();
  const config = loadConfig(process.env.LOOP_CONFIG ?? path.join(dir, 'loop.config.json'));

  const onyx = new Onyx(config.onyx);
  const reaper = new Reaper(config.reaper);
  const audio = new AudioPc(config.audio);
  const resolume = new Resolume(config.resolume);
  const show = new Show(config, onyx, reaper, audio);
  const panel = new PanelServer(config.panel, show, path.join(dir, 'panel'));

  resolume.on('opacity', (value) => show.onOpacity(value));
  resolume.on('color', (color) => show.onColor(color));

  reaper.open();
  await resolume.open();
  await panel.listen();

  log.info(`Loop listo. Onyx ${config.onyx.ip}:${config.onyx.port} | Reaper ${config.reaper.ip}:${config.reaper.port}`);
  log.info(`Escuchando Resolume: OSC ${config.resolume.oscPort}, Art-Net ${config.resolume.artnetPort}`);
  log.info(`Panel: ${panelUrls(config.panel.port).join('  ')}${config.panel.pin ? '  (con PIN)' : ''}`);

  const stop = (): void => {
    log.info('Cerrando Loop...');
    show.stop();
    panel.close();
    resolume.close();
    reaper.close();
    onyx.close();
    audio.close();
    process.exit(0);
  };
  process.on('SIGINT', stop);
  process.on('SIGTERM', stop);

  // Comandos de consola solo si hay una persona en la terminal (no cuando corre como servicio)
  if (process.stdin.isTTY) {
    log.info('Comandos: "limpiar" (CLEAR en Onyx), "salir"');
    readline.createInterface({ input: process.stdin }).on('line', (line) => {
      const cmd = line.trim().toLowerCase();
      if (cmd === 'limpiar') show.clearLights();
      else if (cmd === 'salir') stop();
      else if (cmd) log.warn(`Comando desconocido: ${cmd}`);
    });
  }
}

main().catch((err: NodeJS.ErrnoException) => {
  if (err instanceof ConfigError) log.error(`Configuración: ${err.message}`);
  else if (err.code === 'EADDRINUSE') log.error(`Un puerto ya está en uso (${err.message}). ¿Hay otro Loop abierto?`);
  else log.error(err.stack ?? String(err));
  process.exit(1);
});
