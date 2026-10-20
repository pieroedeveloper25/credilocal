import type { Capitalizacion, TipoTasa } from './credito/motor';
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
export interface Compra {
    fecha: string;
    hora?: string;
    horaCorte?: string;
    detalle: string;
    capital: string;
}
export interface Producto {
    tiendaId?: number;
    activo?: boolean;
    imagen?: string;
    proveedor?: string;
    descripcion?: string;
    sku: string;
    nombre: string;
    unidad: string;
    marca: string;
    contado: string;
    credito: string;
    modalidad: 'Ambas' | 'Fin de mes' | 'Cuotas';
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
export type Rol = 'Superadministrador' | 'Comercio' | 'Cliente';
export interface Cuenta {
    id: number;
    rol: Rol;
    tiendaId?: number;
    clienteId?: number;
    correo: string;
    sal: string;
    hash: string;
}
export interface Tienda {
    id: number;
    ruc: string;
    razon: string;
    nombre: string;
    giro: string;
    direccion: string;
    telefono: string;
    correo: string;
    activa: boolean;
}
export interface Pago {
    clienteId: number;
    tiendaId?: number;
    periodo?: string;
    capital: string;
    constancia: string;
    fecha?: string;
    hora?: string;
    abono?: string;
    comp?: string;
    mora?: string;
    moneda?: string;
    detalles?: DetallePago[];
}
export interface Datos {
    finanzasVersion?: number;
    obligaciones?: Obligacion[];
    listados?: ListadoCorte[];
    tiendas: Tienda[];
    cuentas: Cuenta[];
    clientes: Cliente[];
    productos: Producto[];
    ventas: Venta[];
    pagos: Pago[];
    auditoria: {
        fecha: string;
        actor: string;
        accion: string;
    }[];
}
export interface Obligacion {
    id: string;
    tiendaId: number;
    clienteId: number;
    ventaId: number;
    modalidad: Venta['modalidad'];
    cuota: number;
    fechaCompra: string;
    hora: string;
    detalle: string;
    vencimiento: string;
    corteAsignado: string;
    capital: string;
    comp: string;
    tedComp?: string;
    temComp?: string;
    tedMora: string;
    moneda: string;
    pagada?: string;
    fechaPago?: string;
    horaPago?: string;
}
export interface DetallePago {
    obligacionId: string;
    capital: string;
    comp: string;
    mora: string;
}
export interface LineaDeuda extends Obligacion {
    mora: string;
    total: string;
    dias: number;
    diasMora: number;
}
export interface ListadoCorte {
    id: string;
    clienteId: number;
    tiendaId: number;
    periodo: string;
    corte: string;
    fechaPago: string;
    moneda: string;
    lineas: {
        obligacionId: string;
        fechaCompra: string;
        detalle: string;
        concepto: string;
        importe: string;
        vencimiento?: string;
        dias?: number;
        tasa?: string;
        baseTasa?: string;
    }[];
    capital: string;
    comp: string;
    mora: string;
    total: string;
}
export interface Sesion {
    rol: Rol;
    clienteId: number;
    tiendaId: number;
    correo: string;
}
