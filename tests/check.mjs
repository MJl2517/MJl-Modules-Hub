import assert from "node:assert/strict";
import {readFile} from "node:fs/promises";
import {matchesCard,normalizeCatalog,notices,rawSource,releaseFor} from "../scripts/catalog.mjs";

const cards=normalizeCatalog(JSON.parse(await readFile(new URL("../catalog.json",import.meta.url),"utf8")));
const pointcrawl=cards.find(card=>card.id==="mjl-pointcrawl");
const hub=cards.find(card=>card.id==="mjl-modules-hub");
assert.equal(cards[0],pointcrawl);
assert.equal(cards.length,4);
assert.deepEqual(normalizeCatalog([{id:"local-only",title:"Локальный модуль"}]),[]);
for(const card of cards){
  const image=await readFile(new URL(`../art/${card.art}.webp`,import.meta.url));
  assert.equal(image.toString("ascii",8,12),"WEBP");
}
assert.ok(matchesCard(pointcrawl,{installed:{active:true},update:true},{query:"ПУТЕШЕСТВИЯ",category:"Путешествия",status:"update"}));
assert.ok(!matchesCard(pointcrawl,{installed:{active:false}},{status:"active"}));
assert.ok(!matchesCard(pointcrawl,{}, {category:"Карты"}));
const base={id:pointcrawl.id,version:"1.2.0",download:"https://raw.githubusercontent.com/MJl2517/dnd-point-crawl-2024/main/dist/mjl-pointcrawl.zip"};
pointcrawl.release=releaseFor(pointcrawl,base);
assert.equal(pointcrawl.release.version,"1.2.0");
assert.equal(releaseFor(pointcrawl,{...base,id:"other"}),null);
assert.equal(releaseFor(pointcrawl,{...base,download:"https://github.com/MJl2517/other/releases/download/v1/file.zip"}),null);
assert.equal(rawSource("https://raw.githubusercontent.com/other/project/main/catalog.json","catalog.json"),null);
assert.throws(()=>normalizeCatalog([hub,hub]),/дубли/);

const installed=new Map([[pointcrawl.id,{active:true,version:"1.1.0"}]]);
const newer=(a,b)=>a.localeCompare(b,undefined,{numeric:true})>0;
assert.deepEqual(notices(cards,installed,{},newer).news,[]);
const {news,updates}=notices(cards,installed,{initialized:true,seen:cards.filter(card=>card!==hub).map(card=>card.id)},newer);
assert.deepEqual(news.map(card=>card.id),[hub.id]);
assert.deepEqual(updates.map(card=>card.id),[pointcrawl.id]);
installed.get(pointcrawl.id).active=false;
assert.deepEqual(notices(cards,installed,{},newer).updates,[]);
console.log("OK: curated sources, manifest and ZIP validation, novelty baseline, and active-module updates.");
