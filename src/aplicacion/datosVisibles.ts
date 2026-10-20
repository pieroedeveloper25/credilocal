import type { Datos, Sesion } from '../dominio/modelos';
export const datosVisibles = (d: Datos, s: Sesion): Datos => {
    const propios = (x: {
        tiendaId?: number;
        clienteId?: number;
    }) => x.tiendaId === s.tiendaId && (s.rol !== 'Cliente' || x.clienteId === s.clienteId);
    if (s.rol === 'Superadministrador')
        return { finanzasVersion: d.finanzasVersion, tiendas: d.tiendas, cuentas: [], clientes: [], productos: [], ventas: [], pagos: [], auditoria: [], obligaciones: [], listados: [] };
    return { finanzasVersion: d.finanzasVersion, tiendas: d.tiendas.filter(t => t.id === s.tiendaId), cuentas: [],
        clientes: d.clientes.filter(c => c.tiendaId === s.tiendaId && (s.rol !== 'Cliente' || c.id === s.clienteId)),
        productos: s.rol === 'Cliente' ? [] : d.productos.filter(p => p.tiendaId === s.tiendaId), ventas: d.ventas.filter(propios), pagos: d.pagos.filter(propios),
        obligaciones: (d.obligaciones ?? []).filter(propios), listados: (d.listados ?? []).filter(propios), auditoria: [] };
};
