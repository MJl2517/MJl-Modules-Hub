import {HUB_ID as ID,availabilityFor,matchesCard,normalizeCatalog,notices,rawSource,releaseFor} from "./catalog.mjs";

const SOURCE="https://raw.githubusercontent.com/MJl2517/MJl-Modules-Hub/main/catalog.json";
const TITLE="MJl - Modules Hub";
const {ApplicationV2,DialogV2}=foundry.applications.api;
const {escapeHTML:esc,isNewerVersion:newer}=foundry.utils;
const asset=name=>foundry.utils.getRoute(`modules/${ID}/art/${name==="travel"?"pointcrawl":name}.webp`);
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
    const releases=[...next,{id:ID,title:TITLE,manifest:new URL("module.json",SOURCE).href}];
    for(let i=0;i<releases.length;i+=6){
      await Promise.all(releases.slice(i,i+6).map(async card=>{
        try{
          card.release=releaseFor(card,await json(card.manifest));
          if(!card.release)throw Error("Invalid manifest");
        }catch{errors++;}
      }));
    }
    cards=next;
    const previous=preferences(),{news,updates}=notices(releases,game.modules,previous,newer,game.version);
    const announced=new Set(previous.announced??[]),versions={...previous.versions};
    const fresh=news.filter(card=>!announced.has(card.id));
    const changed=updates.filter(card=>versions[card.id]!==card.release.version);
    if(fresh.length)ui.notifications.info(`${TITLE} · Новинки: ${fresh.map(card=>esc(card.title)).join(", ")}`);
    if(changed.length)ui.notifications.info(`${TITLE} · Обновления: ${changed.map(card=>`${esc(card.title)} ${card.release.version}`).join(", ")}`);
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

const stateFor=card=>availabilityFor(card,game.modules.get(card.id),game.version,newer);

