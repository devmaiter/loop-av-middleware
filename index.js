const osc = require('osc');
const dgram = require('dgram');
const express = require('express');
const http = require('http');
const { Server } = require('socket.io');
const dmxlib = require('dmxnet');

const app = express();
const server = http.createServer(app);
const io = new Server(server, {
    cors: { origin: "*" }
});
const WEB_PORT = 3000;
const dmxnet = new dmxlib.dmxnet();

// --- CONFIGURACIÓN ---
const ONYX_IP = '192.168.1.20';
const ONYX_UDP_PORT = 3333;
const AUDIO_IP = '127.0.0.1'; // Placeholder IP para PC del Audio (Voicemeeter/Reaper)
const AUDIO_UDP_PORT = 8080;  // Placeholder puerto para Audio
const udpClient = dgram.createSocket('udp4');

const oscServer = new osc.UDPPort({
    localAddress: "0.0.0.0",
    localPort: 7000,
    metadata: true
});

let isStrobing = false;
let isAutomationEnabled = true;
let currentColor = { r: 0, g: 0, b: 0 };

// --- FUNCIÓN PARA ENVIAR COMANDOS A ONYX ---
function sendToOnyx(command) {
    const message = Buffer.from(command);
    udpClient.send(message, 0, message.length, ONYX_UDP_PORT, ONYX_IP, (err) => {
        if (err) console.error(`❌ Error enviando a Onyx ${command}:`, err);
    });
}

// --- FUNCIÓN PARA ENVIAR COMANDOS AL AUDIO ---
function sendToAudio(command) {
    const message = Buffer.from(command);
    udpClient.send(message, 0, message.length, AUDIO_UDP_PORT, AUDIO_IP, (err) => {
        if (err) console.error(`❌ Error enviando a Audio ${command}:`, err);
    });
}

// --- SERVIDOR WEBSOCKETS (PANEL DE CONTROL) ---
io.on('connection', (socket) => {
    console.log(`\n🔌 Cliente Web Conectado: ${socket.id}`);
    
    // Enviar estado actual de automatización al cliente
    socket.emit('automation_state', isAutomationEnabled);
    
    // Enviar último color conocido
    socket.emit('video_color', currentColor);

    socket.on('toggle_automation', (state) => {
        isAutomationEnabled = state;
        console.log(`\n🤖 Automatización de Estrobos: ${isAutomationEnabled ? 'ON' : 'OFF'}`);
        // Retransmitir a todos los clientes
        io.emit('automation_state', isAutomationEnabled);
    });

    socket.on('audio_preset', (presetName) => {
        console.log(`\n🎵 Audio Preset Web Seleccionado: ${presetName}`);
        sendToAudio(`PRESET:${presetName}`);
    });

    socket.on('direct_button', (onyxCommand) => {
        console.log(`\n🎯 Botón Directo Web: ${onyxCommand}`);
        sendToOnyx(onyxCommand);
    });

    socket.on('flash_button_down', (onyxCommand) => {
        console.log(`\n⚡ Flash DOWN: ${onyxCommand}`);
        sendToOnyx(onyxCommand);
    });
    
    socket.on('flash_button_up', (onyxCommand) => {
        console.log(`\n⚡ Flash UP: ${onyxCommand}`);
        sendToOnyx(onyxCommand);
    });

    socket.on('disconnect', () => {
        console.log(`\n❌ Cliente Web Desconectado: ${socket.id}`);
    });
});

// --- INTERFAZ DE COMANDOS (Para enviar "clear" manualmente) ---
const readline = require('readline');
const rl = readline.createInterface({
    input: process.stdin,
    output: process.stdout,
    prompt: '' // Dejamos el prompt vacío para no estorbar la barra visual
});

rl.on('line', (input) => {
    const cmd = input.trim().toLowerCase();

    if (cmd === 'clear') {
        sendToOnyx("CLRCLR");
        console.log("\n🧹 [MANUAL] Comando CLEAR enviado a Onyx");
    } else if (cmd === 'exit' || cmd === 'quit') {
        console.log("👋 Saliendo...");
        process.exit();
    }
});

// Variable para recordar el último valor DMX enviado y no saturar la red
let lastDmxValue = -1;

