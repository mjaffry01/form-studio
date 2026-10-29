import http from 'node:http';
import { randomBytes } from 'node:crypto';
import { createService } from './service.mjs';

// A same-origin, loopback-only UI sharing the stdio server's immutable records.
export async function startLocalWeb({store,template,port=4174}){
 const token=randomBytes(32).toString('hex'),service=createService(store,template);
 let origin;
 const server=http.createServer(async(req,res)=>{
  const send=(status,data,type='application/json')=>{res.writeHead(status,{'content-type':type,'cache-control':'no-store','x-content-type-options':'nosniff','referrer-policy':'no-referrer','content-security-policy':"frame-ancestors 'none'"});res.end(type==='application/json'?JSON.stringify(data):data);};
  if(req.headers.host!==new URL(origin).host)return send(403,{error:'Invalid local host.'});
  if((req.headers.origin&&req.headers.origin!==origin)||req.headers['sec-fetch-site']==='cross-site')return send(403,{error:'Open the local Form Studio address directly.'});
  const url=new URL(req.url,origin);
  if(url.pathname==='/'&&req.method==='GET')return send(200,template.replace('<script id="form-config" type="application/json">{"locked":false}</script>',`<script id="form-config" type="application/json">${JSON.stringify({locked:false,mcpEnabled:true,mcpLocal:true,mcpToken:token})}</script>`),'text/html; charset=utf-8');
  if(!url.pathname.startsWith('/api/'))return send(404,{error:'Not found.'});
  if(req.headers['x-form-studio-token']!==token)return send(403,{error:'Reopen the local app to reconnect to its library.'});
  try{
   if(url.pathname==='/api/forms'&&req.method==='GET')return send(200,await service.call('list_forms',{limit:50,cursor:url.searchParams.get('cursor')||undefined}));
   if(url.pathname.startsWith('/api/forms/')&&req.method==='GET')return send(200,(await store.getRecord(url.pathname.slice('/api/forms/'.length))).document);
   if(url.pathname==='/api/import'&&req.method==='POST'){
    if(!req.headers['content-type']?.includes('application/json'))return send(415,{error:'Use application/json.'});
    const limit=8*1024*1024;
    if(Number(req.headers['content-length']||0)>limit)return send(413,{error:'Library saves are limited to 8 MB.'});
    let size=0;const parts=[];
    for await(const part of req){size+=part.length;if(size>limit){send(413,{error:'Library saves are limited to 8 MB.'});return;}parts.push(part);}
    return send(200,await service.call('import_document',{document:JSON.parse(Buffer.concat(parts).toString('utf8'))}));
   }
   return send(404,{error:'Not found.'});
  }catch(e){return send(400,{error:e.message});}
 });
 server.requestTimeout=30000;server.headersTimeout=15000;
 await new Promise((resolve,reject)=>{server.once('error',reject);server.listen(port,'127.0.0.1',()=>{origin=`http://127.0.0.1:${server.address().port}`;resolve();});});
 return {server,url:origin};
}
