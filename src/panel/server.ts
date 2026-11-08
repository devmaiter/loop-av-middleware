// Servidor del panel: sirve la página y conecta cada tablet con el show por Socket.IO.
//
// Es la frontera con la red del club, así que aquí se revisa el PIN y el tipo de
// cada dato que llega. El panel solo manda índices de botones; los comandos reales
// los decide el show a partir de la configuración.

import { createHash, timingSafeEqual } from 'crypto';
import * as fs from 'fs';
import * as http from 'http';
import * as path from 'path';
import express from 'express';
import { Server, type Socket } from 'socket.io';
import type { Config } from '../config';
import { log } from '../log';
import { ShowError, type Show } from '../show';

type Handler = (...args: unknown[]) => void;

const asBool = (v: unknown): boolean => {
  if (typeof v !== 'boolean') throw new ShowError('Se esperaba verdadero o falso');
  return v;
};
const asIndex = (v: unknown): number => {
  if (!Number.isInteger(v) || (v as number) < 0) throw new ShowError('Se esperaba un número de botón');
  return v as number;
};
const asTrack = (v: unknown): number | 'master' => (v === 'master' ? 'master' : asIndex(v));

const sameText = (a: string, b: string): boolean => {
  const hash = (s: string) => createHash('sha256').update(s).digest();
  return timingSafeEqual(hash(a), hash(b));
};

/** Cliente de Socket.IO para el navegador, servido localmente (el panel no depende de internet). */
function socketIoClientFile(panelDir: string): string {
  const bundled = path.join(panelDir, 'vendor', 'socket.io.min.js');
  if (fs.existsSync(bundled)) return bundled;
  return path.join(path.dirname(require.resolve('socket.io/package.json')), 'client-dist', 'socket.io.min.js');
}

export class PanelServer {
  private readonly http: http.Server;
  private readonly io: Server;

  constructor(private readonly settings: Config['panel'], private readonly show: Show, panelDir: string) {
    const app = express();
    const clientFile = socketIoClientFile(panelDir);
    app.get('/vendor/socket.io.min.js', (_req, res) => res.sendFile(clientFile));
    app.use(express.static(panelDir));

    this.http = http.createServer(app);
    // Sin opción cors: solo se aceptan conexiones desde la misma página del panel
    this.io = new Server(this.http, { serveClient: false });
    this.io.use((socket, next) => {
      const pin = String(socket.handshake.auth?.pin ?? '');
      if (!settings.pin || sameText(pin, settings.pin)) return next();
      next(new Error('PIN incorrecto'));
    });
    this.io.on('connection', (socket) => this.onConnection(socket));
    show.on('change', (state) => this.io.emit('state', state));
  }

  listen(): Promise<void> {
    return new Promise((resolve, reject) => {
      this.http.once('error', reject);
      this.http.listen(this.settings.port, this.settings.host, () => resolve());
    });
  }

  close(): void {
    this.io.close();
  }

  private onConnection(socket: Socket): void {
    const who = socket.handshake.address;
    log.info(`Panel conectado desde ${who}`);
    socket.emit('layout', this.show.layout);
    socket.emit('state', this.show.current);

    const show = this.show;
    const actions: Record<string, Handler> = {
      automation: (on) => show.setAutomation(asBool(on)),
      scene: (i) => show.runScene(asIndex(i)),
      flash: (i, pressed) => show.flash(asIndex(i), asBool(pressed)),
      release_all: () => show.releaseAll(),
      clear_lights: () => show.clearLights(),
      mute: (track, muted) => show.setMute(asTrack(track), asBool(muted)),
      select: (track) => show.select(asTrack(track)),
      preset: (i) => show.loadPreset(asIndex(i)),
    };

    for (const [event, action] of Object.entries(actions)) {
      socket.on(event, (...args: unknown[]) => {
        try {
          action(...args);
          if (event !== 'flash') log.info(`Panel ${who}: ${event} ${args.join(' ')}`.trim());
        } catch (err) {
          if (!(err instanceof ShowError)) throw err;
          log.warn(`Panel ${who}: ${event} rechazado: ${err.message}`);
          socket.emit('rejected', err.message);
        }
      });
    }
    socket.on('disconnect', () => log.info(`Panel desconectado: ${who}`));
  }
}
