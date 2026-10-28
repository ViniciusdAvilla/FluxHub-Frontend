import test from "node:test";
import assert from "node:assert/strict";
import { abcMarginTargets, abcStrategy, highVolumeThreshold } from "../src/lib/abc-strategy";
import type { AbcRow } from "../src/lib/types";

function row(fields: Partial<AbcRow>): AbcRow {
  return {
    id:"X",title:"Item",brand:"B",category:"C",price:100,originalPrice:100,
    stock:30,sales:20,condition:"new",rating:null,freeShipping:null,discount:null,
    finance:null,revenue:2000,profit:null,margin:5,stockDays:30,
    stockTone:"good",stockLabel:"Saudável",abcClass:"A",revenueShare:10,cumulativeShare:10,
    ...fields,
  };
}
test("metas estratégicas de A/B/C são distintas da curva de receita",()=>{
  assert.deepEqual(abcMarginTargets,{A:10,B:15,C:20});
  assert.equal(abcStrategy(row({abcClass:"C",margin:18}),10).state,"below-target");
});
test("boi de piranha exige volume, classe A e margem reduzida, mas não prejuízo",()=>{
  assert.equal(abcStrategy(row({}),15).attraction,true);
  assert.equal(abcStrategy(row({margin:-2}),15).attraction,false);
  assert.equal(abcStrategy(row({sales:1}),15).attraction,false);
  assert.equal(abcStrategy(row({abcClass:"B"}),15).attraction,false);
});
test("sem dados de vendas ou custo não classifica",()=>{
  assert.equal(abcStrategy(row({margin:null}),10).state,"incomplete");
  assert.equal(highVolumeThreshold([row({sales:null})]),null);
});
