export const HUB_ID="mjl-modules-hub";
const owner="mjl2517";
const art=new Set(["pointcrawl","travel","dungeon","importer","dungeon-sketch","campaign-journal","loot-and-share"]);
const clean=text=>typeof text==="string"?text.trim():"";
const key=/^[a-z\d][a-z\d-]{0,63}$/;
const packageId=/^[A-Za-z\d_-]{1,80}$/;
const versionPattern=/^[vV]?\d[\dA-Za-z.+-]{0,49}$/;
const compatibilityVersion=value=>{
  const version=typeof value==="number"?String(value):clean(value);
  return versionPattern.test(version)?version:"";
};

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
    const {id,title,description,category,manifest,art:picture,dependencyNotes}=row??{};
    if(typeof id!=="string"||!key.test(id)||ids.has(id)||!clean(title)||!clean(description)){
      throw Error("В каталоге есть дубли или карточки без идентификатора, названия и описания.");
    }
    ids.add(id);
    const url=rawSource(manifest,"module.json");
    if(!url)throw Error(`Некорректный GitHub-манифест для ${id}.`);
    const notes=Object.fromEntries(Object.entries(dependencyNotes??{}).slice(0,40)
      .filter(([id,note])=>packageId.test(id)&&note&&typeof note==="object")
      .map(([id,note])=>[id,{title:clean(note.title).slice(0,100),description:clean(note.description).slice(0,300)}]));
    return {id,title:clean(title).slice(0,100),description:clean(description).slice(0,700),dependencyNotes:notes,
      category:clean(category).slice(0,60),art:art.has(picture)?picture:"raspberry",
      manifest:url.href,repo:`https://github.com/${url.pathname.split("/").slice(1,3).join("/")}`};
  });
}

export function dependencyGroups(relationships){
  const rows=(kind,type)=>{
    const value=relationships?.[kind];
    const entries=Array.isArray(value)||value instanceof Set?Array.from(value):[value];
    const packages=new Map();
    for(const entry of entries.slice(0,80)){
      if(typeof entry?.id!=="string"||!packageId.test(entry.id)||(entry.type??type)!==type)continue;
      packages.set(entry.id,{id:entry.id,minimum:compatibilityVersion(entry.compatibility?.minimum)});
    }
    return [...packages.values()];
  };
  const required=rows("requires","module");
  const requiredIds=new Set(required.map(row=>row.id));
  return {
    systems:rows("systems","system"),
    required,
    recommended:rows("recommends","module").filter(row=>!requiredIds.has(row.id))
  };
}

export function releaseFor(card, data){
  if(!data||data.id!==card.id||typeof data.version!=="string"||!versionPattern.test(data.version))return null;
  try{
    const zip=new URL(data.download), source=new URL(card.manifest);
    const repo=source.pathname.split("/").slice(0,3).join("/").toLowerCase()+"/";
    if(!["https://github.com","https://raw.githubusercontent.com"].includes(zip.origin)||
      zip.username||zip.password||zip.search||zip.hash||
      !zip.pathname.toLowerCase().startsWith(repo)||!zip.pathname.toLowerCase().endsWith(".zip"))return null;
  }catch{return null;}
  const {minimum,verified,maximum}=data.compatibility??{};
  return {version:data.version,minimum:compatibilityVersion(minimum),verified:compatibilityVersion(verified),
    maximum:compatibilityVersion(maximum),dependencies:dependencyGroups(data.relationships)};
}

export function coreCompatibility(release,version,newer){
  if(!release)return {state:"unknown",requirement:"Требования Foundry не проверены",reason:"Не удалось получить или подтвердить манифест GitHub."};
  const {minimum,maximum,verified}=release;
  const majorOnly=value=>Number.isInteger(Number(value));
  const upper=maximum&&(majorOnly(maximum)?`${Number(maximum)}.x`:maximum);
  const requirement=minimum&&upper?`Foundry ${minimum}–${upper}`:minimum?`Foundry от ${minimum}`:upper?`Foundry до ${upper}`:"Границы версий Foundry не указаны";
  if(minimum&&newer(minimum,version))return {state:"blocked",requirement,reason:`На сервере Foundry ${version}. Нужна версия ${minimum} или новее.`};
  if(maximum&&newer(version,maximum,{majorOnly:majorOnly(maximum)}))return {state:"blocked",requirement,reason:`На сервере Foundry ${version}. Манифест допускает версии до ${upper} включительно.`};
  if(!verified)return {state:"unverified",requirement,reason:`На сервере Foundry ${version}. Автор не указал проверенную версию.`};
  if(newer(version,verified,{majorOnly:majorOnly(verified)}))return {state:"unverified",requirement,reason:`На сервере Foundry ${version}. Выпуск проверен до ${verified}, текущая версия ещё не проверена.`};
  return {state:"compatible",requirement,reason:`На сервере Foundry ${version}. Выпуск подходит по манифесту, проверен до ${verified}.`};
}

export function availabilityFor(card,installed,version,newer){
  const compatibility=coreCompatibility(card.release,version,newer);
  const newerRelease=!!(installed&&card.release&&newer(card.release.version,installed.version));
  const candidate=!installed||newerRelease;
  const canInstall=candidate&&!!card.release&&compatibility.state!=="blocked";
  const update=newerRelease&&canInstall;
  const label=update?`Обновление ${card.release.version}`:
    candidate&&compatibility.state==="blocked"?(installed?"Обновление недоступно":"Несовместим с Foundry"):
    installed?.active?"Включён в мире":installed?"Установлен":canInstall?"Можно установить":"Манифест не проверен";
  const action=newerRelease?"Обновить":"Установить";
  const installStatus=canInstall?(newerRelease?"Доступно обновление с GitHub.":"Доступна установка с GitHub."):
    candidate?(newerRelease?"Обновление из Hub сейчас недоступно.":"Установка из Hub сейчас недоступна."):
    installed?.active?"Модуль установлен и включён в этом мире.":"Модуль установлен. Активация доступна через управление модулями.";
  return {installed,update,available:!installed&&canInstall,candidate,canInstall,label,action,compatibility,
    reason:`${installStatus} ${compatibility.reason}`};
}

export function notices(cards, installed, previous, newer, version){
  const seen=Array.isArray(previous?.seen)?previous.seen:[];
  const news=previous?.initialized?cards.filter(card=>card.id!==HUB_ID&&!seen.includes(card.id)):[];
  const updates=cards.filter(card=>{
    const module=installed.get(card.id);
    return module?.active&&availabilityFor(card,module,version,newer).update&&
      previous?.chatVersions?.[card.id]!==card.release.version;
  });
  return {news,updates};
}

export function matchesCard(card,{installed,update,available},{query="",status="",category=""}={}){
  if(category&&card.category!==category)return false;
  if(status==="active"&&!installed?.active||
    status==="installed"&&!installed||
    status==="update"&&!update||
    status==="available"&&!available)return false;
  const search=query.trim().toLocaleLowerCase("ru");
  return !search||[card.title,card.description,card.category,card.id].join(" ").toLocaleLowerCase("ru").includes(search);
}
