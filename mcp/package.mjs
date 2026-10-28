import fs from 'node:fs/promises';
import path from 'node:path';
import JSZip from 'jszip';
import { execFileSync } from 'node:child_process';
const out=path.resolve('outputs'),dir=path.join(out,'Form-Studio-MCP');await fs.mkdir(dir,{recursive:true});
for(const file of ['server.mjs','Form-Studio.html'])await fs.copyFile('local-mcp/'+file,path.join(dir,file));
for(const [src,name] of [['mcp/README.md','README.md'],['mcp/setup-config.mjs','setup-config.mjs']])await fs.copyFile(src,path.join(dir,name));
await fs.copyFile('mcp/README.md',path.join(out,'MCP-setup.md'));
let notices='Third-party notices for Form Studio MCP\n';
async function licenses(base){for(const entry of await fs.readdir(base,{withFileTypes:true})){if(!entry.isDirectory()||entry.name.startsWith('.'))continue;const folder=path.join(base,entry.name);if(entry.name.startsWith('@')){await licenses(folder);continue;}const files=await fs.readdir(folder),license=files.find(n=>/^licen[sc]e/i.test(n));if(license)notices+='\n=== '+folder.replace(/\\/g,'/')+' ===\n'+await fs.readFile(path.join(folder,license),'utf8')+'\n';}}
await licenses('node_modules');await fs.writeFile(path.join(dir,'THIRD-PARTY-NOTICES.txt'),notices);
execFileSync(process.execPath,[path.join(dir,'setup-config.mjs')],{stdio:'inherit'});
const zip=new JSZip();for(const name of ['server.mjs','Form-Studio.html','README.md','setup-config.mjs','THIRD-PARTY-NOTICES.txt'])zip.file(name,await fs.readFile(path.join(dir,name)));await fs.writeFile(path.join(out,'Form-Studio-MCP-local.zip'),await zip.generateAsync({type:'nodebuffer',compression:'DEFLATE'}));
const source=new JSZip();for(const f of ['app.js','styles.css','index.template.html','build.cjs','server.cjs','tests.cjs','package-output.cjs','package.json','package-lock.json','README.md','.gitignore'])source.file(f,await fs.readFile(f));for(const f of await fs.readdir('mcp'))if(/\.(?:mjs|md|js)$/.test(f))source.file('mcp/'+f,await fs.readFile('mcp/'+f));source.file('.openai/hosting.json',await fs.readFile('.openai/hosting.json'));source.file('THIRD-PARTY-NOTICES.txt',notices);await fs.writeFile(path.join(out,'Form-Studio-source.zip'),await source.generateAsync({type:'nodebuffer',compression:'DEFLATE'}));
console.log('Packaged local server, client configuration, guide, and source.');
