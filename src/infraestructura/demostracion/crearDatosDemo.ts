import { readFileSync } from 'node:fs';
import { resolve, basename } from 'node:path';
import { iniciales } from './iniciales';
import { normalizarFinanzas } from '../migracion/normalizarFinanzas';
import { crearCuenta } from '../../contexts/identity-and-access/infraestructura/credenciales';
import { validarTienda } from '../../contexts/identity-and-access/dominio/validaciones';
import { validarCliente } from '../../contexts/customer-management/dominio/validaciones';
import { validarProducto } from '../../contexts/product-catalog/dominio/validaciones';
import type { Producto, CreditoImagen } from '../../contexts/product-catalog/dominio/modelos';
import type { Cliente } from '../../contexts/customer-management/dominio/modelos';
import { registrarCompra, registrarCobranza } from '../../aplicacion/casosDeUso';
import { liquidarObligaciones } from '../../contexts/billing-and-collections/dominio/obligaciones';
import { emitirCortesPendientes } from '../../contexts/billing-and-collections/aplicacion/emitirCorte';
import { D, r2 } from '../../shared/dominio/decimal';
import { fechaValida, parseFecha, isoFecha, establecerDia, relojPeru } from '../../shared/dominio/fechas';
import { exigir } from '../../shared/dominio/validaciones';

interface EntradaCatalogo extends Omit<Producto, 'imagen' | 'proveedor' | 'activo'> {
    archivo: string;
    fuente: { tienda: string; url: string; precioRegular: string };
}

