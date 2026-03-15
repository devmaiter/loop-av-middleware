// ============================================================
//  src/web/webServer.ts  –  Express + Socket.io + Dashboard
// ============================================================

import * as http from 'http';
import * as path from 'path';
import express from 'express';
import { Server as SocketIOServer } from 'socket.io';
import { config } from '../config';
import type {
  RGBColor,
  ServerToClientEvents,
  ClientToServerEvents,
} from '../types';

/** Callback invocado cuando el cliente solicita un comando directo a Onyx */
type OnyxCommandCallback = (command: string) => void;
/** Callback invocado cuando el cliente solicita un preset de audio */
type AudioPresetCallback = (preset: string) => void;
/** Callback invocado cuando el cliente cambia el estado de automatización */
type AutomationCallback = (enabled: boolean) => void;
/** Callback invocado cuando el cliente mutea/desmutea una pista de Reaper */
type ReaperTrackMuteCallback = (track: number, muted: boolean) => void;
/** Callback invocado cuando el cliente mutea/desmutea el Master de Reaper */
type ReaperMasterMuteCallback = (muted: boolean) => void;
/** Callback invocado cuando el cliente selecciona una pista de Reaper */
type ReaperSelectTrackCallback = (track: number) => void;
/** Callback invocado cuando el cliente selecciona el Master de Reaper */
type ReaperSelectMasterCallback = () => void;

export class WebServer {
  private readonly app: express.Application;
  private readonly httpServer: http.Server;
  private readonly io: SocketIOServer<ClientToServerEvents, ServerToClientEvents>;

  /** Estado de automatización actual (sincronizado con index.ts) */
  private automationEnabled: boolean = true;
  /** Último color conocido (para nuevos clientes que se conecten) */
  private lastColor: RGBColor = { r: 0, g: 0, b: 0 };

  // Callbacks opcionales para que index.ts pueda reaccionar a eventos del cliente
  private onAutomationChange?: AutomationCallback;
  private onAudioPreset?: AudioPresetCallback;
  private onOnyxCommand?: OnyxCommandCallback;
  private onReaperMute?: ReaperTrackMuteCallback;
  private onReaperMasterMute?: ReaperMasterMuteCallback;
  private onReaperSelectTrack?: ReaperSelectTrackCallback;
  private onReaperSelectMaster?: ReaperSelectMasterCallback;

  constructor() {
    this.app = express();
    this.httpServer = http.createServer(this.app);
    this.io = new SocketIOServer(this.httpServer, {
      cors: { origin: '*' },
    });

    this.setupStaticFiles();
    this.setupSocketHandlers();
  }

  // ── Configuración ────────────────────────────────────────────

  private setupStaticFiles(): void {
    const staticPath = path.join(process.cwd(), config.web.staticPath);
    this.app.use(express.static(staticPath));
  }

  private setupSocketHandlers(): void {
    this.io.on('connection', (socket) => {
      console.log(`\n🔌 Cliente Web Conectado: ${socket.id}`);

      // Enviar estado actual al nuevo cliente
      socket.emit('automation_state', this.automationEnabled);
      socket.emit('video_color', this.lastColor);

      socket.on('toggle_automation', (state: boolean) => {
        this.automationEnabled = state;
        console.log(`\n🤖 Automatización de Estrobos: ${state ? 'ON' : 'OFF'}`);
        // Retransmitir a todos los clientes
        this.io.emit('automation_state', state);
        this.onAutomationChange?.(state);
      });

      socket.on('audio_preset', (presetName: string) => {
        console.log(`\n🎵 Audio Preset Web: ${presetName}`);
        this.onAudioPreset?.(presetName);
      });

      socket.on('direct_button', (command: string) => {
        console.log(`\n🎯 Botón Directo Web: ${command}`);
        this.onOnyxCommand?.(command);
      });

      socket.on('flash_button_down', (command: string) => {
        console.log(`\n⚡ Flash DOWN: ${command}`);
        this.onOnyxCommand?.(command);
      });

      socket.on('flash_button_up', (command: string) => {
        console.log(`\n⚡ Flash UP: ${command}`);
        this.onOnyxCommand?.(command);
      });

      socket.on('toggle_track_mute', (track: number, muted: boolean) => {
        console.log(`\n🎛️  Pista Reaper ${track}: ${muted ? 'SILENCIADA' : 'SONANDO'}`);
        this.onReaperMute?.(track, muted);
      });

      socket.on('toggle_master_mute', (muted: boolean) => {
        console.log(`\n🎚️  Reaper Master: ${muted ? 'SILENCIADO' : 'SONANDO'}`);
        this.onReaperMasterMute?.(muted);
      });

      socket.on('select_reaper_track', (track: number) => {
        console.log(`\n🎯 Seleccionar Pista Reaper: ${track}`);
        this.onReaperSelectTrack?.(track);
      });

      socket.on('select_reaper_master', () => {
        console.log(`\n🎯 Seleccionar Master Reaper`);
        this.onReaperSelectMaster?.();
      });

      socket.on('disconnect', () => {
        console.log(`\n❌ Cliente Web Desconectado: ${socket.id}`);
      });
    });
  }

  // ── API pública ───────────────────────────────────────────────

  /** Suscribes para eventos de clientes */
  onEvent(event: 'automationChange', cb: AutomationCallback): void;
  onEvent(event: 'audioPreset', cb: AudioPresetCallback): void;
  onEvent(event: 'onyxCommand', cb: OnyxCommandCallback): void;
  onEvent(event: 'reaperMute', cb: ReaperTrackMuteCallback): void;
  onEvent(event: 'reaperMasterMute', cb: ReaperMasterMuteCallback): void;
  onEvent(event: 'reaperSelectTrack', cb: ReaperSelectTrackCallback): void;
  onEvent(event: 'reaperSelectMaster', cb: ReaperSelectMasterCallback): void;
  onEvent(
    event: 'automationChange' | 'audioPreset' | 'onyxCommand' | 'reaperMute' | 'reaperMasterMute' | 'reaperSelectTrack' | 'reaperSelectMaster',
    cb: AutomationCallback | AudioPresetCallback | OnyxCommandCallback | ReaperTrackMuteCallback | ReaperMasterMuteCallback | ReaperSelectTrackCallback | ReaperSelectMasterCallback
  ): void {
    if (event === 'automationChange') this.onAutomationChange = cb as AutomationCallback;
    if (event === 'audioPreset') this.onAudioPreset = cb as AudioPresetCallback;
    if (event === 'onyxCommand') this.onOnyxCommand = cb as OnyxCommandCallback;
    if (event === 'reaperMute') this.onReaperMute = cb as ReaperTrackMuteCallback;
    if (event === 'reaperMasterMute') this.onReaperMasterMute = cb as ReaperMasterMuteCallback;
    if (event === 'reaperSelectTrack') this.onReaperSelectTrack = cb as ReaperSelectTrackCallback;
    if (event === 'reaperSelectMaster') this.onReaperSelectMaster = cb as ReaperSelectMasterCallback;
  }

  /** Emite un nuevo color a todos los clientes conectados. */
  emitColor(color: RGBColor): void {
    this.lastColor = color;
    this.io.emit('video_color', color);
  }

  /** Inicia el servidor HTTP. */
  listen(): void {
    this.httpServer.listen(config.web.port, () => {
      console.log(`🌐 Dashboard listo en http://localhost:${config.web.port}`);
    });
  }

  /** Cierra el servidor HTTP. */
  close(): void {
    this.httpServer.close();
  }
}
