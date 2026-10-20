import {build} from 'esbuild';
await build({entryPoints:['servidor/main.ts'],outfile:'servidor-dist/main.mjs',bundle:true,platform:'node',format:'esm',target:'node24',packages:'bundle'});
