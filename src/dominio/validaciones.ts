import type { Cliente, Producto, Venta, Tienda, Datos } from './modelos';
import { D, fechaValida } from './credito/motor';
export const normalizarCorreo = (s: string) => s.trim().toLowerCase();
export const correoValido = (s: string) => /^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(s);
export const horaValida = (s: string) => /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
export function exigir(ok: unknown, mensaje: string): asserts ok { if (!ok)
    throw new Error(mensaje); }
export const activo = (c: {
    activo?: boolean;
}) => c.activo !== false;
export const siguienteId = (l: {
    id: number;
}[]) => Math.max(-1, ...l.map(x => x.id)) + 1;
export function relojPeru(ahora = new Date()) {
    const partes = new Intl.DateTimeFormat('sv-SE', { timeZone: 'America/Lima', year: 'numeric', month: '2-digit', day: '2-digit', hour: '2-digit', minute: '2-digit', hourCycle: 'h23' }).formatToParts(ahora);
    const v = (t: string) => partes.find(p => p.type === t)!.value;
    return `${v('year')}-${v('month')}-${v('day')}T${v('hour')}:${v('minute')}`;
}
function texto(s: string | undefined, min: number, max: number, nombre: string) {
    exigir((s ?? '').trim().length >= min && (s ?? '').length <= max, `${nombre}: entre ${min} y ${max} caracteres.`);
}
function telefono(s: string | undefined) {
    exigir(/^[+\d]{0,20}$/.test(s ?? ''), 'El teléfono admite hasta 20 caracteres, solo dígitos y +.');
}
export function decimalEntrada(s: string, enteros: number, decimales: number) {
    return new RegExp(`^\\d{1,${enteros}}(\\.\\d{1,${decimales}})?$`).test(s);
}
export function validarTienda(t: Tienda, datos: Datos) {
    exigir(/^\d{11}$/.test(t.ruc), 'El RUC debe tener 11 dígitos.');
    exigir(!datos.tiendas.some(x => x.id !== t.id && x.ruc === t.ruc), 'El RUC ya está registrado.');
    exigir(t.razon.trim() && t.nombre.trim() && t.giro.trim() && t.direccion.trim(), 'Complete razón social, nombre, giro y dirección.');
    texto(t.razon, 1, 150, 'Razón social');
    texto(t.nombre, 1, 100, 'Nombre comercial');
    texto(t.giro, 1, 50, 'Giro');
    texto(t.direccion, 1, 200, 'Dirección');
    telefono(t.telefono);
    texto(t.correo, 5, 100, 'Correo');
    exigir(correoValido(t.correo), 'Ingrese un correo válido para el administrador.');
}
export function validarCliente(c: Cliente, otros: Cliente[]) {
    texto(c.nombre, 1, 120, 'Nombre del cliente');
    texto(c.direccion, 0, 200, 'Dirección');
    texto(c.correo, 0, 100, 'Correo');
    telefono(c.telefono);
    exigir(['DNI', 'RUC'].includes(c.tipoDoc), 'Seleccione DNI o RUC.');
    exigir(decimalEntrada(c.limite, 10, 2), 'El límite admite hasta 10 enteros y dos decimales.');
    exigir(decimalEntrada(c.valC, 3, 7) && decimalEntrada(c.valM, 3, 7), 'Las tasas admiten hasta siete decimales.');
    exigir(c.nombre.trim(), 'Ingrese el nombre del cliente.');
    exigir(new RegExp(`^\\d{${c.tipoDoc === 'DNI' ? 8 : 11}}$`).test(c.doc), 'El documento debe tener 8 dígitos para DNI o 11 para RUC.');
    exigir(!otros.some(x => x.id !== c.id && x.doc === c.doc), 'El documento ya está registrado en esta tienda.');
    exigir(!c.correo || correoValido(c.correo), 'Ingrese un correo válido.');
    exigir(horaValida(c.horaCorte ?? ''), 'Ingrese una hora de corte válida.');
    exigir(Number.isInteger(c.diaCorte) && Number.isInteger(c.diaPago) && c.diaCorte >= 1 && c.diaCorte <= 30 && c.diaPago > c.diaCorte && c.diaPago <= 30, 'El pago debe ser posterior al corte, entre los días 1 y 30.');
    exigir(Number.isInteger(c.plazo) && c.plazo >= 1 && c.plazo <= 12, 'El plazo debe estar entre 1 y 12 meses.');
    exigir(/^(PEN|USD)$/.test(c.moneda), 'Seleccione una moneda.');
    exigir(['Nominal', 'Efectiva'].includes(c.tipoC) && ['Nominal', 'Efectiva'].includes(c.tipoM), 'Seleccione tasas nominales o efectivas.');
    exigir(['Diaria', 'Mensual'].includes(c.capC) && ['Diaria', 'Mensual'].includes(c.capM), 'Seleccione capitalización diaria o mensual.');
    for (const s of [c.limite, c.valC, c.valM])
        exigir(/^\d+(\.\d+)?$/.test(s), 'Ingrese importes y tasas numéricos no negativos.');
    exigir(D(c.valC).lte(100) && D(c.valM).lte(100), 'Las tasas del formulario deben estar entre 0 y 100 %.');
}
export function validarProducto(p: Producto) {
    texto(p.nombre, 1, 120, 'Nombre del producto');
    texto(p.descripcion, 1, 255, 'Descripción');
    texto(p.marca, 0, 50, 'Marca');
    texto(p.proveedor, 0, 100, 'Proveedor');
    texto(p.unidad, 1, 20, 'Unidad');
    exigir(['Ambas', 'Cuotas', 'Fin de mes'].includes(p.modalidad), 'Seleccione una modalidad válida.');
    exigir(decimalEntrada(p.contado, 10, 2) && decimalEntrada(p.credito, 10, 2), 'Los precios admiten hasta 10 enteros y dos decimales.');
    exigir(p.nombre.trim() && p.unidad.trim() && p.descripcion?.trim(), 'Complete nombre, descripción y unidad.');
    exigir(/^data:image\/(png|jpeg);base64,/.test(p.imagen ?? ''), 'Adjunte una imagen JPG o PNG.');
    exigir(((p.imagen ?? '').split(',')[1]?.length ?? 0) * 3 / 4 - ((p.imagen ?? '').endsWith('==') ? 2 : (p.imagen ?? '').endsWith('=') ? 1 : 0) <= 2 * 1024 * 1024, 'La imagen supera 2 MB.');
    exigir(/^\d+(\.\d+)?$/.test(p.contado) && /^\d+(\.\d+)?$/.test(p.credito), 'Ingrese precios válidos.');
    exigir(D(p.contado).gt(0) && D(p.credito).gte(p.contado), 'El precio de crédito debe ser mayor o igual al precio contado, ambos positivos.');
}
export function validarVenta(v: Omit<Venta, 'id'>, c: Cliente, deuda: string) {
    exigir(activo(c), 'No se permiten ventas a clientes dados de baja.');
    exigir(fechaValida(v.fecha) && horaValida(v.hora ?? ''), 'Ingrese fecha y hora válidas.');
    exigir(`${v.fecha}T${v.hora}` <= relojPeru(), 'No se puede registrar una compra futura.');
    exigir(decimalEntrada(v.capital, 10, 2), 'El capital admite hasta 10 enteros y dos decimales.');
    exigir(D(v.capital).gt(0) && D(deuda).plus(v.capital).lte(c.limite), 'La venta excede la línea disponible o tiene un importe inválido.');
    exigir(v.modalidad === 'Cuotas' || v.modalidad === 'Fin de mes', 'Seleccione una modalidad válida.');
    exigir(v.modalidad !== 'Cuotas' || Number.isInteger(v.n) && v.n >= 1 && v.n <= c.plazo, 'El plazo excede el máximo del cliente.');
}
