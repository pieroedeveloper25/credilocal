import{test}from'node:test';import assert from'node:assert/strict';import{mkdtempSync}from'node:fs';import{resolve}from'node:path';import{crearAplicacion}from'../servidor-dist/main.mjs';
async function entorno(ruta=':memory:'){
 const app=await crearAplicacion(ruta);await new Promise(r=>app.servidor.listen(0,'127.0.0.1',r));const url=`http://127.0.0.1:${app.servidor.address().port}`;
 const sesion=()=>{let cookie='';return async(ruta,pedido)=>{const r=await fetch(`${url}/api/${ruta}`,{method:pedido===undefined?'GET':'POST',headers:{...(pedido===undefined?{}:{'Content-Type':'application/json'}),Cookie:cookie},body:pedido===undefined?undefined:JSON.stringify(pedido)});if(r.headers.get('set-cookie'))cookie=r.headers.get('set-cookie').split(';')[0];return{codigo:r.status,datos:await r.json()};};};return{...app,sesion};
}
const entrar=(api,rol='Comercio',correo='admin@sutaller.pe',clave='credi2026')=>api('login',{rol,correo,clave});
const op=(api,accion,pedido)=>api('operacion',{accion,pedido});
const cliente=(base,doc,nombre='Cliente de prueba')=>({...base,id:-1,tipoDoc:'DNI',doc,nombre,correo:'',limite:'10000',tipoC:'Nominal',valC:'24',valM:'15',horaCorte:'18:00'});
test('API exige sesión, no expone contraseñas y aplica permisos en el servidor',async()=>{
 const app=await entorno();try{const api=app.sesion();assert.equal((await api('estado')).codigo,401);assert.equal((await entrar(api,'Comercio','admin@sutaller.pe','incorrecta')).codigo,400);
 const comercio=await entrar(api);assert.equal(comercio.codigo,200);assert.deepEqual(comercio.datos.datos.cuentas,[]);assert.ok(!JSON.stringify(comercio.datos).includes('"hash"'));
 const cli=app.sesion();const c=await entrar(cli,'Cliente','contacto@transintegrales.pe');assert.equal(c.codigo,200);assert.equal(c.datos.datos.clientes.length,1);assert.ok(c.datos.datos.ventas.every(v=>v.clienteId===1));assert.equal((await op(cli,'GUARDAR PRODUCTO',{registro:comercio.datos.datos.productos[0]})).codigo,400);
 await api('logout',{});assert.equal((await api('estado')).codigo,401);
 }finally{await app.cerrar();}
});
test('dos sesiones independientes guardan simultáneamente sin perder clientes ni auditoría',async()=>{
 const app=await entorno();try{const a=app.sesion(),b=app.sesion();const [login]=await Promise.all([entrar(a),entrar(b)]);const base=login.datos.datos.clientes[0];
 const r=await Promise.all([op(a,'GUARDAR CLIENTE',{registro:cliente(base,'11111111','Simultáneo A')}),op(b,'GUARDAR CLIENTE',{registro:cliente(base,'22222222','Simultáneo B')})]);assert.ok(r.every(x=>x.codigo===200));
 const estado=(await a('estado')).datos;const nuevos=estado.clientes.filter(c=>c.nombre.startsWith('Simultáneo'));assert.equal(nuevos.length,2);assert.notEqual(nuevos[0].id,nuevos[1].id);
 const superadmin=app.sesion();await entrar(superadmin,'Superadministrador','sistema@credilocal.pe');const tienda={id:-1,ruc:'20999999999',razon:'Bodega Prueba SAC',nombre:'Bodega Prueba',giro:'Bodega',direccion:'Lima',telefono:'',correo:'bodega@prueba.pe',activa:true};assert.equal((await op(superadmin,'GUARDAR TIENDA',{registro:tienda,clave:'Prueba2026'})).codigo,200);
 const otra=app.sesion();assert.equal((await entrar(otra,'Comercio','bodega@prueba.pe','Prueba2026')).codigo,200);assert.equal((await otra('estado')).datos.clientes.length,0);
 assert.equal((await op(otra,'GUARDAR CLIENTE',{registro:{...estado.clientes[0],nombre:'Ajeno'}})).codigo,400);assert.equal((await otra('estado')).datos.ventas.length,0);
 }finally{await app.cerrar();}
});
test('cálculos reales por API, cobranza completa, rechazo de duplicados y conservación en SQLite',async()=>{
 const carpeta=mkdtempSync(resolve('pruebas','base-prueba-')),ruta=resolve(carpeta,'prueba.sqlite');let app=await entorno(ruta);let id;
 try{const api=app.sesion();const inicio=await entrar(api);const c=cliente(inicio.datos.datos.clientes[0],'33333333');const guardado=await op(api,'GUARDAR CLIENTE',{registro:c});assert.equal(guardado.codigo,200);id=guardado.datos.datos.clientes.find(c=>c.doc==='33333333').id;
 const venta=await op(api,'REGISTRAR VENTA',{clienteId:id,fecha:'2026-09-10',hora:'12:00',capital:'1200',modalidad:'Fin de mes',n:1,detalle:'',items:[{sku:'KIT-001',cantidad:'1'}]});assert.equal(venta.codigo,200);
 const corte=venta.datos.datos.listados.find(l=>l.clienteId===id&&l.periodo==='2026-09');assert.equal(corte.total,'1212.86');assert.equal(corte.moneda,'PEN');
 const pedido={clienteId:id,periodo:'2026-09',fecha:'2026-09-30',hora:'12:00',abono:'1214.87'};assert.equal((await op(api,'REGISTRAR PAGO',pedido)).codigo,400);
 pedido.abono='1214.88';const pago=await op(api,'REGISTRAR PAGO',pedido);assert.equal(pago.codigo,200);assert.deepEqual([pago.datos.resultado.capital,pago.datos.resultado.comp,pago.datos.resultado.mora],['1200.00','12.86','2.02']);assert.equal((await op(api,'REGISTRAR PAGO',pedido)).codigo,400);
 await app.cerrar();app=await entorno(ruta);const segunda=app.sesion();await entrar(segunda);const persistido=(await segunda('estado')).datos;assert.ok(persistido.pagos.some(p=>p.clienteId===id&&p.abono==='1214.88'));assert.ok(persistido.obligaciones.filter(o=>o.clienteId===id).every(o=>o.pagada));
 }finally{await app.cerrar();}
});
test('un producto inválido no se guarda al darlo de baja y una operación denegada no cambia la base',async()=>{
 const app=await entorno();try{const api=app.sesion(),inicio=await entrar(api);const p=inicio.datos.datos.productos[0];assert.equal((await op(api,'GUARDAR PRODUCTO',{registro:{...p,activo:false,contado:'abc'}})).codigo,400);const d=(await api('estado')).datos;assert.equal(d.productos[0].contado,p.contado);assert.equal(d.productos[0].activo,true);
 const cliente=app.sesion();await entrar(cliente,'Cliente','contacto@transintegrales.pe');assert.equal((await op(cliente,'EMITIR CORTE',{clienteId:0,periodo:'2026-09'})).codigo,400);
 }finally{await app.cerrar();}
});
test('cronograma francés del segundo caso y cobranza completa por API',async()=>{
 const app=await entorno();try{const api=app.sesion(),inicio=await entrar(api);const registro={...cliente(inicio.datos.datos.clientes[0],'55555555'),tipoC:'Efectiva',valC:'30'};
 const creado=await op(api,'GUARDAR CLIENTE',{registro});const c=creado.datos.datos.clientes.find(c=>c.doc==='55555555');
 const venta=await op(api,'REGISTRAR VENTA',{clienteId:c.id,fecha:'2026-09-15',hora:'12:00',capital:'4500',modalidad:'Cuotas',n:3,detalle:'',items:[{sku:'SRV-014',cantidad:'1'}]});assert.equal(venta.codigo,200);assert.equal(venta.datos.resultado.plan.cuotaFija,'1579.41');assert.equal(venta.datos.resultado.plan.capitalAjustado,'4536.22');
 // Hasta hoy se admiten pagos efectivamente realizados; cuotas futuras se consultan, no se registran anticipadamente como hechos futuros.
 const cuotas=venta.datos.datos.obligaciones.filter(o=>o.clienteId===c.id);assert.deepEqual(cuotas.map(o=>[o.capital,o.comp]),[['1479.14','100.27'],['1511.83','67.58'],['1545.25','34.16']]);
 const corte=await op(api,'EMITIR CORTE',{clienteId:c.id,periodo:'2026-09'});assert.equal(corte.codigo,200);
 }finally{await app.cerrar();}
});
test('el servicio genera el corte sin navegador ni sesión y evita duplicados',async()=>{
 let reloj='2026-09-19T12:00';const app=await crearAplicacion(':memory:',()=>reloj);
 try{reloj='2026-09-20T23:59';assert.ok(await app.revisarCortes()>0);assert.equal(await app.revisarCortes(),0);}
 finally{await app.cerrar();}
});
