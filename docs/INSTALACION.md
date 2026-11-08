# Instalar Loop en un evento

Guía para el técnico. No hace falta instalar Node ni nada más.

## 1. Copiar

Descomprime `loop-v3.x.x-win32-x64.zip` en el PC que va a correr Loop (por ejemplo `C:\Loop`).
Quedan:

```
loop.exe            el programa
loop.config.json    lo que cambia en cada evento
panel\              la página que se abre en las tablets
INSTALACION.md      esta guía
```

## 2. Configurar `loop.config.json`

Ábrelo con el Bloc de notas. Solo hace falta escribir lo que cambia; lo que no esté
toma el valor por defecto.

| Sección | Campo | Qué es |
|---|---|---|
| `panel` | `port` | Puerto de la página del panel (por defecto 3000) |
| | `pin` | PIN para entrar desde las tablets. Vacío = sin PIN |
| `onyx` | `ip`, `port` | PC con Onyx y el puerto donde escucha comandos UDP |
| | `strobeCuelist` | Cuelist que sigue la opacidad del video (estrobos automáticos) |
| `reaper` | `ip`, `port` | PC con Reaper y su puerto OSC (ver paso 3) |
| | `tracks` | Pistas que aparecen en el panel: número en Reaper y nombre |
| `audio` | `ip`, `port`, `presets` | PC de audio que recibe `PRESET:<nombre>` por UDP. Sin presets, la sección no aparece |
| `resolume` | `oscPort` | Puerto donde Loop escucha el OSC de Resolume |
| | `artnetPort` | Puerto Art-Net (6454 es el estándar) |
| | `colorChannel` | Canal DMX donde Resolume manda el color R,G,B |
| `scenes` | `name`, `command` | Botones de escenas: nombre en el panel y comando para Onyx (`GQL 1` dispara la cuelist 1) |
| `flashes` | `name`, `cuelist` | Botones que suben una cuelist a 255 mientras se mantienen presionados |

Si algo está mal escrito, Loop no arranca y dice qué campo revisar.

## 3. Configurar los programas

- **Resolume Arena**
  - *Preferences > OSC*: activar *OSC Output* hacia la IP del PC de Loop, puerto `oscPort`. Loop
    usa los mensajes que terminan en `/opacity`.
  - Para el color: una salida DMX por Art-Net hacia el PC de Loop, con R, G y B a partir del
    canal `colorChannel`.
- **Onyx**: activar la recepción de comandos por UDP en el puerto de `onyx.port`.
- **Reaper**: *Preferences > Control/OSC/web > Add > OSC*, modo *Configure device IP+local port*,
  con *Local listen port* = `reaper.port`.

## 4. Arrancar

Doble clic en `loop.exe`. En la ventana aparecen las direcciones del panel, por ejemplo
`http://192.168.1.4:3000`. Ábrela en la tablet, conectada a la misma red.

La primera vez, Windows pregunta si permite el acceso a la red: aceptar en **redes privadas**.

En la ventana se pueden escribir dos comandos: `limpiar` (CLEAR en Onyx) y `salir`.

## 5. Que arranque solo con el PC (opcional)

Para que Loop arranque al iniciar sesión, crea un acceso directo a `loop.exe` en la carpeta que
abre `Win + R` → `shell:startup`. Para un PC dedicado que debe arrancar aunque nadie inicie
sesión, conviene instalarlo como servicio (por ejemplo con NSSM) con reinicio automático: si
Loop se cierra por un error, vuelve en un segundo sin tocar lo que está en escena.

## Problemas comunes

| Síntoma | Causa probable |
|---|---|
| "Un puerto ya está en uso" | Hay otro Loop abierto, u otro programa usa ese puerto |
| El panel dice *Resolume sin señal* | Resolume no está mandando OSC o Art-Net a este PC, o el firewall lo bloquea |
| Los botones no hacen nada en Onyx | IP o puerto de `onyx` incorrectos, o el listener UDP de Onyx está apagado |
| Reaper no responde | Puerto OSC distinto al de `reaper.port`, o la superficie OSC no está activa |
| La tablet no abre el panel | No está en la misma red, o Windows bloqueó a `loop.exe` en el firewall |
