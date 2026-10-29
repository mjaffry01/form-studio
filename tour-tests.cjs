const fs=require('fs'),assert=require('node:assert/strict'),{JSDOM}=require('jsdom');
for(const config of [{},{mcpEnabled:true},{locked:true,schema:{id:'own',title:'My saved form',fields:[]}}]){
 const dom=new JSDOM(fs.readFileSync('index.template.html','utf8'),{runScripts:'outside-only',url:'http://localhost'}),w=dom.window,d=w.document;
 d.querySelector('#form-config').textContent=JSON.stringify(config);
 w.scrollTo=()=>{};w.HTMLDialogElement.prototype.showModal=function(){this.open=true;};w.HTMLDialogElement.prototype.close=function(){this.open=false;};
 w.eval(fs.readFileSync('node_modules/dompurify/dist/purify.js','utf8'));w.eval(fs.readFileSync('app.js','utf8'));
 const click=s=>d.querySelector(s).click();
 if(!config.locked){click('[data-add="text"]');const title=d.querySelector('#form-title');title.value='My unsaved work';title.dispatchEvent(new w.Event('input'));}
 const before=JSON.stringify(w.FormStudio.getState());
 click('[data-tour-start]');assert.ok(d.querySelector('dialog').open);
 click('[data-tour="next"]');click('[data-tour="back"]');click('[data-tour="close"]');
 assert.equal(JSON.stringify(w.FormStudio.getState()),before,'Skip must preserve user form, answers and mode');
 click('[data-tour-start]');let count=0;
 while(d.querySelector('dialog')){assert.ok(d.querySelector('.tour-highlight'),'Each step must point to a rendered control');click('[data-tour="next"]');assert.ok(++count<=12);}
 assert.equal(JSON.stringify(w.FormStudio.getState()),before,'Finish must restore original work');
 click('[data-tour-start]');d.querySelector('dialog').dispatchEvent(new w.Event('cancel',{cancelable:true}));assert.equal(JSON.stringify(w.FormStudio.getState()),before);
 assert.equal(d.activeElement,d.querySelector('[data-tour-start]'),'Keyboard focus must return');dom.window.close();
}
console.log('PASS: builder, hosted and recipient tours; back, skip, finish, Escape, highlighted controls and original work preservation.');
