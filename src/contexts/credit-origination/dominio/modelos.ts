import type { Cliente } from '../../customer-management/dominio/modelos';
export interface Compra {
    fecha: string;
    hora?: string;
    horaCorte?: string;
    detalle: string;
    capital: string;
}

export type Condiciones = Pick<Cliente, 'moneda' | 'diaCorte' | 'diaPago' | 'tipoC' | 'valC' | 'capC' | 'tipoM' | 'valM' | 'capM'> & {
    horaCorte: string;
};

export interface ItemVenta {
    sku: string;
    cantidad: string;
    precio?: string;
}

export interface Venta {
    condiciones?: Condiciones;
    items?: ItemVenta[];
    plan?: {
        diasGracia: number;
        capitalAjustado: string;
        cuotaFija: string;
        totalIntereses: string;
        totalCuotas: string;
    };
    tiendaId?: number;
    hora?: string;
    horaCorte?: string;
    id: number;
    clienteId: number;
    fecha: string;
    capital: string;
    modalidad: 'Fin de mes' | 'Cuotas';
    n: number;
    detalle: string;
}
