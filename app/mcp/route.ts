import {identity,json,ORIGIN} from '../../lib/oura';
import {reportFor,saveReport} from '../../lib/reports';
import {POST as sync} from '../api/oura/sync/route';
const schema={type:'object',properties:{period:{type:'string',enum:['morning','week','month']},timeZone:{type:'string'}},additionalProperties:false};
const tools=[{name:'read_health_report',description:'Read the signed-in user’s current structured nutrition, exercise, weight and sleep report. Includes dates and missing-data coverage. No writes.',inputSchema:schema,annotations:{readOnlyHint:true}},{name:'save_health_report',description:'Generate and save a dated structured report for the signed-in user. Re-running the same period/day updates the same report.',inputSchema:schema},{name:'refresh_recent_oura',description:'Sync the signed-in user’s recent Oura sleep, readiness, activity, workout, heart rate and daily stress data. Cannot read directly from the ring or force the Oura mobile app to upload.',inputSchema:{type:'object',properties:{},additionalProperties:false}}];
export async function POST(r:Request){let id:unknown=null;try{const b=await r.json() as any;id=b.id??null;
 if(b.method==='server/discover')return json({jsonrpc:'2.0',id,result:{supportedVersions:['2026-07-28'],capabilities:{tools:{}}}});
 if(b.method==='initialize')return json({jsonrpc:'2.0',id,result:{protocolVersion:b.params?.protocolVersion||'2026-07-28',serverInfo:{name:'Health Care Agent',version:'1.0.0'},capabilities:{tools:{}}}});
 if(b.method==='notifications/initialized')return new Response(null,{status:204});
 if(b.method==='tools/list')return json({jsonrpc:'2.0',id,result:{tools}});
 if(b.method!=='tools/call')return json({jsonrpc:'2.0',id,error:{code:-32601,message:'Method not found'}});
 const user=await identity(),name=b.params?.name,args=b.params?.arguments||{};let result:unknown;
 if(name==='refresh_recent_oura'){const results=[];for(const resource of ['daily_sleep','daily_readiness','sleep','daily_activity','workout','heartrate','daily_stress']){const response=await sync(new Request(ORIGIN+'/api/oura/sync',{method:'POST',headers:{Origin:ORIGIN,'Content-Type':'application/json'},body:JSON.stringify({resource,days:7})}));const value=await response.json() as any;results.push(value);if(value.status==='rate_limited')break;}result={results};}
 else{if(name!=='read_health_report'&&name!=='save_health_report')throw Error('Unknown tool');const period=args.period||'week';if(!['morning','week','month'].includes(period))throw Error('Invalid report period');const zone=typeof args.timeZone==='string'?args.timeZone:'America/New_York';result=await (name==='save_health_report'?saveReport:reportFor)(user,period,zone);}
 return json({jsonrpc:'2.0',id,result:{content:[{type:'text',text:JSON.stringify(result)}]}});
 }catch(e){return json({jsonrpc:'2.0',id,result:{isError:true,content:[{type:'text',text:e instanceof Error?e.message:'Unable to complete request'}]}});}}
export const dynamic='force-dynamic';
