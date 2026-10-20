import { describe, it, expect } from 'vitest';
import { CLIENTES, type Cliente, type Venta } from './data';
import { validarCliente, validarTienda, validarVenta, validarProducto, type Datos } from './gestion';
import { crearCuenta, comprobarClave } from './persistencia';
import { comprasDe } from './liquidacion';
import { D, convertirTasas, generarCronogramaFrances, parseFecha, resolverCiclo, fechaValida } from './motor';
const cliente: Cliente = { ...CLIENTES[0], horaCorte: '18:00', activo: true };
const datos: Datos = { tiendas: [{ id:1,ruc:'20601234567',nombre:'Tienda',razon:'Tienda SAC',giro:'Bodega',correo:'admin@demo.pe',direccion:'Lima',telefono:'',activa:true }], cuentas:[],clientes:[],productos:[],ventas:[],pagos:[],auditoria:[] };
describe('mantenimiento',()=>{
  it('valida las longitudes, teléfonos y precisión conservados en el informe',async()=>{
    expect(()=>validarCliente({...cliente,nombre:'A'.repeat(121)},[])).toThrow('120');
    expect(()=>validarCliente({...cliente,telefono:'abc'},[])).toThrow('teléfono');
    expect(()=>validarCliente({...cliente,limite:'5000.001'},[])).toThrow('dos decimales');
    expect(()=>validarCliente({...cliente,valC:'24.12345678'},[])).toThrow('siete decimales');
    expect(()=>validarCliente({...cliente,valC:'0',valM:'0',telefono:'+51987654321'},[])).not.toThrow();
    await expect(crearCuenta('test@demo.pe','A1'+'a'.repeat(63),'Comercio',1,1)).rejects.toThrow('64');
  });
  it('rechaza documentos duplicados dentro de una tienda y permite uno nuevo',()=>{
    expect(()=>validarCliente({...cliente,id:9},[cliente])).toThrow('documento');
    expect(()=>validarCliente({...cliente,id:9,doc:'20123456789'},[cliente])).not.toThrow();
  });
  it('rechaza RUC duplicado y correo inválido de tiendas',()=>{
    expect(()=>validarTienda({...datos.tiendas[0],id:2},datos)).toThrow('RUC');
    expect(()=>validarTienda({...datos.tiendas[0],correo:'incorrecto'},datos)).toThrow('correo');
  });
  it('bloquea ventas a clientes de baja y por encima del límite',()=>{
    const v = {clienteId:0,fecha:'2026-09-20',hora:'18:00',capital:'100',modalidad:'Fin de mes' as const,n:1,detalle:'Producto'};
    expect(()=>validarVenta(v,{...cliente,activo:false},'0')).toThrow('baja');
    expect(()=>validarVenta(v,cliente,'4990')).toThrow('línea');
    expect(()=>validarVenta(v,cliente,'4900')).not.toThrow();
  });
  it('exige imagen y precios coherentes del producto',()=>{
    const p={sku:'P1',nombre:'Pan',descripcion:'Pan integral',unidad:'UNIDAD',marca:'',contado:'1',credito:'2',modalidad:'Ambas' as const};
    expect(()=>validarProducto(p)).toThrow('imagen');
    expect(()=>validarProducto({...p,imagen:'data:image/png;base64,AAAA',credito:'0.5'})).toThrow('precio');
  });
  it('deriva la clave con sal y rechaza una contraseña incorrecta',async()=>{
    const a=await crearCuenta(' TEST@DEMO.PE ','Prueba2026','Comercio',1,1);
    const b=await crearCuenta('test@demo.pe','Prueba2026','Comercio',1,1);
    expect(a.correo).toBe('test@demo.pe'); expect(a.hash).not.toBe('Prueba2026'); expect(a.hash).not.toBe(b.hash);
    expect(await comprobarClave(a,'Prueba2026')).toBe(true); expect(await comprobarClave(a,'Otra2026')).toBe(false);
  });
});
describe('fecha y hora de corte',()=>{
  it('incluye la hora límite y asigna la posterior al siguiente ciclo',()=>{
    const f=parseFecha('2026-09-20');
    expect(resolverCiclo(f,20,26,'18:00','18:00').ciclo).toBe(0);
    expect(resolverCiclo(f,20,26,'18:01','18:00').vencimiento.toISOString().slice(0,10)).toBe('2026-10-26');
  });
  it('muestra la venta posterior al corte en octubre, sin perderla',()=>{
    const v: Venta={id:1,clienteId:0,fecha:'2026-09-20',hora:'18:01',capital:'100',modalidad:'Fin de mes',n:1,detalle:'Después del corte'};
    expect(comprasDe(cliente,[v],'2026-09').some(x=>x.detalle===v.detalle)).toBe(false);
    expect(comprasDe(cliente,[v],'2026-10').map(x=>x.detalle)).toEqual([v.detalle]);
  });
  it('aplica gracia solo si la compra no supera la hora del corte',()=>{
    const t=convertirTasas('Efectiva',30);
    const args={capital:D(4500),fechaCompra:parseFecha('2026-09-20'),diaCorte:20,diaPago:26,ted:t.ted,tem:t.tem,nMeses:3,horaCorte:'18:00'};
    expect(generarCronogramaFrances({...args,hora:'17:59'}).diasGracia).toBe(6);
    expect(generarCronogramaFrances({...args,hora:'18:01'}).diasGracia).toBe(0);
  });
  it('rechaza fechas imposibles y amortiza créditos sin interés',()=>{
    expect(fechaValida('2026-02-30')).toBe(false);
    const c=generarCronogramaFrances({capital:D(100),fechaCompra:parseFecha('2026-09-15'),diaCorte:20,diaPago:26,ted:D(0),tem:D(0),nMeses:3});
    expect(c.totalCuotas.toFixed(2)).toBe('100.00');expect(c.cierra).toBe(true);
  });
});
