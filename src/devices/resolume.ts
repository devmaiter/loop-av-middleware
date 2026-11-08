// Resolume Arena (video): lo que Loop escucha de él.
//   OSC     cualquier dirección que termine en /opacity (0.0-1.0) -> evento "opacity"
//   Art-Net el color R,G,B en resolume.colorChannel            -> evento "color"

import * as dgram from 'dgram';
import { EventEmitter } from 'events';
import * as osc from 'osc';
import type { Config } from '../config';
import { readColor, type RGB } from '../protocols/artnet';

/** Máximo de colores por segundo que se reenvían al panel */
const COLOR_FPS = 30;

interface ResolumeEvents {
  opacity: [value: number];
  color: [color: RGB];
}

export class Resolume extends EventEmitter<ResolumeEvents> {
  private readonly osc: osc.UDPPort;
  private readonly artnet = dgram.createSocket({ type: 'udp4', reuseAddr: true });
  private lastColorAt = 0;
  private lastColor = '';

  constructor(private readonly settings: Config['resolume']) {
    super();
    this.osc = new osc.UDPPort({ localAddress: '0.0.0.0', localPort: settings.oscPort, metadata: true });
    this.osc.on('message', (msg: { address: string; args: Array<{ value: unknown }> }) => {
      const value = msg.args[0]?.value;
      if (msg.address.endsWith('/opacity') && typeof value === 'number') this.emit('opacity', value);
    });
    this.artnet.on('message', (packet) => this.onArtnet(packet));
  }

  /** Abre los dos puertos. Falla si alguno está ocupado. */
  open(): Promise<void> {
    const oscReady = new Promise<void>((resolve, reject) => {
      this.osc.once('ready', resolve);
      this.osc.once('error', reject);
      this.osc.open();
    });
    const artnetReady = new Promise<void>((resolve, reject) => {
      this.artnet.once('listening', resolve);
      this.artnet.once('error', reject);
      // reuseAddr permite compartir el puerto Art-Net con Resolume en el mismo PC
      this.artnet.bind({ port: this.settings.artnetPort, address: '0.0.0.0', exclusive: false });
    });
    return Promise.all([oscReady, artnetReady]).then(() => undefined);
  }

  close(): void {
    this.osc.close();
    this.artnet.close();
  }

  private onArtnet(packet: Buffer): void {
    const color = readColor(packet, this.settings.colorChannel);
    if (!color) return;

    const key = `${color.r},${color.g},${color.b}`;
    const now = Date.now();
    if (key === this.lastColor || now - this.lastColorAt < 1000 / COLOR_FPS) return;

    this.lastColor = key;
    this.lastColorAt = now;
    this.emit('color', color);
  }
}
