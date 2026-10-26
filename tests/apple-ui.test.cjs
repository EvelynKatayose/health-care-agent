const fs=require('node:fs'),vm=require('node:vm'),assert=require('node:assert/strict'),postcss=require('postcss'),{parseHTML}=require('../.sites-runtime/qa/node_modules/linkedom');
const tick=()=>new Promise(r=>setTimeout(r,10));
const css=fs.readFileSync('public/apple-ui.css','utf8'),source=fs.readFileSync('public/apple-ui.js','utf8');
const ast=postcss.parse(css),selectors=[];ast.walkRules(rule=>selectors.push(rule.selector));
for(const section of ['.control-deck','.care-card','.chat-welcome','#food','#settings','.cycle-overview','.report-card','nav','dialog'])assert.ok(selectors.some(s=>s.includes(section)),'shared style coverage: '+section);
assert.match(css,/-apple-system/);assert.match(css,/linear-gradient/);assert.match(css,/-webkit-backdrop-filter/);assert.match(css,/prefers-reduced-motion/);assert.match(css,/prefers-reduced-transparency/);assert.match(css,/prefers-contrast/);assert.doesNotMatch(css,/@import|@font-face|url\(['"]?https:/,'no external fonts or assets');
assert.doesNotMatch(source,/\bfetch\s*\(|localStorage|sessionStorage/,'presentation module does not transmit or store health data');
async function run(english){
 const page=fs.readFileSync(english?'public/health-en.html':'public/health.html','utf8'),{window}=parseHTML(page),{document}=window;
 const styles=[...document.querySelectorAll('link[rel="stylesheet"]')].map(s=>s.getAttribute('href'));
 assert.equal(styles.at(-1),'/apple-ui.css?v=1');assert.match(page,/care\.js\?v=3/);assert.match(page,/apple-ui\.js\?v=1/);assert.equal(document.querySelector('.living-orb'),null);
 const foodInput=document.getElementById('chat-image'),label=foodInput.parentElement;let photoClicks=0;label.addEventListener('click',()=>photoClicks++);
 const context={window,document,MutationObserver:window.MutationObserver,console};vm.createContext(context);vm.runInContext(source,context);await tick();
 assert.ok(document.querySelector('.brand-mark svg.ui-symbol'));assert.ok(document.querySelector('.welcome-orb svg.ui-symbol'));assert.ok(document.getElementById('latest-heart').querySelector('.vital-label svg'));
 assert.equal(document.getElementById('chat-image'),foodInput,'file input is not replaced');label.click();assert.equal(photoClicks,1,'file-label click handler retained');
 assert.equal(document.querySelector('nav button.active').getAttribute('aria-current'),'page');
 for(const id of ['overview','data','chat','journal','cycle','food','reports','care','settings']){const before=document.getElementById(id),isHidden=before.hidden;context.window.HealthAppearance.refresh();assert.equal(document.getElementById(id),before,'section identity preserved');assert.equal(before.hidden,isHidden,'visibility is owned by existing navigation');}
 const dynamic=document.createElement('button');dynamic.dataset.care='open';dynamic.dataset.pane='medications';dynamic.className='care-tile';dynamic.innerHTML='<span>✚</span><strong>Existing user instructions</strong>';let clicks=0;dynamic.addEventListener('click',()=>clicks++);document.getElementById('care').append(dynamic);await tick();
 assert.equal(dynamic.querySelector('span').dataset.uiIcon,'pill');dynamic.querySelector('svg').dispatchEvent(new window.Event('click',{bubbles:true}));assert.equal(clicks,1,'SVG taps still activate parent controls');assert.equal(dynamic.querySelector('strong').textContent,'Existing user instructions');
 const icon=dynamic.querySelector('svg');await tick();assert.equal(dynamic.querySelector('svg'),icon,'observer settles instead of repeatedly replacing icons');
 const theme=document.getElementById('theme-toggle');document.body.classList.add('dark');theme.textContent='☀';await tick();assert.equal(theme.dataset.uiIcon,'sun');assert.equal(document.querySelector('meta[name="theme-color"]').content,'#101014');document.body.classList.remove('dark');await tick();assert.equal(theme.dataset.uiIcon,'moon');
 const [home,browse]=document.querySelectorAll('nav button');home.classList.remove('active');browse.classList.add('active');await tick();assert.equal(browse.getAttribute('aria-current'),'page');assert.equal(home.hasAttribute('aria-current'),false);
 for(const symbol of document.querySelectorAll('svg.ui-symbol'))assert.equal(symbol.getAttribute('aria-hidden'),'true');
}
(async()=>{await run(false);await run(true);console.log('Passed: bilingual Apple-style shared assets, full-page style coverage, system fonts, accessibility fallbacks, SVG icons, retained inputs/click handlers, dynamic cards, dark mode and navigation state.');})().catch(e=>{console.error(e);process.exit(1);});
