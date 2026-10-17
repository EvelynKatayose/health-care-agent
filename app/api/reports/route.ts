import {identity,json,failure,checkOrigin} from '../../../lib/oura';
import {reportFor,saveReport} from '../../../lib/reports';
function options(r:Request){const q=new URL(r.url).searchParams;const p=q.get('period');return {period:p==='month'?'month' as const:p==='morning'?'morning' as const:'week' as const,zone:q.get('timeZone')||'America/New_York'};}
export async function GET(r:Request){try{const o=options(r);return json(await reportFor(await identity(),o.period,o.zone));}catch(e){return failure(e);}}
export async function POST(r:Request){try{checkOrigin(r);const o=options(r);return json(await saveReport(await identity(),o.period,o.zone));}catch(e){return failure(e);}}
export const dynamic='force-dynamic';
