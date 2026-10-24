export interface CreditoImagen {
    autor: string;
    licencia: string;
    urlFuente: string;
    urlLicencia: string;
    nota?: string;
}

export interface Producto {
    tiendaId?: number;
    activo?: boolean;
    imagen?: string;
    imagenCredito?: CreditoImagen;
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
