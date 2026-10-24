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
