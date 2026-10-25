import {database,seal,unseal} from './oura';
import {healthData,encryptedRows} from './health';
import {controlOverview,syncOverview} from './sync-overview';
import {buildSignals,dayInZone,medicationSchedule,shiftDay,zone,type CarePlan,type CareSettings,type Dose,type Medication} from './care-model';
export async function saveCare(user:string,kind:string,id:string,value:unknown,day=''){
 await database().prepare('INSERT INTO care_records(id,user_id,kind,day,payload,updated_at) VALUES(?,?,?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload,day=excluded.day,updated_at=excluded.updated_at WHERE care_records.user_id=excluded.user_id').bind(user+':care:'+kind+':'+id,user,kind,day,await seal(JSON.stringify(value),user),new Date().toISOString()).run();
}
export async function listCare<T>(user:string,kind:string,limit=100,since=''):Promise<T[]>{
 const r=await database().prepare('SELECT payload FROM care_records WHERE user_id=? AND kind=? AND day>=? ORDER BY updated_at DESC,id DESC LIMIT ?').bind(user,kind,since,limit).all<{payload:string}>();return Promise.all(r.results.map(async row=>JSON.parse(await unseal(row.payload,user)) as T));
}
export async function deleteCare(user:string,kind:string,id:string){await database().prepare('DELETE FROM care_records WHERE user_id=? AND id=?').bind(user,user+':care:'+kind+':'+id).run();}
export async function careSnapshot(user:string,timeZone='America/New_York',now=new Date().toISOString()){
 const tz=zone(timeZone),today=dayInZone(now,tz);
 const [medications,doses,plans,savedSettings,hidden,health,entries,completions]=await Promise.all([listCare<Medication>(user,'medication',32),listCare<Dose>(user,'dose',1500,shiftDay(today,-8)),listCare<CarePlan>(user,'plan',1),listCare<CareSettings>(user,'settings',1),listCare<{id:string;until:string}>(user,'dismissed',100),healthData(user,30),encryptedRows('journal_entries',user,150),listCare<{planId:string;item:string;done:boolean}>(user,'completion',1000,shiftDay(today,-30))]);
 if(plans[0])plans[0].completed=completions.filter(c=>c.planId===plans[0].id&&c.done).map(c=>c.item);
 const settings={timeZone:tz,sensitivity:savedSettings[0]?.sensitivity||'balanced'} as CareSettings;
 const signals=buildSignals(health.data,entries,settings,now),alerts=signals.filter(s=>!hidden.some(h=>h.id===s.id&&h.until>=today));
 const latestDays=Object.values(health.data).flatMap(rows=>rows.map(r=>r as {day?:string})).filter(r=>r.day&&r.day<=today).map(r=>r.day!).sort();
 return {overview:controlOverview(health.data,today),sync:health.sync||syncOverview(health.data,health.statuses,now),today,now,timeZone:tz,settings,medications,doses,schedule:medicationSchedule(medications,doses,now),plan:plans[0]||null,signals,alerts,coverage:{syncedAt:health.syncedAt,latestDay:latestDays.at(-1)||null,healthConnected:Object.keys(health.data).length>0,notes:entries.length},health,entries};
}
export async function careContext(user:string){const [medications,plans,doses,settings,completions]=await Promise.all([listCare<Medication>(user,'medication',32),listCare<CarePlan>(user,'plan',1),listCare<Dose>(user,'dose',100),listCare<CareSettings>(user,'settings',1),listCare<{planId:string;item:string;done:boolean}>(user,'completion',1000)]);if(plans[0])plans[0].completed=completions.filter(c=>c.planId===plans[0].id&&c.done).map(c=>c.item);return {medications:medications.filter(m=>m.active),plan:plans[0]||null,recentDoseLogs:doses,preferences:settings[0]||null,limitations:'Medication names, doses and schedules were entered by the user. Do not prescribe, change a dose, or advise doubling a missed dose. A generated meal/workout plan is an estimate and is not evidence that the user ate or exercised. Completion checkboxes are user-reported. Do not diagnose from trend signals.'};}
