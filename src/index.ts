// ============================================================
//  src/index.ts  –  Entry point principal del middleware Loop
// ============================================================

import { OnyxSender } from './udp/onyxSender';
import { AudioSender } from './udp/audioSender';
import { OscServer } from './osc/oscServer';
import { ReaperSender } from './osc/reaperSender';
import { ArtNetReceiver } from './artnet/artnetReceiver';
import { WebServer } from './web/webServer';
import { ConsoleInterface } from './cli/consoleInterface';
import type { RGBColor } from './types';

// ── Estado global tipado ──────────────────────────────────────

let isAutomationEnabled: boolean = true;
// ── Instanciar módulos ────────────────────────────────────────


const onyxSender    = new OnyxSender();
const audioSender   = new AudioSender();
const reaperSender  = new ReaperSender();
const oscServer     = new OscServer();
const artnetRx      = new ArtNetReceiver();
const webServer     = new WebServer();
const consoleCli    = new ConsoleInterface();

// ── Wiring: OSC → Onyx ───────────────────────────────────────

oscServer.on('opacityChange', ({ dmxValue }) => {
  if (isAutomationEnabled) {
    onyxSender.send(`SQL 5,${dmxValue}`);
  }
});

oscServer.on('ready', () => {
  // CLEAR automático al iniciar (prueba de conexión con Onyx)
  setTimeout(() => {
    console.log('\n📡 Enviando Clear de inicio...');
    onyxSender.send('CLRCLR');
  }, 1000);
});

oscServer.on('error', (err) => {
  console.error(`❌ [OSC] Error: ${err.message}`);
});

// ── Wiring: Art-Net → WebServer ───────────────────────────────

artnetRx.on('colorChange', (color: RGBColor) => {
  webServer.emitColor(color);
});


// ── Wiring: WebServer → Onyx / Audio ─────────────────────────

webServer.onEvent('automationChange', (enabled: boolean) => {
  isAutomationEnabled = enabled;
});

webServer.onEvent('audioPreset', (preset: string) => {
  audioSender.sendPreset(preset);
});

webServer.onEvent('onyxCommand', (command: string) => {
  onyxSender.send(command);
});

webServer.onEvent('reaperMute', (track: number, muted: boolean) => {
  reaperSender.setTrackMute(track, muted);
});

webServer.onEvent('reaperMasterMute', (muted: boolean) => {
  reaperSender.setMasterMute(muted);
});

webServer.onEvent('reaperSelectTrack', (track: number) => {
  reaperSender.setTrackSelect(track);
});

webServer.onEvent('reaperSelectMaster', () => {
  reaperSender.setMasterSelect();
});

// ── Wiring: CLI → Onyx ───────────────────────────────────────

consoleCli.on('clear', () => {
  onyxSender.send('CLRCLR');
  console.log('\n🧹 [MANUAL] Comando CLEAR enviado a Onyx');
});

consoleCli.on('exit', () => {
  console.log('\n👋 Cerrando middleware...');
  // Graceful shutdown
  oscServer.close();
  reaperSender.close();
  artnetRx.close();
  webServer.close();
  consoleCli.close();
  process.exit(0);
});

consoleCli.on('unknown', (cmd) => {
  console.log(`\n❓ Comando desconocido: "${cmd}". Usa 'clear' o 'exit'.`);
});

// ── Iniciar todos los servicios ───────────────────────────────

webServer.listen();   // Servidor HTTP + WebSockets
oscServer.open();     // Servidor OSC (puerto 7000)
artnetRx.bind();      // Receptor Art-Net (puerto 6454)

// Mantener el proceso vivo ante errores no controlados
process.on('uncaughtException', (err) => {
  console.error(`\n💥 Error no controlado: ${err.message}`);
});

process.on('unhandledRejection', (reason) => {
  console.error(`\n💥 Promise rechazada: ${reason}`);
});
