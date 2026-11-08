// Lectura de paquetes Art-Net (ArtDmx).
//
// Estructura del paquete ArtDmx:
//   0-7   "Art-Net\0"
//   8-9   OpCode, little endian (0x5000 = ArtDmx)
//   10-11 versión del protocolo
//   12    secuencia, 13 físico
//   14-15 universo, little endian
//   16-17 cantidad de canales, big endian
//   18+   valores DMX (canal 1 en el byte 18)

export interface RGB {
  r: number;
  g: number;
  b: number;
}

const HEADER = 'Art-Net\0';
const OP_DMX = 0x5000;
const DATA_START = 18;

/**
 * Devuelve el color R,G,B que empieza en `channel` (1 = primer canal DMX),
 * o null si el paquete no es ArtDmx o no trae esos tres canales.
 */
export function readColor(packet: Buffer, channel: number): RGB | null {
  if (packet.length < DATA_START) return null;
  if (packet.toString('latin1', 0, 8) !== HEADER) return null;
  if (packet.readUInt16LE(8) !== OP_DMX) return null;

  const channels = packet.readUInt16BE(16);
  if (channel < 1 || channel + 2 > channels) return null;

  const at = DATA_START + channel - 1;
  if (at + 3 > packet.length) return null;
  return { r: packet[at], g: packet[at + 1], b: packet[at + 2] };
}

/** Arma un paquete ArtDmx. Lo usan las pruebas y sirve para depurar. */
export function buildPacket(values: number[], universe = 0): Buffer {
  const length = Math.max(2, values.length + (values.length % 2)); // el estándar pide un número par
  const packet = Buffer.alloc(DATA_START + length);
  packet.write(HEADER, 0, 'latin1');
  packet.writeUInt16LE(OP_DMX, 8);
  packet.writeUInt16BE(14, 10);
  packet.writeUInt16LE(universe, 14);
  packet.writeUInt16BE(length, 16);
  values.forEach((v, i) => (packet[DATA_START + i] = v));
  return packet;
}
