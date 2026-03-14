// ============================================================
//  src/udp/audioSender.ts  –  Envío de presets UDP a Audio PC
// ============================================================

import * as dgram from 'dgram';
import { config } from '../config';

export class AudioSender {
  private readonly socket: dgram.Socket;
  private readonly ip: string;
  private readonly port: number;

  constructor() {
    this.ip = config.audio.ip;
    this.port = config.audio.port;
    this.socket = dgram.createSocket('udp4');

    this.socket.on('error', (err) => {
      console.error(`❌ [AudioSender] Error de socket UDP: ${err.message}`);
    });
  }

  /**
   * Envía un preset de audio al PC de audio.
   * @param preset - Nombre del preset, ej: "PRESET:INTRO"
   */
  sendPreset(preset: string): void {
    const command = `PRESET:${preset}`;
    const message = Buffer.from(command);
    this.socket.send(message, 0, message.length, this.port, this.ip, (err) => {
      if (err) {
        console.error(`❌ [AudioSender] Error enviando preset "${preset}": ${err.message}`);
      }
    });
  }

  /** Cierra el socket UDP al finalizar. */
  close(): void {
    this.socket.close();
  }
}