/** Carga separada: no cambia los datos iniciales del sistema ni depende de la red. */
export async function crearDatosDemo(fecha = relojPeru().slice(0, 10), recursos = resolve('recursos/demo')) {
    exigir(fechaValida(fecha) && fecha >= '2026-10-01' && fecha <= relojPeru().slice(0, 10),
        'La fecha de referencia debe ser válida, desde 2026-10-01 y no futura.');
    const catalogo = JSON.parse(readFileSync(resolve(recursos, 'catalogo.json'), 'utf8')) as { productos: EntradaCatalogo[] };
    const imagenes = JSON.parse(readFileSync(resolve(recursos, 'imagenes.json'), 'utf8')) as Record<string, CreditoImagen>;
    exigir(catalogo.productos.length === 8, 'La demostración necesita ocho productos.');

    const datos = await iniciales();
    normalizarFinanzas(datos); // Conserva los casos financieros históricos del parcial.
    const tienda = { id: 2, ruc: '20000000001', razon: 'Bodega La Esquina Demo SAC', nombre: 'Bodega La Esquina (demo)',
        giro: 'Bodega', direccion: 'Dirección ficticia de demostración, Lima', telefono: '', correo: 'bodega@credilocal.test', activa: true };
    validarTienda(tienda, datos);
    datos.tiendas.push(tienda);
    datos.cuentas.push(await crearCuenta('cliente.taller@credilocal.test', 'credi2026', 'Cliente', 4, 1, 0));
    datos.clientes[0].correo = 'cliente.taller@credilocal.test';
    datos.cuentas.push(await crearCuenta(tienda.correo, 'credi2026', 'Comercio', 5, 2));

    const nombres = ['Ana Gómez (demo)', 'Pedro Ramos (demo)', 'Rosa Díaz (demo)'];
    for (let i = 0; i < 3; i++) {
        const id = i + 3;
        const c: Cliente = { id, tiendaId: 2, activo: true, nombre: nombres[i], tipoDoc: 'DNI', doc: `0000000${i + 1}`,
            direccion: 'Dirección ficticia, Lima', telefono: '', correo: ['ana', 'pedro', 'rosa'][i] + '@credilocal.test',
            limite: ['1500.00', '600.00', '80.00'][i], deuda: '0', saldoComprometido: '0.00', moneda: 'PEN',
            diaCorte: i === 1 ? 10 : 20, diaPago: i === 1 ? 15 : 26, horaCorte: '18:00', plazo: 3,
            tipoC: 'Nominal', valC: '24', capC: 'Diaria', tipoM: 'Nominal', valM: '15', capM: 'Diaria' };
        validarCliente(c, datos.clientes.filter(x => x.tiendaId === 2));
        datos.clientes.push(c);
        datos.cuentas.push(await crearCuenta(c.correo!, 'credi2026', 'Cliente', id + 3, 2, id));
    }

    datos.productos = catalogo.productos.map(entrada => {
        exigir(basename(entrada.archivo) === entrada.archivo, 'Nombre de imagen inválido.');
        const bytes = readFileSync(resolve(recursos, 'productos', entrada.archivo));
        const { archivo, fuente, ...producto } = entrada;
        const credito = imagenes[archivo];
        exigir(credito?.autor && credito.urlFuente && credito.urlLicencia, 'Falta la atribución de una imagen.');
        const p: Producto = { ...producto, proveedor: 'Referencia: ' + fuente.tienda, activo: true,
            imagen: (archivo.endsWith('.png') ? 'data:image/png;base64,' : 'data:image/jpeg;base64,') + bytes.toString('base64'),
            imagenCredito: { ...credito, urlLicencia: credito.urlLicencia.replace(/^http:/, 'https:') } };
        validarProducto(p);
        return p;
    });

    const f = parseFecha(fecha), anio = f.getUTCFullYear(), mes = f.getUTCMonth() + 1;
    const anterior = (dia: number) => isoFecha(establecerDia(anio, mes - 1, dia));
    const venta = (clienteId: number, fechaCompra: string, items: { sku: string; cantidad: string }[]) => {
        const capital = r2(items.reduce((s, it) => s.plus(D(datos.productos.find(p => p.tiendaId === 2 && p.sku === it.sku)!.credito).mul(it.cantidad)), D(0))).toFixed(2);
        return registrarCompra(datos, 2, { clienteId, fecha: fechaCompra, hora: '00:00', capital, modalidad: 'Fin de mes', n: 1, detalle: '', items });
    };
    venta(3, anterior(3), [{ sku: 'DEMO-ARROZ', cantidad: '6' }, { sku: 'DEMO-ACEITE', cantidad: '2' }]);
    const periodoAnterior = anterior(1).slice(0, 7);
    const liquidacion = liquidarObligaciones(datos, datos.clientes.find(c => c.id === 3)!, periodoAnterior, anterior(26));
    const pago = registrarCobranza(datos, 2, { clienteId: 3, periodo: periodoAnterior, fecha: anterior(26), hora: '12:00', abono: liquidacion.total.toFixed(2) });
    venta(4, anterior(5), [{ sku: 'DEMO-ACEITE', cantidad: '3' }, { sku: 'DEMO-AZUCAR', cantidad: '2' }]);
    venta(5, isoFecha(establecerDia(anio, mes, Math.min(19, f.getUTCDate()))), [{ sku: 'DEMO-ARROZ', cantidad: '14' }]);
    const ahora = fecha === relojPeru().slice(0, 10) ? relojPeru() : fecha + 'T23:59';
    emitirCortesPendientes(datos, ahora);
    datos.auditoria.push({ fecha: ahora, actor: 'Carga de demostración', accion: 'CREAR DEMO DOS TIENDAS' });

    return { datos, resumen: {
        fechaReferencia: fecha,
        tiendas: 2, clientes: 6, productos: 8, cuentas: 9,
        nota: 'Tiendas, personas, precios a crédito y operaciones ficticios; productos reales y contado referencial. Imágenes referenciales con atribución.',
        casos: [
            { nombre: 'Fin de mes histórico', clienteId: 0, tiendaId: 1, periodo: '2026-09', fechaPagoEjemplo: '2026-09-30', abonoEjemplo: '1214.88' },
            { nombre: 'Cuotas históricas con gracia', clienteId: 1, tiendaId: 1, capital: '4500.00', capitalAjustado: '4536.22', cuota: '1579.41', nota: 'El cliente también tiene compras anteriores.' },
            { nombre: 'Pago dentro del plazo', clienteId: 3, tiendaId: 2, periodo: periodoAnterior, fecha: pago.fecha, abono: pago.abono, mora: pago.mora },
            { nombre: 'Deuda vencida con mora', clienteId: 4, tiendaId: 2, periodo: periodoAnterior },
            { nombre: 'Línea casi agotada', clienteId: 5, tiendaId: 2, capitalPendiente: '72.80', limite: '80.00', disponible: '7.20', prueba: 'Dos bolsas de arroz a crédito exceden el disponible.' },
        ],
    } };
}
