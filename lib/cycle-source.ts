import {database,unseal} from './oura';
import {recordDay} from './sync-overview';
// Deliberately exact: "rest_mode_period", predictions and free-form comments
// must never become menstrual records or confirmed period starts.
const periodNames=new Set(['period','menstruation','menstrual_period','period_start','menstruation_start','start_of_period','月经','经期','月经开始','生理期']);
function normalize(value:unknown){return typeof value==='string'?value.toLowerCase().trim().replace(/^tag_generic_/,'').replace(/[ -]+/g,'_'):'';}
export function periodObservations(records:Record<string,unknown>[]){
 const observations=new Map<string,{id:string;day:string;endDay:string|null;label:string;source:string;confirmedStart:boolean}>();
 for(const r of records){const labels=[r.tag_type_code,r.custom_name,...(Array.isArray(r.tags)?r.tags:[])];const matched=labels.find(label=>periodNames.has(normalize(label)));if(!matched)continue;const day=recordDay(r);if(!/^\d{4}-\d{2}-\d{2}$/.test(day)||!Number.isFinite(Date.parse(day))||new Date(day).toISOString().slice(0,10)!==day)continue;const id=String(r.id||day+':'+matched);observations.set(id,{id,day,endDay:typeof r.end_day==='string'?r.end_day:null,label:String(r.custom_name||matched),source:'oura_tag',confirmedStart:false});
 }return [...observations.values()].sort((a,b)=>b.day.localeCompare(a.day));
}
export async function cycleSource(user:string){
 const [rows,status]=await Promise.all([database().prepare("SELECT payload FROM health_records WHERE user_id=? AND resource IN ('enhanced_tag','tag') ORDER BY record_day DESC LIMIT 2000").bind(user).all<{payload:string}>(),database().prepare("SELECT resource,status,detail,updated_at FROM sync_status WHERE user_id=? AND resource IN ('enhanced_tag','tag') ORDER BY updated_at DESC").bind(user).all<any>()]);
 const tags=await Promise.all(rows.results.map(async row=>JSON.parse(await unseal(row.payload,user))));
 return {cycleInsightsAvailable:false,source:'public_tag_api_only',checkedAt:status.results[0]?.updated_at||null,statuses:status.results,totalTags:tags.length,limited:tags.length===2000,observations:periodObservations(tags),note:'Oura public API does not expose Cycle Insights period history, phases or predictions. Tags are observations only, not confirmed menstrual starts. Manual records remain the source of the cycle calendar.'};
}
