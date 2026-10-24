import type { EventoDeDominio } from '../../../shared/dominio/eventos';

/** BC 5 cobró capital; informa el capital que sigue comprometido para que BC 2 libere la línea. */
export interface CapitalAmortizado extends EventoDeDominio {
    readonly tipo: 'CapitalAmortizado';
    readonly clienteId: number;
    readonly tiendaId: number;
    readonly saldoPendiente: string;
}
export const capitalAmortizado = (clienteId: number, tiendaId: number, saldoPendiente: string): CapitalAmortizado =>
    ({ tipo: 'CapitalAmortizado', clienteId, tiendaId, saldoPendiente });
