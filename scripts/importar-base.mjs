import{readFileSync,existsSync}from'node:fs';import{resolve}from'node:path';import{DatabaseSync}from'node:sqlite';
// Importación administrativa fuera de HTTP, sobre un archivo nuevo: nunca reemplaza la base en uso.
const[origen,destino]=process.argv.slice(2);if(!origen||!destino)throw Error('Uso: node scripts/importar-base.mjs respaldo.json datos/importada.sqlite');
if(existsSync(destino))throw Error('El destino ya existe. Use un archivo nuevo para conservar el anterior.');
const d=JSON.parse(readFileSync(origen,'utf8'));const listas=['tiendas','cuentas','clientes','productos','ventas','obligaciones','listados','pagos','auditoria'];
for(const k of listas)if(!Array.isArray(d[k]))throw Error(`Falta la colección ${k}. Use un respaldo completo de la versión anterior.`);
const claves={tiendas:x=>x.id,cuentas:x=>x.id,clientes:x=>x.id,productos:x=>`${x.tiendaId}:${x.sku}`,ventas:x=>x.id,obligaciones:x=>x.id,listados:x=>x.id,pagos:x=>x.constancia};
for(const[k,clave]of Object.entries(claves)){const ids=d[k].map(clave);if(new Set(ids).size!==ids.length||ids.some(x=>x===undefined))throw Error(`Identificadores inválidos en ${k}.`);}
for(const c of d.cuentas)if(!/^[a-f0-9]{32}$/.test(c.sal)||!/^[a-f0-9]{64}$/.test(c.hash))throw Error('Cuenta sin hash o sal válidos.');
for(const c of d.clientes)if(!d.tiendas.some(t=>t.id===c.tiendaId))throw Error('Cliente sin tienda.');
for(const v of d.ventas)if(!d.clientes.some(c=>c.id===v.clienteId&&c.tiendaId===v.tiendaId))throw Error('Venta con referencia ajena.');
for(const o of d.obligaciones)if(!d.ventas.some(v=>v.id===o.ventaId&&v.clienteId===o.clienteId&&v.tiendaId===o.tiendaId))throw Error('Obligación con referencia ajena.');
const db=new DatabaseSync(resolve(destino));try{db.exec('BEGIN IMMEDIATE; CREATE TABLE metadatos(clave TEXT PRIMARY KEY,valor TEXT NOT NULL)');for(const k of listas){db.exec(`CREATE TABLE ${k}(posicion INTEGER PRIMARY KEY,contenido TEXT NOT NULL CHECK(json_valid(contenido)))`);const st=db.prepare(`INSERT INTO ${k} VALUES (?,?)`);d[k].forEach((x,i)=>st.run(i,JSON.stringify(x)));}db.prepare('INSERT INTO metadatos VALUES (?,?)').run('inicializada','1');db.prepare('INSERT INTO metadatos VALUES (?,?)').run('finanzasVersion',String(d.finanzasVersion??1));db.exec('COMMIT');console.log('Importación terminada. El respaldo y la base anterior se conservaron.');}catch(e){db.exec('ROLLBACK');throw e;}finally{db.close();}
