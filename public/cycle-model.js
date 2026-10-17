(function(root){
  'use strict';
  const dayMs=86400000;
  function validDate(day){return typeof day==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(day)&&Number.isFinite(Date.parse(day))&&new Date(day).toISOString().slice(0,10)===day;}
  function addDays(day,n){return new Date(Date.parse(day)+n*dayMs).toISOString().slice(0,10);}
  function daysBetween(a,b){return Math.round((Date.parse(b)-Date.parse(a))/dayMs);}
  function summary(entries,today){
    const rows=entries.map(e=>e.cycle||e).filter(e=>validDate(e.date)&&e.date<=today).sort((a,b)=>a.date.localeCompare(b.date));
    const starts=[...new Set(rows.filter(e=>e.start===true).map(e=>e.date))];
    const last=starts.at(-1)||null,intervals=starts.slice(1).map((s,i)=>daysBetween(starts[i],s)).slice(-6);
    const sorted=intervals.slice().sort((a,b)=>a-b),middle=Math.floor(sorted.length/2);
    const typical=sorted.length?Math.round(sorted.length%2?sorted[middle]:(sorted[middle-1]+sorted[middle])/2):null;
    const variable=intervals.length>=2&&(Math.max(...intervals)-Math.min(...intervals)>7);
    // This deliberately conservative calendar estimate never infers ovulation or rolls a missed date forward.
    const enough=intervals.length>=2&&intervals.every(n=>n>=15&&n<=90)&&!variable;
    return {last,day:last?daysBetween(last,today)+1:null,starts,intervals,typical,variable,next:enough?addDays(last,typical):null,rows};
  }
  const api={validDate,addDays,daysBetween,summary};
  if(typeof module!=='undefined'&&module.exports)module.exports=api;
  else root.CycleModel=api;
})(typeof globalThis!=='undefined'?globalThis:this);
