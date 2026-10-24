import { test } from 'node:test';
import assert from 'node:assert/strict';
import { mkdtempSync, existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { DatabaseSync } from 'node:sqlite';
import { spawnSync } from 'node:child_process';
import { crearBaseDemo } from '../servidor-dist/demo.mjs';
import { crearAplicacion } from '../servidor-dist/main.mjs';

function destino(){return resolve(mkdtempSync(resolve('pruebas','base-prueba-demo-')),'demo.sqlite');}
function leer(ruta){const db=new DatabaseSync(ruta,{readOnly:true});try{return Object.fromEntries(['tiendas','cuentas','clientes','productos','ventas','pagos','obligaciones','listados'].map(t=>[t,db.prepare(`SELECT contenido FROM ${t} ORDER BY posicion`).all().map(x=>JSON.parse(x.contenido))]));}finally{db.close();}}

test('demo:iniciar rechaza una base normal sin abrir el servicio ni cambiarla',()=>{
 const ruta=destino(),db=new DatabaseSync(ruta);db.exec('CREATE TABLE metadatos(clave TEXT PRIMARY KEY,valor TEXT NOT NULL)');db.close();
 const antes=readFileSync(ruta),resultado=spawnSync(process.execPath,['scripts/iniciar-demo.mjs',ruta],{encoding:'utf8',timeout:10000});
 assert.equal(resultado.status,1);assert.match(resultado.stderr,/no es una base de demostración/);assert.deepEqual(readFileSync(ruta),antes);
});

test('la carga crea dos tiendas, seis clientes, ocho imágenes locales y los casos históricos',async()=>{
 const ruta=destino(),resumen=await crearBaseDemo(ruta,'2026-10-24'),d=leer(ruta);
 assert.equal(d.tiendas.length,2);assert.equal(d.clientes.length,6);assert.equal(d.cuentas.length,9);assert.equal(d.productos.length,8);
 for(const tienda of d.tiendas){assert.equal(d.clientes.filter(c=>c.tiendaId===tienda.id).length,3);assert.equal(d.productos.filter(p=>p.tiendaId===tienda.id).length,4);}
 for(const p of d.productos){assert.match(p.imagen,/^data:image\/(jpeg|png);base64,/);assert.ok(Buffer.from(p.imagen.split(',')[1],'base64').length<2*1024*1024);assert.ok(p.imagenCredito.autor);assert.match(p.imagenCredito.urlLicencia,/^https:/);}
 const frances=d.ventas.find(v=>v.id===2026000);
 assert.equal(frances.plan.capitalAjustado,'4536.22');assert.equal(frances.plan.cuotaFija,'1579.41');
 assert.equal(d.pagos.find(p=>p.clienteId===3).mora,'0.00');
 assert.equal(d.clientes.find(c=>c.id===5).saldoComprometido,'72.80');
 assert.ok(d.listados.length>0);assert.equal(resumen.casos.length,5);
});

test('la carga no sobrescribe una base y rechaza una fecha futura antes de crearla',async()=>{
 const ruta=destino();await crearBaseDemo(ruta,'2026-10-24');const antes=readFileSync(ruta);
 await assert.rejects(crearBaseDemo(ruta,'2026-10-24'),/ya existe/);
 assert.deepEqual(readFileSync(ruta),antes);
 const futuro=destino();await assert.rejects(crearBaseDemo(futuro,'9999-12-31'),/no futura/);assert.equal(existsSync(futuro),false);
});

test('el servidor usa la demo con permisos, imágenes, mora y línea disponible correctos',async()=>{
 const ruta=destino();await crearBaseDemo(ruta,'2026-10-24');const app=await crearAplicacion(ruta);
 await new Promise(r=>app.servidor.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${app.servidor.address().port}`;
 function sesion(){let cookie='';return async(endpoint,body)=>{const r=await fetch(url+'/api/'+endpoint,{method:body?'POST':'GET',headers:{Cookie:cookie,...(body?{'Content-Type':'application/json'}:{})},body:body?JSON.stringify(body):undefined});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return{status:r.status,body:await r.json()};};}
 try{
  const comercio=sesion();const acceso=await comercio('login',{rol:'Comercio',correo:'bodega@credilocal.test',clave:'credi2026'});assert.equal(acceso.status,200);
  assert.equal(acceso.body.datos.productos.length,4);assert.ok(acceso.body.datos.ventas.every(v=>v.tiendaId===2));assert.deepEqual(acceso.body.datos.cuentas,[]);
  const venta=await comercio('operacion',{accion:'REGISTRAR VENTA',pedido:{clienteId:5,fecha:'2026-10-19',hora:'00:00',modalidad:'Fin de mes',n:1,capital:'10.40',detalle:'',items:[{sku:'DEMO-ARROZ',cantidad:'2'}]}});
  assert.equal(venta.status,400);assert.match(venta.body.error,/línea/);
  const pedro=sesion();assert.equal((await pedro('login',{rol:'Cliente',correo:'pedro@credilocal.test',clave:'credi2026'})).status,200);
  const estado=(await pedro('estado')).body;assert.equal(estado.clientes.length,1);assert.equal(estado.clientes[0].id,4);assert.deepEqual(estado.productos,[]);
  const mora=estado.listados.filter(l=>l.clienteId===4).some(l=>Number(l.mora)>0);assert.equal(mora,true);
  const taller=sesion();await taller('login',{rol:'Comercio',correo:'admin@sutaller.pe',clave:'credi2026'});
  const pago=await taller('operacion',{accion:'REGISTRAR PAGO',pedido:{clienteId:0,periodo:'2026-09',fecha:'2026-09-30',hora:'12:00',abono:'1214.88'}});assert.equal(pago.status,200);
  assert.deepEqual([pago.body.resultado.capital,pago.body.resultado.comp,pago.body.resultado.mora],['1200.00','12.86','2.02']);
 }finally{await app.cerrar();}
});
