import {normalizeCatalog,notices,rawSource,releaseFor} from "./catalog.mjs";

const ID="mjl-modules-hub";
const SOURCE="https://raw.githubusercontent.com/MJl2517/MJl-Modules-Hub/main/catalog.json";
const {ApplicationV2,DialogV2}=foundry.applications.api;
const {escapeHTML:esc,isNewerVersion:newer}=foundry.utils;
const asset=name=>foundry.utils.getRoute(`modules/${ID}/art/${name}.svg`);
const allowed=()=>game.user?.isGM&&game.user.can("SETTINGS_MODIFY");
const blank={initialized:false,seen:[],announced:[],versions:{}};
let cards=[],errors=0,loading,instance;

function preferences(){return game.settings.get(ID,"seen")[game.world.id]??blank;}
async function savePreferences(state){
  if(JSON.stringify(state)===JSON.stringify(preferences()))return;
  await game.settings.set(ID,"seen",{...game.settings.get(ID,"seen"),[game.world.id]:state});
}

async function json(url){
  const response=await fetch(url,{credentials:"omit",cache:"no-store",redirect:"error",signal:AbortSignal.timeout(8000)});
  if(!response.ok)throw Error(`HTTP ${response.status}`);
  return response.json();
}

function refresh(){
  if(!allowed())return;
  if(loading)return loading;
  loading=(async()=>{
    const seed=normalizeCatalog(await json(new URL("../catalog.json",import.meta.url)));
    const entries=new Map(seed.map(card=>[card.id,card]));
    const source=game.settings.get(ID,"source");
    errors=0;
    if(source){
      const url=rawSource(source,"catalog.json");
      try{
        if(!url)throw Error("Invalid catalog source");
        for(const card of normalizeCatalog(await json(url)))entries.set(card.id,card);
      }catch{errors++;}
    }
    const next=[...entries.values()];
    for(let i=0;i<next.length;i+=6){
      await Promise.all(next.slice(i,i+6).map(async card=>{
        if(!card.manifest)return;
        try{
          card.release=releaseFor(card,await json(card.manifest));
          if(!card.release)throw Error("Invalid manifest");
        }catch{errors++;}
      }));
    }
    cards=next;
    const previous=preferences(),{news,updates}=notices(cards,game.modules,previous,newer);
    const announced=new Set(previous.announced??[]),versions={...previous.versions};
    const fresh=news.filter(card=>!announced.has(card.id));
    const changed=updates.filter(card=>versions[card.id]!==card.release.version);
    if(fresh.length)ui.notifications.info(`MJl Hub · Новинки: ${fresh.map(card=>esc(card.title)).join(", ")}`);
    if(changed.length)ui.notifications.info(`MJl Hub · Обновления: ${changed.map(card=>`${esc(card.title)} ${card.release.version}`).join(", ")}`);
    for(const card of fresh)announced.add(card.id);
    for(const card of changed)versions[card.id]=card.release.version;
    await savePreferences({...previous,initialized:true,announced:[...announced],versions,
      seen:previous.initialized?previous.seen:cards.map(card=>card.id)});
  })().catch(error=>{errors++;console.error(ID,error);}).finally(()=>{
    loading=null;
    if(instance?.rendered)instance.render();
  });
  return loading;
}

function stateFor(card){
  const installed=game.modules.get(card.id),remote=card.release?.version;
  const update=!!(installed&&remote&&newer(remote,installed.version));
  const label=update?`Обновление ${remote}`:installed?.active?"Включён в мире":installed?"Установлен":card.manifest?"Доступен на GitHub":"Ожидает публикации";
  return {installed,update,label};
}

async function install(card){
  const url=rawSource(card.manifest,"module.json");
  if(!allowed()||!url)return;
  if(card.release?.minimum&&newer(card.release.minimum,game.version)||
     card.release?.maximum&&newer(game.version,card.release.maximum)){
    ui.notifications.warn("Этот выпуск несовместим с текущей версией Foundry.");
    return;
  }
  const proceed=await DialogV2.confirm({
    classes:["mjl-brand","mjl-hub"],window:{title:`Установка · ${card.title}`,icon:"fa-solid fa-store"},rejectClose:false,
    content:`<p>Скопируйте манифест GitHub. В меню настройки откройте «Модули → Установить модуль» и вставьте адрес. Выход в меню закроет текущий мир для всех участников.</p>
      <label>Адрес манифеста<input class="mjl-hub-url" type="url" readonly value="${esc(url.href)}"></label>
      <button type="button" class="mjl-hub-copy"><i class="fa-solid fa-copy" aria-hidden="true"></i> Скопировать адрес</button>`,
    render:event=>{
      const root=event.target.element,input=root.querySelector(".mjl-hub-url");
      root.querySelector(".mjl-hub-copy").onclick=async()=>{
        input.select();
        try{await navigator.clipboard.writeText(input.value);ui.notifications.info("Адрес скопирован.");}
        catch{ui.notifications.info("Адрес выделен. Нажмите Ctrl+C.");}
      };
    },
    yes:{label:"Выйти в меню настройки"},no:{label:"Остаться в мире"}
  });
  if(proceed&&allowed())await game.shutDown();
}

class Hub extends ApplicationV2{
  static DEFAULT_OPTIONS={
    id:ID,classes:["mjl-brand","mjl-hub"],position:{width:960,height:660},
    window:{title:"MJl Modules Hub",icon:"fa-solid fa-store",resizable:true}
  };
  query="";selected="";

