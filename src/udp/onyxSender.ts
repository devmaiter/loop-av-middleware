// ============================================================
//  src/udp/onyxSender.ts  –  Envío de comandos UDP a Onyx
// ============================================================

import * as dgram from 'dgram';
import { config } from '../config';
import type { OnyxCommand } from '../types';

export class OnyxSender {
  private readonly socket: dgram.Socket;
  private readonly ip: string;
  private readonly port: number;

  constructor() {
    this.ip = config.onyx.ip;
    this.port = config.onyx.port;
    this.socket = dgram.createSocket('udp4');

    this.socket.on('error', (err) => {
      console.error(`❌ [OnyxSender] Error de socket UDP: ${err.message}`);
    });
  }

  /**
   * Envía un comando de texto plano a Onyx por UDP.
   * @param command - Ejemplo: "SQL 5,128" o "CLRCLR"
   */
  send(command: OnyxCommand): void {
    const message = Buffer.from(command);
    this.socket.send(message, 0, message.length, this.port, this.ip, (err) => {
      if (err) {
        console.error(`❌ [OnyxSender] Error enviando "${command}": ${err.message}`);
      }
    });
  }

  /** Cierra el socket UDP al finalizar. */
  close(): void {
    this.socket.close();
  }
}
