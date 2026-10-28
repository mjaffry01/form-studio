import { Document,Packer,Paragraph,TextRun,ImageRun,HeadingLevel } from 'docx';
import pdfMake from 'pdfmake/build/pdfmake.js';
import fonts from 'pdfmake/build/vfs_fonts.js';
import JSZip from 'jszip';
import { documentBlocks,imageData } from './content.mjs';
pdfMake.addVirtualFileSystem(fonts);
export async function exportDocument(document,format){
 const blocks=documentBlocks(document);
 if(format==='pdf'){
  const definition={info:{title:document.schema.title,creator:'Form Studio MCP'},pageSize:'A4',pageMargins:[48,48,48,48],defaultStyle:{font:'Roboto',fontSize:10.5,color:'#263c32',lineHeight:1.25},styles:{title:{fontSize:23,bold:true,color:'#176c55',margin:[0,0,0,12]},description:{color:'#637267',margin:[0,0,0,19]},heading:{fontSize:16,bold:true,margin:[0,16,0,10]},label:{fontSize:11,bold:true,margin:[0,15,0,6]}},content:blocks.map(b=>{if(b.kind==='image'){const d=imageData(b.src),scale=Math.min(.75,495/d.width,500/d.height);return {image:b.src,width:d.width*scale,height:d.height*scale,margin:[0,5,0,9]};}if(b.kind==='text')return {text:b.runs.map(r=>({text:r.text,bold:r.bold,italics:r.italics,decoration:r.underline?'underline':undefined})),margin:[0,0,0,6]};return {text:b.text,style:b.kind};}),footer:(page,total)=>({text:`${page} / ${total}`,alignment:'right',fontSize:8,color:'#88958d',margin:[48,10,48,0]})};
  const pdf=pdfMake.createPdf(definition);
  // With embedded fonts/images, the pinned pdfmake version can create its stream
  // synchronously. This lets invalid image errors reach the MCP caller.
  return await new Promise((resolve,reject)=>{try{const doc=pdf._createDoc({}),parts=[];doc.on('data',chunk=>parts.push(chunk));doc.on('error',reject);doc.on('end',()=>{const size=parts.reduce((n,p)=>n+p.length,0),bytes=new Uint8Array(size);let offset=0;for(const p of parts){bytes.set(p,offset);offset+=p.length;}resolve(bytes);});doc.end();}catch(error){reject(error);}});
 }
 const children=blocks.map(b=>{if(b.kind==='image'){const d=imageData(b.src),scale=Math.min(1,624/d.width,650/d.height);return new Paragraph({children:[new ImageRun({data:d.bytes,type:d.type,transformation:{width:Math.max(1,Math.round(d.width*scale)),height:Math.max(1,Math.round(d.height*scale))}})],spacing:{after:160}});}if(b.kind==='text')return new Paragraph({children:b.runs.flatMap(r=>r.text.split('\n').map((line,i)=>new TextRun({text:line,break:i?1:undefined,bold:r.bold,italics:r.italics,underline:r.underline?{}:undefined}))),spacing:{after:100}});return new Paragraph({children:[new TextRun({text:b.text,bold:b.kind==='label'})],heading:b.kind==='title'?HeadingLevel.TITLE:b.kind==='heading'?HeadingLevel.HEADING_1:undefined,keepNext:['label','heading'].includes(b.kind),spacing:{before:b.kind==='label'?220:0,after:120}});});
 const doc=new Document({creator:'Form Studio MCP',title:document.schema.title,styles:{default:{document:{run:{font:'Calibri',size:22,color:'263C32'},paragraph:{spacing:{line:280}}}}},sections:[{properties:{page:{size:{width:11906,height:16838},margin:{top:960,bottom:960,left:960,right:960}}},children}]});return new Uint8Array(await Packer.toArrayBuffer(doc));
}
export function standaloneHTML(template,schema){const cfg=JSON.stringify({locked:true,schema}).replace(/</g,'\\u003c');return template.replace(/(<script id="form-config" type="application\/json">)[\s\S]*?(<\/script>)/,()=>`<script id="form-config" type="application/json">${cfg}</script>`);}
export async function exportForm(template,schema,format){const html=standaloneHTML(template,schema);if(format==='html')return new TextEncoder().encode(html);const zip=new JSZip();zip.file('index.html',html);zip.file('README.txt','Extract this ZIP and open index.html in a browser. Fill in the form, save a draft, and export Word or PDF. Works offline. Submit validates and opens export review; it does not send responses to a server.');return zip.generateAsync({type:'uint8array',compression:'DEFLATE'});}
