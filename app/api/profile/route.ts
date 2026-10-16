import {identity,json,failure,database,seal,checkOrigin} from '../../../lib/oura';
import {profile} from '../../../lib/health';
export async function GET(){try{return json(await profile(await identity()));}catch(e){return failure(e);}}
export async function POST(r:Request){try{checkOrigin(r);const u=await identity();const b=await r.json() as {text?:string};if(typeof b.text!=='string'||b.text.length>12000)throw new Error('个人背景最多 12000 字');await database().prepare('INSERT INTO health_profiles(user_id,payload) VALUES(?,?) ON CONFLICT(user_id) DO UPDATE SET payload=excluded.payload').bind(u,await seal(JSON.stringify({text:b.text}),u)).run();return json({ok:true});}catch(e){return failure(e);}}
export const dynamic='force-dynamic';
