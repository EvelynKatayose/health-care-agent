import { identity,database,json,checkOrigin,failure } from '../../../../lib/oura';
export async function POST(r:Request){try{checkOrigin(r);const u=await identity();await database().batch([database().prepare('DELETE FROM oauth_states WHERE user_id=?').bind(u),database().prepare('DELETE FROM oura_connections WHERE user_id=?').bind(u)]);return json({ok:true,message:'已删除本项目中的 Oura 应用信息、令牌及健康数据。请到 Oura 账户中撤销本应用授权。'});}catch(e){return failure(e);}}

export const dynamic = "force-dynamic";
