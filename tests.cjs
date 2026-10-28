const fs=require('fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom'),JSZip=require('jszip');
const html=fs.readFileSync('index.template.html','utf8');
const dom=new JSDOM(html,{runScripts:'outside-only',url:'http://localhost',pretendToBeVisual:true}),w=dom.window;
w.scrollTo=()=>{};w.confirm=()=>true;w.Blob=Blob;w.Uint8Array=Uint8Array;w.ArrayBuffer=ArrayBuffer;w.docx=require('docx');w.JSZip=JSZip;
const objects=new Map();w.URL.createObjectURL=b=>{const id='blob:'+objects.size;objects.set(id,b);return id;};w.URL.revokeObjectURL=()=>{};
const downloads=[];w.HTMLAnchorElement.prototype.click=function(){downloads.push({name:this.download,blob:objects.get(this.href)});};
let nextFile;w.HTMLInputElement.prototype.click=function(){if(this.type==='file'){Object.defineProperty(this,'files',{value:[nextFile],configurable:true});this.onchange();}};
w.Image=class {async decode(){const b=Buffer.from(this.src.split(',')[1],'base64');this.width=b.readUInt32BE(16);this.height=b.readUInt32BE(20);}};
w.eval(fs.readFileSync('node_modules/dompurify/dist/purify.js','utf8'));w.eval(fs.readFileSync('app.js','utf8'));
const api=w.FormStudio,$=s=>w.document.querySelector(s),click=s=>{assert.ok($(s),'Missing '+s);$(s).click();},input=(s,v)=>{$(s).value=v;$(s).dispatchEvent(new w.Event('input',{bubbles:true}));},change=(s,v)=>{$(s).value=v;$(s).dispatchEvent(new w.Event('change',{bubbles:true}));};
const pause=()=>new Promise(r=>setTimeout(r,80));
async function main(){
assert.equal(api.getState().schema.fields.length,5);click('[data-mode="fill"]');click('[data-mode="export"]');assert.equal(api.getState().mode,'fill');assert.match($('.error-text').textContent,/complete/);
const textId=api.getState().schema.fields.find(f=>f.type==='text').id;input('[data-answer="'+textId+'"]','Website refresh');
const richId=api.getState().schema.fields.find(f=>f.type==='rich').id;
const png='data:image/png;base64,iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAQAAAC1HAwCAAAAC0lEQVR42mP8/x8AAwMCAO+aKp8AAAAASUVORK5CYII=';
const rich=$('[data-rich]');rich.innerHTML='<p>Hello <b>bold</b> and <i>italic</i> text.</p><ul><li>First point</li><li>Second point</li></ul><img src="'+png+'"><p>After the image.</p>';rich.dispatchEvent(new w.Event('input'));
// Regression: entering Design must not erase answers when returning to Fill in.
click('[data-mode="design"]');click('[data-mode="fill"]');assert.equal($('[data-answer="'+textId+'"]').value,'Website refresh');assert.equal($('[data-rich] img').src,png);
click('[data-mode="export"]');assert.equal(api.getState().mode,'export');assert.match($('.answer').textContent,/Website refresh/);
const blocks=api.documentBlocks();assert.equal(blocks.filter(b=>b.kind==='image').length,1);assert.ok(blocks.some(b=>b.runs?.some(r=>r.bold&&r.text==='bold')));
assert.equal(api.cleanRich('<script>alert(1)</script><img src="https://bad.example/a.png" onerror="x"><b>Safe</b>'),'<b>Safe</b>');
assert.throws(()=>api.validateSchema({title:'Bad',fields:[{type:'text',id:'x" onclick="alert(1)',label:'x'}]}));
const word=Buffer.from(await (await api.createWord()).arrayBuffer());const wordZip=await JSZip.loadAsync(word);const xml=await wordZip.file('word/document.xml').async('string');assert.match(xml,/Website refresh/);assert.match(xml,/w:b/);assert.match(xml,/drawing/);assert.ok(Object.keys(wordZip.files).some(x=>x.startsWith('word/media/')&&x.endsWith('.png')));
fs.mkdirSync('test-results',{recursive:true});fs.writeFileSync('test-results/sample.docx',word);
const pdfMake=require('pdfmake/build/pdfmake.js');pdfMake.addVirtualFileSystem(require('pdfmake/build/vfs_fonts.js'));
const definition=await api.pdfDefinition();const pdf=await new Promise(resolve=>pdfMake.createPdf(definition).getBuffer(resolve));assert.equal(pdf.subarray(0,4).toString(),'%PDF');fs.writeFileSync('test-results/sample.pdf',pdf);
click('[data-action="save-draft"]');const saved=JSON.parse(await downloads.at(-1).blob.text());assert.equal(saved.answers[richId].includes(png),true);assert.equal(saved.answers[textId],'Website refresh');
click('[data-mode="fill"]');input('[data-answer="'+textId+'"]','Changed');nextFile={size:100,text:async()=>JSON.stringify(saved)};click('[data-action="open-draft"]');await pause();assert.equal($('[data-answer="'+textId+'"]').value,'Website refresh');assert.equal($('[data-rich] img').src,png);
click('[data-mode="design"]');for(const type of ['textarea','select','datetime','heading'])click('[data-add="'+type+'"]');let schema=api.getState().schema;assert.equal(schema.fields.length,9);click('[data-duplicate]');assert.equal(api.getState().schema.fields.length,10);click('[data-move="-1"]');click('[data-delete]');assert.equal(api.getState().schema.fields.length,9);
const selectId=api.getState().schema.fields.find(f=>f.type==='select').id;click('[data-select="'+selectId+'"]');change('[data-prop="options"]','Alpha\nBeta\nBeta\n');assert.equal(api.getState().schema.fields.find(f=>f.id===selectId).options.join(','),'Alpha,Beta');
click('[data-action="save-design"]');const design=JSON.parse(await downloads.at(-1).blob.text());assert.equal(design.format,'form-studio-design');assert.equal(design.answers,undefined);
const portable=api.portableHTML(true);const d=new JSDOM(portable);const cfg=JSON.parse(d.window.document.querySelector('#form-config').textContent);assert.equal(cfg.locked,true);assert.equal(cfg.schema.fields.length,9);assert.equal(d.window.document.querySelector('#app').innerHTML,'');assert.ok(!portable.includes('Website refresh'));d.window.close();
// Reopen a packaged form with saved answers; its designer is unavailable.
$('#form-config').textContent=JSON.stringify(cfg);w.eval(fs.readFileSync('app.js','utf8'));assert.equal(w.FormStudio.getState().mode,'fill');assert.equal($('[data-mode="design"]'),null);
// A draft from a different form version cannot replace a locked form.
nextFile={size:100,text:async()=>JSON.stringify(saved)};click('[data-action="open-draft"]');await pause();assert.match($('#toast').textContent,/different form/);
console.log('PASS: required fields, preserved answers, rich text, embedded images, DOCX and PDF generation, draft round-trip, field add/duplicate/reorder/delete, dropdown options, design save, standalone form, import sanitization, version mismatch.');
w.close();}
main().catch(e=>{console.error(e);w.close();process.exitCode=1;});
