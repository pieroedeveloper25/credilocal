import type { Cliente } from './modelos';
import { D } from '../../../shared/dominio/decimal';
import { correoValido, decimalEntrada, exigir, horaValida, telefono, texto } from '../../../shared/dominio/validaciones';
export function validarCliente(c: Cliente, otros: Cliente[]) {
    texto(c.nombre, 1, 120, 'Nombre del cliente');
    texto(c.direccion, 0, 200, 'Dirección');
    texto(c.correo, 0, 100, 'Correo');
    telefono(c.telefono);
    exigir(['DNI', 'RUC'].includes(c.tipoDoc), 'Seleccione DNI o RUC.');
    exigir(decimalEntrada(c.limite, 10, 2), 'El límite admite hasta 10 enteros y dos decimales.');
    exigir(decimalEntrada(c.valC, 3, 7) && decimalEntrada(c.valM, 3, 7), 'Las tasas admiten hasta siete decimales.');
    exigir(c.nombre.trim(), 'Ingrese el nombre del cliente.');
    exigir(new RegExp(`^\\d{${c.tipoDoc === 'DNI' ? 8 : 11}}$`).test(c.doc), 'El documento debe tener 8 dígitos para DNI o 11 para RUC.');
    exigir(!otros.some(x => x.id !== c.id && x.doc === c.doc), 'El documento ya está registrado en esta tienda.');
    exigir(!c.correo || correoValido(c.correo), 'Ingrese un correo válido.');
    exigir(horaValida(c.horaCorte ?? ''), 'Ingrese una hora de corte válida.');
    exigir(Number.isInteger(c.diaCorte) && Number.isInteger(c.diaPago) && c.diaCorte >= 1 && c.diaCorte <= 30 && c.diaPago > c.diaCorte && c.diaPago <= 30, 'El pago debe ser posterior al corte, entre los días 1 y 30.');
    exigir(Number.isInteger(c.plazo) && c.plazo >= 1 && c.plazo <= 12, 'El plazo debe estar entre 1 y 12 meses.');
    exigir(/^(PEN|USD)$/.test(c.moneda), 'Seleccione una moneda.');
    exigir(['Nominal', 'Efectiva'].includes(c.tipoC) && ['Nominal', 'Efectiva'].includes(c.tipoM), 'Seleccione tasas nominales o efectivas.');
    exigir(['Diaria', 'Mensual'].includes(c.capC) && ['Diaria', 'Mensual'].includes(c.capM), 'Seleccione capitalización diaria o mensual.');
    for (const s of [c.limite, c.valC, c.valM])
        exigir(/^\d+(\.\d+)?$/.test(s), 'Ingrese importes y tasas numéricos no negativos.');
    exigir(D(c.valC).lte(100) && D(c.valM).lte(100), 'Las tasas del formulario deben estar entre 0 y 100 %.');
}
