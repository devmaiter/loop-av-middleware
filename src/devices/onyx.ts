// Onyx (luces): recibe comandos de texto por UDP.
//   GQL n     dispara la cuelist n
//   RQL 0     suelta todas las cuelists
//   SQL n,v   pone la cuelist n al nivel v (0-255)
//   CLRCLR    limpia el programador

import type { Endpoint } from '../config';
import type { Lights } from '../show';
import { UdpText } from './udpText';

export class Onyx implements Lights {
  private readonly udp: UdpText;

  constructor(target: Endpoint) {
    this.udp = new UdpText('Onyx', target);
  }

  command(text: string): void {
    this.udp.send(text);
  }

  setLevel(cuelist: number, level: number): void {
    this.udp.send(`SQL ${cuelist},${level}`);
  }

  releaseAll(): void {
    this.udp.send('RQL 0');
  }

  clear(): void {
    this.udp.send('CLRCLR');
  }

  close(): void {
    this.udp.close();
  }
}
