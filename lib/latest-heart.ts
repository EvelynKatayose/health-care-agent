export function newestHeart(rows:Record<string,unknown>[]){return rows.filter(r=>typeof r.timestamp==='string'&&Number.isFinite(Date.parse(r.timestamp))&&typeof r.bpm==='number'&&r.bpm>0).sort((a,b)=>Date.parse(String(b.timestamp))-Date.parse(String(a.timestamp)))[0]||null;}
export async function recentHeart(token:string){
 const checks:Record<string,unknown>[]=[],samples:Record<string,unknown>[]=[];
 const now=new Date(),recent=new URLSearchParams({start_datetime:new Date(now.getTime()-4*3600000).toISOString(),end_datetime:now.toISOString()});
 for(const [mode,query] of [['latest','latest=true'],['recent',recent.toString()]]){
  try{const response=await fetch('https://api.ouraring.com/v2/usercollection/heartrate?'+query,{headers:{Authorization:'Bearer '+token,'Cache-Control':'no-cache'},cache:'no-store',signal:AbortSignal.timeout(15000)});
   if(!response.ok){checks.push({mode,status:response.status});if(response.status===429)break;continue;}
   const data=await response.json() as {data?:Record<string,unknown>[];next_token?:string};if(!Array.isArray(data.data)){checks.push({mode,error:'Invalid response'});continue;}
   const latest=newestHeart(data.data);samples.push(...data.data);checks.push({mode,status:200,count:data.data.length,latestMeasurement:latest?.timestamp||null,partial:!!data.next_token});
   if(latest&&now.getTime()-Date.parse(String(latest.timestamp))<10*60000)break;
  }catch{checks.push({mode,error:'Request failed or timed out'});}
 }
 return {checks,samples};
}
export function mergeHeart(history:Record<string,unknown>[],extra:Record<string,unknown>[],start:string,end:string){const merged=new Map(history.map(r=>[String(r.timestamp)+':'+String(r.source),r]));for(const r of extra){const t=Date.parse(String(r.timestamp));if(Number.isFinite(t)&&t>=Date.parse(start)&&t<Date.parse(end))merged.set(String(r.timestamp)+':'+String(r.source),r);}return [...merged.values()];}