  async _renderHTML(){
    const selected=cards.find(card=>card.id===this.selected)??cards[0];
    this.selected=selected?.id??"";
    const seen=new Set(preferences().seen??[]);
    const tiles=cards.map(card=>{
      const {label,update}=stateFor(card);
      return `<button type="button" class="mjl-hub-card" data-card="${card.id}" aria-pressed="${card===selected}">
        <img src="${esc(asset(card.art))}" alt="">
        <span class="mjl-hub-card-body"><strong>${esc(card.title)}</strong><small>${esc(card.category)}</small>
        <span class="mjl-hub-badge" data-update="${update}">${esc(label)}</span>
        ${!seen.has(card.id)?'<span class="mjl-hub-badge" data-update="true">Новинка</span>':""}</span></button>`;
    }).join("");
    const detail=selected?this.details(selected):'<p>Каталог загружается…</p>';
    return `<section class="mjl-hub-shell"><header class="mjl-hub-head">
      <img src="${esc(asset("raspberry"))}" alt=""><div><h2>MJl Modules Hub</h2><p>Каталог модулей для Foundry VTT</p></div>
      <button type="button" data-hub="refresh"><i class="fa-solid fa-rotate" aria-hidden="true"></i> Проверить версии</button></header>
      <div class="mjl-hub-status" role="status">${loading?"Проверяем GitHub…":errors?`Не удалось проверить источники GitHub: ${errors}. Карточки каталога доступны.`:""}</div>
      <label class="mjl-hub-search">Поиск<input type="search" name="search" value="${esc(this.query)}" placeholder="Название, описание или категория"></label>
      <div class="mjl-hub-layout"><div class="mjl-hub-grid">${tiles}<p data-empty hidden>По этому запросу ничего нет.</p></div>
      <article class="mjl-hub-details">${detail}</article></div></section>`;
  }

  details(card){
    const {installed,update,label}=stateFor(card);
    return `<img src="${esc(asset(card.art))}" alt=""><h3>${esc(card.title)}</h3>
      <p>${esc(card.description)}</p><p><strong>${esc(label)}</strong></p>
      ${installed?`<p>На сервере ${esc(installed.version)}</p>`:""}
      ${card.release?`<p>На GitHub ${esc(card.release.version)}${card.release.verified?` · Проверено на Foundry ${esc(card.release.verified)}`:""}</p>`:""}
      <div class="mjl-hub-actions">
      ${card.manifest&&(!installed||update)?`<button type="button" data-hub="install">${update?"Обновить":"Установить"}</button>`:""}
      ${installed&&!installed.active?'<button type="button" data-hub="enable">Включить в мире</button>':""}
      ${card.repo?`<a href="${esc(card.repo)}" target="_blank" rel="noopener noreferrer">GitHub <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></a>`:""}</div>`;
  }

  _replaceHTML(html,content){content.innerHTML=html;}

  _onRender(context,options){
    super._onRender(context,options);
    const root=this.element.querySelector(".mjl-hub-shell"),search=root.querySelector("[name=search]");
    const filter=()=>{
      this.query=search.value;
      const query=this.query.trim().toLocaleLowerCase("ru");
      let matches=0;
      for(const button of root.querySelectorAll("[data-card]")){
        const card=cards.find(card=>card.id===button.dataset.card);
        button.hidden=!card||![card.title,card.description,card.category,card.id].join(" ").toLocaleLowerCase("ru").includes(query);
        if(!button.hidden)matches++;
      }
      root.querySelector("[data-empty]").hidden=!!matches||!!loading;
    };
    search.addEventListener("input",filter);
    root.addEventListener("click",event=>{
      const id=event.target.closest("[data-card]")?.dataset.card;
      if(id){
        const card=cards.find(card=>card.id===id);
        if(!card)return;
        this.selected=id;
        root.querySelector(".mjl-hub-details").innerHTML=this.details(card);
        for(const button of root.querySelectorAll("[data-card]"))button.setAttribute("aria-pressed",String(button.dataset.card===id));
      }
      const action=event.target.closest("[data-hub]")?.dataset.hub;
      if(action==="refresh"){refresh();this.render();}
      if(action==="enable"&&allowed())new foundry.applications.sidebar.apps.ModuleManagement().render({force:true});
      if(action==="install"){
        const card=cards.find(card=>card.id===this.selected);
        if(card)install(card).catch(error=>ui.notifications.error(error.message));
      }
    });
    filter();
    if(cards.length)savePreferences({...preferences(),initialized:true,seen:cards.map(card=>card.id)}).catch(console.error);
  }
}

function open(){
  if(!allowed())return;
  instance??=new Hub();
  instance.render({force:true});
  if(!cards.length)refresh();
  return instance;
}

class HubMenu extends Hub{
  render(){return open();}
}

Hooks.once("init",()=>{
  game.settings.register(ID,"seen",{scope:"client",config:false,type:Object,default:{}});
  game.settings.register(ID,"source",{scope:"world",config:true,type:String,default:SOURCE,
    name:"Источник каталога MJl",hint:"Публичный catalog.json из репозитория MJl2517 на raw.githubusercontent.com.",
    onChange:refresh});
  game.settings.registerMenu(ID,"open",{name:"MJl Modules Hub",label:"Открыть каталог",icon:"fa-solid fa-store",type:HubMenu,restricted:true});
});
Hooks.on("getSceneControlButtons",controls=>{
  if(!allowed()||!controls.tokens)return;
  controls[ID]={name:ID,title:"MJl Modules Hub",order:8,layer:"tokens",icon:"fa-solid fa-store",tools:{
    catalog:{name:"catalog",title:"Открыть каталог",icon:"fa-solid fa-store",button:true,onChange:(_event,active)=>{if(active)open();}}
  }};
});
Hooks.once("ready",()=>{
  if(!allowed())return;
  refresh();
  setInterval(refresh,30*60*1000);
});
