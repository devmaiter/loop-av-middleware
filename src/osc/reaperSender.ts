// ============================================================
//  src/osc/reaperSender.ts  –  Envío de comandos OSC a Reaper
// ============================================================

import * as osc from 'osc';
import { config } from '../config';

/**
 * Envía comandos OSC a Reaper via UDP.
 *
 * Reaper expone un servidor OSC (por defecto puerto 8000).
 * Este cliente usa un puerto local distinto para no colisionar
 * con el oscServer que escucha en el puerto 7000.
 */
export class ReaperSender {
  private readonly udpPort: osc.UDPPort;
  private ready: boolean = false;

  constructor() {
    this.udpPort = new osc.UDPPort({
      localAddress: '0.0.0.0',
      localPort: config.reaper.localPort,
    });

    this.udpPort.on('ready', () => {
      this.ready = true;
      console.log(`🎛️  [ReaperSender] OSC listo → Reaper ${config.reaper.ip}:${config.reaper.port}`);
    });

    this.udpPort.on('error', (err: Error) => {
      console.error(`❌ [ReaperSender] Error OSC: ${err.message}`);
    });

    this.udpPort.open();
  }

  /**
   * Envía un mensaje OSC con un único argumento float a Reaper.
   * @param address  - Dirección OSC, ej: "/track/1/mute"
   * @param value    - Valor float, ej: 0 (sonando) o 1 (silenciado)
   */
  send(address: string, value: number): void {
    if (!this.ready) {
      console.warn(`⚠️  [ReaperSender] Puerto no listo todavía, descartando: ${address}`);
      return;
    }
    this.udpPort.send(
      { address, args: [{ type: 'f', value }] },
      config.reaper.ip,
      config.reaper.port,
    );
  }

  /**
   * Mutea o desmutea una pista de Reaper.
   * @param track  - Número de pista (1-indexed, donde 1 = primera pista de audio)
   * @param muted  - true = silenciada, false = sonando
   */
  setTrackMute(track: number, muted: boolean): void {
    const address = `/track/${track}/mute`;
    const value = muted ? 1 : 0;
    this.send(address, value);
    console.log(`🎵 [Reaper] Pista ${track}: ${muted ? 'SILENCIADA' : 'SONANDO'}`);
  }

  /**
   * Mutea o desmutea el Master de Reaper.
   * Usa /master/mute para evitar ambigüedad con la numeración de pistas.
   * @param muted - true = silenciado, false = sonando
   */
  setMasterMute(muted: boolean): void {
    this.send('/master/mute', muted ? 1 : 0);
    console.log(`🎚️ [Reaper] Master: ${muted ? 'SILENCIADO' : 'SONANDO'}`);
  }

  /**
   * Selecciona una pista en Reaper (botón momentáneo, no toggle).
   * @param track - Número de pista (1-indexed)
   */
  setTrackSelect(track: number): void {
    this.send(`/track/${track}/select`, 1);
    console.log(`🎯 [Reaper] Pista ${track} seleccionada`);
  }

  /**
   * Selecciona el Master en Reaper (botón momentáneo).
   */
  setMasterSelect(): void {
    this.send('/master/select', 1);
    console.log(`🎯 [Reaper] Master seleccionado`);
  }

  /** Cierra el puerto OSC. */
  close(): void {
    this.udpPort.close();
  }
}
