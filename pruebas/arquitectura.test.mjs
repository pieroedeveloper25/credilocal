import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
import ts from 'typescript';

const raiz = resolve('src');
const contextos = ['identity-and-access', 'customer-management', 'product-catalog', 'credit-origination', 'billing-and-collections'];

function archivos(carpeta) {
  return readdirSync(carpeta, { withFileTypes: true }).flatMap(entrada => {
    const ruta = resolve(carpeta, entrada.name);
    if (entrada.isDirectory()) return archivos(ruta);
    return /\.tsx?$/.test(ruta) && !/\.test\.tsx?$/.test(ruta) ? [ruta] : [];
  });
}

/** Zona arquitectónica de un archivo, a partir de su ruta relativa a src/. */
function zona(rel) {
  const p = rel.split('/');
  if (p[0] === 'shared') return { tipo: `shared/${p[1]}` };
  if (p[0] === 'contexts') return { tipo: `contexto/${p[2]}`, contexto: p[1] };
  if (p[0] === 'main.tsx') return { tipo: 'presentacion' };
  return { tipo: p[0] };
}

// Lo único que un contexto puede conocer de otro: su lenguaje publicado (modelos y eventos)
// y la consulta de línea de crédito de BC 2.
const publicado = /^contexts\/[^/]+\/dominio\/(modelos|eventos|lineaCredito)$/;
const modelos = /^contexts\/[^/]+\/dominio\/modelos$/;

function permitido(origen, relOrigen, destino) {
  const d = zona(destino);
  const quitaExt = destino.replace(/\.tsx?$/, '');
  switch (origen.tipo) {
    case 'shared/dominio':
      return d.tipo === 'shared/dominio' || modelos.test(quitaExt) && /^shared\/dominio\/(datos|cuentaUnica)\.ts$/.test(relOrigen);
    case 'shared/aplicacion':
      return d.tipo.startsWith('shared/') || modelos.test(quitaExt);
    case 'contexto/dominio':
      return d.tipo === 'shared/dominio' || d.contexto === origen.contexto && d.tipo === 'contexto/dominio' || publicado.test(quitaExt);
    case 'contexto/aplicacion':
      return d.tipo.startsWith('shared/') || d.contexto === origen.contexto && ['contexto/dominio', 'contexto/aplicacion'].includes(d.tipo) || publicado.test(quitaExt);
    case 'contexto/infraestructura':
      return d.tipo !== 'presentacion';
    case 'aplicacion':
      return d.tipo.startsWith('shared/') || d.tipo === 'aplicacion' || ['contexto/dominio', 'contexto/aplicacion'].includes(d.tipo);
    case 'infraestructura':
      return d.tipo !== 'presentacion';
    case 'presentacion':
      return d.tipo === 'presentacion' || d.tipo === 'shared/dominio' || d.tipo === 'contexto/dominio';
    default:
      return false;
  }
}

function externoPermitido(origen, relOrigen, referencia) {
  if (referencia === 'decimal.js') return relOrigen === 'shared/dominio/decimal.ts';
  if (origen.tipo === 'presentacion') return ['react', 'react-dom/client', 'react/jsx-runtime'].includes(referencia);
  return origen.tipo === 'infraestructura' || origen.tipo === 'contexto/infraestructura';
}

function importaciones(ruta) {
  const fuente = ts.createSourceFile(ruta, readFileSync(ruta, 'utf8'), ts.ScriptTarget.Latest, true);
  const referencias = [];
  (function revisar(nodo) {
    // Incluye importaciones de tipos, reexportaciones, import() y require().
    if ((ts.isImportDeclaration(nodo) || ts.isExportDeclaration(nodo)) && nodo.moduleSpecifier && ts.isStringLiteral(nodo.moduleSpecifier)) {
      referencias.push(nodo.moduleSpecifier.text);
    } else if (ts.isCallExpression(nodo) &&
      (nodo.expression.kind === ts.SyntaxKind.ImportKeyword || ts.isIdentifier(nodo.expression) && nodo.expression.text === 'require') &&
      nodo.arguments[0] && ts.isStringLiteral(nodo.arguments[0])) {
      referencias.push(nodo.arguments[0].text);
    }
    ts.forEachChild(nodo, revisar);
  })(fuente);
  return referencias;
}

test('cada archivo de src/ vive en una zona conocida y no quedan carpetas del diseño anterior', () => {
  const conocidas = ['shared', 'contexts', 'aplicacion', 'infraestructura', 'presentacion', 'main.tsx'];
  for (const entrada of readdirSync(raiz)) assert.ok(conocidas.includes(entrada), `Carpeta fuera de la arquitectura: src/${entrada}`);
  assert.deepEqual(readdirSync(resolve(raiz, 'contexts')).sort(), [...contextos].sort());
});

test('las dependencias respetan capas y límites entre contextos', () => {
  for (const ruta of archivos(raiz)) {
    const rel = relative(raiz, ruta).replaceAll('\\', '/');
    const origen = zona(rel);
    for (const referencia of importaciones(ruta)) {
      const contexto = `${rel} -> ${referencia}`;
      if (referencia.startsWith('.')) {
        const destino = relative(raiz, resolve(dirname(ruta), referencia)).replaceAll('\\', '/');
        assert.ok(!destino.startsWith('..'), `${contexto} sale de src/`);
        assert.ok(permitido(origen, rel, destino), contexto);
      } else {
        assert.ok(externoPermitido(origen, rel, referencia), `Dependencia externa no permitida: ${contexto}`);
      }
    }
  }
});

test('un contexto solo conoce de otro sus modelos, eventos y consulta de línea', () => {
  for (const ruta of archivos(resolve(raiz, 'contexts'))) {
    const rel = relative(raiz, ruta).replaceAll('\\', '/');
    const propio = rel.split('/')[1];
    for (const referencia of importaciones(ruta).filter(r => r.startsWith('.'))) {
      const destino = relative(raiz, resolve(dirname(ruta), referencia)).replaceAll('\\', '/');
      const ajeno = destino.startsWith('contexts/') && destino.split('/')[1] !== propio;
      if (ajeno && zona(rel).tipo !== 'contexto/infraestructura') assert.match(destino, publicado, `${rel} -> ${referencia}`);
    }
  }
});

test('las fachadas de compatibilidad antiguas ya no existen', () => {
  const sobrantes = readdirSync(raiz).filter(n => /^(api|credenciales|data|finanzas|gestion|imagenPredeterminada|liquidacion|persistencia|persistenciaLegada|store)\.tsx?$/.test(n));
  assert.deepEqual(sobrantes, []);
});
