export interface Cliente {
    tiendaId?: number;
    activo?: boolean;
    direccion?: string;
    telefono?: string;
    correo?: string;
    horaCorte?: string;
    id: number;
    nombre: string;
    tipoDoc: 'DNI' | 'RUC';
    doc: string;
    limite: string;
    deuda: string;
    /** Capital comprometido en la línea. Solo lo modifican los eventos de BC 4 y BC 5. */
    saldoComprometido?: string;
    diaCorte: number;
    diaPago: number;
    plazo: number;
    moneda: 'PEN' | 'USD';
    tipoC: TipoTasa;
    valC: string;
    capC: Capitalizacion;
    tipoM: TipoTasa;
    valM: string;
    capM: Capitalizacion;
}

/* ---------- Algoritmo 1: conversión de tasas ---------- */
export type TipoTasa = 'Nominal' | 'Efectiva';

export type Capitalizacion = 'Diaria' | 'Mensual';
