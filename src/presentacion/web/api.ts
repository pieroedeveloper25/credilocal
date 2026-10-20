export async function api<T>(ruta: string, cuerpo?: unknown): Promise<T> {
    const r = await fetch(`/api/${ruta}`, { method: cuerpo === undefined ? 'GET' : 'POST', credentials: 'same-origin', headers: cuerpo === undefined ? {} : { 'Content-Type': 'application/json' }, body: cuerpo === undefined ? undefined : JSON.stringify(cuerpo) });
    const d = await r.json();
    if (!r.ok)
        throw new Error(d.error ?? 'No se pudo completar la operación.');
    return d;
}