async function install(card){
  const url=rawSource(card.manifest,"module.json");
  if(!allowed()||!url)return;
  const state=stateFor(card);
  if(!state.canInstall){
    ui.notifications.warn(esc(state.reason));
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
    id:ID,classes:["mjl-brand","mjl-hub"],position:{width:1080,height:720},
    window:{title:TITLE,icon:"fa-solid fa-store",resizable:true}
  };
  filters={query:"",status:"",category:""};
  expanded="";
  scroll=0;

  async _renderHTML(){
    const seen=new Set(preferences().seen??[]);
    const categories=[...new Set(cards.map(card=>card.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"ru"));
    const options=(name,choices)=>choices.map(([value,title])=>
      `<option value="${esc(value)}" ${this.filters[name]===value?"selected":""}>${esc(title)}</option>`).join("");
    const tiles=cards.map(card=>this.tile(card,!seen.has(card.id))).join("");
    return `<section class="mjl-hub-shell"><header class="mjl-hub-head">
      <img src="${esc(asset("raspberry"))}" alt=""><div><h2>${TITLE}</h2><p>Версия сервера Foundry ${esc(game.version)}</p></div>
      <button type="button" data-hub="refresh" ${loading?"disabled":""}><i class="fa-solid fa-rotate" aria-hidden="true"></i> Проверить версии</button></header>
      <div class="mjl-hub-status" role="status">${loading?"Проверяем GitHub…":errors?`Не удалось проверить источники GitHub: ${errors}. Карточки каталога доступны.`:""}</div>
      <div class="mjl-hub-layout"><aside class="mjl-hub-filters">
        <label>Поиск<input type="search" name="query" value="${esc(this.filters.query)}" placeholder="Найти модуль"></label>
        <label>Статус<select name="status">${options("status",[["","Все модули"],["active","Включены в мире"],["installed","Установлены"],["update","Есть обновление"],["available","Можно установить"]])}</select></label>
        <label>Категория<select name="category">${options("category",[["","Все категории"],...categories.map(category=>[category,category])])}</select></label>
        <button type="button" data-hub="reset">Сбросить фильтры</button>
      </aside><section class="mjl-hub-results" aria-label="Модули">
        <div class="mjl-hub-grid">${tiles}</div><p data-empty hidden>По этому запросу ничего нет.</p>
      </section></div></section>`;
  }

  tile(card,isNew){
    const {installed,update,label,compatibility,reason,candidate,canInstall,action}=stateFor(card);
    return `<details class="mjl-hub-card" name="mjl-hub-card" data-card="${card.id}" ${this.expanded===card.id?"open":""}>
      <summary><span class="mjl-hub-cover">
        <img src="${esc(asset(card.art))}" alt="">
        <span class="mjl-hub-badge" data-update="${update}" data-tooltip-text="${esc(reason)}">${esc(label)}</span>
        ${isNew?'<span class="mjl-hub-new">Новинка</span>':""}
      </span><span class="mjl-hub-card-heading"><span><strong>${esc(card.title)}</strong><small>${esc(card.category)}</small></span>
      <i class="fa-solid fa-chevron-down" aria-hidden="true"></i></span>
      <span class="mjl-hub-compatibility" data-state="${compatibility.state}" data-tooltip-text="${esc(compatibility.reason)}">${esc(compatibility.requirement)}${compatibility.state==="unverified"?" · не проверено":""}</span>
      <span class="mjl-hub-card-description">${esc(card.description)}</span></summary>
      <div class="mjl-hub-card-details">
      <p class="mjl-hub-availability">${esc(reason)}</p>
      ${installed?`<p>На сервере ${esc(installed.version)}</p>`:""}
      ${card.release?`<p>На GitHub ${esc(card.release.version)}${card.release.verified?` · Проверено на Foundry ${esc(card.release.verified)}`:""}</p>`:""}
      <div class="mjl-hub-actions">
      ${candidate?`<span data-tooltip-text="${esc(reason)}"><button type="button" data-hub="install" ${canInstall?"":"disabled"}>${action}</button></span>`:""}
      ${installed&&!installed.active?'<button type="button" data-hub="enable">Включить в мире</button>':""}
      ${card.repo?`<a href="${esc(card.repo)}" target="_blank" rel="noopener noreferrer">GitHub <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></a>`:""}</div></div></details>`;
  }

  _replaceHTML(html,content){
    this.scroll=content.querySelector(".mjl-hub-results")?.scrollTop??this.scroll;
    const focus=document.activeElement;
    const search=focus?.matches?.('[name="query"]')&&content.contains(focus);
    content.innerHTML=html;
    if(search){
      const field=content.querySelector('[name="query"]');
      field.focus();
      field.setSelectionRange(focus.selectionStart,focus.selectionEnd);
    }
  }

  _onRender(context,options){
    super._onRender(context,options);
    const root=this.element.querySelector(".mjl-hub-shell");
    const fields=[...root.querySelectorAll(".mjl-hub-filters [name]")];
    const elements=[...root.querySelectorAll("[data-card]")];
    const filter=()=>{
      for(const field of fields)this.filters[field.name]=field.value;
      let matches=0;
      for(const element of elements){
        const card=cards.find(card=>card.id===element.dataset.card);
        element.hidden=!card||!matchesCard(card,stateFor(card),this.filters);
        if(!element.hidden)matches++;
      }
      root.querySelector("[data-empty]").hidden=!!matches||!!loading;
    };
    for(const field of fields)field.addEventListener("input",filter);
    for(const element of elements){
      element.addEventListener("toggle",()=>{
        if(element.open)this.expanded=element.dataset.card;
        else if(this.expanded===element.dataset.card)this.expanded="";
      });
      const summary=element.querySelector("summary");
      summary.addEventListener("keydown",event=>{
        if(event.key!=="Enter"&&event.key!==" ")return;
        event.preventDefault();
        event.stopPropagation();
        if(!event.repeat)summary.click();
      });
    }
    root.addEventListener("click",event=>{
      const action=event.target.closest("[data-hub]")?.dataset.hub;
      if(action==="reset"){for(const field of fields)field.value="";filter();}
      if(action==="refresh"){refresh();this.render();}
      if(action==="enable"&&allowed())new foundry.applications.sidebar.apps.ModuleManagement().render({force:true});
      if(action==="install"){
        const id=event.target.closest("[data-card]")?.dataset.card;
        const card=cards.find(card=>card.id===id);
        if(card)install(card).catch(error=>ui.notifications.error(error.message));
      }
    });
    filter();
    root.querySelector(".mjl-hub-results").scrollTop=this.scroll;
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
  game.settings.registerMenu(ID,"open",{name:TITLE,label:"Открыть каталог",icon:"fa-solid fa-store",type:HubMenu,restricted:true});
});
Hooks.on("getSceneControlButtons",controls=>{
  if(!allowed()||!controls.tokens)return;
  controls[ID]={name:ID,title:TITLE,order:8,layer:"tokens",icon:"fa-solid fa-store",tools:{
    catalog:{name:"catalog",title:"Открыть каталог",icon:"fa-solid fa-store",button:true,onChange:(_event,active)=>{if(active)open();}}
  }};
});
Hooks.once("ready",()=>{
  if(!allowed())return;
  refresh();
  setInterval(refresh,30*60*1000);
});
