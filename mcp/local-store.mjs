import fs from 'node:fs/promises';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import { artifactId } from './schema.mjs';
export class LocalStore {
 constructor(root){this.root=path.resolve(root);}
 async init(){await fs.mkdir(this.root,{recursive:true});this.root=await fs.realpath(this.root);for(const dir of ['records','exports','imports']){const p=path.join(this.root,dir);await fs.mkdir(p,{recursive:true});if((await fs.realpath(p))!==p)throw new Error(`Data directory must not contain a symlink: ${dir}`);}return this;}
 recordPath(id){return path.join(this.root,'records',artifactId.parse(id)+'.json');}
 recordLink(record){const p=this.recordPath(record.id);return {file_path:p,download_url:pathToFileURL(p).href};}
 async putRecord(record){const docPath=this.recordPath(record.id);await fs.writeFile(docPath,JSON.stringify(record.document,null,2),{flag:'wx'});await fs.writeFile(docPath+'.meta',JSON.stringify({id:record.id,kind:record.kind,title:record.document.schema.title,created_at:record.created_at,parent_id:record.parent_id}),{flag:'wx'});}
 async getRecord(id){const p=this.recordPath(id);try{if((await fs.lstat(p)).isSymbolicLink())throw new Error('Symlink records are not allowed.');const document=JSON.parse(await fs.readFile(p,'utf8')),meta=JSON.parse(await fs.readFile(p+'.meta','utf8'));return {...meta,document};}catch(e){if(e.code==='ENOENT')throw new Error('Artifact not found in this local server.');throw e;}}
 async list({kind='all',cursor,limit=30}){if(cursor&&!/^\d+$/.test(cursor))throw new Error('Invalid list cursor.');const names=(await fs.readdir(path.join(this.root,'records'))).filter(n=>/^[a-f0-9-]{36}\.json\.meta$/.test(n)).sort();const all=[];for(const name of names){const p=path.join(this.root,'records',name);if((await fs.lstat(p)).isSymbolicLink())continue;const meta=JSON.parse(await fs.readFile(p,'utf8'));if(kind==='all'||meta.kind===kind)all.push({...meta,...this.recordLink(meta)});}const offset=Number(cursor||0);return {items:all.slice(offset,offset+limit),next_cursor:offset+limit<all.length?String(offset+limit):null};}
 async putExport({id,name,mime,bytes,source_id}){const p=path.join(this.root,'exports',artifactId.parse(id)+'-'+path.basename(name));await fs.writeFile(p,bytes,{flag:'wx'});return {artifact_id:id,source_id,name,mime_type:mime,size_bytes:bytes.length,file_path:p,download_url:pathToFileURL(p).href};}
 async importBytes(filename,max=8*1024*1024){if(!filename||filename!==path.basename(filename)||/[\\/:]/.test(filename))throw new Error('Use only a filename inside the server imports folder.');const p=path.join(this.root,'imports',filename),real=await fs.realpath(p);if(path.dirname(real)!==path.join(this.root,'imports'))throw new Error('Imports must remain inside the imports folder.');const st=await fs.stat(real);if(!st.isFile()||st.size>max)throw new Error('Import file is too large or not a regular file.');return fs.readFile(real);}
}
