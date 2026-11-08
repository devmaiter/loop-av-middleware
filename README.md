# Loop

Integración AV para shows en vivo: une **Resolume Arena** (video), **Onyx** (luces) y **Reaper**
(audio), y los pone en un panel web que se maneja desde una tablet.

Se usó en un bar con shows en vivo y hoy lo usa **Multiaudio** en sus eventos.

## Qué resuelve

En un club, el video, las luces y el audio suelen estar en programas y PCs distintos, y cada
cambio necesita un técnico en cada consola. Loop los conecta:

- **Los estrobos siguen al video.** La opacidad de una capa de Resolume mueve, en tiempo real,
  el nivel de una cuelist de Onyx.
- **El panel muestra el color del video** que Resolume manda por Art-Net, y si está llegando señal.
- **Una tablet, todo el show:** escenas y flashes de luces, mute y selección de pistas de
  Reaper y presets de audio, con botones grandes y sin depender de internet.
- **Varias tablets a la vez** ven el mismo estado.

## Cómo funciona

```
Resolume ──OSC (opacidad)──┐                    ┌──UDP──> Onyx
         ──Art-Net (color)─┤                    ├──OSC──> Reaper
                           ├──>  Loop  ─────────┼──UDP──> PC de audio
Tablets <──Socket.IO──────>┘   (un .exe)        └──HTTP─> página del panel
```

| Carpeta | Qué hay |
|---|---|
| `src/show.ts` | Las reglas del show. No sabe de redes: habla con los equipos por interfaces (`Lights`, `Mixer`, `AudioPresets`) |
| `src/devices/` | Un archivo por equipo: cómo se le habla a Resolume, Onyx, Reaper y al PC de audio |
| `src/protocols/artnet.ts` | Lectura de paquetes Art-Net |
| `src/panel/server.ts` | Servidor del panel. Es la frontera con la red: revisa el PIN y cada dato que llega |
| `src/config.ts` | Carga y valida `loop.config.json` |
| `panel/` | La página de las tablets (HTML, CSS y JS sin compilar) |

### Decisiones

- **El panel no conoce comandos.** Manda "botón 3" y el servidor decide qué comando sale según
  la configuración. Así, alguien en el wifi del club no puede mandarle cualquier cosa a Onyx, y
  agregar un botón es editar el JSON, no el código.
- **Nada destructivo al arrancar.** Si el PC se reinicia en pleno show, Loop vuelve sin tocar lo
  que está en escena. Limpiar el programador es un botón que pide un segundo toque.
- **Falla rápido al arrancar y explica por qué:** puerto ocupado o configuración mal escrita.
  Durante el show, un error inesperado cierra el proceso para que el servicio lo reinicie limpio,
  en vez de seguir en un estado desconocido.
- **Sin frameworks en el panel.** Son menos de 200 líneas de JS; React y un paso de compilación no
  aportaban nada y hacían que la página dependiera de internet.

## Uso

Para instalar en un evento: [docs/INSTALACION.md](docs/INSTALACION.md).

Desarrollo (Node 22 o superior):

```bash
npm install
cp loop.config.example.json loop.config.json   # ajustar IPs
npm run dev        # corre desde el código
npm test           # pruebas
npm run lint       # revisión de tipos
npm run package    # crea release/loop-vX.Y.Z-win32-x64.zip con loop.exe
```

`npm run package` genera un ejecutable único de Node, sin instalar nada en el PC del evento. El
`.exe` no está firmado, así que la primera vez Windows SmartScreen puede pedir confirmación.

## Licencia

MIT
