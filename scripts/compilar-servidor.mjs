import {build} from 'esbuild';
await build({entryPoints:['servidor/main.ts'],outfile:'servidor-dist/main.mjs',bundle:true,platform:'node',format:'esm',target:'node24',packages:'bundle'});
await build({entryPoints:['servidor/demo.ts'],outfile:'servidor-dist/demo.mjs',bundle:true,platform:'node',format:'esm',target:'node24',packages:'bundle'});
