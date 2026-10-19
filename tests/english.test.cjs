const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),ts=require('typescript');
const {javascript,html}=require('../scripts/build-english.cjs');
const source=fs.readFileSync('public/health.js','utf8'),english=fs.readFileSync('public/health-en.js','utf8'),page=fs.readFileSync('public/health-en.html','utf8');
assert.equal(javascript(source),english,'generated JS must match source');
assert.equal(html(fs.readFileSync('public/health.html','utf8')),page,'generated HTML must match source');
assert.match(page,/<html lang="en">/);assert.match(page,/href="\/health.html\?lang=zh"/);assert.match(page,/health-en.js/);
assert.equal(/\p{Script=Han}/u.test(page.replace('中文','')),false,'all English UI copy must be translated');
const ids=s=>[...s.matchAll(/\bid="([^"]+)"/g)].map(m=>m[1]).sort();assert.deepEqual(ids(page),ids(fs.readFileSync('public/health.html','utf8')));
assert.match(english,/message:question,language:"en"/);assert.match(english,/JSON.stringify\(\{\.\.\.body,language:"en"\}\)/);
assert.match(english,/average_breath'\)return n\+" breaths\/min"/);
assert.throws(()=>javascript("const a='遗漏的翻译';"),/Missing English translation/);
const exported={};vm.runInNewContext(ts.transpileModule(fs.readFileSync('lib/chat-prompt.ts','utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS}}).outputText,{exports:exported});
assert.match(exported.instructions('natural','en'),/^Reply in natural English/);
assert.equal(exported.instructions('brief','zh').startsWith('Reply in natural English'),false);
function language(path,query,saved){const data=new Map(saved?[['hca-language',saved]]:[]),result={};const location={href:'https://example.test'+path+query+'#chat',hash:'#chat',replace:url=>result.redirect=url};const link={addEventListener(){}};vm.runInNewContext(fs.readFileSync('public/health-language.js','utf8'),{URL,location,localStorage:{getItem:k=>data.get(k),setItem:(k,v)=>data.set(k,v)},document:{addEventListener:(_name,fn)=>fn(),getElementById:()=>link}});return {...result,language:data.get('hca-language'),hash:link.hash};}
assert.match(language('/health.html','','en').redirect,/health-en.html#chat$/);
assert.equal(language('/health.html','?lang=zh','en').redirect,undefined);
assert.equal(language('/health.html','?lang=zh','en').language,'zh');
assert.equal(language('/health-en.html','','zh').language,'en');
assert.equal(language('/health-en.html','','zh').hash,'#chat');
// Production static hosting canonicalizes .html URLs to extensionless paths.
// An English page must settle after that redirect instead of reloading forever.
for(const path of ['/health-en','/health-en/','/health-en.html']){
 for(const saved of ['zh','en',undefined]){
  for(const query of ['','?lang=en']){
   const result=language(path,query,saved);
   assert.equal(result.redirect,undefined,`${path}${query} must not redirect`);
   assert.equal(result.language,'en');
   assert.equal(result.hash,'#chat');
  }
 }
}
for(const path of ['/health','/health.html']){
 const first=language(path,'?source=homescreen','en');
 const target=new URL(first.redirect);
 assert.equal(target.searchParams.get('source'),'homescreen');
 assert.equal(target.hash,'#chat');
 const canonical=target.pathname.replace(/\.html$/,'');
 assert.equal(language(canonical,target.search,'en').redirect,undefined,'canonical destination must settle');
 assert.equal(language(path,'?lang=zh','en').language,'zh');
 assert.equal(language(path,'?lang=zh','en').redirect,undefined);
}
console.log('Passed: complete English UI, source parity, DOM IDs, language requests and prompts, stored language preference, explicit Chinese override and preserved view.');
