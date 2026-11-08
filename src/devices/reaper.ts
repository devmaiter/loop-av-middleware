// Reaper: se controla por OSC.
// En Reaper: Preferences > Control/OSC/web > Add > OSC, modo "Local port" = reaper.port.

import * as osc from 'osc';
import type { Config } from '../config';
import type { Mixer } from '../show';
import { log } from '../log';

export class Reaper implements Mixer {
  private readonly port: osc.UDPPort;
  private ready = false;

  constructor(private readonly target: Config['reaper']) {
    this.port = new osc.UDPPort({ localAddress: '0.0.0.0', localPort: target.localPort });
    this.port.on('ready', () => (this.ready = true));
    this.port.on('error', (err: Error) => log.error(`Reaper: ${err.message}`));
  }

  open(): void {
    this.port.open();
  }

  setMute(track: number | 'master', muted: boolean): void {
    this.send(`${this.address(track)}/mute`, muted ? 1 : 0);
  }

  select(track: number | 'master'): void {
    this.send(`${this.address(track)}/select`, 1);
  }

  close(): void {
    this.port.close();
  }

  private address(track: number | 'master'): string {
    return track === 'master' ? '/master' : `/track/${track}`;
  }

  private send(address: string, value: number): void {
    if (!this.ready) {
      log.warn(`Reaper todavía no está listo, se descarta ${address}`);
      return;
    }
    this.port.send({ address, args: [{ type: 'f', value }] }, this.target.ip, this.target.port);
  }
}
