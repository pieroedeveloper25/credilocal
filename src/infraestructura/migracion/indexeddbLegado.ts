import type { Cuenta, Rol } from '../../contexts/identity-and-access/dominio/modelos';
import type { Datos } from '../../shared/dominio/datos';
import { exigir, normalizarCorreo } from '../../shared/dominio/validaciones';
const hex = (b: ArrayBuffer | Uint8Array) => Array.from(new Uint8Array(b instanceof Uint8Array ? b.buffer : b)).map(x => x.toString(16).padStart(2, '0')).join('');
export async function crearCuenta(correo: string, clave: string, rol: Rol, id: number, tiendaId?: number, clienteId?: number): Promise<Cuenta> {
    exigir(correo.trim().length >= 5 && correo.trim().length <= 100, 'El correo debe tener entre 5 y 100 caracteres.');
    exigir(clave.length >= 8 && clave.length <= 64 && /[a-zA-Z]/.test(clave) && /\d/.test(clave), 'La contraseña inicial requiere entre 8 y 64 caracteres, letras y números.');
    const sal = hex(crypto.getRandomValues(new Uint8Array(16)));
    return { id, rol, correo: normalizarCorreo(correo), sal, hash: await derivar(clave, sal), tiendaId, clienteId };
}
async function derivar(clave: string, sal: string) {
    const key = await crypto.subtle.importKey('raw', new TextEncoder().encode(clave), 'PBKDF2', false, ['deriveBits']);
    return hex(await crypto.subtle.deriveBits({ name: 'PBKDF2', salt: new TextEncoder().encode(sal), iterations: 100000, hash: 'SHA-256' }, key, 256));
}
export const comprobarClave = async (c: Cuenta, clave: string) => await derivar(clave, c.sal) === c.hash;
/** Serializa la lectura, modificación y guardado entre todas las pestañas del origen. */
export async function conBloqueoDatos<T>(operacion: () => Promise<T>): Promise<T> {
    exigir(!!navigator.locks, 'Este navegador no permite coordinar los guardados. Use Edge o Chrome actualizado.');
    return navigator.locks.request('credilocal-estado', operacion);
}
let base: Promise<IDBDatabase> | undefined;
function abrir() {
    return base ??= new Promise<IDBDatabase>((resolve, reject) => {
        const req = indexedDB.open('credilocal', 1);
        req.onupgradeneeded = () => req.result.createObjectStore('datos');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
        req.onblocked = () => reject(new Error('Cierre otras pestañas de CrediLocal para abrir la base de datos.'));
    });
}
export async function cargarDatos(): Promise<Datos | undefined> {
    const db = await abrir();
    return new Promise((resolve, reject) => {
        const req = db.transaction('datos').objectStore('datos').get('estado');
        req.onsuccess = () => resolve(req.result);
        req.onerror = () => reject(req.error);
    });
}
export async function guardarDatos(datos: Datos): Promise<void> {
    const db = await abrir();
    return new Promise((resolve, reject) => {
        const tx = db.transaction('datos', 'readwrite');
        tx.objectStore('datos').put(datos, 'estado');
        tx.oncomplete = () => resolve();
        tx.onerror = tx.onabort = () => reject(tx.error ?? new Error('No se pudo guardar en la base local.'));
    });
}
