// Arma la carpeta de entrega: release/loop/ con loop.exe, el panel y la configuración,
// y un .zip listo para copiar al PC del evento.
//
// Usa los ejecutables únicos de Node (Single Executable Applications):
// https://nodejs.org/api/single-executable-applications.html
//
// Uso: npm run package   (en Windows; el .exe lleva el Node con el que se corre)

import { execFileSync } from 'node:child_process';
import * as fs from 'node:fs';
import * as path from 'node:path';
import { build } from 'esbuild';

const root = path.resolve(import.meta.dirname, '..');
const pkg = JSON.parse(fs.readFileSync(path.join(root, 'package.json'), 'utf8'));
const work = path.join(root, 'build');
const out = path.join(root, 'release', 'loop');
const exe = path.join(out, process.platform === 'win32' ? 'loop.exe' : 'loop');

const step = (text) => console.log(`- ${text}`);

fs.rmSync(work, { recursive: true, force: true });
fs.rmSync(path.join(root, 'release'), { recursive: true, force: true });
fs.mkdirSync(work, { recursive: true });
fs.mkdirSync(out, { recursive: true });

step('Uniendo el código en un solo archivo');
await build({
  entryPoints: [path.join(root, 'src', 'main.ts')],
  outfile: path.join(work, 'loop.cjs'),
  bundle: true,
  platform: 'node',
  target: 'node22',
  format: 'cjs',
  // Aceleradores opcionales de WebSocket; si no están, socket.io sigue funcionando
  external: ['bufferutil', 'utf-8-validate'],
  logLevel: 'warning',
});

step('Generando el ejecutable');
const seaConfig = path.join(work, 'sea-config.json');
const blob = path.join(work, 'sea-prep.blob');
fs.writeFileSync(
  seaConfig,
  JSON.stringify({ main: path.join(work, 'loop.cjs'), output: blob, disableExperimentalSEAWarning: true }),
);
execFileSync(process.execPath, ['--experimental-sea-config', seaConfig], { stdio: 'inherit' });
fs.copyFileSync(process.execPath, exe);
execFileSync(
  process.execPath,
  [
    path.join(root, 'node_modules', 'postject', 'dist', 'cli.js'),
    exe,
    'NODE_SEA_BLOB',
    blob,
    '--sentinel-fuse',
    'NODE_SEA_FUSE_fce680ab2cc467b6e072b8b5df1996b2',
  ],
  { stdio: 'inherit' },
);

step('Copiando el panel, la configuración y las instrucciones');
fs.cpSync(path.join(root, 'panel'), path.join(out, 'panel'), { recursive: true });
fs.mkdirSync(path.join(out, 'panel', 'vendor'), { recursive: true });
fs.copyFileSync(
  path.join(root, 'node_modules', 'socket.io', 'client-dist', 'socket.io.min.js'),
  path.join(out, 'panel', 'vendor', 'socket.io.min.js'),
);
fs.copyFileSync(path.join(root, 'loop.config.example.json'), path.join(out, 'loop.config.json'));
fs.copyFileSync(path.join(root, 'docs', 'INSTALACION.md'), path.join(out, 'INSTALACION.md'));

step('Comprimiendo');
const zip = `loop-v${pkg.version}-${process.platform}-${process.arch}.zip`;
// El tar de Windows (bsdtar) crea .zip con -a. Se usa por su ruta: el de Git Bash (GNU) no hace zip.
const tar =
  process.platform === 'win32' ? path.join(process.env.SystemRoot ?? 'C:\\Windows', 'System32', 'tar.exe') : 'tar';
execFileSync(tar, ['-a', '-c', '-f', zip, 'loop'], { cwd: path.join(root, 'release'), stdio: 'inherit' });

console.log(`\nListo: release/${zip}`);
