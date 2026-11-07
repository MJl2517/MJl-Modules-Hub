export const HUB_ID="mjl-modules-hub";
const owner="mjl2517";
const art=new Set(["pointcrawl","travel","dungeon","importer","dungeon-sketch","campaign-journal"]);
const clean=text=>typeof text==="string"?text.trim():"";
const key=/^[a-z\d][a-z\d-]{0,63}$/;

export function rawSource(value, filename){
  try{
    const url=new URL(value),parts=url.pathname.split("/").slice(1);
    if(url.origin!=="https://raw.githubusercontent.com"||url.username||url.password||url.search||url.hash||
      parts[0]?.toLowerCase()!==owner||parts.length<4||parts.at(-1)!==filename||
      parts.slice(1).some(part=>!part||!/^[-\w.]+$/.test(part)))return null;
    return url;
  }catch{return null;}
}

export function normalizeCatalog(entries){
  if(!Array.isArray(entries)||entries.length>80)throw Error("Ожидается список из 80 карточек или меньше.");
  const ids=new Set();
  return entries.filter(row=>row?.manifest&&row.id!==HUB_ID).map(row=>{
    const {id,title,description,category,manifest,art:picture}=row??{};
    if(typeof id!=="string"||!key.test(id)||ids.has(id)||!clean(title)||!clean(description)){
      throw Error("В каталоге есть дубли или карточки без идентификатора, названия и описания.");
    }
    ids.add(id);
    const url=rawSource(manifest,"module.json");
    if(!url)throw Error(`Некорректный GitHub-манифест для ${id}.`);
    return {id,title:clean(title).slice(0,100),description:clean(description).slice(0,700),
      category:clean(category).slice(0,60),art:art.has(picture)?picture:"raspberry",
      manifest:url.href,repo:`https://github.com/${url.pathname.split("/").slice(1,3).join("/")}`};
  });
}

export function releaseFor(card, data){
  if(!data||data.id!==card.id||typeof data.version!=="string"||!/^[vV]?\d[\dA-Za-z.+-]{0,49}$/.test(data.version))return null;
  try{
    const zip=new URL(data.download), source=new URL(card.manifest);
    const repo=source.pathname.split("/").slice(0,3).join("/").toLowerCase()+"/";
    if(!["https://github.com","https://raw.githubusercontent.com"].includes(zip.origin)||
      zip.username||zip.password||zip.search||zip.hash||
      !zip.pathname.toLowerCase().startsWith(repo)||!zip.pathname.toLowerCase().endsWith(".zip"))return null;
  }catch{return null;}
  const {minimum,verified,maximum}=data.compatibility??{};
  return {version:data.version,minimum:clean(minimum),verified:clean(verified),maximum:clean(maximum)};
}

export function notices(cards, installed, previous, newer){
  const seen=Array.isArray(previous?.seen)?previous.seen:[];
  const news=previous?.initialized?cards.filter(card=>card.id!==HUB_ID&&!seen.includes(card.id)):[];
  const updates=cards.filter(card=>{
    const module=installed.get(card.id);
    return module?.active&&card.release&&newer(card.release.version,module.version);
  });
  return {news,updates};
}

export function matchesCard(card,{installed,update},{query="",status="",category=""}={}){
  if(category&&card.category!==category)return false;
  if(status==="active"&&!installed?.active||
    status==="installed"&&!installed||
    status==="update"&&!update||
    status==="available"&&(installed||!card.release))return false;
  const search=query.trim().toLocaleLowerCase("ru");
  return !search||[card.title,card.description,card.category,card.id].join(" ").toLocaleLowerCase("ru").includes(search);
}
