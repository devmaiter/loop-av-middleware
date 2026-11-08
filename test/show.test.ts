import { test } from 'node:test';
import assert from 'node:assert/strict';
import { defaults } from '../src/config';
import { opacityToDmx, Show, ShowError, type ShowState } from '../src/show';

function setup() {
  const sent: string[] = [];
  const show = new Show(
    defaults,
    {
      command: (t) => sent.push(t),
      setLevel: (c, l) => sent.push(`SQL ${c},${l}`),
      releaseAll: () => sent.push('RQL 0'),
      clear: () => sent.push('CLRCLR'),
    },
    {
      setMute: (t, m) => sent.push(`mute ${t} ${m}`),
      select: (t) => sent.push(`select ${t}`),
    },
    { loadPreset: (p) => sent.push(`preset ${p}`) },
  );
  return { show, sent };
}

test('convierte opacidad en nivel DMX y la recorta', () => {
  assert.equal(opacityToDmx(0), 0);
  assert.equal(opacityToDmx(0.5), 128);
  assert.equal(opacityToDmx(1), 255);
  assert.equal(opacityToDmx(1.7), 255);
  assert.equal(opacityToDmx(-1), 0);
});

test('la opacidad mueve los estrobos solo si cambia y si la automatización está activa', () => {
  const { show, sent } = setup();
  show.onOpacity(0.5);
  show.onOpacity(0.5);
  show.setAutomation(false);
  show.onOpacity(1);
  show.stop();
  assert.deepEqual(sent, ['SQL 5,128', 'SQL 5,0']);
});

test('los botones usan los comandos de la configuración', () => {
  const { show, sent } = setup();
  show.runScene(0);
  show.flash(1, true);
  show.flash(1, false);
  assert.deepEqual(sent, ['GQL 1', 'SQL 12,255', 'SQL 12,0']);
});

test('rechaza botones y pistas que no existen', () => {
  const { show, sent } = setup();
  assert.throws(() => show.runScene(99), ShowError);
  assert.throws(() => show.setMute(42, true), ShowError);
  assert.deepEqual(sent, []);
});

test('el estado de mute es uno solo para todas las tablets', () => {
  const { show } = setup();
  const states: ShowState[] = [];
  show.on('change', (s) => states.push(s));
  show.setMute(3, true);
  show.setMute(1, true);
  show.setMute('master', true);
  show.setMute(3, false);
  assert.deepEqual(show.current.mutedTracks, [1]);
  assert.equal(show.current.masterMuted, true);
  assert.equal(states.length, 4);
});
