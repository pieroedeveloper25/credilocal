import { test } from 'node:test';
import assert from 'node:assert/strict';
import { readdirSync, readFileSync } from 'node:fs';
import { resolve, relative, dirname } from 'node:path';
import ts from 'typescript';

const raiz = resolve('src');
const permitidas = {
  dominio: ['dominio'],
  aplicacion: ['dominio', 'aplicacion'],
  infraestructura: ['dominio', 'aplicacion', 'infraestructura'],
  presentacion: ['dominio', 'presentacion'],
};

function archivos(carpeta) {
  return readdirSync(carpeta, { withFileTypes: true }).flatMap(entrada => {
    const ruta = resolve(carpeta, entrada.name);
    if (entrada.isDirectory()) return archivos(ruta);
    return /\.tsx?$/.test(ruta) && !ruta.endsWith('.test.ts') ? [ruta] : [];
  });
}

for (const [capa, destinos] of Object.entries(permitidas)) {
  test(`${capa} respeta sus dependencias y no utiliza las fachadas antiguas`, () => {
    for (const ruta of archivos(resolve(raiz, capa))) {
      const fuente = ts.createSourceFile(ruta, readFileSync(ruta, 'utf8'), ts.ScriptTarget.Latest, true);
      function revisar(nodo) {
        // Incluye importaciones de tipos, reexportaciones, import() y require().
        let referencia;
        if ((ts.isImportDeclaration(nodo) || ts.isExportDeclaration(nodo)) && nodo.moduleSpecifier && ts.isStringLiteral(nodo.moduleSpecifier)) {
          referencia = nodo.moduleSpecifier.text;
        } else if (ts.isCallExpression(nodo) &&
          (nodo.expression.kind === ts.SyntaxKind.ImportKeyword || ts.isIdentifier(nodo.expression) && nodo.expression.text === 'require') &&
          nodo.arguments[0] && ts.isStringLiteral(nodo.arguments[0])) {
          referencia = nodo.arguments[0].text;
        }
        if (referencia !== undefined) {
          const contexto = `${relative(raiz, ruta)} -> ${referencia}`;
          if (referencia.startsWith('.')) {
            const destino = relative(raiz, resolve(dirname(ruta), referencia)).replaceAll('\\', '/').split('/')[0];
            assert.ok(destinos.includes(destino), contexto);
          } else if (capa === 'dominio') {
            assert.equal(referencia, 'decimal.js', contexto);
          } else if (capa === 'aplicacion') {
            assert.fail(`La aplicación debe depender de contratos y dominio: ${contexto}`);
          } else if (capa === 'presentacion') {
            assert.ok(['react', 'react-dom/client', 'react/jsx-runtime'].includes(referencia), contexto);
          }
        }
        ts.forEachChild(nodo, revisar);
      }
      revisar(fuente);
    }
  });
}
