import { useState } from 'react';
import { useStore } from '../store';
import { leer, num, sol as dinero } from '../format';
import { Badge, Field, Head, Money, PrelacionFlow, Tick, idx, tipId } from '../components/ui';
import { imputarPorPrelacion } from '../../../contexts/billing-and-collections/dominio/prelacion';
import { D, r2 } from '../../../shared/dominio/decimal';
import { fechaPagoPeriodo, fmtFecha, parseFecha, relojPeru } from '../../../shared/dominio/fechas';
export function Pago() {
    const { clientes, pagos, liquidarDe, registrarCobro } = useStore();
    const [ci, setCi] = useState(clientes[0]?.id ?? -1);
    const [periodo, setPeriodo] = useState(() => relojPeru().slice(0, 7));
    const [fr, setFr] = useState('');
    const [hora, setHora] = useState('');
    const [abono, setAbono] = useState<string | null>(null);
    const [hecho, setHecho] = useState<string | null>(null);
    const [ocupado, setOcupado] = useState(false);
    const [error, setError] = useState('');
    const [resumen, setResumen] = useState<ReturnType<typeof liquidarDe> | null>(null);
    const cl = clientes.find(c => c.id === ci) ?? clientes[0];
    const sol = (d: Parameters<typeof dinero>[0]) => dinero(d, cl.moneda);
    const prevista = fechaPagoPeriodo(periodo, cl.diaPago);
    const defFr = relojPeru().slice(0, 10);
    const frEf = fr || defFr;
    let calculo: ReturnType<typeof liquidarDe>;
    let errorFecha = '';
    try {
        calculo = liquidarDe(cl, periodo, frEf);
    }
    catch (e) {
        errorFecha = (e as Error).message;
        calculo = { lineas: [], capital: D(0), comp: D(0), mora: D(0), total: D(0), vencimiento: parseFecha(prevista), diasMora: 0 };
    }
    const liq = hecho && resumen ? resumen : calculo;
    const yaPagado = !liq.lineas.length && pagos.some(p => p.clienteId === cl.id && p.periodo === periodo);
    const txt = abono ?? liq.total.toFixed(2);
    const monto = r2(leer(txt) ?? D(0));
    const pr = imputarPorPrelacion(monto, liq.mora, liq.comp, liq.capital);
    const imp = pr.mora.plus(pr.comp).plus(pr.cap);
    const igual = monto.eq(liq.total);
    const menor = monto.lt(liq.total);
    const futura = frEf > relojPeru().slice(0, 10);
    const bloqueado = futura || !igual || !/^\d+(\.\d{1,2})?$/.test(txt) || !!hecho || yaPagado || ocupado || liq.total.lte(0) || !!errorFecha;
    const filas = [
        ['1.°', 'Interés moratorio', liq.mora, pr.mora],
        ['2.°', 'Interés compensatorio', liq.comp, pr.comp],
        ['3.°', 'Capital principal', liq.capital, pr.cap],
    ] as const;
    const msg = igual ? 'El abono cubre el total exigible.' : menor ? `Falta ${sol(liq.total.minus(monto))}. No se admiten pagos parciales al vencimiento.` : `El abono excede la deuda en ${sol(monto.minus(liq.total))}.`;
    const registrar = async () => {
        if (bloqueado)
            return;
        setOcupado(true);
        setError('');
        try {
            const pago = await registrarCobro({ clienteId: cl.id, periodo, fecha: frEf, hora: hora || undefined, abono: txt });
            setResumen(liq);
            setHecho(pago.constancia);
        }
        catch (e) {
            setError((e as Error).message);
        }
        finally {
            setOcupado(false);
        }
    };
    return (<>
      <>{error && <p role="alert" className="notice">{error}</p>}</>
      <Head title="Registrar pago" sub="El abono se imputa en orden legal: mora, interés compensatorio y capital (Art. 1257 del Código Civil)."/>

      <div className="card grid rv" style={{ ...idx(1), gridTemplateColumns: '1.4fr 1fr 1fr', alignItems: 'end' }}>
        <div><Field id="liq" label="Liquidación" helpText="Seleccione el cliente cuya deuda del período desea cancelar. Los clientes de baja conservan sus deudas."><select id="liq" className="in" value={ci} onChange={(e) => { setCi(+e.currentTarget.value); setFr(''); setAbono(null); setHecho(null); }}>{clientes.map((c, i) => <option key={c.id} value={c.id}>#{1040 + i} · {periodo} · {c.nombre}</option>)}</select></Field></div>
        <Field id="periodoPago" label="Período del pago" help="periodo"><input id="periodoPago" className="in" type="month" value={periodo} onInput={e => { setPeriodo(e.currentTarget.value || relojPeru().slice(0, 7)); setFr(''); setAbono(null); setHecho(null); }}/></Field>
        <div><div className="lbl">Fecha pactada</div><div className="num" style={{ height: 42, display: 'flex', alignItems: 'center', fontSize: 16 }}>{fmtFecha(liq.vencimiento)}</div></div>
        <Field id="fr" label="Fecha real de pago" help="fechaReal"><input id="fr" className="in num" type="date" value={frEf} onInput={(e) => { setFr(e.currentTarget.value); setAbono(null); }} disabled={!!hecho} aria-describedby={tipId('fr')}/></Field>
        <Field id="horaPago" label="Hora real de pago" helpText="Hora de Perú; permite distinguir pagos anteriores y posteriores al corte. En registros antiguos sin hora se considera 23:59."><input id="horaPago" className="in" type="time" value={hora || (frEf === defFr ? relojPeru().slice(11, 16) : '23:59')} onChange={e => setHora(e.currentTarget.value)} disabled={!!hecho}/></Field>
        <div style={{ gridColumn: '1 / -1' }}><Badge tone={liq.diasMora > 0 ? 'warn' : 'ok'}>{liq.diasMora > 0 ? `${liq.diasMora} días de mora` : 'Pago en plazo, sin mora'}</Badge></div>
      </div>

      {futura && <p className="notice" role="alert">La fecha real de un pago registrado no puede ser futura.</p>}
      {errorFecha && <p role="alert" className="notice">{errorFecha}</p>}
      <div className="card table-scroll"><table className="tbl"><caption>Obligaciones incluidas en el pago completo</caption><thead><tr><th>Compra / cuota</th><th>Vence</th><th>Capital</th><th>Interés</th><th>Mora</th><th>Total</th></tr></thead><tbody>{liq.lineas.map(l => <tr key={l.id}><td>{l.detalle}{l.cuota ? ` · cuota ${l.cuota}` : ''}</td><td>{l.vencimiento}</td><td>{num(D(l.capital))}</td><td>{num(D(l.comp))}</td><td>{num(D(l.mora))}</td><td>{num(D(l.total))}</td></tr>)}</tbody></table></div>
      <PrelacionFlow moraDeuda={liq.mora} moraImp={pr.mora} compDeuda={liq.comp} compImp={pr.comp} capDeuda={liq.capital} capImp={pr.cap}/>

      <div className="card flat rv" style={idx(2)}>
        <div style={{ padding: '16px 20px', fontWeight: 600 }}>Desglose de imputación · Art. 1257 C.C.</div>
        <table className="tbl">
          <caption className="sr">Desglose por prelación legal</caption>
          <thead><tr><th scope="col">Orden</th><th scope="col">Concepto</th><th scope="col" className="r">Deuda</th><th scope="col" className="r">Imputado</th><th scope="col" className="r">Saldo</th></tr></thead>
          <tbody>{filas.map(([o, t, d, i], k) => {
            const s = d.minus(i);
            return (<tr key={o} className="row-in" style={idx(k)}><td className="num" style={{ color: 'var(--muted)' }}>{o}</td><td style={{ fontWeight: 500 }}>{t}</td><td className="r num">{num(d)}</td><td className="r"><Tick value={num(i)}/></td><td className="r"><Tick value={num(s)} className={s.gt(0) ? '' : ''}/></td></tr>);
        })}</tbody>
          <tfoot><tr><td /><td>Deuda total</td><td className="r num">{num(liq.total)}</td><td className="r num">{num(imp)}</td><td className="r num">{num(pr.saldo)}</td></tr></tfoot>
        </table>
      </div>

      <div className="rv" style={{ ...idx(3), display: 'flex', gap: 20, alignItems: 'stretch', flexWrap: 'wrap' }}>
        <div className="card" style={{ flex: 1, minWidth: 300 }}>
          <Field id="abono" label="Monto abonado" help="abono" error={igual ? '' : msg}>
            <input id="abono" className={`in num${igual ? '' : ' err'}`} style={{ fontSize: 22, height: 54 }} inputMode="decimal" value={txt} onChange={(e) => setAbono(e.currentTarget.value)} disabled={!!hecho} aria-invalid={!igual} aria-describedby={tipId('abono')}/>
          </Field>
          {igual && <div style={{ color: 'var(--ok)', marginTop: 8, fontSize: 13 }} aria-live="polite">{msg}</div>}
        </div>
        <div className="card" style={{ flex: 1, minWidth: 300, display: 'flex', flexDirection: 'column', justifyContent: 'space-between', gap: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}><span className="lbl" style={{ margin: 0 }}>Estado resultante</span><Badge tone={pr.saldo.isZero() ? 'ok' : 'warn'}>{pr.saldo.isZero() ? 'Deuda totalmente extinguida' : 'Saldo pendiente'}</Badge></div>
          <div style={{ fontSize: 30, fontWeight: 500, letterSpacing: '-0.02em' }}>Saldo <Money divisa={cl.moneda} value={pr.saldo}/></div>
          {hecho && <div className="toast" role="status">Constancia {hecho} emitida. Auditoría: ABONAR.</div>}
          {yaPagado && !hecho && <div className="toast warn" role="status">Este cliente ya tiene un pago registrado.</div>}
        </div>
      </div>

      <div style={{ display: 'flex', justifyContent: 'space-between' }}>
        <a className="btn" href="#/estado">Volver al estado de cuenta</a>
        <button type="button" className="btn pri" style={{ height: 48, padding: '0 30px' }} disabled={bloqueado} aria-busy={!!hecho} onClick={registrar}>Registrar pago</button>
      </div>
    </>);
}
