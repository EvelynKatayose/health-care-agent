const fs=require('node:fs'),vm=require('node:vm'),ts=require('typescript'),assert=require('node:assert/strict');
function load(file){const exports={};vm.runInNewContext(ts.transpileModule(fs.readFileSync(file,'utf8'),{compilerOptions:{module:ts.ModuleKind.CommonJS,target:ts.ScriptTarget.ES2022}}).outputText,{exports,require:()=>({})});return exports;}
const {summarizeReport}=load('lib/reports.ts'),{validateNutrition}=load('lib/nutrition.ts');
assert.throws(()=>validateNutrition({kcal:-1,protein:2,carbs:3,fat:4}));
const notes=[{time:'2026-10-16T15:00:00Z',kind:'meal',nutrition:{kcal:500,protein:30,carbs:50,fat:20}},{time:'2026-10-16T12:00:00Z',weight:60},{time:'2026-10-10T12:00:00Z',weight:61}];
const r=summarizeReport({daily_activity:[{day:'2026-10-16',steps:5000,active_calories:300}],workout:[{start_datetime:'2026-10-16T15:00:00Z',end_datetime:'2026-10-16T16:00:00Z',calories:250}]},notes,'week','America/New_York','2026-10-17T01:00:00Z');
assert.equal(r.to,'2026-10-16');assert.equal(r.from,'2026-10-10');assert.equal(r.nutrition.averagePerRecordedDay.kcal,500);assert.equal(r.coverage.mealDays,1);assert.equal(r.weight.change,-1);assert.equal(r.activity.totalActiveKcal,300);assert.equal(r.activity.workoutMinutes,60);assert.equal(r.sleep.latest,null);
const empty=summarizeReport({},[],'month','America/New_York','2026-10-17T01:00:00Z');assert.equal(empty.nutrition.totals.kcal,null);assert.equal(empty.weight.change,null);assert.throws(()=>summarizeReport({},[],'week','Bad/Zone'));
console.log('Passed: report timezone, coverage, missing data, weight trend and no activity double counting; nutrition validation.');
