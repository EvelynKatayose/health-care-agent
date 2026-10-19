// Keep the chosen interface after opening from the Home Screen or OAuth callback.
(()=>{
 const url=new URL(location.href),english=url.pathname==='/health-en.html';
 const explicit=url.searchParams.get('lang');
 try{
  if(explicit==='zh')localStorage.setItem('hca-language','zh');
  else if(english||explicit==='en')localStorage.setItem('hca-language','en');
  if(!english&&explicit!=='zh'&&localStorage.getItem('hca-language')==='en'){
   url.pathname='/health-en.html';location.replace(url.href);return;
  }
 }catch{}
 document.addEventListener('DOMContentLoaded',()=>{
  const link=document.getElementById('language-switch');
  if(link){link.hash=location.hash;link.addEventListener('click',()=>{link.hash=location.hash;});}
 });
})();
