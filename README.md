# 🎛️ Loop – AV Middleware Controller

**Loop** es un middleware de control AV en tiempo real desarrollado con **Node.js**. Actúa como puente central entre Resolume Arena, Onyx, sistemas de audio, y un dashboard web de monitoreo. Diseñado para shows en vivo y producción de eventos.

---

## 🚀 Características principales

- 🎨 **Recepción de color vía Art-Net** – Captura el color de video de Resolume Arena (puerto UDP 6454) y lo emite al dashboard en tiempo real.
- 💡 **Control de estrobos proporcional vía OSC** – Convierte la opacidad de capas en Resolume (0.0–1.0) a valores DMX (0–255) enviados a Onyx vía UDP.
- 🌐 **Panel de control web** – Dashboard integrado con WebSockets (Socket.io) para visualización y control remoto.
- 🎵 **Envío de presets de audio** – Envía comandos UDP a un PC de audio remoto.
- ⌨️ **Comandos manuales por consola** – Soporte para `clear` y `exit` desde terminal.

---

## 🏗️ Arquitectura

```
Resolume Arena
    │
    ├── OSC (puerto 7000) ──────────► Loop Middleware (index.js)
    │                                        │
    └── Art-Net DMX (puerto 6454) ──────────►│
                                             │
                              ┌──────────────┼──────────────────┐
                              │              │                  │
                          Onyx (UDP)   Audio PC (UDP)    Dashboard Web
                          :3333         :8080            localhost:3000
```

---

## 📦 Dependencias

| Paquete    | Uso                                          |
|------------|----------------------------------------------|
| `osc`      | Recepción de mensajes OSC desde Resolume     |
| `dgram`    | Sockets UDP para Art-Net y envío a Onyx      |
| `express`  | Servidor HTTP para el dashboard web          |
| `socket.io`| WebSockets para comunicación en tiempo real  |
| `dmxnet`   | Librería Art-Net auxiliar                    |

---

## ⚙️ Configuración

Edita las constantes en `index.js` según tu red:

```js
const ONYX_IP = '192.168.1.20';    // IP del PC con Onyx
const ONYX_UDP_PORT = 3333;        // Puerto UDP de Onyx
const AUDIO_IP = '127.0.0.1';      // IP del PC de audio
const AUDIO_UDP_PORT = 8080;       // Puerto UDP de audio
```

---

## 🖥️ Instalación y uso

```bash
# 1. Instalar dependencias
npm install

# 2. Ejecutar el middleware
node index.js
```

El servidor web del dashboard estará disponible en **http://localhost:3000**.

---

## 🧪 Test de Art-Net (standalone)

Para verificar que Resolume está enviando datos de color sin iniciar el middleware completo:

```bash
node test-artnet.js
```

Muestra en consola el color RGB recibido en tiempo real con representación visual ANSI.

---

## 📡 Protocolos utilizados

| Protocolo | Dirección     | Puerto | Descripción                            |
|-----------|---------------|--------|----------------------------------------|
| OSC/UDP   | Entrada       | 7000   | Opacidad de capas desde Resolume       |
| Art-Net   | Entrada       | 6454   | Color de video desde Resolume          |
| UDP raw   | Salida        | 3333   | Comandos DMX/SQL a Onyx                |
| UDP raw   | Salida        | 8080   | Presets de audio al PC de audio        |
| HTTP/WS   | Entrada/Salida| 3000   | Dashboard web + WebSockets             |

---

## 🗓️ Historial de desarrollo

### v1.0.0 – Lanzamiento inicial (2026-03-14)
- ✅ Recepción OSC de opacidad desde Resolume Arena
- ✅ Conversión proporcional OSC → DMX (0–255)
- ✅ Envío de comandos UDP a Onyx (`SQL 5,<value>`)
- ✅ Comando CLEAR manual y automático al inicio
- ✅ Barra de progreso visual en consola
- ✅ Recepción de color vía Art-Net (puerto 6454, `reuseAddr`)
- ✅ Emisión de color en tiempo real al dashboard via WebSocket
- ✅ Panel de control web (Dashboard) en `localhost:3000`
- ✅ Control de automatización de estrobos (toggle on/off)
- ✅ Botones de flash y botones directos desde el dashboard
- ✅ Test standalone de Art-Net (`test-artnet.js`)

---

## 👨‍💻 Autor

**Julian Osorio** – [@devmaiter](https://github.com/devmaiter)  
Frontend Developer & AV Engineer – Bogotá, Colombia 🇨🇴
