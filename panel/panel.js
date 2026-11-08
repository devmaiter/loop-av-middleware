// Panel de Loop: dibuja los botones que manda el servidor y refleja el estado del show.
// El panel solo envía índices de botones; los comandos reales están en la configuración.
'use strict';

const $ = (id) => document.getElementById(id);
const PIN_KEY = 'loop.pin';

function savedPin() {
  try { return localStorage.getItem(PIN_KEY) || ''; } catch { return ''; }
}
function savePin(pin) {
  try { localStorage.setItem(PIN_KEY, pin); } catch { /* navegador sin almacenamiento */ }
}

const socket = io({ auth: { pin: savedPin() } });

// ── Conexión y PIN ─────────────────────────────────────────

socket.on('connect', () => setChip($('server-status'), true, 'Conectado'));
socket.on('disconnect', () => setChip($('server-status'), false, 'Sin conexión'));
socket.on('connect_error', (err) => {
  setChip($('server-status'), false, 'Sin conexión');
  if (err.message === 'PIN incorrecto') askPin(savedPin() !== '');
});

function askPin(wasWrong) {
  $('pin-error').hidden = !wasWrong;
  $('pin').value = '';
  if (!$('pin-dialog').open) $('pin-dialog').showModal();
}

$('pin-form').addEventListener('submit', () => {
  const pin = $('pin').value.trim();
  savePin(pin);
  socket.auth.pin = pin;
  socket.connect();
});

// ── Dibujo de botones según la configuración ───────────────

function button(label, className) {
  const b = document.createElement('button');
  b.type = 'button';
  b.textContent = label;
  if (className) b.className = className;
  return b;
}

socket.on('layout', (layout) => {
  const scenes = $('scenes');
  scenes.replaceChildren(...layout.scenes.map((name, i) => {
    const b = button(name);
    b.addEventListener('click', () => socket.emit('scene', i));
    return b;
  }));

  const flashes = $('flashes');
  flashes.replaceChildren(...layout.flashes.map((name, i) => holdButton(name, i)));

  const tracks = [{ number: 'master', name: 'Master' }, ...layout.tracks];
  $('tracks').replaceChildren(...tracks.map(trackRow));

  $('presets-block').hidden = layout.presets.length === 0;
  $('presets').replaceChildren(...layout.presets.map((name, i) => {
    const b = button(name);
    b.addEventListener('click', () => socket.emit('preset', i));
    return b;
  }));
});

/** Flash: se enciende mientras el dedo o el mouse está encima. */
function holdButton(name, index) {
  const b = button(name);
  let pressed = false;
  const set = (on) => {
    if (on === pressed) return;
    pressed = on;
    b.classList.toggle('pressed', on);
    socket.emit('flash', index, on);
  };
  b.addEventListener('pointerdown', (e) => { b.setPointerCapture(e.pointerId); set(true); });
  for (const end of ['pointerup', 'pointercancel', 'lostpointercapture']) {
    b.addEventListener(end, () => set(false));
  }
  b.addEventListener('contextmenu', (e) => e.preventDefault());
  return b;
}

function trackRow(track) {
  const row = document.createElement('div');
  row.className = 'track';
  row.dataset.track = String(track.number);

  const name = document.createElement('span');
  name.className = 'name';
  name.textContent = track.name;

  const mute = button('Sonando');
  mute.dataset.role = 'mute';
  mute.addEventListener('click', () => socket.emit('mute', track.number, !mute.classList.contains('muted')));

  const select = button('Seleccionar');
  select.addEventListener('click', () => socket.emit('select', track.number));

  row.append(name, mute, select);
  return row;
}

// ── Estado del show (es el mismo en todas las tablets) ─────

socket.on('state', (state) => {
  $('automation').checked = state.automation;
  setChip($('resolume-status'), state.resolumeOnline, state.resolumeOnline ? 'Resolume' : 'Resolume sin señal');
  const { r, g, b } = state.color;
  $('video-color').style.background = `rgb(${r}, ${g}, ${b})`;

  for (const row of document.querySelectorAll('.track')) {
    const id = row.dataset.track;
    const muted = id === 'master' ? state.masterMuted : state.mutedTracks.includes(Number(id));
    const mute = row.querySelector('[data-role="mute"]');
    mute.classList.toggle('muted', muted);
    mute.textContent = muted ? 'Silenciado' : 'Sonando';
  }
});

socket.on('rejected', (message) => toast(message));

$('automation').addEventListener('change', (e) => socket.emit('automation', e.target.checked));
$('release-all').addEventListener('click', () => socket.emit('release_all'));

// Limpiar el programador borra lo que está en escena: pide un segundo toque.
let clearTimer;
$('clear-lights').addEventListener('click', (e) => {
  const b = e.currentTarget;
  if (!b.classList.contains('armed')) {
    b.classList.add('armed');
    b.textContent = 'Toca otra vez para limpiar';
    clearTimer = setTimeout(() => disarm(b), 3000);
    return;
  }
  clearTimeout(clearTimer);
  disarm(b);
  socket.emit('clear_lights');
  toast('Programador limpio');
});

function disarm(b) {
  b.classList.remove('armed');
  b.textContent = 'Limpiar programador';
}

// ── Utilidades ─────────────────────────────────────────────

function setChip(el, on, text) {
  el.classList.toggle('on', on);
  el.textContent = text;
}

let toastTimer;
function toast(text) {
  const t = $('toast');
  t.textContent = text;
  t.hidden = false;
  clearTimeout(toastTimer);
  toastTimer = setTimeout(() => (t.hidden = true), 2500);
}
