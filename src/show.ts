// Lógica del show: qué hace Loop con lo que llega de Resolume y del panel.
//
// No sabe de UDP, OSC ni sockets: habla con los equipos a través de las
// interfaces Lights, Mixer y AudioPresets. Así se puede probar sin equipos
// y cambiar un equipo (por ejemplo otra consola de luces) sin tocar esta lógica.

import { EventEmitter } from 'events';
import type { Config } from './config';
import type { RGB } from './protocols/artnet';

export interface Lights {
  command(text: string): void;
  setLevel(cuelist: number, level: number): void;
  releaseAll(): void;
  clear(): void;
}

export interface Mixer {
  setMute(track: number | 'master', muted: boolean): void;
  select(track: number | 'master'): void;
}

export interface AudioPresets {
  loadPreset(name: string): void;
}

export interface ShowState {
  automation: boolean;
  color: RGB;
  /** true si llegó algo de Resolume en los últimos segundos */
  resolumeOnline: boolean;
  masterMuted: boolean;
  mutedTracks: number[];
}

/** Lo que el panel necesita para dibujar sus botones (solo nombres, nunca comandos). */
export interface Layout {
  scenes: string[];
  flashes: string[];
  tracks: Array<{ number: number; name: string }>;
  presets: string[];
}

export class ShowError extends Error {}

/** Segundos sin datos de Resolume para darlo por desconectado */
const RESOLUME_TIMEOUT_MS = 3000;

export const opacityToDmx = (opacity: number): number => Math.round(Math.min(1, Math.max(0, opacity)) * 255);

export class Show extends EventEmitter<{ change: [ShowState] }> {
  private readonly state: ShowState = {
    automation: true,
    color: { r: 0, g: 0, b: 0 },
    resolumeOnline: false,
    masterMuted: false,
    mutedTracks: [],
  };
  private lastStrobe = -1;
  private resolumeTimer?: NodeJS.Timeout;

  constructor(
    private readonly config: Pick<Config, 'onyx' | 'scenes' | 'flashes' | 'reaper' | 'audio'>,
    private readonly lights: Lights,
    private readonly mixer: Mixer,
    private readonly audio: AudioPresets,
  ) {
    super();
  }

  get current(): ShowState {
    return { ...this.state, mutedTracks: [...this.state.mutedTracks] };
  }

  get layout(): Layout {
    return {
      scenes: this.config.scenes.map((s) => s.name),
      flashes: this.config.flashes.map((f) => f.name),
      tracks: this.config.reaper.tracks.map((t) => ({ ...t })),
      presets: [...this.config.audio.presets],
    };
  }

  // ── Lo que llega de Resolume ──────────────────────────────

  /** La opacidad de la capa de video maneja los estrobos (si la automatización está activa). */
  onOpacity(opacity: number): void {
    this.markResolumeOnline();
    if (!this.state.automation) return;

    const level = opacityToDmx(opacity);
    if (level === this.lastStrobe) return;
    this.lastStrobe = level;
    this.lights.setLevel(this.config.onyx.strobeCuelist, level);
  }

  onColor(color: RGB): void {
    this.markResolumeOnline();
    this.state.color = color;
    this.changed();
  }

  // ── Lo que llega del panel ────────────────────────────────

  setAutomation(on: boolean): void {
    this.state.automation = on;
    if (!on) {
      // Al apagar la automatización los estrobos no se quedan pegados en el último nivel
      this.lights.setLevel(this.config.onyx.strobeCuelist, 0);
      this.lastStrobe = 0;
    }
    this.changed();
  }

  runScene(index: number): void {
    this.lights.command(this.pick(this.config.scenes, index, 'escena').command);
  }

  flash(index: number, pressed: boolean): void {
    this.lights.setLevel(this.pick(this.config.flashes, index, 'flash').cuelist, pressed ? 255 : 0);
  }

  releaseAll(): void {
    this.lights.releaseAll();
  }

  clearLights(): void {
    this.lights.clear();
  }

  setMute(track: number | 'master', muted: boolean): void {
    if (track === 'master') {
      this.state.masterMuted = muted;
    } else {
      this.checkTrack(track);
      const others = this.state.mutedTracks.filter((t) => t !== track);
      this.state.mutedTracks = muted ? [...others, track].sort((a, b) => a - b) : others;
    }
    this.mixer.setMute(track, muted);
    this.changed();
  }

  select(track: number | 'master'): void {
    if (track !== 'master') this.checkTrack(track);
    this.mixer.select(track);
  }

  loadPreset(index: number): void {
    this.audio.loadPreset(this.pick(this.config.audio.presets, index, 'preset'));
  }

  stop(): void {
    clearTimeout(this.resolumeTimer);
  }

  // ── Interno ───────────────────────────────────────────────

  private markResolumeOnline(): void {
    clearTimeout(this.resolumeTimer);
    this.resolumeTimer = setTimeout(() => {
      this.state.resolumeOnline = false;
      this.changed();
    }, RESOLUME_TIMEOUT_MS);

    if (!this.state.resolumeOnline) {
      this.state.resolumeOnline = true;
      this.changed();
    }
  }

  private checkTrack(track: number): void {
    if (!this.config.reaper.tracks.some((t) => t.number === track)) {
      throw new ShowError(`La pista ${track} no está en la configuración`);
    }
  }

  private pick<T>(list: T[], index: number, what: string): T {
    const item = list[index];
    if (item === undefined) throw new ShowError(`No existe la ${what} número ${index}`);
    return item;
  }

  private changed(): void {
    this.emit('change', this.current);
  }
}
