// ============================================================
//  src/artnet/artnetTester.ts  –  Tester standalone de Art-Net
// ============================================================

import * as dgram from 'dgram';

const PORT = 6454;
const HOST = '0.0.0.0';
const ARTNET_HEADER = 'Art-Net';

let packetCount = 0;
let lastColor = { r: 0, g: 0, b: 0 };
let lastReportTime = 0;

console.log('=========================================');
console.log('🧪 TESTER DE RECEPCIÓN ART-NET (Standalone)');
console.log('=========================================');

const client = dgram.createSocket({ type: 'udp4', reuseAddr: true });

client.on('listening', () => {
  const address = client.address();
  console.log(`\n✅ Escuchando UDP en ${address.address}:${address.port}`);
  console.log('📡 Esperando que Resolume envíe datos de color...\n');
});

client.on('message', (message: Buffer, remote: dgram.RemoteInfo) => {
  if (message.length < 21) return;
  if (message.toString('utf8', 0, 7) !== ARTNET_HEADER) return;

  packetCount++;
  const r = message[18] ?? 0;
  const g = message[19] ?? 0;
  const b = message[20] ?? 0;

  const now = Date.now();
  const colorChanged = r !== lastColor.r || g !== lastColor.g || b !== lastColor.b;
  const timeoutReached = now - lastReportTime > 1000;

  if (colorChanged || timeoutReached) {
    const ansiBlock = `\x1b[38;2;${r};${g};${b}m███\x1b[0m`;
    process.stdout.write(
      `\r[ART-NET] De: ${remote.address}:${remote.port} | Pqts: ${packetCount
        .toString()
        .padStart(4, ' ')} | Color: ${ansiBlock} RGB(${r
        .toString()
        .padStart(3, ' ')}, ${g.toString().padStart(3, ' ')}, ${b
        .toString()
        .padStart(3, ' ')})   `
    );

    lastColor = { r, g, b };
    lastReportTime = now;
  }
});

client.on('error', (err: Error) => {
  console.error(`\n❌ Error en el socket UDP: ${err.message}`);
  client.close();
});

client.bind(PORT, HOST);
