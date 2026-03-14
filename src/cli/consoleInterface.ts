// ============================================================
//  src/cli/consoleInterface.ts  –  Interfaz de comandos por consola
// ============================================================

import * as readline from 'readline';
import { EventEmitter } from 'events';

/** Eventos emitidos por ConsoleInterface */
interface ConsoleEvents {
  clear: () => void;
  exit: () => void;
  unknown: (cmd: string) => void;
}

declare interface ConsoleInterface {
  on<K extends keyof ConsoleEvents>(event: K, listener: ConsoleEvents[K]): this;
  emit<K extends keyof ConsoleEvents>(event: K, ...args: Parameters<ConsoleEvents[K]>): boolean;
}

class ConsoleInterface extends EventEmitter {
  private readonly rl: readline.Interface;

  constructor() {
    super();
    this.rl = readline.createInterface({
      input: process.stdin,
      output: process.stdout,
      prompt: '', // Sin prompt visible para no estorbar la barra de progreso
    });

    this.rl.on('line', (input) => this.handleLine(input));
    this.rl.on('close', () => this.emit('exit'));
  }

  private handleLine(input: string): void {
    const cmd = input.trim().toLowerCase();

    switch (cmd) {
      case 'clear':
        this.emit('clear');
        break;
      case 'exit':
      case 'quit':
        this.emit('exit');
        break;
      default:
        if (cmd.length > 0) {
          this.emit('unknown', cmd);
        }
    }
  }

  /** Cierra la interfaz readline. */
  close(): void {
    this.rl.close();
  }
}

export { ConsoleInterface };
