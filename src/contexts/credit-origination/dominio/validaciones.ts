import type { Venta } from './modelos';
import type { Cliente } from '../../customer-management/dominio/modelos';
import { D } from '../../../shared/dominio/decimal';
import { fechaValida, relojPeru } from '../../../shared/dominio/fechas';
import { activo, decimalEntrada, exigir, horaValida } from '../../../shared/dominio/validaciones';
export function validarVenta(v: Omit<Venta, 'id'>, c: Cliente, deuda: string) {
    exigir(activo(c), 'No se permiten ventas a clientes dados de baja.');
    exigir(fechaValida(v.fecha) && horaValida(v.hora ?? ''), 'Ingrese fecha y hora válidas.');
    exigir(`${v.fecha}T${v.hora}` <= relojPeru(), 'No se puede registrar una compra futura.');
    exigir(decimalEntrada(v.capital, 10, 2), 'El capital admite hasta 10 enteros y dos decimales.');
    exigir(D(v.capital).gt(0) && D(deuda).plus(v.capital).lte(c.limite), 'La venta excede la línea disponible o tiene un importe inválido.');
    exigir(v.modalidad === 'Cuotas' || v.modalidad === 'Fin de mes', 'Seleccione una modalidad válida.');
    exigir(v.modalidad !== 'Cuotas' || Number.isInteger(v.n) && v.n >= 1 && v.n <= c.plazo, 'El plazo excede el máximo del cliente.');
}
