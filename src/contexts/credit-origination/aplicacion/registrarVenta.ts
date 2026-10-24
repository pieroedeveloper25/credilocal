import { ventaCreditoRegistrada } from '../dominio/eventos';
import { saldoComprometidoDe } from '../../customer-management/dominio/lineaCredito';
import type { Publicar } from '../../../shared/aplicacion/busDeEventos';
import type { Venta } from '../dominio/modelos';
import { condicionesDe, crearObligaciones } from '../dominio/obligaciones';
import { validarVenta } from '../dominio/validaciones';
import type { Datos } from '../../../shared/dominio/datos';
import { D, r2 } from '../../../shared/dominio/decimal';
import { activo, decimalEntrada, exigir } from '../../../shared/dominio/validaciones';
export function registrarCompra(d: Datos, tiendaId: number, entrada: Omit<Venta, 'id'>, publicar: Publicar): Venta {
    const c = d.clientes.find(c => c.id === entrada.clienteId && c.tiendaId === tiendaId);
    exigir(c && activo(c), 'Seleccione un cliente activo de la tienda.');
    exigir(entrada.items?.length, 'Agregue productos a la compra.');
    const items = entrada.items.map(it => {
        const p = d.productos.find(p => p.tiendaId === tiendaId && p.sku === it.sku);
        exigir(p && activo(p) && (p.modalidad === 'Ambas' || p.modalidad === entrada.modalidad), 'Producto de baja, ajeno a la tienda o incompatible.');
        exigir(decimalEntrada(it.cantidad, 8, 2) && D(it.cantidad).gt(0), 'Ingrese cantidades positivas con hasta ocho enteros y dos decimales.');
        return { sku: p.sku, cantidad: it.cantidad, precio: p.credito, nombre: p.nombre };
    });
    const capital = r2(items.reduce((a, it) => a.plus(D(it.cantidad).mul(it.precio)), D(0))).toFixed(2);
    const v: Venta = { ...entrada, id: Math.max(2026000, ...d.ventas.map(v => v.id)) + 1, tiendaId, capital, items, detalle: items.map(it => `${it.cantidad} × ${it.nombre}`).join(' + '), condiciones: condicionesDe(c), horaCorte: c.horaCorte ?? '23:59' };
    validarVenta(v, c, saldoComprometidoDe(c));
    exigir(D(entrada.capital).eq(capital), 'El precio del catálogo cambió. Revise la compra antes de registrarla.');
    const obs = crearObligaciones(v, c);
    d.ventas.push(v);
    publicar(ventaCreditoRegistrada(v, obs), d);
    return v;
}
