// Registro simple con hora, legible en consola y en el archivo de un servicio.

const time = (): string => new Date().toLocaleTimeString('es-CO', { hour12: false });

export const log = {
  info: (message: string): void => console.log(`${time()}  ${message}`),
  warn: (message: string): void => console.warn(`${time()}  AVISO  ${message}`),
  error: (message: string): void => console.error(`${time()}  ERROR  ${message}`),
};
