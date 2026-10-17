export type Nutrition={kcal:number;protein:number;carbs:number;fat:number;estimated:boolean;assumptions:string;range?:{low:number;high:number}};
export function validateNutrition(value:unknown):Nutrition{
 const n=value as Nutrition;if(!n||typeof n!=='object')throw Error('缺少营养数据');
 for(const key of ['kcal','protein','carbs','fat'] as const)if(typeof n[key]!=='number'||!Number.isFinite(n[key])||n[key]<0||n[key]>(key==='kcal'?20000:3000))throw Error('营养数值无效');
 if(typeof n.assumptions!=='string'||n.assumptions.length>3000)throw Error('估算说明无效');
 if(n.range&&(!Number.isFinite(n.range.low)||!Number.isFinite(n.range.high)||n.range.low<0||n.range.high<n.range.low||n.range.high>20000))throw Error('热量范围无效');
 return {kcal:n.kcal,protein:n.protein,carbs:n.carbs,fat:n.fat,estimated:true,assumptions:n.assumptions,...(n.range?{range:n.range}:{})};
}
