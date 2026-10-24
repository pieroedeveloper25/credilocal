import { registrarCobranza, registrarCompra } from './casosDeUso';
import { emitirCorte } from '../contexts/billing-and-collections/aplicacion/emitirCorte';
import type { Venta } from '../contexts/credit-origination/dominio/modelos';
import { guardarCliente } from '../contexts/customer-management/aplicacion/guardarCliente';
import type { Cliente } from '../contexts/customer-management/dominio/modelos';
import { guardarTienda } from '../contexts/identity-and-access/aplicacion/guardarTienda';
import type { Sesion, Tienda } from '../contexts/identity-and-access/dominio/modelos';
import { guardarProducto } from '../contexts/product-catalog/aplicacion/guardarProducto';
import type { Producto } from '../contexts/product-catalog/dominio/modelos';
import type { CreadorDeCuentas } from '../shared/aplicacion/puertos';
import type { Datos } from '../shared/dominio/datos';
import { exigir } from '../shared/dominio/validaciones';
export type Operacion = {
    accion: 'GUARDAR TIENDA';
    pedido: {
        registro: Tienda;
        clave?: string;
    };
} | {
    accion: 'GUARDAR CLIENTE';
    pedido: {
        registro: Cliente;
        clave?: string;
    };
} | {
    accion: 'GUARDAR PRODUCTO';
    pedido: {
        registro: Producto;
    };
} | {
    accion: 'REGISTRAR VENTA';
    pedido: Omit<Venta, 'id'>;
} | {
    accion: 'REGISTRAR PAGO';
    pedido: Parameters<typeof registrarCobranza>[2];
} | {
    accion: 'EMITIR CORTE';
    pedido: {
        clienteId: number;
        periodo: string;
    };
};
/** Selecciona el caso de uso y exige el perfil antes de ejecutar sus cambios. */
export async function ejecutarOperacion(datos: Datos, sesion: Sesion, operacion: Operacion, cuentas: CreadorDeCuentas) {
    if (operacion.accion === 'GUARDAR TIENDA') {
        exigir(sesion.rol === 'Superadministrador', 'Solo el administrador del sistema gestiona tiendas.');
        return guardarTienda(datos, operacion.pedido.registro, operacion.pedido.clave, cuentas);
    }
    // Una acción desconocida no debe adquirir permisos por entrar en este despachador.
    const accionesComercio = ['GUARDAR CLIENTE', 'GUARDAR PRODUCTO', 'REGISTRAR VENTA', 'REGISTRAR PAGO', 'EMITIR CORTE'];
    exigir(accionesComercio.includes(operacion.accion), 'Operación no permitida.');
    exigir(sesion.rol === 'Comercio', 'Esta operación requiere el perfil Comercio.');
    switch (operacion.accion) {
        case 'GUARDAR CLIENTE':
            return guardarCliente(datos, sesion, operacion.pedido.registro, operacion.pedido.clave, cuentas);
        case 'GUARDAR PRODUCTO':
            return guardarProducto(datos, sesion, operacion.pedido.registro);
        case 'REGISTRAR VENTA':
            return registrarCompra(datos, sesion.tiendaId, operacion.pedido);
        case 'REGISTRAR PAGO':
            return registrarCobranza(datos, sesion.tiendaId, operacion.pedido);
        case 'EMITIR CORTE':
            return emitirCorte(datos, sesion.tiendaId, operacion.pedido.clienteId, operacion.pedido.periodo);
    }
}
