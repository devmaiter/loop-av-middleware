const dgram = require('dgram');

console.log("=========================================");
console.log("🧪 TESTER DE RECEPCIÓN ART-NET (Standalone)");
console.log("=========================================");

const PORT = 6454;
const HOST = '0.0.0.0';

// reuseAddr:true es clave para compartir el puerto 6454 con Resolume en Windows
const client = dgram.createSocket({ type: 'udp4', reuseAddr: true });

let packetCount = 0;
let lastColor = { r: 0, g: 0, b: 0 };
let lastReportTime = 0;

client.on('listening', function () {
    const address = client.address();
    console.log(`\n✅ Escuchando UDP en ${address.address}:${address.port}`);
    console.log("📡 Esperando que Resolume envíe datos de color...\n");
});

client.on('message', function (message, remote) {
    // Verificamos si es un paquete Art-Net comprobando su cabecera (primeros 7 bytes)
    if (message.toString('utf8', 0, 7) === 'Art-Net') {
        packetCount++;

        // Universos reales están entre bytes 14 y 15, DMX inicia en el byte 18
        const r = message[18] || 0;
        const g = message[19] || 0;
        const b = message[20] || 0;

        const now = Date.now();
        
        // Logueamos solo si el color cambia o cada 1 segundo para mostrar que seguimos vivos
        if (r !== lastColor.r || g !== lastColor.g || b !== lastColor.b || (now - lastReportTime > 1000)) {
            
            // Refresca la terminal mostrando el paquete, la IP origen y el color con cuadros ANSI
            process.stdout.write(`\r[ART-NET] De: ${remote.address}:${remote.port} | Pqts: ${packetCount.toString().padStart(4, ' ')} | Color: \x1b[38;2;${r};${g};${b}m███\x1b[0m RGB(${r.toString().padStart(3, ' ')}, ${g.toString().padStart(3, ' ')}, ${b.toString().padStart(3, ' ')})   `);
            
            lastColor = { r, g, b };
            lastReportTime = now;
        }
    }
});

// En Windows la forma correcta de compartir un puerto UDP es con SO_REUSEADDR
client.on('error', (err) => {
    console.error(`\n❌ Error en el socket UDP: ${err.message}`);
    client.close();
});

client.bind(PORT, '0.0.0.0');
