import { test } from 'node:test';
import assert from 'node:assert/strict';
import * as fs from 'fs';
import * as os from 'os';
import * as path from 'path';
import { ConfigError, defaults, loadConfig } from '../src/config';

function withFile(content: string): string {
  const file = path.join(fs.mkdtempSync(path.join(os.tmpdir(), 'loop-')), 'loop.config.json');
  fs.writeFileSync(file, content);
  return file;
}

test('sin archivo usa los valores por defecto', () => {
  assert.deepEqual(loadConfig(path.join(os.tmpdir(), 'no-existe.json')), defaults);
});

test('el archivo solo necesita lo que cambia', () => {
  const config = loadConfig(withFile('{ "onyx": { "ip": "10.0.0.5" } }'));
  assert.equal(config.onyx.ip, '10.0.0.5');
  assert.equal(config.onyx.port, defaults.onyx.port);
  assert.deepEqual(config.scenes, defaults.scenes);
});

test('las listas se reemplazan completas', () => {
  const config = loadConfig(withFile('{ "scenes": [{ "name": "Apertura", "command": "GQL 20" }] }'));
  assert.deepEqual(config.scenes, [{ name: 'Apertura', command: 'GQL 20' }]);
});

test('explica los errores en lenguaje de instalación', () => {
  assert.throws(() => loadConfig(withFile('{ "onyx": { "port": 99999 } }')), ConfigError);
  assert.throws(() => loadConfig(withFile('{ mal json')), /No se pudo leer/);
  assert.throws(() => loadConfig(withFile('{ "reaper": { "localPort": 7000 } }')), /no puede ser igual/);
});
