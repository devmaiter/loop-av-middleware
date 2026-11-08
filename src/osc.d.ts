declare module 'osc' {
    import { EventEmitter } from 'events';

    export interface UDPPortOptions {
        localAddress?: string;
        localPort?: number;
        remoteAddress?: string;
        remotePort?: number;
        metadata?: boolean;
    }

    export class UDPPort extends EventEmitter {
        constructor(options: UDPPortOptions);
        open(): void;
        close(): void;
        send(msg: any, address?: string, port?: number): void;
    }
}
