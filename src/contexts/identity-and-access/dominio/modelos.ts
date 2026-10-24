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

export interface Sesion {
    rol: Rol;
    clienteId: number;
    tiendaId: number;
    correo: string;
}
