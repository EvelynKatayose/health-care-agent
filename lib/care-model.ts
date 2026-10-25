// Personal trend rules, not clinical thresholds or diagnostic predictions.
export type Medication={id:string;name:string;dose:string;notes:string;times:string[];weekdays:number[];timeZone:string;active:boolean};
export type Dose={id:string;medicationId:string;day:string;time:string;status:'taken'|'skipped';recordedAt:string};
export type CareSettings={timeZone:string;sensitivity:'gentle'|'balanced'|'sensitive'};
export type PlanPreferences={goal:'balance'|'strength'|'endurance'|'recovery';equipment:'none'|'home'|'gym';minutes:number;sessions:number;foodPreferences:string;avoidFoods:string;constraints:string;calorieTarget:number|null;startDay:string;timeZone:string;language:'en'|'zh'};
export type PlanMeal={title:string;portion:string;ingredients:string[];kcal:number;protein:number;carbs:number;fat:number};
export type PlanDay={date:string;meals:PlanMeal[];workout:{title:string;type:'rest'|'walk'|'mobility'|'strength'|'cardio';minutes:number;intensity:'easy'|'moderate';steps:string[]};note:string};
export type CarePlan={id:string;createdAt:string;overview:string;preferences:PlanPreferences;days:PlanDay[];completed:string[];source:'openai';evidence:{latestDay:string|null;signals:string[]}};
export type Signal={id:string;kind:string;day:string;value:number|null;baseline:number|null;unit:string;count:number;level:'notice'|'checkin';source:string;action:string};
export function text(value:unknown,max:number,required=false){if(typeof value!=='string'||value.length>max||required&&!value.trim())throw Error('Invalid text / 请检查文字内容');return value.trim();}
export function validDay(value:unknown):value is string{return typeof value==='string'&&/^\d{4}-\d{2}-\d{2}$/.test(value)&&Number.isFinite(Date.parse(value))&&new Date(value).toISOString().slice(0,10)===value;}
export function zone(value:unknown){if(typeof value!=='string'||value.length>80)throw Error('Invalid time zone');try{new Intl.DateTimeFormat('en',{timeZone:value}).format();}catch{throw Error('Invalid time zone');}return value;}
export function dayInZone(now:string,timeZone:string){return new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit'}).format(new Date(now));}
export function localClock(now:string,timeZone:string){const p=new Intl.DateTimeFormat('en-GB',{timeZone,hour:'2-digit',minute:'2-digit',hourCycle:'h23'}).format(new Date(now));return p;}
export function shiftDay(day:string,n:number){return new Date(Date.parse(day)+n*86400000).toISOString().slice(0,10);}
export function weekday(day:string){return new Date(day+'T12:00:00Z').getUTCDay();}
export function validateMedication(value:unknown):Medication{
 const b=value as Medication;if(!b||typeof b!=='object')throw Error('Invalid medication');
 if(typeof b.id!=='string'||!/^med-[\w-]{1,64}$/.test(b.id))throw Error('Invalid medication id');
 if(!Array.isArray(b.times)||!b.times.length||b.times.length>6||b.times.some(t=>typeof t!=='string'||!/^([01]\d|2[0-3]):[0-5]\d$/.test(t)))throw Error('Use times such as 08:00 / 请填写有效时间');
 if(!Array.isArray(b.weekdays)||!b.weekdays.length||b.weekdays.some(d=>!Number.isInteger(d)||d<0||d>6))throw Error('Select reminder days');
 if(typeof b.active!=='boolean')throw Error('Invalid reminder status');
 return {id:b.id,name:text(b.name,100,true),dose:text(b.dose,120,true),notes:text(b.notes,600),times:[...new Set(b.times)].sort(),weekdays:[...new Set(b.weekdays)].sort(),timeZone:zone(b.timeZone),active:b.active};
}
export function validatePreferences(value:unknown,now=new Date().toISOString()):PlanPreferences{
 const b=value as PlanPreferences;if(!b||!['balance','strength','endurance','recovery'].includes(b.goal)||!['none','home','gym'].includes(b.equipment))throw Error('Choose a plan goal and equipment');
 if(!Number.isInteger(b.minutes)||b.minutes<10||b.minutes>90||!Number.isInteger(b.sessions)||b.sessions<1||b.sessions>5)throw Error('Choose 10–90 minutes and 1–5 sessions');
 const tz=zone(b.timeZone),today=dayInZone(now,tz);if(!validDay(b.startDay)||b.startDay<today||b.startDay>shiftDay(today,14))throw Error('Plan must start within the next 14 days');
 if(b.calorieTarget!==null&&(!Number.isFinite(b.calorieTarget)||b.calorieTarget<1200||b.calorieTarget>4500))throw Error('Optional calorie target must be 1200–4500; otherwise leave blank');
 return {goal:b.goal,equipment:b.equipment,minutes:b.minutes,sessions:b.sessions,foodPreferences:text(b.foodPreferences,1000),avoidFoods:text(b.avoidFoods,1000),constraints:text(b.constraints,1000),calorieTarget:b.calorieTarget,startDay:b.startDay,timeZone:tz,language:b.language==='en'?'en':'zh'};
}
export function doseId(medicationId:string,day:string,time:string){return medicationId+'@'+day+'@'+time;}
export function medicationSchedule(medications:Medication[],doses:Dose[],now=new Date().toISOString()){
 return medications.filter(m=>m.active).flatMap(m=>{const day=dayInZone(now,m.timeZone);if(!m.weekdays.includes(weekday(day)))return [];const clock=localClock(now,m.timeZone);return m.times.map(time=>{const id=doseId(m.id,day,time),dose=doses.find(d=>d.id===id);return {id,medicationId:m.id,name:m.name,dose:m.dose,notes:m.notes,day,time,timeZone:m.timeZone,status:dose?.status||(time<=clock?'due':'upcoming'),recordedAt:dose?.recordedAt||null};});}).sort((a,b)=>a.time.localeCompare(b.time));
}
const numeric=(n:unknown):n is number=>typeof n==='number'&&Number.isFinite(n);
function daily(rows:any[],key:string,predicate=(r:any)=>true){const map=new Map<string,any>();for(const row of rows){if(!validDay(row.day)||!numeric(row[key])||!predicate(row))continue;const old=map.get(row.day);if(!old||(row.total_sleep_duration||0)>(old.total_sleep_duration||0))map.set(row.day,row);}return [...map.values()].sort((a,b)=>a.day.localeCompare(b.day));}
export function buildSignals(data:Record<string,any[]>,entries:any[],settings:CareSettings,now=new Date().toISOString()):Signal[]{
 const today=dayInZone(now,settings.timeZone),result:Signal[]=[],s=settings.sensitivity;
 const rules=[{kind:'sleep',type:'daily_sleep',key:'score',unit:'score',low:true,delta:s==='gentle'?18:s==='sensitive'?10:15,action:'wind_down'},
 {kind:'hrv',type:'sleep',key:'average_hrv',unit:'ms',low:true,ratio:s==='gentle'?.65:s==='sensitive'?.85:.75,action:'gentle_day'},
 {kind:'heart',type:'sleep',key:'average_heart_rate',unit:'bpm',low:false,delta:s==='gentle'?12:s==='sensitive'?6:9,action:'recovery'},
 {kind:'readiness',type:'daily_readiness',key:'score',unit:'score',low:true,delta:s==='gentle'?18:s==='sensitive'?10:15,action:'gentle_day'}];
 for(const rule of rules){const rows=daily(data[rule.type]||[],rule.key,r=>rule.type!=='sleep'||r.type==='long_sleep').filter(r=>r.day<=today);const latest=rows.at(-1);if(!latest||latest.day<shiftDay(today,-1))continue;const previous=rows.filter(r=>r.day<latest.day&&r.day>=shiftDay(latest.day,-21));if(previous.length<5)continue;const values=previous.map(r=>r[rule.key]).sort((a,b)=>a-b),middle=Math.floor(values.length/2),baseline=values.length%2?values[middle]:(values[middle-1]+values[middle])/2,value=latest[rule.key];if(baseline<=0)continue;
  const changed='ratio' in rule?value<baseline*rule.ratio!:(rule.low?baseline-value:value-baseline)>=rule.delta!;
  if(changed)result.push({id:rule.kind+':'+latest.day,kind:rule.kind,day:latest.day,value:Math.round(value*10)/10,baseline:Math.round(baseline*10)/10,unit:rule.unit,count:previous.length,level:'notice',source:rule.type+'.'+rule.key,action:rule.action});
 }
 const moodDays=new Map<string,number>();for(const row of entries.filter(r=>numeric(r.mood)&&r.time&&Number.isFinite(Date.parse(r.time))).sort((a,b)=>a.time.localeCompare(b.time))){const day=dayInZone(row.time,settings.timeZone);if(day>=shiftDay(today,-3)&&day<=today)moodDays.set(day,row.mood);}
 const recent=[...moodDays].sort((a,b)=>a[0].localeCompare(b[0]));if(recent.length>=2&&recent.slice(-2).every(([,m])=>m<=2)&&recent.at(-1)![0]>=shiftDay(today,-1))result.push({id:'mood:'+recent.at(-1)![0],kind:'mood',day:recent.at(-1)![0],value:recent.at(-1)![1],baseline:null,unit:'/5',count:2,level:'checkin',source:'user.mood',action:'connect'});
 const latest=daily(data.daily_sleep||[],'score').filter(r=>r.day<=today).at(-1);if(!latest||latest.day<shiftDay(today,-2))result.push({id:'coverage:'+today,kind:'coverage',day:latest?.day||today,value:null,baseline:null,unit:'',count:0,level:'notice',source:'Oura.daily_sleep',action:'sync'});
 return result;
}
export function validatePlan(value:unknown,preferences:PlanPreferences,signals:Signal[],now=new Date().toISOString()):CarePlan{
 const b=value as any;if(!b||!Array.isArray(b.days)||b.days.length!==7)throw Error('Plan must contain seven complete days');
 const allergies=preferences.avoidFoods.toLowerCase(),avoid=allergies.split(/[,，;；\n]/).map(x=>x.trim()).filter(Boolean);
 if(/peanut|花生/.test(allergies))avoid.push('peanut','花生');
 const days:PlanDay[]=b.days.map((d:any,i:number)=>{
  const date=shiftDay(preferences.startDay,i);if(d.date!==date||!Array.isArray(d.meals)||d.meals.length!==3)throw Error('Plan dates or meal count do not match');
  const meals=d.meals.map((m:any)=>{const result:PlanMeal={title:text(m.title,150,true),portion:text(m.portion,250,true),ingredients:[],kcal:0,protein:0,carbs:0,fat:0};if(!Array.isArray(m.ingredients)||!m.ingredients.length||m.ingredients.length>20)throw Error('Missing meal ingredients');result.ingredients=m.ingredients.map((v:unknown)=>text(v,100,true));const labels=[result.title,...result.ingredients].join(' ').toLowerCase();if(avoid.some(a=>labels.includes(a)))throw Error('A meal includes an excluded ingredient. Please regenerate / 计划包含需避开的食材，请重新生成');for(const key of ['kcal','protein','carbs','fat'] as const){if(!numeric(m[key])||m[key]<0||m[key]>(key==='kcal'?2000:300))throw Error('Invalid nutrition estimate');result[key]=Math.round(m[key]*10)/10;}if(!result.kcal)throw Error('Missing meal energy estimate');const energy=4*(result.protein+result.carbs)+9*result.fat;if(Math.abs(energy-result.kcal)>Math.max(150,result.kcal*.3))throw Error('Meal energy and macros are inconsistent');return result;});
  const total=meals.reduce((n: number,m:PlanMeal)=>n+m.kcal,0);if(preferences.calorieTarget&&Math.abs(total-preferences.calorieTarget)>preferences.calorieTarget*.2)throw Error('Daily plan is too far from your chosen calorie target');
  const w=d.workout;if(!w||!['rest','walk','mobility','strength','cardio'].includes(w.type)||!['easy','moderate'].includes(w.intensity)||!Number.isInteger(w.minutes)||w.minutes<0||w.minutes>preferences.minutes||!Array.isArray(w.steps)||w.steps.length>10)throw Error('Invalid workout plan');
  const workout={title:text(w.title,150,true),type:w.type as PlanDay['workout']['type'],minutes:w.type==='rest'?0:w.minutes,intensity:w.intensity as 'easy'|'moderate',steps:w.steps.map((x:unknown)=>text(x,250,true))};
  if(i===0&&signals.some(s=>['hrv','heart','readiness','sleep'].includes(s.kind))){workout.intensity='easy';if(['strength','cardio'].includes(workout.type)){workout.type='walk';workout.title=preferences.language==='en'?'Easy movement; reassess how you feel':'轻松活动，先看看身体感受';workout.minutes=Math.min(20,workout.minutes);workout.steps=[preferences.language==='en'?'Choose a comfortable walk or rest. Stop if you feel unwell.':'选择舒适的散步或休息；不舒服就停止。'];}}
  return {date,meals,workout,note:text(d.note,600)};
 });
 if(days.filter(d=>['strength','cardio'].includes(d.workout.type)).length>preferences.sessions)throw Error('Too many training sessions');
 return {id:'plan-'+crypto.randomUUID(),createdAt:now,overview:text(b.overview,1200,true),preferences,days,completed:[],source:'openai',evidence:{latestDay:signals.filter(s=>s.kind!=='coverage').map(s=>s.day).sort().at(-1)||null,signals:signals.map(s=>s.id)}};
}
// UTC events are explicit for the next 30 days, so device import preserves DST.
export function localToUTC(day:string,time:string,timeZone:string){const wanted=Date.parse(day+'T'+time+':00Z');let guess=wanted;for(let i=0;i<5;i++){const parts=new Intl.DateTimeFormat('en-CA',{timeZone,year:'numeric',month:'2-digit',day:'2-digit',hour:'2-digit',minute:'2-digit',second:'2-digit',hourCycle:'h23'}).formatToParts(new Date(guess)),p=Object.fromEntries(parts.map(x=>[x.type,x.value]));const observed=Date.parse(p.year+'-'+p.month+'-'+p.day+'T'+p.hour+':'+p.minute+':'+p.second+'Z');const delta=wanted-observed;if(!delta)return new Date(guess).toISOString();guess+=delta;}return null;}
export function calendarFor(m:Medication,now=new Date().toISOString()){
 const escape=(s:string)=>s.replace(/\\/g,'\\\\').replace(/\r?\n/g,'\\n').replace(/,/g,'\\,').replace(/;/g,'\\;'),stamp=(s:string)=>s.replace(/[-:]/g,'').replace(/\.\d{3}/,'');
 const fold=(s:string)=>{let result='',bytes=0;for(const c of s){const n=new TextEncoder().encode(c).length;if(bytes+n>73){result+='\r\n ';bytes=1;}result+=c;bytes+=n;}return result;};
 const lines=['BEGIN:VCALENDAR','VERSION:2.0','PRODID:-//Health Care Agent//Medication reminders//EN','CALSCALE:GREGORIAN','METHOD:PUBLISH'];
 for(let i=0;i<30;i++){const day=shiftDay(dayInZone(now,m.timeZone),i);if(!m.active||!m.weekdays.includes(weekday(day)))continue;for(const time of m.times){const at=localToUTC(day,time,m.timeZone);if(!at||at<now)continue;lines.push('BEGIN:VEVENT','UID:'+doseId(m.id,day,time).replace(/:/g,'')+'@health-care-agent','DTSTAMP:'+stamp(now),'DTSTART:'+stamp(at),'DTEND:'+stamp(new Date(Date.parse(at)+5*60000).toISOString()),'SUMMARY:'+escape(m.name+' · '+m.dose),'DESCRIPTION:'+escape(m.notes+'\nUser-entered schedule. Follow your existing instructions. Export covers 30 days; re-export after editing.'),'BEGIN:VALARM','TRIGGER:PT0M','ACTION:DISPLAY','DESCRIPTION:'+escape(m.name),'END:VALARM','END:VEVENT');}}
 lines.push('END:VCALENDAR');return lines.map(fold).join('\r\n')+'\r\n';
}
