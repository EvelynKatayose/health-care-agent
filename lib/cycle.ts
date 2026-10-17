import {database,seal,unseal} from './oura';

export const flows=['none','spotting','light','medium','heavy'] as const;
export const symptoms=['cramps','headache','bloating','breast_tenderness','fatigue','low_mood','appetite_change','acne'] as const;
export type CycleEntry={date:string;flow:typeof flows[number];start:boolean;symptoms:string[];note:string};
export function validateCycle(value:unknown):CycleEntry {
  const b=value as Partial<CycleEntry>;
  if(!b||typeof b.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(b.date)||!Number.isFinite(Date.parse(b.date))||new Date(b.date).toISOString().slice(0,10)!==b.date)throw Error('请选择有效日期');
  const tomorrow=new Date(Date.now()+86400000).toISOString().slice(0,10);
  if(b.date>tomorrow||b.date<'1900-01-01')throw Error('只能记录已发生的日期');
  if(!flows.includes(b.flow as typeof flows[number]))throw Error('请选择经量');
  if(typeof b.start!=='boolean'||b.start&&!['light','medium','heavy'].includes(b.flow!))throw Error('开始日需要选择少量、中等或较多经量');
  if(!Array.isArray(b.symptoms)||b.symptoms.length>symptoms.length||b.symptoms.some(s=>!symptoms.includes(s as typeof symptoms[number])))throw Error('请选择有效症状');
  if(typeof b.note!=='string'||b.note.length>2000)throw Error('备注最多 2000 字');
  return {date:b.date,flow:b.flow!,start:b.start,symptoms:[...new Set(b.symptoms)],note:b.note.trim()};
}
export async function cycleEntries(user:string,limit=512){
  const prefix=user+':cycle:';
  const rows=await database().prepare('SELECT id,payload,created_at FROM journal_entries WHERE user_id=? AND substr(id,1,?)=? ORDER BY created_at DESC LIMIT ?').bind(user,prefix.length,prefix,limit).all<{id:string;payload:string;created_at:string}>();
  return Promise.all(rows.results.map(async row=>({id:row.id,time:row.created_at,...JSON.parse(await unseal(row.payload,user))})));
}
export async function saveCycle(user:string,cycle:CycleEntry){
  const flowText={none:'无出血',spotting:'点滴',light:'少量',medium:'中等',heavy:'较多'};
  const symptomText:Record<string,string>={cramps:'腹痛',headache:'头痛',bloating:'腹胀',breast_tenderness:'乳房胀痛',fatigue:'疲倦',low_mood:'情绪低落',appetite_change:'食欲变化',acne:'痘痘'};
  const text=`生理周期 ${cycle.date}：${flowText[cycle.flow]}${cycle.start?'，本次月经开始日':''}${cycle.symptoms.length?'；'+cycle.symptoms.map(s=>symptomText[s]).join('、'):''}${cycle.note?'；'+cycle.note:''}`;
  // Separate namespace supports one editable entry per day without changing ordinary journal IDs.
  await database().prepare('INSERT INTO journal_entries(id,user_id,payload,created_at) VALUES(?,?,?,?) ON CONFLICT(id) DO UPDATE SET payload=excluded.payload').bind(user+':cycle:'+cycle.date,user,await seal(JSON.stringify({kind:'cycle',text,cycle}),user),cycle.date+'T12:00:00.000Z').run();
}
