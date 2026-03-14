// ============================================================
//  src/osc/oscServer.ts  –  Servidor OSC + conversión opacidad→DMX
// ============================================================

import { EventEmitter } from 'events';
import * as osc from 'osc';
import { config } from '../config';
import type { OscMessage, OpacityChangePayload } from '../types';

/** Eventos emitidos por OscServer */
interface OscServerEvents {
  opacityChange: (payload: OpacityChangePayload) => void;
  ready: () => void;
  error: (err: Error) => void;
}

declare interface OscServer {
  on<K extends keyof OscServerEvents>(event: K, listener: OscServerEvents[K]): this;
  emit<K extends keyof OscServerEvents>(event: K, ...args: Parameters<OscServerEvents[K]>): boolean;
}

class OscServer extends EventEmitter {
  private readonly port: osc.UDPPort;
  /** Último valor DMX enviado (evita saturar la red con valores idénticos) */
  private lastDmxValue: number = -1;

  constructor() {
    super();
    this.port = new osc.UDPPort({
      localAddress: config.osc.localAddress,
      localPort: config.osc.localPort,
      metadata: true,
    });

    this.port.on('message', (oscMsg: OscMessage) => this.handleMessage(oscMsg));
    this.port.on('ready', () => this.handleReady());
    this.port.on('error', (err: Error) => this.emit('error', err));
  }

  private handleMessage(oscMsg: OscMessage): void {
    if (!oscMsg.address.includes('/opacity')) return;

    const arg = oscMsg.args[0] as { value?: unknown } | undefined;
    const rawValue = (typeof arg?.value === 'number' ? arg.value : 0);
    const dmxValue = Math.round(rawValue * 255);

    // Solo procesar si el valor DMX cambió (debounce)
    if (dmxValue === this.lastDmxValue) return;
    this.lastDmxValue = dmxValue;

    this.renderProgressBar(rawValue, dmxValue);
    this.emit('opacityChange', { rawValue, dmxValue });
  }

  private handleReady(): void {
    console.log('-----------------------------------------');
    console.log('🚀 MIDDLEWARE ACTIVO');
    console.log(`🔗 Destino Onyx: ${config.onyx.ip}:${config.onyx.port}`);
    console.log(`📡 OSC escuchando en puerto ${config.osc.localPort}`);
    console.log("⌨️  Escribe 'clear' y presiona Enter para CLEAR manual");
    console.log("⌨️  Escribe 'exit' para cerrar");
    console.log('-----------------------------------------');
    this.emit('ready');
  }

  private renderProgressBar(rawValue: number, dmxValue: number): void {
    const BAR_LENGTH = 40;
    const filled = Math.round(BAR_LENGTH * rawValue);
    const bar = '█'.repeat(filled) + '-'.repeat(BAR_LENGTH - filled);
    const pct = (rawValue * 100).toFixed(0).padStart(3, ' ');
    const dmx = dmxValue.toString().padStart(3, ' ');
    process.stdout.write(
      `\r📊 OPACIDAD: [${bar}] ${pct}% | 🔌 ONYX CUELIST 5: ${dmx}/255     `
    );
  }

  /** Abre el puerto OSC y comienza a escuchar. */
  open(): void {
    this.port.open();
  }

  /** Cierra el puerto OSC. */
  close(): void {
    this.port.close();
  }
}

export { OscServer };
