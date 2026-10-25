const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),{parseHTML}=require('../.sites-runtime/qa/node_modules/linkedom');const tick=()=>new Promise(r=>setImmediate(r));
(async()=>{for(const english of [false,true]){
 const {window}=parseHTML(fs.readFileSync(english?'public/health-en.html':'public/health.html','utf8')),{document}=window;let synced=0,opened=null;
 const source={checkedAt:'2026-10-25T23:46:43Z',totalTags:2,cycleInsightsAvailable:false,statuses:[{resource:'enhanced_tag',status:'error',detail:'Oura 返回 HTTP 401'}],observations:[{id:'one',day:'2026-10-01',label:'Period <script>alert(1)</script>',confirmedStart:false}]};
 window.HealthCareBridge={sync:async options=>{assert.equal(options.cycleOnly,true);synced++;},refreshCycle:async()=>window.CycleSync.update(source),openCycle:day=>{opened=day;}};
 const context={window,document,Date,console};vm.createContext(context);vm.runInContext(fs.readFileSync('public/cycle-sync.js','utf8'),context);await tick();
 assert.equal(document.querySelectorAll('#cycle-source').length,1);assert.ok(document.getElementById('cycle-source').textContent.includes(english?'unavailable through the public API':'公开接口未提供'));assert.equal(document.querySelectorAll('#cycle-source script').length,0,'untrusted Oura tag labels are escaped');assert.equal(document.querySelectorAll('[data-cycle-tag]').length,1);
 document.querySelector('[data-cycle-tag]').click();assert.equal(opened,'2026-10-01');assert.ok(document.getElementById('cycle-note').value.includes('Period'));
 document.getElementById('cycle-note').value='A manual note';document.querySelector('[data-cycle-tag]').click();assert.equal(document.getElementById('cycle-note').value,'A manual note','manual notes are never overwritten by a tag');
 await document.getElementById('cycle-check-cloud').onclick();assert.equal(synced,1);assert.equal(source.observations[0].confirmedStart,false,'review never silently creates a confirmed start');
 if(english)assert.equal(/\p{Script=Han}/u.test(document.getElementById('cycle-source').textContent),false);
 }console.log('Passed: bilingual cycle provenance, actual tag refresh action, escaped labels, explicit review and preserved manual notes.');})().catch(e=>{console.error(e);process.exit(1)});
