export function recordDay(record:Record<string,unknown>){const value=record.day||record.start_day||record.timestamp||record.start_datetime||record.start_time||'';return String(value).slice(0,10);}
export function syncOverview(data:Record<string,unknown[]>,statuses:any[],now=new Date().toISOString()){
 const latest=(rows:unknown[],field:string)=>rows.map(r=>(r as Record<string,unknown>)[field]).filter((s):s is string=>typeof s==='string'&&Number.isFinite(Date.parse(s))&&Date.parse(s)<=Date.parse(now)+60000).sort((a,b)=>Date.parse(a)-Date.parse(b)).at(-1)||null;
 const checkedAt=statuses.map(s=>s.updated_at).filter((s:unknown)=>typeof s==='string'&&Number.isFinite(Date.parse(s))).sort((a:string,b:string)=>Date.parse(a)-Date.parse(b)).at(-1)||null;
 const heart=latest(data.heartrate||[],'timestamp'),heartAgeMinutes=heart?Math.max(0,Math.floor((Date.parse(now)-Date.parse(heart))/60000)):null;
 return {checkedAt,heartCheckedAt:statuses.find(s=>s.resource==='heartrate')?.updated_at||null,heartMeasuredAt:heart,heartAgeMinutes,heartStale:heartAgeMinutes===null||heartAgeMinutes>30,phoneUploadStatus:'not_exposed_by_api',canForceRingUpload:false,resources:statuses.map(s=>({resource:s.resource,status:s.status,checkedAt:s.updated_at,detail:s.detail,latestDay:(data[s.resource]||[]).map(r=>recordDay(r as Record<string,unknown>)).filter(day=>/^\d{4}-\d{2}-\d{2}$/.test(day)&&day<=now.slice(0,10)).sort().at(-1)||null}))};
}
export function controlOverview(data:Record<string,any[]>,today:string){
 const select=(type:string,day:string)=>(data[type]||[]).find(r=>r.day===day&&typeof r.score==='number'&&Number.isFinite(r.score)&&r.score>=0&&r.score<=100)?.score??null;
 return {timeline:Array.from({length:7},(_,i)=>{const day=new Date(Date.parse(today)+(i-6)*86400000).toISOString().slice(0,10);return {day,readiness:select('daily_readiness',day),sleep:select('daily_sleep',day),activity:select('daily_activity',day)};})};
}
