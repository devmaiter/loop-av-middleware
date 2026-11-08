import { test } from 'node:test';
import assert from 'node:assert/strict';
import { buildPacket, readColor } from '../src/protocols/artnet';

test('lee el color desde el canal configurado', () => {
  const packet = buildPacket([10, 20, 30, 200, 100, 50]);
  assert.deepEqual(readColor(packet, 1), { r: 10, g: 20, b: 30 });
  assert.deepEqual(readColor(packet, 4), { r: 200, g: 100, b: 50 });
});

test('ignora paquetes que no son ArtDmx', () => {
  const packet = buildPacket([1, 2, 3]);
  packet.writeUInt16LE(0x2000, 8); // ArtPoll
  assert.equal(readColor(packet, 1), null);
  assert.equal(readColor(Buffer.from('hola'), 1), null);
});

test('ignora un canal que el paquete no trae', () => {
  assert.equal(readColor(buildPacket([1, 2, 3, 4]), 3), null);
});
