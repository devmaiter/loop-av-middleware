// Envío de comandos de texto por UDP (lo que esperan Onyx y el PC de audio).

import * as dgram from 'dgram';
import type { Endpoint } from '../config';
import { log } from '../log';

export class UdpText {
  private readonly socket = dgram.createSocket('udp4');

  constructor(private readonly name: string, private readonly target: Endpoint) {
    this.socket.on('error', (err) => log.error(`${name}: ${err.message}`));
  }

  send(text: string): void {
    this.socket.send(text, this.target.port, this.target.ip, (err) => {
      if (err) log.error(`${this.name}: no se pudo enviar "${text}": ${err.message}`);
    });
  }

  close(): void {
    this.socket.close();
  }
}
