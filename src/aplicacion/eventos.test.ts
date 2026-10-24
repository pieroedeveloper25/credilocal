import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { registrarCobranza, registrarCompra } from './casosDeUso';
import { deudaLinea } from '../contexts/billing-and-collections/dominio/obligaciones';
import type { Cliente } from '../contexts/customer-management/dominio/modelos';
import { saldoComprometidoDe } from '../contexts/customer-management/dominio/lineaCredito';
import { CLIENTES, PRODUCTOS } from '../infraestructura/demostracion/datos';
import { crearBusDeEventos } from '../shared/aplicacion/busDeEventos';
import type { Datos } from '../shared/dominio/datos';

const cliente = (): Cliente => ({ ...CLIENTES[0], id: 50, tiendaId: 1, activo: true, horaCorte: '18:00' });
const datos = (): Datos => ({ finanzasVersion: 1, tiendas: [], cuentas: [], clientes: [cliente()], productos: PRODUCTOS.map(p => ({ ...p, tiendaId: 1, activo: true })), ventas: [], pagos: [], auditoria: [], obligaciones: [], listados: [] });
const comprar = (d: Datos) => registrarCompra(d, 1, { clienteId: 50, fecha: '2026-09-10', hora: '12:00', capital: '1200', modalidad: 'Fin de mes', n: 1, detalle: '', items: [{ sku: 'KIT-001', cantidad: '1' }] });

describe('eventos entre contextos', () => {
  beforeEach(() => { vi.useFakeTimers(); vi.setSystemTime(new Date('2027-01-01T17:00:00Z')); });
  afterEach(() => vi.useRealTimers());

  it('VentaCreditoRegistrada crea las obligaciones en BC 5 y compromete la línea en BC 2', () => {
    const d = datos();
    comprar(d);
    expect(d.obligaciones).toHaveLength(1);
    expect(saldoComprometidoDe(d.clientes[0])).toBe('1200.00');
    expect(saldoComprometidoDe(d.clientes[0])).toBe(deudaLinea(d, d.clientes[0]).toFixed(2));
  });

  it('CapitalAmortizado libera la línea cuando el pago cancela el capital', () => {
    const d = datos();
    comprar(d);
    registrarCobranza(d, 1, { clienteId: 50, periodo: '2026-09', fecha: '2026-09-20', hora: '17:59', abono: '1212.86' });
    expect(saldoComprometidoDe(d.clientes[0])).toBe('0.00');
  });

  it('una venta rechazada no compromete la línea ni crea obligaciones', () => {
    const d = datos();
    expect(() => registrarCompra(d, 1, { clienteId: 50, fecha: '2026-09-10', hora: '12:00', capital: '99999', modalidad: 'Fin de mes', n: 1, detalle: '', items: [{ sku: 'KIT-001', cantidad: '1' }] })).toThrow();
    expect(d.obligaciones).toHaveLength(0);
    expect(saldoComprometidoDe(d.clientes[0])).toBe('0');
  });
});

describe('bus de eventos', () => {
  it('ejecuta los suscriptores en orden antes de retornar y omite tipos sin suscriptor', () => {
    const bus = crearBusDeEventos();
    const llamadas: string[] = [];
    bus.suscribir<{ tipo: 'A' }>('A', () => llamadas.push('primero'));
    bus.suscribir<{ tipo: 'A' }>('A', () => llamadas.push('segundo'));
    bus.publicar({ tipo: 'A' }, datos());
    bus.publicar({ tipo: 'B' }, datos());
    expect(llamadas).toEqual(['primero', 'segundo']);
  });
});
