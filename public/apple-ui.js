/* Presentation only: no network calls, health inference, or personal-data storage. */
(()=>{'use strict';
 const paths={
  heart:'<path d="M20.8 4.6a5.5 5.5 0 0 0-7.8 0L12 5.7l-1.1-1.1a5.5 5.5 0 0 0-7.8 7.8L12 21l8.8-8.6a5.5 5.5 0 0 0 0-7.8Z"/>',
  pulse:'<path d="M2 12h4l3-8 5 16 3-8h5"/>',
  spark:'<path d="m12 3 2.3 6.7L21 12l-6.7 2.3L12 21l-2.3-6.7L3 12l6.7-2.3L12 3ZM20 2v4M18 4h4"/>',
  pill:'<path d="M6 18 18 6M4.8 19.2a5.7 5.7 0 0 1 0-8.1l6.3-6.3a5.7 5.7 0 0 1 8.1 8.1l-6.3 6.3a5.7 5.7 0 0 1-8.1 0Z"/>',
  calendar:'<rect x="3" y="5" width="18" height="16" rx="4"/><path d="M7 3v4M17 3v4M3 10h18M8 14h2M14 14h2M8 17h2"/>',
  trend:'<path d="M4 19h16M4 19V5M7 14l4-4 4 2 5-7"/>',
  cycle:'<path d="M12 3c-2.1 3.7-6 7.6-6 11a6 6 0 0 0 12 0c0-3.4-3.9-7.3-6-11Z"/><path d="M9 15c0 1.4 1.1 2.5 2.5 2.5"/>',
  camera:'<path d="m8 5 1.4-2h5.2L16 5h3a2 2 0 0 1 2 2v12a2 2 0 0 1-2 2H5a2 2 0 0 1-2-2V7a2 2 0 0 1 2-2Z"/><circle cx="12" cy="13" r="4"/>',
  weight:'<rect x="4" y="3" width="16" height="18" rx="4"/><path d="M8 7c2-2 6-2 8 0l-2 4h-4ZM12 6v3"/>',
  chat:'<path d="M21 11.5a8.5 8.5 0 0 1-8.5 8.5H8l-5 2v-6a8.5 8.5 0 1 1 18-4.5Z"/><path d="M8 11h8M8 15h5"/>',
  moon:'<path d="M20.5 14.5A8.7 8.7 0 0 1 9.5 3.5a9 9 0 1 0 11 11Z"/>',
  sun:'<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M2 12h2M20 12h2M5 5l1.5 1.5M17.5 17.5 19 19M5 19l1.5-1.5M17.5 6.5 19 5"/>',
  cloud:'<path d="M7 18h11a4 4 0 0 0 .6-8A6.5 6.5 0 0 0 6 9a4.5 4.5 0 0 0 1 9Z"/>',
  rain:'<path d="M7 15h11a4 4 0 0 0 .6-8A6.5 6.5 0 0 0 6 6a4.5 4.5 0 0 0 1 9ZM8 18l-1 3M13 18l-1 3M18 18l-1 3"/>',
  calm:'<circle cx="12" cy="12" r="9"/><path d="M7 10h2M15 10h2M8 16h8"/>',
  smile:'<circle cx="12" cy="12" r="9"/><path d="M7 10h2M15 10h2M7 14c3 4 7 4 10 0"/>',
  leaf:'<path d="M20 3C7 2 2 8 5 16s16 4 15-13ZM5 20 16 8M9 15h5M13 11V7"/>',
  menu:'<path d="M4 6h16M4 12h12M4 18h16"/>',
  plus:'<path d="M12 4v16M4 12h16"/>',
  refresh:'<path d="M20 7v5h-5M4 17v-5h5M5.1 7A8 8 0 0 1 19 7l1 5M4 12l1 5a8 8 0 0 0 13.9 0"/>'
 };
 const markup=name=>'<svg class="ui-symbol" viewBox="0 0 24 24" aria-hidden="true" focusable="false">'+(paths[name]||paths.spark)+'</svg>';
 const selectors='.brand-mark,.mini-orb,.welcome-orb,.cycle-icon,.vital-label>span:first-child,.mood-picker button>span,.suggestion-grid button>span,.quick-actions button>span:first-child,.control-shortcuts button>span:first-child,.care-tile>span:first-child,.care-meal-icon,#open-history,#new-chat,#refresh-latest,#theme-toggle';
 function nameFor(el){
  if(el.id==='theme-toggle')return document.body.classList.contains('dark')?'sun':'moon';
  if(el.id==='open-history')return 'menu';if(el.id==='new-chat')return 'plus';if(el.id==='refresh-latest')return 'refresh';
  if(el.matches('.brand-mark,.mini-orb,.welcome-orb'))return 'spark';
  const button=el.closest('button'),mood=button?.dataset.mood,care=button?.dataset.pane;
  if(mood)return ({1:'rain',2:'cloud',3:'calm',4:'smile',5:'sun'})[mood];
  if(care)return ({medications:'pill',plan:'calendar',signals:'trend',cycle:'cycle'})[care]||'spark';
  if(el.classList.contains('care-meal-icon'))return 'leaf';
  if(el.closest('#latest-heart'))return 'heart';if(el.closest('#latest-stress'))return 'pulse';
  if(el.closest('#food')&&el.classList.contains('cycle-icon')&&!button)return 'camera';
  if(button?.dataset.view==='reports')return 'trend';if(button?.dataset.view==='cycle'||el.classList.contains('cycle-icon'))return 'cycle';
  if(button?.id==='quick-food'||button?.id==='welcome-food')return 'camera';if(button?.id==='quick-weight')return 'weight';if(button?.id==='quick-talk')return 'chat';
  return ({'♡':'heart','☾':'moon','↗':'pulse','◉':'camera','✧':'spark'})[el.textContent.trim()]||'spark';
 }
 function decorate(root=document){
  if(!root)return;
  const nodes=[...(root.matches?.(selectors)?[root]:[]),...(root.querySelectorAll?.(selectors)||[])];
  for(const el of nodes){const name=nameFor(el);if(el.dataset.uiIcon!==name||!el.querySelector('svg.ui-symbol')){el.dataset.uiIcon=name;el.innerHTML=markup(name);}}
 }
 function navigation(){for(const button of document.querySelectorAll('nav button')){if(button.classList.contains('active'))button.setAttribute('aria-current','page');else button.removeAttribute('aria-current');}}
 function appearance(){const meta=document.querySelector('meta[name="theme-color"]');if(meta)meta.content=document.body.classList.contains('dark')?'#101014':'#f5f5fa';decorate(document.getElementById('theme-toggle'));}
 decorate();navigation();appearance();
 if(typeof MutationObserver!=='undefined')new MutationObserver(records=>{
  for(const record of records){if(record.type==='childList')for(const node of record.addedNodes){if(node.nodeType===1)decorate(node);else if(record.target?.id==='theme-toggle')decorate(record.target);}else if(record.target===document.body)appearance();else if(record.target?.closest?.('nav'))navigation();}
 }).observe(document.body,{childList:true,subtree:true,attributes:true,attributeFilter:['class']});
 window.HealthAppearance={refresh:()=>{decorate();navigation();appearance();}};
})();
