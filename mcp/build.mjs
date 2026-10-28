import { build } from 'esbuild';
import fs from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';
const root=path.resolve(path.dirname(fileURLToPath(import.meta.url)),'..');
await fs.mkdir(path.join(root,'dist/server'),{recursive:true});
await fs.mkdir(path.join(root,'dist/.openai'),{recursive:true});
await build({absWorkingDir:root,entryPoints:['mcp/worker.mjs'],outfile:'dist/server/index.js',bundle:true,format:'esm',platform:'browser',target:'es2022',minify:true,loader:{'.html':'text'},legalComments:'eof'});
await fs.copyFile(path.join(root,'.openai/hosting.json'),path.join(root,'dist/.openai/hosting.json'));
// A standalone Node bundle avoids requiring npm installation on the recipient's PC.
const local=path.join(root,'local-mcp');await fs.mkdir(local,{recursive:true});
await build({absWorkingDir:root,entryPoints:['mcp/local.mjs'],outfile:'local-mcp/server.mjs',bundle:true,format:'esm',platform:'node',target:'node20',minify:true,legalComments:'eof',banner:{js:"import { createRequire as __createRequire } from 'node:module'; const require = __createRequire(import.meta.url);"}});
await fs.copyFile(path.join(root,'dist/index.html'),path.join(local,'Form-Studio.html'));
console.log('Built online Worker and standalone local MCP server.');
