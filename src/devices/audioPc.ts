// PC de audio: recibe "PRESET:<nombre>" por UDP.

import type { Endpoint } from '../config';
import type { AudioPresets } from '../show';
import { UdpText } from './udpText';

export class AudioPc implements AudioPresets {
  private readonly udp: UdpText;

  constructor(target: Endpoint) {
    this.udp = new UdpText('PC de audio', target);
  }

  loadPreset(name: string): void {
    this.udp.send(`PRESET:${name}`);
  }

  close(): void {
    this.udp.close();
  }
}
