import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {HUB_ID,availabilityFor,coreCompatibility,dependencyGroups,matchesCard,normalizeCatalog,notices,rawSource,releaseFor} from "../scripts/catalog.mjs";

const entries=JSON.parse(await readFile(new URL("../catalog.json",import.meta.url),"utf8"));
const cards=normalizeCatalog(entries);
const pointcrawl=cards.find(card=>card.id==="mjl-pointcrawl");
const hub={id:HUB_ID,title:"MJl Modules Hub",description:"Устаревшая карточка",
  manifest:"https://raw.githubusercontent.com/MJl2517/MJl-Modules-Hub/main/module.json",release:{version:"1.2.0"}};
assert.ok(entries.every(card=>card.id!==HUB_ID));
assert.deepEqual(normalizeCatalog([...entries,hub]),cards);
assert.equal(cards[0],pointcrawl);
assert.equal(cards.length,7);
assert.deepEqual(normalizeCatalog([{id:"local-only",title:"Локальный модуль"}]),[]);
for(const card of cards){
  assert.match(card.title,/^MJl - .+/);
  const image=await readFile(new URL(`../art/${card.art}.webp`,import.meta.url));
  assert.equal(image.toString("ascii",8,12),"WEBP");
}
assert.ok(matchesCard(pointcrawl,{installed:{active:true},update:true},{query:"ПУТЕШЕСТВИЯ",category:"Путешествия",status:"update"}));
assert.ok(matchesCard(pointcrawl,{},{query:"заявки на переход"}));
assert.ok(!matchesCard(pointcrawl,{installed:{active:false}},{status:"active"}));
assert.ok(!matchesCard(pointcrawl,{}, {category:"Карты"}));
const base={id:pointcrawl.id,version:"1.2.0",download:"https://raw.githubusercontent.com/MJl2517/dnd-point-crawl-2024/main/dist/mjl-pointcrawl.zip"};
pointcrawl.release=releaseFor(pointcrawl,base);
assert.equal(pointcrawl.release.version,"1.2.0");
assert.equal(releaseFor(pointcrawl,{...base,id:"other"}),null);
assert.equal(releaseFor(pointcrawl,{...base,download:"https://github.com/MJl2517/other/releases/download/v1/file.zip"}),null);
assert.equal(rawSource("https://raw.githubusercontent.com/other/project/main/catalog.json","catalog.json"),null);
assert.throws(()=>normalizeCatalog([pointcrawl,pointcrawl]),/дубли/);

const tokens=cards.find(card=>card.id==="mjl-token-display");
assert.equal(tokens.art,"token-display");
assert.match(tokens.repo,/\/MJl2517\/MJl-Token-Dislplay$/);
assert.match(tokens.dependencyNotes.enhancedcombathud.description,/комплект/);
const dependencies=dependencyGroups({
  systems:{id:"dnd5e",compatibility:{minimum:"5.3.3"}},
  requires:new Set([{id:"socketlib",compatibility:{minimum:"1.1.4"}},{id:"bad<id"}]),
  recommends:[{id:"socketlib"},{id:"ag-fifthpendium"},{id:"other",type:"system"}]
});
assert.deepEqual(dependencies,{
  systems:[{id:"dnd5e",minimum:"5.3.3"}],
  required:[{id:"socketlib",minimum:"1.1.4"}],
  recommended:[{id:"ag-fifthpendium",minimum:""}]
});
assert.deepEqual(releaseFor(pointcrawl,{...base,relationships:{requires:[{id:"socketlib"}]}}).dependencies.required,
  [{id:"socketlib",minimum:""}]);

const installed=new Map([[pointcrawl.id,{active:true,version:"1.1.0"}],[HUB_ID,{active:true,version:"1.1.0"}]]);
const newer=(a,b,{majorOnly=false}={})=>majorOnly?Number(a.split(".")[0])>Number(b.split(".")[0]):a.localeCompare(b,undefined,{numeric:true})>0;
const core="14.361";
const bounds=releaseFor(pointcrawl,{...base,compatibility:{minimum:"14.361",verified:13,maximum:14}});
assert.deepEqual([bounds.minimum,bounds.verified,bounds.maximum],["14.361","13","14"]);
assert.equal(coreCompatibility(bounds,"14.360",newer).state,"blocked");
assert.equal(coreCompatibility(bounds,core,newer).state,"unverified");
assert.equal(coreCompatibility(bounds,core,newer).requirement,"Foundry 14.361–14.x");
assert.equal(coreCompatibility({...bounds,verified:"14"},core,newer).state,"compatible");
assert.equal(coreCompatibility({...bounds,maximum:"14.360"},core,newer).state,"blocked");
assert.equal(coreCompatibility(bounds,"15",newer).state,"blocked");
const compatible=availabilityFor({...pointcrawl,release:bounds},undefined,core,newer);
assert.equal(compatible.canInstall,true);
assert.ok(matchesCard(pointcrawl,compatible,{status:"available"}));
const unavailable=availabilityFor({...pointcrawl,release:bounds},undefined,"15",newer);
assert.equal(unavailable.canInstall,false);
assert.ok(!matchesCard(pointcrawl,unavailable,{status:"available"}));
assert.equal(availabilityFor({...pointcrawl,release:null},undefined,core,newer).canInstall,false);
const blockedUpdate={...pointcrawl,release:{...bounds,minimum:"15"}};
assert.equal(availabilityFor(blockedUpdate,installed.get(pointcrawl.id),core,newer).update,false);
assert.deepEqual(notices([blockedUpdate],installed,{},newer,core).updates,[]);
const tracked=[...cards,hub];
assert.deepEqual(notices(tracked,installed,{},newer,core).news,[]);
const {news,updates}=notices(tracked,installed,{initialized:true,seen:cards.slice(1).map(card=>card.id)},newer,core);
assert.deepEqual(news.map(card=>card.id),[pointcrawl.id]);
assert.deepEqual(updates.map(card=>card.id),[pointcrawl.id,HUB_ID]);
const chatted={chatVersions:{[pointcrawl.id]:pointcrawl.release.version,[HUB_ID]:"1.1.5"}};
assert.deepEqual(notices(tracked,installed,chatted,newer,core).updates,[hub]);
assert.equal(availabilityFor(pointcrawl,installed.get(pointcrawl.id),core,newer).update,true);
installed.get(pointcrawl.id).active=false;
assert.deepEqual(notices(tracked,installed,{},newer,core).updates,[hub]);
console.log("OK: curated sources, manifest and ZIP validation, novelty baseline, and active-module updates.");
