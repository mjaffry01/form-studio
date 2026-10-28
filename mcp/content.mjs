import { parseDocument } from 'htmlparser2';
import { formSchema } from './schema.mjs';
export const escapeHTML=s=>String(s??'').replace(/[&<>"']/g,c=>({'&':'&amp;','<':'&lt;','>':'&gt;','"':'&quot;',"'":'&#39;'}[c]));
const allowed=new Set(['p','div','br','b','strong','i','em','u','ul','ol','li','img']);
const dropped=new Set(['script','style','iframe','object','embed','svg','math','template','noscript']);
export function imageData(src){
 const match=/^data:image\/(png|jpeg);base64,([A-Za-z0-9+/]+={0,2})$/.exec(src||'');
 if(!match)throw new Error('Images must be embedded PNG or JPEG data URLs.');
 if(match[2].length>Math.ceil(2*1024*1024/3)*4)throw new Error('Each embedded image must be at most 2 MB.');
 const raw=atob(match[2]),bytes=Uint8Array.from(raw,c=>c.charCodeAt(0));let width,height;
 if(match[1]==='png'){
  if(bytes.length<33||![137,80,78,71,13,10,26,10].every((v,i)=>bytes[i]===v)||raw.slice(12,16)!=='IHDR')throw new Error('Invalid PNG image.');
  const v=new DataView(bytes.buffer);width=v.getUint32(16);height=v.getUint32(20);
 }else{
  if(bytes[0]!==255||bytes[1]!==216)throw new Error('Invalid JPEG image.');
  let p=2;while(p+4<bytes.length){if(bytes[p++]!==255)break;let marker=bytes[p++];while(marker===255)marker=bytes[p++];if(marker===217||marker===218)break;if(marker===1||(marker>=208&&marker<=215))continue;const length=(bytes[p]<<8)|bytes[p+1];if(length<2||p+length>bytes.length)break;if([192,193,194,195,197,198,199,201,202,203,205,206,207].includes(marker)){height=(bytes[p+3]<<8)|bytes[p+4];width=(bytes[p+5]<<8)|bytes[p+6];break;}p+=length;}
 }
 if(!width||!height||width>8192||height>8192||width*height>16000000)throw new Error('Image dimensions are invalid or exceed 16 megapixels.');
 return {bytes,width,height,type:match[1]==='jpeg'?'jpg':'png'};
}
export function cleanRich(html){
 let images=0;const tree=parseDocument(String(html||''));
 function render(n,depth=0){if(depth>100)throw new Error('Rich text is nested too deeply.');if(n.type==='text')return escapeHTML(n.data);const tag=n.name;if(dropped.has(tag))return '';if(tag==='img'){imageData(n.attribs?.src);if(++images>20)throw new Error('Use at most 20 images in one field.');return `<img src="${escapeHTML(n.attribs.src)}" alt="${escapeHTML(n.attribs.alt||'Attached image')}">`;}
 const text=(n.children||[]).map(c=>render(c,depth+1)).join('');if(!allowed.has(tag))return text;if(tag==='br')return '<br>';return `<${tag}>${text}</${tag}>`;}
 return tree.children.map(n=>render(n)).join('');
}
export function normalizeForm(input){
 const s=formSchema.parse(input),ids=new Set();let submit=0;
 s.fields=s.fields.map(f=>{if(ids.has(f.id))throw new Error('Field IDs must be unique.');ids.add(f.id);if(f.type==='submit'&&++submit>1)throw new Error('Use at most one submit button.');return {id:f.id,type:f.type,label:f.label,required:!!f.required,placeholder:f.placeholder||'',help:f.help||'',options:[...new Set(f.options||[])]};});s.description||='';return s;
}
export function normalizeAnswers(schema,values){
 const fields=new Map(schema.fields.map(f=>[f.id,f])),answers={};let size=0;
 for(const [id,value] of Object.entries(values||{})){const f=fields.get(id);if(!f)throw new Error(`Unknown field ID: ${id}`);if(['heading','submit'].includes(f.type))throw new Error(`The ${f.type} field does not accept answers.`);if(typeof value!=='string')throw new Error('Answers must be strings.');answers[id]=f.type==='rich'?cleanRich(value):value;size+=answers[id].length;if(size>6*1024*1024)throw new Error('Draft answers exceed the 6 MB server limit.');}
 return answers;
}
function validDate(value,time){const re=time?/^(\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2})(?::(\d{2}))?$/:/^(\d{4})-(\d{2})-(\d{2})$/;const m=re.exec(value);if(!m)return false;const [y,mo,d]=m.slice(1,4).map(Number);const days=new Date(Date.UTC(y,mo,0)).getUTCDate();return y>=100&&mo>=1&&mo<=12&&d>=1&&d<=days&&(!time||(+m[4]<24&&+m[5]<60&&+(m[6]||0)<60));}
export function validateDraft(document){const errors=[];for(const f of document.schema.fields){if(['heading','submit'].includes(f.type))continue;const v=document.answers?.[f.id]||'';const blocks=f.type==='rich'?richBlocks(v):[];const present=f.type==='rich'?blocks.some(b=>b.kind==='image'||b.runs?.some(r=>r.text.trim())):!!v.trim();if(f.required&&!present)errors.push({field_id:f.id,label:f.label,message:'Required field is empty.'});if(v&&['select','yesno'].includes(f.type)&&!(f.type==='yesno'?['Yes','No']:f.options).includes(v))errors.push({field_id:f.id,label:f.label,message:'Value is not one of the available choices.'});if(v&&['date','datetime'].includes(f.type)&&!validDate(v,f.type==='datetime'))errors.push({field_id:f.id,label:f.label,message:'Invalid date. Use YYYY-MM-DD or YYYY-MM-DDTHH:mm.'});}return {valid:!errors.length,errors};}
export function richBlocks(html){const root=parseDocument(cleanRich(html)),blocks=[];let runs=[];const flush=()=>{if(runs.length){blocks.push({kind:'text',runs});runs=[];}};function walk(n,style={}){if(n.type==='text'){if(n.data)runs.push({text:n.data,...style});return;}const tag=n.name;if(tag==='img'){flush();blocks.push({kind:'image',src:n.attribs.src});return;}if(tag==='br'){flush();return;}const block=['p','div','li','ul','ol'].includes(tag);if(block)flush();const st={...style};if(['b','strong'].includes(tag))st.bold=true;if(['i','em'].includes(tag))st.italics=true;if(tag==='u')st.underline=true;if(tag==='li'){const siblings=n.parent?.children.filter(c=>c.name==='li')||[];runs.push({text:n.parent?.name==='ol'?`${siblings.indexOf(n)+1}. `:'• ',...style});}for(const child of n.children||[])walk(child,st);if(block)flush();}for(const node of root.children)walk(node);flush();return blocks;}
export function documentBlocks(document){const s=document.schema,a=document.answers||{},blocks=[{kind:'title',text:s.title}];if(s.description)blocks.push({kind:'description',text:s.description});for(const f of s.fields){if(f.type==='submit')continue;if(f.type==='heading'){blocks.push({kind:'heading',text:f.label});continue;}blocks.push({kind:'label',text:f.label});const body=f.type==='rich'?richBlocks(a[f.id]||''):[{kind:'text',runs:[{text:a[f.id]||'Not provided'}]}];blocks.push(...(body.length?body:[{kind:'text',runs:[{text:'Not provided'}]}]));}return blocks;}
