import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {HUB_ID,matchesCard,normalizeCatalog,notices,rawSource,releaseFor} from "../scripts/catalog.mjs";

const entries=JSON.parse(await readFile(new URL("../catalog.json",import.meta.url),"utf8"));
const cards=normalizeCatalog(entries);
const pointcrawl=cards.find(card=>card.id==="mjl-pointcrawl");
const hub={id:HUB_ID,title:"MJl Modules Hub",description:"Устаревшая карточка",
  manifest:"https://raw.githubusercontent.com/MJl2517/MJl-Modules-Hub/main/module.json",release:{version:"1.2.0"}};
assert.ok(entries.every(card=>card.id!==HUB_ID));
assert.deepEqual(normalizeCatalog([...entries,hub]),cards);
assert.equal(cards[0],pointcrawl);
assert.equal(cards.length,3);
assert.deepEqual(normalizeCatalog([{id:"local-only",title:"Локальный модуль"}]),[]);
for(const card of cards){
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

const installed=new Map([[pointcrawl.id,{active:true,version:"1.1.0"}],[HUB_ID,{active:true,version:"1.1.0"}]]);
const newer=(a,b)=>a.localeCompare(b,undefined,{numeric:true})>0;
const tracked=[...cards,hub];
assert.deepEqual(notices(tracked,installed,{},newer).news,[]);
const {news,updates}=notices(tracked,installed,{initialized:true,seen:cards.slice(1).map(card=>card.id)},newer);
assert.deepEqual(news.map(card=>card.id),[pointcrawl.id]);
assert.deepEqual(updates.map(card=>card.id),[pointcrawl.id,HUB_ID]);
installed.get(pointcrawl.id).active=false;
assert.deepEqual(notices(tracked,installed,{},newer).updates,[hub]);
console.log("OK: curated sources, manifest and ZIP validation, novelty baseline, and active-module updates.");
