// Keep the chosen interface after opening from the Home Screen or OAuth callback.
(()=>{
 const url=new URL(location.href);
 // Static hosting removes .html; accept both forms to avoid a redirect loop.
 const page=url.pathname.replace(/\/+$/,'').replace(/\.html$/,'');
 const english=page==='/health-en';
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
