import { useState } from 'react';
import { useStore } from '../store';
import { D } from '../../../dominio/credito/motor';
import { num } from '../format';
import { Field, Head, Badge } from '../components/ui';
import type { Producto } from '../../../dominio/modelos';
const nuevo = (): Producto => ({ sku: '', nombre: '', unidad: 'UNIDAD', marca: '', proveedor: '', descripcion: '', imagen: '', contado: '', credito: '', modalidad: 'Ambas', activo: true });
export function Catalogo() {
    const { productos, agregarProducto } = useStore();
    const [f, setF] = useState<Producto>(nuevo);
    const [abierto, setAbierto] = useState(false);
    const [editando, setEditando] = useState(false);
    const [q, setQ] = useState('');
    const [fm, setFm] = useState('');
    const [mensaje, setMensaje] = useState('');
    const [ocupado, setOcupado] = useState(false);
    const [leyendo, setLeyendo] = useState(false);
    const set = <K extends keyof Producto>(k: K, v: Producto[K]) => setF(x => ({ ...x, [k]: v }));
    const guardar = async () => { setOcupado(true); setMensaje(''); try {
        await agregarProducto({ ...f, sku: editando ? f.sku : `P-${crypto.randomUUID()}` });
        setMensaje('Producto guardado en la base local.');
        setAbierto(false);
    }
    catch (e) {
        setMensaje((e as Error).message);
    }
    finally {
        setOcupado(false);
    } };
    const imagen = async (archivo?: File) => {
        if (!archivo)
            return;
        if (!['image/png', 'image/jpeg'].includes(archivo.type) || archivo.size > 2 * 1024 * 1024) {
            setMensaje('Adjunte una imagen JPG o PNG de hasta 2 MB.');
            return;
        }
        setLeyendo(true);
        try {
            const url = await new Promise<string>((resolve, reject) => { const r = new FileReader(); r.onload = () => resolve(String(r.result)); r.onerror = () => reject(new Error('No se pudo leer la imagen.')); r.readAsDataURL(archivo); });
            await new Promise<void>((resolve, reject) => { const im = new Image(); im.onload = () => resolve(); im.onerror = () => reject(new Error('El archivo no es una imagen válida.')); im.src = url; });
            set('imagen', url);
            setMensaje('');
        }
        catch (e) {
            setMensaje((e as Error).message);
        }
        finally {
            setLeyendo(false);
        }
    };
    const filas = productos.filter(p => (p.nombre.toLowerCase().includes(q.toLowerCase()) || p.sku.includes(q)) && (!fm || p.modalidad === fm));
    return <>
    <Head title="Catálogo" sub="Productos y servicios con imagen, precios y modalidades de crédito. La baja conserva las ventas anteriores."><button className="btn pri" onClick={() => { setF(nuevo()); setEditando(false); setAbierto(true); setMensaje(''); }}>Nuevo producto</button></Head>
    {abierto && <section className="card"><h2>{editando ? 'Editar producto' : 'Nuevo producto'}</h2><div className="form-grid">
      {([['nombre', 'Nombre', 'Denominación del producto o servicio.'], ['descripcion', 'Descripción', 'Características que permiten identificarlo.'], ['marca', 'Marca', 'Fabricante, si corresponde.'], ['proveedor', 'Proveedor', 'Empresa que lo suministra, si corresponde.']] as const).map(([k, label, help]) => <Field key={k} id={`p-${k}`} label={label} helpText={help}><input id={`p-${k}`} className="in" value={f[k] ?? ''} onChange={e => set(k, e.target.value)}/></Field>)}
      <Field id="p-unidad" label="Unidad de medida" helpText="Forma de venta. Seleccione servicio para trabajos o prestaciones."><select id="p-unidad" className="in" value={f.unidad} onChange={e => set('unidad', e.target.value)}>{['UNIDAD', 'GALON', 'LITRO', 'SERVICIO', 'KIT', 'KILO', 'PAQUETE'].map(u => <option key={u}>{u}</option>)}</select></Field>
      <Field id="p-imagen" label="Imagen referencial" helpText="Adjunte una imagen JPG o PNG válida, de hasta 2 MB. Se conserva en la base local."><input key={f.sku || 'nuevo'} id="p-imagen" className="in" type="file" accept="image/png,image/jpeg" onChange={e => void imagen(e.target.files?.[0])}/>{f.imagen && <img src={f.imagen} alt={`Vista previa de ${f.nombre || 'producto'}`} className="product-preview"/>}</Field>
      <Field id="p-contado" label="Precio contado" help="contado"><input id="p-contado" className="in" value={f.contado} inputMode="decimal" onChange={e => set('contado', e.target.value)}/></Field>
      <Field id="p-credito" label="Precio crédito" help="credito"><input id="p-credito" className="in" value={f.credito} inputMode="decimal" onChange={e => set('credito', e.target.value)}/></Field>
      <Field id="p-modalidad" label="Modalidad permitida" help="modalidad"><select id="p-modalidad" className="in" value={f.modalidad} onChange={e => set('modalidad', e.target.value as Producto['modalidad'])}><option>Ambas</option><option>Fin de mes</option><option>Cuotas</option></select></Field>
      <Field id="p-estado" label="Estado del producto" helpText="La baja impide seleccionarlo en nuevas ventas. Sus ventas anteriores permanecen registradas."><select id="p-estado" className="in" value={String(f.activo !== false)} onChange={e => set('activo', e.target.value === 'true')}><option value="true">Activo</option><option value="false">De baja</option></select></Field>
    </div><button className="btn pri" disabled={ocupado || leyendo} onClick={guardar}>{ocupado ? 'Guardando…' : 'Guardar producto'}</button> <button className="btn" onClick={() => setAbierto(false)}>Cancelar</button></section>}
    {mensaje && <p role="status" className="notice">{mensaje}</p>}
    <div className="form-grid"><Field id="q" label="Buscar producto" helpText="Busque por nombre o código SKU, incluyendo productos dados de baja."><input id="q" className="in" type="search" value={q} onChange={e => setQ(e.target.value)}/></Field><Field id="fm" label="Filtrar modalidad" helpText="Muestra los productos permitidos en la modalidad seleccionada."><select id="fm" className="in" value={fm} onChange={e => setFm(e.target.value)}><option value="">Todas</option><option>Ambas</option><option>Fin de mes</option><option>Cuotas</option></select></Field></div>
    <div className="table-scroll"><table className="tbl"><caption>Catálogo de productos y servicios</caption><thead><tr><th>Imagen</th><th>Nombre / SKU</th><th>Marca / proveedor</th><th>Unidad</th><th>Contado</th><th>Crédito</th><th>Modalidad</th><th>Estado</th><th>Acción</th></tr></thead><tbody>{filas.map(p => <tr key={p.sku}><td>{p.imagen ? <img className="product-thumb" src={p.imagen} alt={p.nombre}/> : <span className="sub">Imagen pendiente</span>}</td><td>{p.nombre}<br /><small>{p.sku}</small></td><td>{p.marca || '—'}<br />{p.proveedor || '—'}</td><td>{p.unidad}</td><td>{num(D(p.contado))}</td><td>{num(D(p.credito))}</td><td>{p.modalidad}</td><td><Badge tone={p.activo === false ? 'bad' : 'ok'}>{p.activo === false ? 'De baja' : 'Activo'}</Badge></td><td><button className="btn sm" onClick={() => { setF(p); setEditando(true); setAbierto(true); setMensaje(''); }}>Editar {p.nombre}</button></td></tr>)}</tbody></table></div>
    {!filas.length && <p className="empty">No hay productos para mostrar.</p>}
  </>;
}
