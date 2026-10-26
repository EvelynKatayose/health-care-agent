import { redirect } from 'next/navigation';
import {env} from 'cloudflare:workers';
import {getChatGPTUser} from './chatgpt-auth';
export default async function Home(){const user=await getChatGPTUser(),owner=(env as unknown as {HEALTH_APP_OWNER_EMAIL?:string}).HEALTH_APP_OWNER_EMAIL?.trim().toLowerCase();redirect(user&&owner&&user.email.toLowerCase()===owner?'/health.html':'/demo.html');}
export const dynamic='force-dynamic';
