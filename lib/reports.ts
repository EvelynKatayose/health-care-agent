import {healthData,encryptedRows} from './health';
import {database,seal} from './oura';
function dateInZone(time:string,zone:string){return new Intl.DateTimeFormat('en-CA',{timeZone:zone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(time));}
function shift(day:string,n:number){return new Date(Date.parse(day)+n*86400000).toISOString().slice(0,10);}
function average(values:unknown[]){const n=values.filter((x):x is number=>typeof x==='number'&&Number.isFinite(x));return n.length?Math.round(n.reduce((a,b)=>a+b,0)/n.length*10)/10:null;}
export function summarizeReport(data:Record<string,any[]>,entries:any[],period:'week'|'month'|'morning',timeZone='America/New_York',now=new Date().toISOString()){
 try{new Intl.DateTimeFormat('en',{timeZone}).format();}catch{throw Error('无效时区');}
 const today=dateInZone(now,timeZone),days=period==='month'?30:period==='week'?7:1,from=shift(today,1-days),before=shift(from,-days);
 const rowDay=(r:any)=>r.day?String(r.day):r.start_datetime||r.timestamp?dateInZone(r.start_datetime||r.timestamp,timeZone):'';
 const within=(day:string,start=from,end=today)=>day>=start&&day<=end;
 const notes=entries.map(n=>({...n,day:dateInZone(n.time,timeZone)})),selected=notes.filter(n=>within(n.day));
 const meals=selected.filter(n=>n.kind==='meal'&&n.nutrition),mealDays=new Set(meals.map(n=>n.day));
 const totals=Object.fromEntries(['kcal','protein','carbs','fat'].map(key=>[key,meals.length?Math.round(meals.reduce((sum,n)=>sum+(Number(n.nutrition[key])||0),0)*10)/10:null]));
 const weights=notes.filter(n=>Number.isFinite(n.weight)&&n.weight>0).sort((a,b)=>a.time.localeCompare(b.time)),currentWeights=weights.filter(n=>within(n.day));
 const previous=notes.filter(n=>within(n.day,before,shift(from,-1))&&Number.isFinite(n.weight));
 const activity=(data.daily_activity||[]).filter(r=>within(rowDay(r))),workouts=(data.workout||[]).filter(r=>within(rowDay(r)));
 const last=(type:string)=>(data[type]||[]).slice().filter(r=>rowDay(r)<=today&&(type!=='sleep'||r.type==='long_sleep')).sort((a,b)=>rowDay(b).localeCompare(rowDay(a)))[0]||null;
 const sleep=last('sleep'),readiness=last('daily_readiness');
 return {period,from,to:today,timeZone,generatedAt:now,coverage:{days,mealDays:mealDays.size,mealCount:meals.length,weightDays:new Set(currentWeights.map(n=>n.day)).size,activityDays:new Set(activity.map(rowDay)).size},nutrition:{totals,averagePerRecordedDay:mealDays.size?Object.fromEntries(Object.entries(totals).map(([k,v])=>[k,Math.round(Number(v)/mealDays.size)])):null,unestimatedMeals:selected.filter(n=>n.kind==='meal'&&!n.nutrition).length,notes:'仅汇总已记录的餐食，不代表完整全天摄入；照片和文字营养均为估算。'},activity:{workouts:workouts.length,workoutMinutes:Math.round(workouts.reduce((sum,w)=>sum+Math.max(0,(Date.parse(w.end_datetime)-Date.parse(w.start_datetime))/60000||0),0)),averageSteps:average(activity.map(r=>r.steps)),totalActiveKcal:activity.length?activity.reduce((sum,r)=>sum+(r.active_calories||0),0):null,manualExerciseLogs:selected.filter(n=>n.kind==='exercise').length},weight:{first:currentWeights[0]?.weight??null,last:currentWeights.at(-1)?.weight??null,change:currentWeights.length>=2?Math.round((currentWeights.at(-1).weight-currentWeights[0].weight)*10)/10:null,average:average(currentWeights.map(n=>n.weight)),previousAverage:average(previous.map(n=>n.weight)),series:currentWeights.map(n=>({day:n.day,value:n.weight}))},sleep:{latest:sleep?{day:rowDay(sleep),seconds:sleep.total_sleep_duration,hrv:sleep.average_hrv,heartRate:sleep.average_heart_rate}:null,score:last('daily_sleep')?.score??null,scoreDay:last('daily_sleep')?.day??null,readiness:readiness?{day:readiness.day,score:readiness.score}:null,averageHours:average((data.sleep||[]).filter(r=>within(rowDay(r))&&r.type==='long_sleep').map(r=>r.total_sleep_duration/3600))},stress:last('daily_stress'),limitations:['没有记录的日期不按 0 计算。','运动记录与活动消耗可能重叠，不相加为总消耗。','不根据摄入估计和设备消耗直接计算精确热量缺口。']};
}
export async function reportFor(user:string,period:'week'|'month'|'morning',zone='America/New_York'){
 const [health,entries]=await Promise.all([healthData(user,65),encryptedRows('journal_entries',user,2000)]);return {...summarizeReport(health.data,entries,period,zone),syncedAt:health.syncedAt,syncStatus:health.statuses,recordsMayBeTruncated:entries.length===2000||health.limitReached};
}
export async function saveReport(user:string,period:'week'|'month'|'morning',zone='America/New_York'){
 const report=await reportFor(user,period,zone),id=user+':report:'+period+':'+report.to;
 await database().prepare('INSERT INTO journal_entries(id,user_id,payload,created_at) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload').bind(id,user,await seal(JSON.stringify({kind:'report',text:(period==='week'?'周报':period==='month'?'月报':'晨报')+' · '+report.from+' 至 '+report.to,report}),user),report.generatedAt).run();return report;
}
