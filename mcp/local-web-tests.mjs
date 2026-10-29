import assert from 'node:assert/strict';
import fs from 'node:fs/promises';
import os from 'node:os';
import path from 'node:path';
import http from 'node:http';
import { LocalStore } from './local-store.mjs';
import { createService } from './service.mjs';
import { startLocalWeb } from './local-web.mjs';
const root=await fs.mkdtemp(path.join(os.tmpdir(),'form-studio-web-'));
const template=await fs.readFile('dist/index.html','utf8');
const store=await new LocalStore(root).init(),web=await startLocalWeb({store,template,port:0});
try{
 const html=await(await fetch(web.url)).text();
 const config=JSON.parse(html.match(/<script id="form-config" type="application\/json">(.*?)<\/script>/)[1]);
 assert.equal(config.mcpLocal,true);assert.equal(config.mcpEnabled,true);
 const headers={'x-form-studio-token':config.mcpToken,'content-type':'application/json'};
 assert.equal((await fetch(web.url+'/api/forms')).status,403);
 assert.equal((await fetch(web.url+'/api/forms',{headers:{...headers,origin:'https://example.com'}})).status,403);
 const hostStatus=await new Promise((resolve,reject)=>{http.get(web.url,{headers:{host:'example.com'}},r=>{r.resume();resolve(r.statusCode);}).on('error',reject);});assert.equal(hostStatus,403);
 const document={format:'form-studio-draft',version:1,schema:{id:'test',title:'Local draft',fields:[{id:'name',type:'text',label:'Name'}]},answers:{name:'Saved locally'}};
 const saved=await(await fetch(web.url+'/api/import',{method:'POST',headers,body:JSON.stringify(document)})).json();
 assert.ok(saved.artifact_id,JSON.stringify(saved));
 // A second store instance represents the independent stdio process.
 const assistantStore=await new LocalStore(root).init();
 assert.equal((await assistantStore.getRecord(saved.artifact_id)).document.answers.name,'Saved locally');
 const service=createService(assistantStore,template);
 const fromMcp=await service.call('import_document',{document:{format:'form-studio-design',version:1,schema:{id:'assistant',title:'From the assistant',fields:[]}}});
 const opened=await(await fetch(web.url+'/api/forms/'+fromMcp.artifact_id,{headers})).json();assert.equal(opened.schema.title,'From the assistant');
 const list=await(await fetch(web.url+'/api/forms',{headers})).json();assert.equal(list.items.length,2);
 assert.equal((await fetch(web.url+'/api/import',{method:'POST',headers,body:'{'})).status,400);
 assert.equal((await fetch(web.url+'/api/forms/not-an-id',{headers})).status,400);
 assert.equal((await fetch(web.url+'/api/import',{method:'POST',headers,body:' '.repeat(8*1024*1024+1)})).status,413);
 console.log('PASS: local UI configuration, browser-to-MCP and MCP-to-browser saves, persistent shared library, token/origin/host validation and request limits.');
}finally{await new Promise(r=>web.server.close(r));await fs.rm(root,{recursive:true,force:true});}
