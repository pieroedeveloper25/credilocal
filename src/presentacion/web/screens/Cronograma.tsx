import { useState } from 'react';
import { leer, num, pct7, sol } from '../format';
import { Badge, Field, Head, Money, Tick, idx, tipId } from '../components/ui';
import { ChevronDownIcon } from '../components/Icons';
import { convertirTasas, generarCronogramaFrances } from '../../../contexts/credit-origination/dominio/motor';
import { fechaValida, fmtFecha, parseFecha } from '../../../shared/dominio/fechas';
import { horaValida } from '../../../shared/dominio/validaciones';
const INICIAL = { cap: '4500', tea: '30', n: '3', fc: '2026-09-15', dc: '20', dp: '26', hora: '12:00', horaCorte: '23:59' };
type F = typeof INICIAL;
function validar(f: F): string {
    const cap = leer(f.cap), tea = leer(f.tea);
    const dc = /^\d+$/.test(f.dc) ? +f.dc : NaN, dp = /^\d+$/.test(f.dp) ? +f.dp : NaN;
    if (!cap || cap.lte(0))
        return 'El capital debe ser mayor a cero.';
    if (!tea || tea.lt(0) || tea.gt(100))
        return 'La TEA debe estar entre 0 y 100 por ciento.';
    if (!Number.isInteger(+f.n) || +f.n < 1 || +f.n > 12)
        return 'El plazo debe estar entre 1 y 12 meses.';
    if (!horaValida(f.hora) || !horaValida(f.horaCorte))
        return 'Ingrese horas válidas.';
    if (!fechaValida(f.fc))
        return 'Ingrese una fecha de compra válida.';
    if (!(dc >= 1 && dp <= 30 && dp > dc))
        return 'La fecha de pago debe ser mayor que la de corte, entre 1 y 30.';
    return '';
}
export function Cronograma() {
    const [f, setF] = useState<F>(INICIAL);
    const [snap, setSnap] = useState<F>(INICIAL); // el cálculo se dispara al pulsar Simular, no en cada tecla
    const [abierta, setAbierta] = useState<number | null>(null);
    const set = (k: keyof F) => (e: {
        target: {
            value: string;
        };
    }) => setF((p) => ({ ...p, [k]: e.target.value }));
    const err = validar(f);
    let errSnap = validar(snap);
    let res = null as null | {
        t: ReturnType<typeof convertirTasas>;
        c: ReturnType<typeof generarCronogramaFrances>;
    };
    if (!errSnap) {
        try {
            const t = convertirTasas('Efectiva', snap.tea);
            res = { t, c: generarCronogramaFrances({ capital: leer(snap.cap)!, fechaCompra: parseFecha(snap.fc), hora: snap.hora, horaCorte: snap.horaCorte, diaCorte: +snap.dc, diaPago: +snap.dp, ted: t.ted, tem: t.tem, nMeses: +snap.n }) };
        }
        catch (e) {
            errSnap = (e as Error).message;
        }
    }
    const toggleRow = (k: number) => {
        setAbierta((prev) => (prev === k ? null : k));
    };
    return (<>
      <Head title="Cronograma francés" sub="Método francés vencido simple ordinario, con gracia total capitalizada. Pulse cualquier fila para ver el desglose interactivo.">
        {res ? <Badge tone={res.c.cierra ? 'ok' : 'bad'}>{res.c.cierra ? 'Saldo final S/ 0.00' : 'No cierra'}</Badge> : <Badge tone="bad">Sin simulación</Badge>}
      </Head>

      <div className="card grid rv" style={{ ...idx(1), gridTemplateColumns: 'repeat(6, minmax(0, 1fr))', alignItems: 'end' }}>
        <Field id="cap" label="Capital (P)" help="capital"><input id="cap" className="in num" inputMode="decimal" value={f.cap} onChange={set('cap')} aria-describedby={tipId('cap')}/></Field>
        <Field id="tea" label="TEA, %" help="tea"><input id="tea" className="in num" inputMode="decimal" value={f.tea} onChange={set('tea')} aria-describedby={tipId('tea')}/></Field>
        <Field id="n" label="Meses" help="meses"><select id="n" className="in" value={f.n} onChange={set('n')} aria-describedby={tipId('n')}>{Array.from({ length: 12 }, (_, i) => <option key={i} value={i + 1}>{i + 1}</option>)}</select></Field>
        <Field id="fc" label="Fecha de compra" help="fecha"><input id="fc" className="in num" type="date" value={f.fc} onInput={e => set('fc')({ target: { value: e.currentTarget.value } })}/></Field>
        <Field id="dc" label="Día de corte" help="corte"><input id="dc" className="in num" inputMode="numeric" value={f.dc} onChange={set('dc')}/></Field>
        <Field id="dp" label="Día de pago" help="pago"><input id="dp" className="in num" inputMode="numeric" value={f.dp} onChange={set('dp')}/></Field>
        <Field id="horaSim" label="Hora de compra" helpText="Hora local de Perú. Si supera la hora de corte en el mismo día, la compra pasa al siguiente ciclo."><input id="horaSim" className="in" type="time" value={f.hora} onInput={e => set('hora')({ target: { value: e.currentTarget.value } })}/></Field>
        <Field id="horaCorteSim" label="Hora de corte" helpText="Hora límite para pertenecer al ciclo de corte actual."><input id="horaCorteSim" className="in" type="time" value={f.horaCorte} onInput={e => set('horaCorte')({ target: { value: e.currentTarget.value } })}/></Field>
        <button type="button" className="btn pri" disabled={!!err} onClick={() => { setSnap(f); setAbierta(null); }}>Simular</button>
      </div>
      {errSnap && !err && <p role="alert" className="err-msg">{errSnap}</p>}
      {err && <div className="err-msg" role="alert">{err}</div>}

      {res && (<>
        <div className="rv" style={{ ...idx(2), display: 'flex', gap: 14, flexWrap: 'wrap' }}>
          <div className="stat"><div className="t">TEM</div><div className="v num" style={{ fontSize: 18 }}><Tick value={pct7(res.t.tem)}/></div></div>
          <div className="stat"><div className="t">Días de gracia total</div><div className="v"><Tick value={String(res.c.diasGracia)}/></div></div>
          <div className="stat"><div className="t">Capital capitalizado</div><div className="v"><Money value={res.c.capitalAjustado}/></div></div>
          <div className="stat hl"><div className="t">Cuota mensual constante (R)</div><div className="v"><Money value={res.c.cuotaFija}/></div></div>
        </div>

        <div className="card flat rv" style={idx(3)}>
          <table className="tbl" key={`${snap.cap}-${snap.tea}-${snap.n}-${snap.fc}`}>
            <caption className="sr">Cronograma de amortización francés</caption>
            <thead><tr><th scope="col">N.°</th><th scope="col">Fecha</th><th scope="col">Gracia</th><th scope="col" className="r">Saldo inicial</th><th scope="col" className="r">Interés</th><th scope="col" className="r">Cuota</th><th scope="col" className="r">Amortización</th><th scope="col" className="r">Saldo final</th></tr></thead>
            <tbody>{res.c.filas.map((x, i) => {
                const isOpen = abierta === x.k;
                const cuotaNum = x.cuota.toNumber();
                const amortPct = cuotaNum > 0 ? Math.min(100, Math.max(0, (x.amortizacion.toNumber() / cuotaNum) * 100)) : 0;
                const intPct = cuotaNum > 0 ? Math.min(100, Math.max(0, (x.interes.toNumber() / cuotaNum) * 100)) : 0;
                return (<>
                  <tr key={`row-${x.k}`} className={`row-in cron-row ${isOpen ? 'open' : ''}`} style={{ ...idx(i), background: x.k === 0 ? 'var(--accent-soft)' : undefined }} onClick={() => toggleRow(x.k)} role="button" tabIndex={0} onKeyDown={(e) => { if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault();
                    toggleRow(x.k);
                } }} aria-expanded={isOpen}>
                    <td className="num" style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                      <span>{x.k}</span>
                      <span className="cron-chevron" style={{ display: 'inline-flex', alignItems: 'center' }}>
                        <ChevronDownIcon size={12}/>
                      </span>
                    </td>
                    <td className="num">{fmtFecha(x.fecha)}</td>
                    <td>{x.gracia}</td>
                    <td className="r num">{num(x.saldoInicial)}</td>
                    <td className="r num">{x.k === 0 ? `(${num(x.interes)})` : num(x.interes)}</td>
                    <td className="r num">{num(x.cuota)}</td>
                    <td className="r num">{num(x.amortizacion)}</td>
                    <td className="r num" style={{ fontWeight: 600 }}>{num(x.saldoFinal)}</td>
                  </tr>
                  <tr key={`detail-${x.k}`} style={{ background: 'transparent' }}>
                    <td colSpan={8} style={{ padding: 0, border: 0 }}>
                      <div className={`accordion-wrapper ${isOpen ? 'expanded' : ''}`}>
                        <div className="accordion-inner">
                          <div className="quota-breakdown">
                            <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                              <span style={{ fontWeight: 600, fontSize: 13 }}>
                                {x.k === 0 ? 'Período de Gracia Total Capitalizable' : `Composición de la Cuota #${x.k}`}
                              </span>
                              <span className="sub" style={{ fontSize: 12 }}>
                                {x.k === 0 ? `Capitalización: P_cap = P · (1 + TED)^${x.diasPeriodo}` : x.k === +snap.n ? 'Ajuste final: amortización = saldo inicial' : `Interés: I_${x.k} = Saldo_${x.k - 1} · TEM`}
                              </span>
                            </div>

                            {x.k > 0 && (<>
                                <div className="quota-stack-bar" role="meter" aria-label="Composición amortización vs interés">
                                  <div className="quota-stack-amort" style={{ width: `${amortPct}%` }} title={`Amortización: ${Math.round(amortPct)}%`}/>
                                  <div className="quota-stack-interes" style={{ width: `${intPct}%` }} title={`Interés: ${Math.round(intPct)}%`}/>
                                </div>
                                <div className="quota-chips">
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ width: 8, height: 8, borderRadius: 2, background: '#2563eb' }}/>
                                    Amortización: <b>{num(x.amortizacion)}</b> ({Math.round(amortPct)}%)
                                  </span>
                                  <span style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                                    <span style={{ width: 8, height: 8, borderRadius: 2, background: '#d97706' }}/>
                                    Interés: <b>{num(x.interes)}</b> ({Math.round(intPct)}%)
                                  </span>
                                  <span style={{ marginLeft: 'auto', color: 'var(--muted)' }}>
                                    Saldo restante posterior: <b className="num">{sol(x.saldoFinal)}</b>
                                  </span>
                                </div>
                              </>)}

                            {x.k === 0 && (<div className="quota-chips">
                                <span>Capital original: <b className="num">{sol(x.saldoInicial)}</b></span>
                                <span>Interés capitalizado (+): <b className="num" style={{ color: 'var(--warn)' }}>{sol(x.interes)}</b></span>
                                <span>Nuevo capital ajustado: <b className="num" style={{ color: 'var(--accent-ink)' }}>{sol(x.saldoFinal)}</b></span>
                              </div>)}
                          </div>
                        </div>
                      </div>
                    </td>
                  </tr>
                </>);
            })}</tbody>
            <tfoot><tr><td colSpan={4}>Totales</td><td className="r num">{num(res.c.totalIntereses)}</td><td className="r num">{num(res.c.totalCuotas)}</td><td className="r num">{num(res.c.totalAmortizado)}</td><td /></tr></tfoot>
          </table>
        </div>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <Badge tone={res.c.cierra ? 'ok' : 'bad'}>{res.c.cierra ? `Saldo final ${sol(res.c.filas[res.c.filas.length - 1].saldoFinal)}: la obligación se extingue sin residuo` : 'El cronograma no cierra en S/ 0.00'}</Badge>
          <a className="btn pri" href="#/venta">Registrar compra en cuotas</a>
        </div>
      </>)}
    </>);
}
