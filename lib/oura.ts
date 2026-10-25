import { env } from 'cloudflare:workers';
import { getChatGPTUser } from '../app/chatgpt-auth';
export const ORIGIN='https://evelyn-health-companion.fun-badge-4372.chatgpt.site';
export const CALLBACK=ORIGIN+'/oura/callback';
export function database(){const db=(env as unknown as {DB:D1Database}).DB;if(!db)throw new Error('数据库尚未就绪');return db;}
export function json(value:unknown,status=200){return Response.json(value,{status,headers:{'Cache-Control':'no-store','Referrer-Policy':'no-referrer'}});}
export async function identity(){const u=await getChatGPTUser();if(!u)throw new Error('请先登录网站');return u.userId;}
export function checkOrigin(r:Request){const origin=r.headers.get('origin');if(origin===ORIGIN)return;const url=new URL(r.url);if(['localhost','127.0.0.1','[::1]'].includes(url.hostname)&&origin===url.origin)return;throw new Error('请求来源不匹配，请从网站页面操作');}
function b64(bytes:Uint8Array){
  // Bound the argument count independently of the synchronized payload size.
  const chunks:string[]=[];
  for(let offset=0;offset<bytes.length;offset+=8192){
    chunks.push(String.fromCharCode(...bytes.subarray(offset,offset+8192)));
  }
  return btoa(chunks.join(''));
}
function un64(s:string){return Uint8Array.from(atob(s),c=>c.charCodeAt(0));}
export function random(){return b64(crypto.getRandomValues(new Uint8Array(32))).replace(/\+/g,'-').replace(/\//g,'_').replace(/=/g,'');}
async function key(){const raw=(env as unknown as {DATA_ENCRYPTION_KEY?:string}).DATA_ENCRYPTION_KEY;if(!raw)throw new Error('加密服务尚未配置');return crypto.subtle.importKey('raw',un64(raw),'AES-GCM',false,['encrypt','decrypt']);}
export async function seal(text:string,user:string){const iv=crypto.getRandomValues(new Uint8Array(12));const cipher=await crypto.subtle.encrypt({name:'AES-GCM',iv,additionalData:new TextEncoder().encode(user)},await key(),new TextEncoder().encode(text));return b64(iv)+'.'+b64(new Uint8Array(cipher));}
export async function unseal(text:string,user:string){const [iv,cipher]=text.split('.');return new TextDecoder().decode(await crypto.subtle.decrypt({name:'AES-GCM',iv:un64(iv),additionalData:new TextEncoder().encode(user)},await key(),un64(cipher)));}
export type Connection={user_id:string;client_id:string;secret:string;tokens:string|null;expires:number;cache:string|null;synced_at:string|null;refresh_lock:number};
export async function connection(user:string){return database().prepare('SELECT * FROM oura_connections WHERE user_id=?').bind(user).first<Connection>();}
export async function tokenRequest(params:URLSearchParams){const r=await fetch('https://api.ouraring.com/oauth/token',{method:'POST',headers:{'Content-Type':'application/x-www-form-urlencoded'},body:params,signal:AbortSignal.timeout(20000)});if(!r.ok)throw new Error('Oura 授权失败，请检查应用信息或重新连接');const t=await r.json() as {access_token:string;refresh_token:string;expires_in:number};if(!t.access_token||!t.refresh_token||!Number.isFinite(t.expires_in)||t.expires_in<=0)throw new Error('Oura 返回了无效的授权信息');return t;}
export async function saveTokens(user:string,t:{access_token:string;refresh_token:string;expires_in:number}){await database().prepare('UPDATE oura_connections SET tokens=?,expires=?,refresh_lock=0 WHERE user_id=?').bind(await seal(JSON.stringify(t),user),Date.now()+t.expires_in*1000,user).run();}
export async function accessToken(user:string,c:Connection){if(!c.tokens)throw new Error('请先授权连接 Oura');let t=JSON.parse(await unseal(c.tokens,user));if(c.expires>Date.now()+60000)return t.access_token as string;const now=Date.now();const lock=await database().prepare('UPDATE oura_connections SET refresh_lock=? WHERE user_id=? AND refresh_lock<?').bind(now+60000,user,now).run();if(!lock.meta.changes)throw new Error('授权正在刷新，请稍后重试');try{const latest=await connection(user);if(!latest?.tokens)throw new Error('请重新连接 Oura');if(latest.expires>Date.now()+60000){await database().prepare('UPDATE oura_connections SET refresh_lock=0 WHERE user_id=?').bind(user).run();return JSON.parse(await unseal(latest.tokens,user)).access_token as string;}t=JSON.parse(await unseal(latest.tokens,user));const fresh=await tokenRequest(new URLSearchParams({grant_type:'refresh_token',refresh_token:t.refresh_token,client_id:latest.client_id,client_secret:await unseal(latest.secret,user)}));await saveTokens(user,fresh);return fresh.access_token;}catch(e){await database().prepare('UPDATE oura_connections SET refresh_lock=0 WHERE user_id=?').bind(user).run();throw e;}}
export function failure(e:unknown){return json({error:e instanceof Error?e.message:'操作失败，请稍后重试'},400);}
