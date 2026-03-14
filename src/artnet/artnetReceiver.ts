// ============================================================
//  src/artnet/artnetReceiver.ts  –  Receptor de color Art-Net
// ============================================================

import { EventEmitter } from 'events';
import * as dgram from 'dgram';
import { config } from '../config';
import type { RGBColor } from '../types';

const ARTNET_HEADER = 'Art-Net';
const ARTNET_MIN_PACKET_LEN = 21;

/** Eventos emitidos por ArtNetReceiver */
interface ArtNetReceiverEvents {
  colorChange: (color: RGBColor) => void;
  listening: () => void;
  error: (err: Error) => void;
}

declare interface ArtNetReceiver {
  on<K extends keyof ArtNetReceiverEvents>(event: K, listener: ArtNetReceiverEvents[K]): this;
  emit<K extends keyof ArtNetReceiverEvents>(event: K, ...args: Parameters<ArtNetReceiverEvents[K]>): boolean;
}

class ArtNetReceiver extends EventEmitter {
  private readonly socket: dgram.Socket;
  private lastSentColorStr: string = '0,0,0';
  private lastEmitTime: number = 0;

  constructor() {
    super();
    // reuseAddr:true es necesario en Windows para compartir el puerto 6454 con Resolume
    this.socket = dgram.createSocket({ type: 'udp4', reuseAddr: true });

    this.socket.on('message', (msg, rinfo) => this.handlePacket(msg, rinfo));
    this.socket.on('listening', () => {
      console.log('✅ Art-Net: escuchando DMX en el puerto 6454.');
      this.emit('listening');
    });
    this.socket.on('error', (err) => {
      console.error(`❌ [ArtNetReceiver] Error de socket: ${err.message}`);
      this.emit('error', err);
    });
  }

  private handlePacket(msg: Buffer, _rinfo: dgram.RemoteInfo): void {
    // Validar longitud mínima y cabecera Art-Net
    if (msg.length < ARTNET_MIN_PACKET_LEN) return;
    if (msg.toString('utf8', 0, 7) !== ARTNET_HEADER) return;

    // Bytes 18-20: R, G, B DMX
    const offset = config.artnet.dmxDataOffset;
    const r = msg[offset] ?? 0;
    const g = msg[offset + 1] ?? 0;
    const b = msg[offset + 2] ?? 0;
    const colorStr = `${r},${g},${b}`;

    // Rate limiter: máximo ~30fps y solo si el color cambió
    const now = Date.now();
    if (colorStr === this.lastSentColorStr) return;
    if (now - this.lastEmitTime < config.artnet.emitThrottleMs) return;

    this.lastSentColorStr = colorStr;
    this.lastEmitTime = now;

    const color: RGBColor = { r, g, b };
    this.renderColorLog(color, msg.readUInt8(14));
    this.emit('colorChange', color);
  }

  private renderColorLog(color: RGBColor, universe: number): void {
    const { r, g, b } = color;
    const ansiColor = `\x1b[38;2;${r};${g};${b}m███\x1b[0m`;
    process.stdout.write(
      `\r[ART-NET] Universo: ${universe} | Color: ${ansiColor} RGB(${r.toString().padStart(3)}, ${g.toString().padStart(3)}, ${b.toString().padStart(3)})   `
    );
  }

  /** Inicia el receptor vinculando el socket al puerto Art-Net. */
  bind(): void {
    console.log('🛠️  Inicializando receptor Art-Net en el puerto 6454...');
    this.socket.bind({
      port: config.artnet.port,
      address: config.artnet.address,
      exclusive: false,
    });
  }

  /** Cierra el socket al finalizar. */
  close(): void {
    this.socket.close();
  }
}

export { ArtNetReceiver };
