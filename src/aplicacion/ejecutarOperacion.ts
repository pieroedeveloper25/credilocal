import type { Cliente, Datos, Producto, Sesion, Tienda, Venta } from '../dominio/modelos';
import { exigir } from '../dominio/validaciones';
import type { CreadorDeCuentas } from './puertos';
import { guardarTienda } from './administracion/guardarTienda';
import { guardarCliente } from './administracion/guardarCliente';
import { guardarProducto } from './administracion/guardarProducto';
import { registrarCompra } from './credito/registrarVenta';
import { registrarCobranza } from './cobranza/registrarPago';
import { emitirCorte } from './cortes/emitirCorte';
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
