import {identity,json,failure,checkOrigin,database} from '../../../lib/oura';
import {cycleEntries,saveCycle,validateCycle} from '../../../lib/cycle';
import {cycleSource} from '../../../lib/cycle-source';
export async function GET(){try{const user=await identity(),[entries,oura]=await Promise.all([cycleEntries(user),cycleSource(user)]);return json({entries,oura});}catch(e){return failure(e);}}
export async function POST(r:Request){try{checkOrigin(r);const u=await identity();await saveCycle(u,validateCycle(await r.json()));return json({ok:true});}catch(e){return failure(e);}}
export async function DELETE(r:Request){try{checkOrigin(r);const u=await identity(),b=await r.json() as {date?:string};if(typeof b.date!=='string'||!/^\d{4}-\d{2}-\d{2}$/.test(b.date))throw Error('请选择日期');await database().prepare('DELETE FROM journal_entries WHERE user_id=? AND id=?').bind(u,u+':cycle:'+b.date).run();return json({ok:true});}catch(e){return failure(e);}}
export const dynamic='force-dynamic';
