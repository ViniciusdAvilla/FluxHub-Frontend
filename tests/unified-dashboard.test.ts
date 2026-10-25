import test from "node:test";
import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { groupedInsights, stockDistribution, abcRevenue, pricingGaps, topReplenishment, costCoverage } from "../src/lib/insight-series";
import type { ProductRow, AbcRow } from "../src/lib/types";

function row(overrides: Partial<ProductRow> = {}): ProductRow {
  return {
    id:"MLB1",title:"Produto 1",category:"Acessórios",brand:"Marca A",
    price:100,originalPrice:120,stock:10,sales:8,condition:null,rating:null,
    freeShipping:null,discount:null,finance:null,revenue:800,profit:null,margin:null,
    stockDays:20,stockTone:"good",stockLabel:"Saudável",...overrides,
  };
}

test("medidas sem dados continuam ausentes em vez de virar faturamento ficticio", () => {
  assert.deepEqual(groupedInsights([row()], "brand", "profit"), []);
  assert.deepEqual(groupedInsights([row()], "brand", "revenue"), [{label:"Marca A",value:800}]);
  assert.deepEqual(groupedInsights([
    row({id:"1",revenue:100}),
    row({id:"2",brand:"Marca B",revenue:null}),
    row({id:"3",revenue:200}),
  ], "brand", "revenue"), [{label:"Marca A",value:300}]);
});

test("graficos de estoque, custos e reposicao usam apenas dados persistidos", () => {
  const rows = [
    row({stock:0,stockTone:"bad",finance:null,sales:30}),
    row({id:"2",stock:20,stockTone:"good",finance:{productId:"2",supplier:"",unitCost:5,feePercent:0,taxPercent:0,shippingCost:0,otherCost:0},sales:5}),
  ];
  assert.equal(stockDistribution(rows).reduce((a,p)=>a+p.value,0),2);
  assert.deepEqual(costCoverage(rows).map(p=>p.value),[1,1]);
  assert.deepEqual(topReplenishment(rows,30),[{label:"Produto 1",value:30}]);
  assert.deepEqual(topReplenishment([row({sales:null,stock:null})],30),[]);
});

test("projecao de precos e curva ABC nao calculam com bases ausentes", () => {
  assert.deepEqual(pricingGaps([row({price:100}),row({price:null})],20, r => r.price===null ? null : 125),
    [{label:"Produto 1",value:25}]);
  const abc = [
    {...row({revenue:700}),abcClass:"A",revenueShare:70,cumulativeShare:70},
    {...row({id:"2",revenue:null}),abcClass:null,revenueShare:null,cumulativeShare:null},
  ] as AbcRow[];
  assert.deepEqual(abcRevenue(abc),[{label:"Classe A",value:700}]);
});

test("modulos usam ModernShell, sem sidebar e cabecalho legados", () => {
  const platform = readFileSync("src/components/platform-page.tsx","utf8");
  const shell = readFileSync("src/components/modern-shell.tsx","utf8");
  for(const term of ['<AppSidebar', 'className="app-shell"', 'className="workspace"', 'className="topbar"']){
    assert.equal(platform.includes(term),false,term);
  }
  assert.match(platform,/ModernShell title=\{current.title\}/);
  for(const path of ["/","/vendas","/anuncios","/produtos","/estoque","/financeiro",
    "/fabricantes","/precificacao","/reposicao","/curva-abc","/pedidos","/raio-x","/dados","/integracoes"]){
    assert.ok(shell.includes(`href: "${path}"`), path);
  }
});
