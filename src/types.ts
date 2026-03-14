// ============================================================
//  src/types.ts  –  Interfaces y tipos globales del sistema
// ============================================================

/** Color RGB normalizado (valores 0-255) */
export interface RGBColor {
  r: number;
  g: number;
  b: number;
}

/** Argumento de un mensaje OSC */
export interface OscArg {
  type: string;
  value: unknown;
}

/** Mensaje OSC entrante */
export interface OscMessage {
  address: string;
  args: OscArg[];
}

/** Comando UDP para Onyx (string tipo "SQL 5,128" o "CLRCLR") */
export type OnyxCommand = string;

/** Estado de automatización de estrobos */
export interface AutomationState {
  enabled: boolean;
}

/** Payload emitido cuando cambia la opacidad desde OSC */
export interface OpacityChangePayload {
  rawValue: number;   // 0.0 – 1.0
  dmxValue: number;  // 0 – 255
}

/** Eventos del servidor WebSocket hacia el cliente */
export interface ServerToClientEvents {
  video_color: (color: RGBColor) => void;
  automation_state: (enabled: boolean) => void;
}

/** Eventos del cliente WebSocket hacia el servidor */
export interface ClientToServerEvents {
  toggle_automation: (state: boolean) => void;
  audio_preset: (presetName: string) => void;
  direct_button: (command: OnyxCommand) => void;
  flash_button_down: (command: OnyxCommand) => void;
  flash_button_up: (command: OnyxCommand) => void;
  /** Mutea/desmutea una pista de Reaper. track: 1-indexed, muted: true=silenciada */
  toggle_track_mute: (track: number, muted: boolean) => void;
  /** Mutea/desmutea el Master de Reaper */
  toggle_master_mute: (muted: boolean) => void;
}