oscServer.on("message", function (oscMsg) {
    if (oscMsg.address.includes("/opacity")) {
        let opacidadVal = oscMsg.args[0]?.value || 0; // Valor entre 0.0 y 1.0

        // --- CONVERSIÓN PROPORCIONAL DE DMX (0 a 255) ---
        let dmxValue = Math.round(opacidadVal * 255);

        // Solo disparamos el comando UDP si el valor de DMX entero realmente cambió
        // Esto evita saturar la red con cambios decimales minúsculos
        if (dmxValue !== lastDmxValue) {

            // Solo enviar el comando a Onyx si la automatización está habilitada
            if (isAutomationEnabled) {
                // Comando SQL proporcional: Set Cuelist 5 level a 'dmxValue'
                sendToOnyx(`SQL 5,${dmxValue}`);
            }

            // --- DIBUJAR LA BARRA DE PROGRESO EN LA MISMA LÍNEA ---
            const barLength = 40;
            const filledLength = Math.round(barLength * opacidadVal);
            const bar = '█'.repeat(filledLength) + '-'.repeat(barLength - filledLength);

            // Escribimos en la consola con \r para sobrescribir la misma línea
            // Añadí el "CUELIST 5" en el log para que tengas confirmación constante
            const autoStatusObj = isAutomationEnabled ? '✔️ AUTO' : '❌ PAUSA';
            process.stdout.write(`\r📊 OPACIDAD: [${bar}] ${(opacidadVal * 100).toFixed(0)}% | 🔌 ONYX CUELIST 5: ${dmxValue.toString().padStart(3, ' ')} / 255 | ${autoStatusObj}     `);

            // Actualizar memoria
            lastDmxValue = dmxValue;
        }
    }
});

oscServer.on("ready", function () {
    console.log("-----------------------------------------");
    console.log("🚀 MIDDLEWARE ACTIVO");
    console.log(`🔗 Destino: PC 2 (${ONYX_IP}:${ONYX_UDP_PORT})`);
    console.log("⌨️  Escribe 'clear' y presiona Enter para enviar un CLEAR manual");
    console.log("⌨️  Escribe 'exit' para cerrar la consola");
    console.log("-----------------------------------------");

    // ENVIAR CLEAR AUTOMÁTICO AL INICIAR (Prueba de conexión)
    setTimeout(() => {
        console.log("📡 Enviando Clear de inicio...");
        sendToOnyx("CLRCLR");
    }, 1000);
});

oscServer.on("error", function (err) {
    console.error("❌ Error del servidor OSC:", err.message);
});

oscServer.open();

// --- RECEPTOR ART-NET (COLOR DESDE RESOLUME) ---
console.log("🛠️ Inicializando sniffer UDP puro para Art-Net en el puerto 6454...");

// reuseAddr:true permite compartir el puerto 6454 con Resolume Arena en Windows
const artnetSocket = dgram.createSocket({ type: 'udp4', reuseAddr: true });
let lastSentColor = "0,0,0";
let lastEmitTime = 0;

artnetSocket.on('message', (msg, rinfo) => {
    // Verificar que es un paquete Art-Net y que es suficientemente largo
    if (msg.length >= 21 && msg.toString('utf8', 0, 7) === 'Art-Net') {
        // El universo (los 15 bits config) está en los bytes 14 y 15
        const universe = msg.readUInt8(14);
        
        // Los datos DMX empiezan en el byte 18
        const r = msg[18] || 0;
        const g = msg[19] || 0;
        const b = msg[20] || 0;

        const colorStr = `${r},${g},${b}`;

        // Emitimos y logueamos
        if (colorStr !== lastSentColor) {
            const now = Date.now();
            if (now - lastEmitTime > 33) {
                currentColor = { r, g, b };
                io.emit('video_color', currentColor);
                
                process.stdout.write(`\r[ART-NET] Universo: ${universe} | Color: \x1b[38;2;${r};${g};${b}m███\x1b[0m RGB(${r.toString().padStart(3)}, ${g.toString().padStart(3)}, ${b.toString().padStart(3)})   `);
                
                lastEmitTime = now;
                lastSentColor = colorStr;
            }
        }
    }
});

artnetSocket.on('listening', () => {
    console.log("✅ Sniffer UDP escuchando DMX en el puerto 6454.");
});

// Windows no permite que 2 programas usen el puerto 6454 en la misma IP al mismo tiempo
// si Resolume también está escuchando DMX. Escuchamos en 0.0.0.0 para interceptar el unicast de Resolume.
artnetSocket.bind({
    port: 6454,
    address: '0.0.0.0',
    exclusive: false
});

// --- INICIAR SERVIDOR WEB ---
// Servir archivos estáticos del dashboard (React build) si existen
app.use(express.static('dashboard/dist'));

server.listen(WEB_PORT, () => {
    console.log(`🌐 Servidor Web (Dashboard) listo en http://localhost:${WEB_PORT}`);
});