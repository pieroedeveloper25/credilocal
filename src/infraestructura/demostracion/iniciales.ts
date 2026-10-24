import { CLIENTES, PRODUCTOS } from './datos';
import { crearCuenta } from '../../contexts/identity-and-access/infraestructura/credenciales';
import type { Datos } from '../../shared/dominio/datos';
const VACIO: Datos = { tiendas: [], cuentas: [], clientes: [], productos: [], ventas: [], pagos: [], auditoria: [] };
export async function iniciales(): Promise<Datos> {
    const cuentas = await Promise.all([
        crearCuenta('sistema@credilocal.pe', 'credi2026', 'Superadministrador', 0),
        crearCuenta('admin@sutaller.pe', 'credi2026', 'Comercio', 1, 1),
        crearCuenta('contacto@transintegrales.pe', 'credi2026', 'Cliente', 2, 1, 1),
        crearCuenta('autopartes@demo.pe', 'credi2026', 'Cliente', 3, 1, 2),
    ]);
    return { ...structuredClone(VACIO), cuentas,
        tiendas: [{ id: 1, ruc: '20601234567', razon: 'Taller San Cristóbal E.I.R.L.', nombre: 'Taller San Cristóbal', giro: 'Taller automotriz', direccion: 'Sede Central', telefono: '', correo: 'admin@sutaller.pe', activa: true }],
        clientes: CLIENTES.map(c => ({ ...c, tiendaId: 1, activo: true, horaCorte: '23:59', correo: cuentas.find(a => a.clienteId === c.id)?.correo ?? '' })),
        productos: PRODUCTOS.map(p => ({ ...p, tiendaId: 1, activo: true, descripcion: p.nombre })),
        ventas: [{ id: 2026000, tiendaId: 1, clienteId: 1, fecha: '2026-09-15', hora: '12:00', horaCorte: '23:59', capital: '4500', modalidad: 'Cuotas', n: 3, detalle: 'Overhaul completo de motor diésel' }],
    };
}
