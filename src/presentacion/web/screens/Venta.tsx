import { useMemo, useState } from 'react';
import { useStore } from '../store';
import { D, Decimal, compraPermitida, convertirTasas, fechaValida, fmtFecha, generarCronogramaFrances, lineaDisponible, liquidarFinDeMes, parseFecha, r2 } from '../../../dominio/credito/motor';
import { leer, num, pct7, sol as dinero } from '../format';
import { activo, horaValida, relojPeru } from '../../../dominio/validaciones';
import { CreditMeter, Field, Head, Seg, Tick, idx, tipId } from '../components/ui';
interface Item {
    sku: string;
    cant: string;
    precio: string;
}
type Modal = 'Fin de mes' | 'Cuotas';
export function Venta() {
    const { clientes, productos, deudaDe, registrarVenta } = useStore();
    const [ci, setCi] = useState(clientes[0]?.id ?? -1);
    const [fecha, setFecha] = useState(() => relojPeru().slice(0, 10));
    const [hora, setHora] = useState(() => relojPeru().slice(11));
    const [error, setError] = useState('');
    const [ocupado, setOcupado] = useState(false);
    const [items, setItems] = useState<Item[]>(productos.some(p => p.sku === 'KIT-001' && activo(p)) ? [{ sku: 'KIT-001', cant: '1', precio: '1200' }] : []);
    const [modal, setModal] = useState<Modal>('Fin de mes');
    const [n, setN] = useState(3);
    const [hecho, setHecho] = useState<number | null>(null);
    const cl = clientes.find(c => c.id === ci) ?? clientes[0];
    const sol = (d: Parameters<typeof dinero>[0]) => dinero(d, cl.moneda);
    const limite = D(cl.limite);
    const deuda = deudaDe(cl);
    const disp = lineaDisponible(limite, deuda);
    const nMax = Math.min(n, cl.plazo);
    const filas = items.map((it) => {
        const p = productos.find((x) => x.sku === it.sku)!;
        const sub = (leer(it.cant) ?? D(0)).mul(p?.credito ?? 0);
        return { it, p, sub };
    });
    const P = r2(filas.reduce((a, f) => a.plus(f.sub), D(0)));
    const fechaOk = fechaValida(fecha);
    const excede = P.gt(0) && !compraPermitida(limite, deuda, P);
    const invalidos = filas.some(f => !activo(f.p) || f.p.modalidad !== 'Ambas' && f.p.modalidad !== modal || !leer(f.it.cant)?.gt(0) || !leer(f.it.precio)?.gt(0));
    const futura = `${fecha}T${hora}` > relojPeru();
    const bloqueado = futura || P.lte(0) || excede || !fechaOk || !horaValida(hora) || !activo(cl) || invalidos || ocupado || hecho !== null;
    const sim = useMemo(() => {
        if (P.lte(0) || !fechaOk)
            return null;
        try {
            const t = convertirTasas(cl.tipoC, cl.valC, cl.capC);
            const fc = parseFecha(fecha);
            const reloj = { hora, horaCorte: cl.horaCorte };
            if (modal === 'Fin de mes')
                return { tipo: 'fin' as const, t, r: liquidarFinDeMes({ ...reloj, capital: P, fechaCompra: fc, diaCorte: cl.diaCorte, diaPago: cl.diaPago, tedComp: t.ted, tedMora: t.ted, fechaRealPago: fc }) };
            return { tipo: 'cuotas' as const, t, c: generarCronogramaFrances({ ...reloj, capital: P, fechaCompra: fc, diaCorte: cl.diaCorte, diaPago: cl.diaPago, ted: t.ted, tem: t.tem, nMeses: nMax }) };
        }
        catch (e) {
            return { tipo: 'error' as const, mensaje: (e as Error).message };
        }
    }, [P, fecha, fechaOk, modal, nMax, cl, hora]);
    const upd = (i: number, k: keyof Item, v: string) => { setItems((l) => l.map((x, j) => (j === i ? { ...x, [k]: v } : x))); setHecho(null); };
    const agregar = (sku: string) => { const p = productos.find((x) => x.sku === sku); if (p) {
        setItems((l) => [...l, { sku, cant: '1', precio: p.credito }]);
        setHecho(null);
    } };
    const registrar = async () => {
        if (bloqueado || sim?.tipo === 'error')
            return;
        setOcupado(true);
        setError('');
        try {
            const v = await registrarVenta({ clienteId: cl.id, fecha, hora, capital: P.toString(), modalidad: modal, n: nMax, detalle: filas.map((f) => f.p.nombre).join(' + '), items: items.map(it => ({ sku: it.sku, cantidad: it.cant })) });
            setHecho(v.id);
        }
        catch (e) {
            setError((e as Error).message);
        }
        finally {
            setOcupado(false);
        }
    };
    return (<>
      <Head title="Venta a crédito" sub="Registro de consumo en mostrador o taller. La simulación se recalcula con cada cambio."/>
      <div style={{ display: 'flex', gap: 24, alignItems: 'flex-start', flexWrap: 'wrap' }}>
        <div className="col rv" style={{ ...idx(1), flex: 1, minWidth: 420, display: 'flex', flexDirection: 'column', gap: 18 }}>
          <div className="card grid" style={{ gridTemplateColumns: '1fr 1fr' }}>
            <Field id="cli" label="Cliente" help="cliente">
              <select id="cli" className="in" value={ci} onChange={(e) => { setCi(+e.currentTarget.value); setHecho(null); }} aria-describedby={tipId('cli')}>{clientes.map((c) => <option key={c.id} value={c.id} disabled={!activo(c)}>{c.nombre}{c.activo === false ? ' (de baja)' : ''}</option>)}</select>
            </Field>
            <Field id="fec" label="Fecha de compra" help="fecha" error={fechaOk ? '' : 'Ingrese una fecha válida'}>
              <input id="fec" className="in num" type="date" value={fecha} onInput={(e) => { setFecha(e.currentTarget.value); setHecho(null); }} aria-describedby={tipId('fec')}/>
            </Field>
            <Field id="horaCompra" label="Hora de compra" helpText="Hora local de Perú. Se compara con la hora de corte del cliente para asignar el ciclo."><input id="horaCompra" className="in" type="time" value={hora} onInput={e => { setHora(e.currentTarget.value); setHecho(null); }}/></Field>
            <p className="sub">Corte: día {cl.diaCorte}, a las {cl.horaCorte ?? '23:59'}.</p>
            <div style={{ gridColumn: '1 / -1' }}>
              <CreditMeter divisa={cl.moneda} limite={limite} deudaActual={deuda} montoPendiente={P}/>
            </div>
          </div>

          <div className="card flat">
            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '16px 20px' }}>
              <span style={{ fontWeight: 600 }}>Detalle de ítems</span>
              <Field id="add" label="Agregar producto" helpText="Seleccione un producto activo del catálogo, permitido en la modalidad de pago elegida.">
                <select id="add" className="in" style={{ width: 280, height: 36 }} value="" onChange={(e) => agregar(e.currentTarget.value)}><option value="">+ Agregar del catálogo</option>{productos.filter(p => activo(p) && (p.modalidad === 'Ambas' || p.modalidad === modal)).map((p) => <option key={p.sku} value={p.sku}>{p.nombre} · {num(D(p.credito))}</option>)}</select></Field>
            </div>
            <table className="tbl">
              <caption className="sr">Ítems de la compra</caption>
              <thead><tr><th scope="col">Producto</th><th scope="col" className="r" style={{ width: 90 }}>Cant.</th><th scope="col" className="r" style={{ width: 140 }}>Precio crédito</th><th scope="col" className="r" style={{ width: 130 }}>Subtotal</th><th scope="col" style={{ width: 56 }}><span className="sr">Quitar</span></th></tr></thead>
              <tbody>
                {filas.map((f, i) => (<tr key={`${f.it.sku}-${i}`} className="row-in">
                    <td style={{ fontWeight: 500 }}>{f.p.nombre}</td>
                    <td className="r"><Field id={`cantidad-${i}`} label="Cantidad" helpText="Cantidad positiva del producto. El subtotal se calcula con el precio de crédito."><input id={`cantidad-${i}`} className="in num" style={{ height: 34, textAlign: 'right' }} aria-label={`Cantidad de ${f.p.nombre}`} inputMode="decimal" value={f.it.cant} onChange={(e) => upd(i, 'cant', e.currentTarget.value)}/></Field></td>
                    <td className="r"><Field id={`precio-${i}`} label="Precio crédito" help="credito"><input id={`precio-${i}`} className="in num" style={{ height: 34, textAlign: 'right' }} aria-label={`Precio de ${f.p.nombre}`} inputMode="decimal" value={f.p.credito} readOnly/></Field></td>
                    <td className="r"><Tick value={num(f.sub)}/></td>
                    <td className="r"><button type="button" className="btn sm" aria-label={`Quitar ${f.p.nombre}`} onClick={() => { setItems((l) => l.filter((_, j) => j !== i)); setHecho(null); }}>×</button></td>
                  </tr>))}
              </tbody>
              <tfoot><tr><td colSpan={3} className="r">Capital total (P)</td><td className="r num">{num(P)}</td><td /></tr></tfoot>
            </table>
            {filas.length === 0 && <div className="empty">Agregue al menos un producto para simular.</div>}
          </div>

          <div className="card" style={{ display: 'flex', gap: 32, alignItems: 'flex-start', flexWrap: 'wrap' }}>
            <Field id="modal" label="Modalidad de pago" help="modal"><Seg<Modal> value={modal} options={['Fin de mes', 'Cuotas']} onChange={(v) => { setModal(v); setHecho(null); }} label="Modalidad de pago"/></Field>
            {modal === 'Cuotas' && (<div className="rv"><Field id="meses" label="Número de meses" help="meses">
                <select id="meses" className="in" style={{ width: 170 }} value={nMax} onChange={(e) => setN(+e.currentTarget.value)} aria-describedby={tipId('meses')}>{Array.from({ length: cl.plazo }, (_, i) => i + 1).map((k) => <option key={k} value={k}>{k} {k === 1 ? 'cuota' : 'cuotas'}</option>)}</select>
                <div className="sub" style={{ fontSize: 12 }}>Máximo {cl.plazo}</div></Field></div>)}
          </div>
        </div>

        <aside className="rv" style={{ ...idx(2), width: 360, flex: 'none', display: 'flex', flexDirection: 'column', gap: 16 }}>
          <section className="card" aria-live="polite" style={{ background: 'var(--accent-soft)', borderColor: '#c9dfd6' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 6 }}><span style={{ fontWeight: 600, color: 'var(--accent-ink)' }}>Simulación previa</span></div>
            {sim?.tipo === 'error' && <p role="alert">{sim.mensaje}</p>}
            {!sim && <div className="empty" style={{ padding: '24px 0' }}>Sin datos para simular.</div>}
            {sim?.tipo === 'fin' && (<>
              <div className="kv"><span>Ciclo</span><span>{sim.r.ciclo === 0 ? 'Actual' : 'Siguiente'}</span></div>
              <div className="kv"><span>Vence</span><Tick value={fmtFecha(sim.r.vencimiento)}/></div>
              <div className="kv"><span>Días ordinarios (d)</span><Tick value={String(sim.r.dias)}/></div>
              <div className="kv"><span>TED compensatoria</span><Tick value={pct7(sim.t.ted)}/></div>
              <div className="kv"><span>Interés compensatorio</span><Tick value={num(sim.r.interesComp)}/></div>
              <div className="kv" style={{ fontWeight: 600, fontSize: 16 }}><span style={{ color: 'var(--ink)' }}>Total exigible</span><Tick value={sol(sim.r.montoVencido)}/></div>
            </>)}
            {sim?.tipo === 'cuotas' && (<>
              <div className="kv"><span>Días de gracia total</span><Tick value={String(sim.c.diasGracia)}/></div>
              <div className="kv"><span>Capital capitalizado</span><Tick value={sol(sim.c.capitalAjustado)}/></div>
              <div className="kv"><span>TEM</span><Tick value={pct7(sim.t.tem)}/></div>
              <div className="kv"><span>Cuota mensual (R)</span><b style={{ fontSize: 18 }}><Tick value={sol(sim.c.cuotaFija)}/></b></div>
              <div className="kv"><span>Total de intereses</span><Tick value={sol(sim.c.totalIntereses)}/></div>
              <div className="kv" style={{ fontWeight: 600 }}><span style={{ color: 'var(--ink)' }}>Total a pagar</span><Tick value={sol(sim.c.totalCuotas)}/></div>
              <a href="#/cronograma" style={{ color: 'var(--accent-ink)', display: 'inline-block', marginTop: 8 }}>Ver cronograma completo</a>
            </>)}
          </section>
          {futura && <p className="notice" role="alert">La simulación permite fechas futuras; el registro requiere fecha y hora hasta el momento actual.</p>}
          {error && <p className="notice" role="alert">{error}</p>}
          {invalidos && <p role="alert" className="notice">Revise cantidades, precios y modalidad de los productos. Los productos de baja no pueden venderse.</p>}
          {!activo(cl) && <p role="alert" className="notice">El cliente está dado de baja. Seleccione uno activo.</p>}
          {excede && <div className="notice" role="alert"><div><b>Línea insuficiente.</b> La compra de {sol(P)} supera la línea disponible de {sol(disp)}. No se puede registrar.</div></div>}
          {hecho !== null && (<><div className="toast" role="status">Operación OP-{hecho} registrada. Deuda actualizada.</div><a className="btn" href="#/estado">Ver estado de cuenta</a></>)}
          <button type="button" className="btn pri" style={{ height: 48 }} disabled={bloqueado || sim?.tipo === 'error'} onClick={registrar}>Registrar compra</button>
        </aside>
      </div>
    </>);
}
export type { Decimal };
