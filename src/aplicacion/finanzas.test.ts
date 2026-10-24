import { describe, it, expect, beforeEach, afterEach, vi } from 'vitest';
import { registrarCobranza, registrarCompra } from './casosDeUso';
import { emitirCorte, emitirCortesPendientes } from '../contexts/billing-and-collections/aplicacion/emitirCorte';
import { deudaLinea, liquidarObligaciones } from '../contexts/billing-and-collections/dominio/obligaciones';
import { crearObligaciones } from '../contexts/credit-origination/dominio/obligaciones';
import type { Cliente } from '../contexts/customer-management/dominio/modelos';
import { CLIENTES, PRODUCTOS } from '../infraestructura/demostracion/datos';
import { normalizarFinanzas } from '../infraestructura/migracion/normalizarFinanzas';
import type { Datos } from '../shared/dominio/datos';
const cliente = (): Cliente => ({...CLIENTES[0],id:50,tiendaId:1,activo:true,horaCorte:'18:00'});
function datos(c=cliente()):Datos {return {finanzasVersion:1,tiendas:[],cuentas:[],clientes:[c],productos:PRODUCTOS.map(p=>({...p,tiendaId:1,activo:true})),ventas:[],pagos:[],auditoria:[],obligaciones:[],listados:[]};}
function comprar(d:Datos,modalidad:'Fin de mes'|'Cuotas'='Fin de mes',fecha='2026-09-10') {
  return registrarCompra(d,1,{clienteId:50,fecha,hora:'12:00',capital:modalidad==='Cuotas'?'4500':'1200',modalidad,n:3,detalle:'',items:[{sku:modalidad==='Cuotas'?'SRV-014':'KIT-001',cantidad:'1'}]});
}
describe('integración de los cinco algoritmos',()=>{
 it('actualiza cortes afectados por compras retroactivas sin duplicarlos',()=>{
  const d=datos();comprar(d);emitirCortesPendientes(d,'2026-10-08T12:00');
  comprar(d);expect(emitirCortesPendientes(d,'2026-10-08T12:00')).toBe(1);
  expect(d.listados!.find(l=>l.periodo==='2026-09')!.total).toBe('2425.72');
  expect(d.listados).toHaveLength(1);expect(emitirCortesPendientes(d,'2026-10-08T12:00')).toBe(0);
 });
 it('reconstruye el corte con la hora pactada y la moneda histórica',()=>{
  const d=datos();comprar(d);const c=d.clientes[0];
  const antes=emitirCorte(d,1,50,'2026-09','2026-09-20T18:00').total;
  registrarCobranza(d,1,{clienteId:50,periodo:'2026-09',fecha:'2026-09-20',hora:'18:01',abono:'1212.86'});
  c.moneda='USD';const despues=emitirCorte(d,1,50,'2026-09','2026-10-08T12:00');
  expect(despues.total).toBe(antes);expect(despues.moneda).toBe('PEN');
  expect(d.obligaciones![0].horaPago).toBe('18:01');
 });
 it('excluye del corte un pago anterior y rechaza horas futuras o anteriores a la compra',()=>{
  const d=datos();comprar(d);
  expect(()=>registrarCobranza(d,1,{clienteId:50,periodo:'2026-09',fecha:'2026-09-10',hora:'11:59',abono:'1212.86'})).toThrow('preceder');
  expect(()=>registrarCobranza(d,1,{clienteId:50,periodo:'2026-09',fecha:'2027-01-01',hora:'12:01',abono:'1212.86'})).toThrow('hora');
  registrarCobranza(d,1,{clienteId:50,periodo:'2026-09',fecha:'2026-09-20',hora:'17:59',abono:'1212.86'});
  expect(emitirCorte(d,1,50,'2026-09','2026-10-08T12:00').total).toBe('0.00');
 });
 it('rechaza el cronograma de centavos antes de guardar venta u obligaciones',()=>{
  const d=datos();d.clientes[0].valC='0';d.clientes[0].plazo=12;
  d.productos[0].credito='6';d.productos[0].contado='6';
  expect(()=>registrarCompra(d,1,{clienteId:50,fecha:'2026-09-15',hora:'12:00',capital:'0.06',modalidad:'Cuotas',n:12,detalle:'',items:[{sku:'KIT-001',cantidad:'0.01'}]})).toThrow('centavos');
  expect(d.ventas).toHaveLength(0);expect(d.obligaciones).toHaveLength(0);
 });
 beforeEach(()=>{vi.useFakeTimers();vi.setSystemTime(new Date('2027-01-01T17:00:00Z'));});
 afterEach(()=>vi.useRealTimers());
 it('bloquea registros futuros, permite proyecciones y conserva el listado enriquecido al migrar',()=>{
  vi.setSystemTime(new Date('2026-10-08T17:00:00Z'));
  const d=datos();comprar(d);
  expect(()=>comprar(d,'Fin de mes','2030-09-10')).toThrow('futura');
  const proyeccion=liquidarObligaciones(d,d.clientes[0],'2026-09','2030-09-26');
  expect(proyeccion.total.gt(0)).toBe(true);
  expect(()=>registrarCobranza(d,1,{clienteId:50,periodo:'2026-09',fecha:'2030-09-26',abono:proyeccion.total.toFixed(2)})).toThrow('futura');
  expect(()=>registrarCompra(d,1,{clienteId:50,fecha:'2026-10-08',hora:'12:01',capital:'1200',modalidad:'Fin de mes',n:1,detalle:'',items:[{sku:'KIT-001',cantidad:'1'}]})).toThrow('futura');
  expect(()=>registrarCompra(d,1,{clienteId:50,fecha:'2026-09-10',hora:'12:00',capital:'1200',modalidad:'Fin de mes',n:1,detalle:'',items:[{sku:'KIT-001',cantidad:'1.001'}]})).toThrow('dos decimales');
  const listado=emitirCorte(d,1,50,'2026-09','2026-09-20T18:00');
  expect(listado.lineas[1]).toMatchObject({dias:16,tasa:d.obligaciones![0].tedComp,baseTasa:'TED',vencimiento:'2026-09-26'});
  const total=listado.total;delete listado.lineas[1].dias;
  normalizarFinanzas(d);expect(listado.total).toBe(total);expect(listado.lineas[1].dias).toBe(16);
  expect(d.productos.every(p=>p.imagen?.startsWith('data:image/png;base64,'))).toBe(true);
  expect(d.pagos).toHaveLength(0);expect(d.ventas).toHaveLength(1);
 });
 it('persiste las tasas pactadas y reproduce la venta de 1200 con mora',()=>{
  const d=datos();const v=comprar(d);d.clientes[0].valC='90';d.clientes[0].valM='99';
  const l=liquidarObligaciones(d,d.clientes[0],'2026-09','2026-09-30');
  expect([l.capital,l.comp,l.mora,l.total].map(x=>x.toFixed(2))).toEqual(['1200.00','12.86','2.02','1214.88']);
  expect(v.condiciones!.valC).toBe('24');
  expect(()=>registrarCobranza(d,1,{clienteId:50,periodo:'2026-09',fecha:'2026-09-30',abono:'1214.87'})).toThrow('toda la deuda');
  expect(d.pagos).toHaveLength(0);expect(d.obligaciones![0].pagada).toBeUndefined();
  const p=registrarCobranza(d,1,{clienteId:50,periodo:'2026-09',fecha:'2026-09-30',abono:'1214.88'});
  expect([p.mora,p.comp,p.capital]).toEqual(['2.02','12.86','1200.00']);expect(p.detalles).toHaveLength(1);
  expect(deudaLinea(d,d.clientes[0]).toString()).toBe('0');
  expect(()=>registrarCobranza(d,1,{clienteId:50,periodo:'2026-09',fecha:'2026-09-30',abono:'1214.88'})).toThrow('No existen');
 });
 it('cobra las tres cuotas con las cifras del informe y libera toda la línea al terminar',()=>{
  const c=cliente();c.tipoC='Efectiva';c.valC='30';const d=datos(c);const v=comprar(d,'Cuotas','2026-09-15');
  expect(v.plan).toEqual({diasGracia:11,capitalAjustado:'4536.22',cuotaFija:'1579.41',totalIntereses:'238.23',totalCuotas:'4738.23'});
  expect(d.obligaciones!.map(o=>[o.vencimiento,o.capital,o.comp])).toEqual([['2026-10-26','1479.14','100.27'],['2026-11-26','1511.83','67.58'],['2026-12-26','1545.25','34.16']]);
  expect(deudaLinea(d,c).toFixed(2)).toBe('4500.00');
  for(const mes of ['10','11','12'])registrarCobranza(d,1,{clienteId:50,periodo:`2026-${mes}`,fecha:`2026-${mes}-26`,abono:'1579.41'});
  expect(d.pagos).toHaveLength(3);expect(d.obligaciones!.every(o=>!!o.pagada)).toBe(true);
  expect(deudaLinea(d,c).toFixed(2)).toBe('0.00');
 });
 it('incluye cuotas vencidas anteriores y recalcula la mora sobre cada cuota',()=>{
  const c=cliente();c.tipoC='Efectiva';c.valC='30';const d=datos(c);comprar(d,'Cuotas','2026-09-15');
  const l=liquidarObligaciones(d,c,'2026-11','2026-11-26');expect(l.lineas).toHaveLength(2);
  expect(l.lineas[0].diasMora).toBe(31);expect(l.lineas[1].mora).toBe('0.00');
  expect(()=>registrarCobranza(d,1,{clienteId:50,periodo:'2026-11',fecha:'2026-11-26',abono:'1579.41'})).toThrow();
  registrarCobranza(d,1,{clienteId:50,periodo:'2026-11',fecha:'2026-11-26',abono:l.total.toFixed(2)});
  expect(d.obligaciones!.filter(o=>o.pagada)).toHaveLength(2);
 });
 it('emite y recupera cortes automáticamente sin duplicar líneas, incluyendo clientes de baja',()=>{
  const d=datos();comprar(d);d.clientes[0].activo=false;
  expect(emitirCortesPendientes(d,'2026-09-20T17:59')).toBe(0);
  expect(emitirCortesPendientes(d,'2026-09-20T18:00')).toBe(1);
  expect(d.listados![0].total).toBe('1212.86');expect(d.listados![0].mora).toBe('0.00');
  expect(emitirCortesPendientes(d,'2026-09-21T18:00')).toBe(0);
  const l=emitirCorte(d,1,50,'2026-09','2026-09-21T18:00');expect(l.lineas).toHaveLength(2);expect(d.listados).toHaveLength(1);
  expect(emitirCortesPendientes(d,'2026-11-25T12:00')).toBe(2);
  expect(d.listados![1].lineas.some(l=>l.concepto==='Interés por mora')).toBe(true);
 });
 it('asigna después de la hora del corte al siguiente período y no anticipa el corte',()=>{
  const d=datos();const v=registrarCompra(d,1,{clienteId:50,fecha:'2026-09-20',hora:'18:01',capital:'1200',modalidad:'Fin de mes',n:1,detalle:'',items:[{sku:'KIT-001',cantidad:'1'}]});
  expect(d.obligaciones![0].vencimiento).toBe('2026-10-26');
  expect(()=>emitirCorte(d,1,50,'2026-10','2026-10-20T17:59')).toThrow('todavía');
  const o=crearObligaciones({...v,id:3,modalidad:'Cuotas',n:3},d.clientes[0]);expect(o[0].vencimiento).toBe('2026-10-26');
 });
 it('rechaza precios manipulados, productos ajenos, cantidades inválidas y límites excedidos',()=>{
  const d=datos();const args={clienteId:50,fecha:'2026-09-10',hora:'12:00',capital:'1',modalidad:'Fin de mes' as const,n:1,detalle:'',items:[{sku:'KIT-001',cantidad:'1'}]};
  expect(()=>registrarCompra(d,1,args)).toThrow('catálogo');
  expect(()=>registrarCompra(d,2,args)).toThrow('cliente activo');
  expect(()=>registrarCompra(d,1,{...args,items:[{sku:'SRV-014',cantidad:'1'}]})).toThrow('incompatible');
  expect(()=>registrarCompra(d,1,{...args,items:[{sku:'KIT-001',cantidad:'0'}]})).toThrow('positivas');
  d.clientes[0].limite='1000';expect(()=>comprar(d)).toThrow('línea');expect(d.ventas).toHaveLength(0);
 });
 it('conserva pagos anteriores y no vuelve a insertar la demostración al migrar',()=>{
  const c={...CLIENTES[0],tiendaId:1};const d=datos(c);delete d.finanzasVersion;
  d.pagos.push({clienteId:0,capital:'1200',periodo:'2026-09',constancia:'ANTERIOR'});
  normalizarFinanzas(d);normalizarFinanzas(d);expect(d.ventas).toHaveLength(1);expect(d.obligaciones).toHaveLength(1);expect(d.obligaciones![0].pagada).toBe('ANTERIOR');
  const restored=normalizarFinanzas(JSON.parse(JSON.stringify(d)));expect(deudaLinea(restored,c).toString()).toBe('0');
 });
 it('rechaza fechas anteriores a la compra, más de dos decimales y pagos desde otra tienda',()=>{
  const d=datos();comprar(d);
  expect(()=>registrarCobranza(d,1,{clienteId:50,periodo:'2026-09',fecha:'2026-09-01',abono:'1212.86'})).toThrow('anterior');
  expect(()=>registrarCobranza(d,1,{clienteId:50,periodo:'2026-09',fecha:'2026-09-26',abono:'1212.860'})).toThrow('dos decimales');
  expect(()=>registrarCobranza(d,2,{clienteId:50,periodo:'2026-09',fecha:'2026-09-26',abono:'1212.86'})).toThrow('ajeno');
 });
 it('las fechas y tasas guardadas no cambian al editar las condiciones del cliente',()=>{
  const d=datos();comprar(d);const c=d.clientes[0];c.diaCorte=10;c.diaPago=15;c.valC='80';
  const l=liquidarObligaciones(d,c,'2026-09','2026-09-15');
  expect(l.vencimiento.toISOString().slice(0,10)).toBe('2026-09-26');expect(l.comp.toFixed(2)).toBe('12.86');
  expect(()=>emitirCorte(d,1,50,'2026-09','2026-09-10T18:00')).toThrow('todavía');
  expect(emitirCorte(d,1,50,'2026-09','2026-09-20T18:00').corte).toBe('2026-09-20T18:00');
 });
 it('la serialización conserva cuotas y pagos, y los listados muestran las deudas al corte',()=>{
  const d=datos();comprar(d);emitirCortesPendientes(d,'2026-09-20T18:00');
  registrarCobranza(d,1,{clienteId:50,periodo:'2026-09',fecha:'2026-09-30',abono:'1214.88'});
  const restored=normalizarFinanzas(JSON.parse(JSON.stringify(d)));
  expect(restored.pagos[0].detalles![0].mora).toBe('2.02');
  expect(emitirCorte(restored,1,50,'2026-09','2026-10-01T12:00').total).toBe('1212.86');
  expect(liquidarObligaciones(restored,restored.clientes[0],'2026-09','2026-09-30').total.toString()).toBe('0');
 });
});
