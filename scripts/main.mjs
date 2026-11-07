import {HUB_ID as ID,availabilityFor,matchesCard,normalizeCatalog,notices,rawSource,releaseFor} from "./catalog.mjs";

const SOURCE="https://raw.githubusercontent.com/MJl2517/MJl-Modules-Hub/main/catalog.json";
const TITLE="MJl - Modules Hub";
const {ApplicationV2,DialogV2}=foundry.applications.api;
const {escapeHTML:esc,isNewerVersion:newer}=foundry.utils;
const asset=name=>foundry.utils.getRoute(`modules/${ID}/art/${name==="travel"?"pointcrawl":name}.webp`);
const allowed=()=>game.user?.isGM&&game.user.can("SETTINGS_MODIFY");
const blank={initialized:false,seen:[],announced:[],chatVersions:{}};
let cards=[],hubRelease,errors=0,loading,instance;

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

function refresh({notify=game.settings.get(ID,"autoCheck")}={}){
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
    hubRelease=releases.at(-1);
    const previous=preferences(),{news,updates}=notices(releases,game.modules,previous,newer,game.version);
    const announced=new Set(previous.announced??[]),chatVersions={...previous.chatVersions};
    const fresh=news.filter(card=>!announced.has(card.id));
    if(fresh.length)ui.notifications.info(`${TITLE} · Новинки: ${fresh.map(card=>esc(card.title)).join(", ")}`);
    for(const card of fresh)announced.add(card.id);
    if(notify&&updates.length){
      try{
        const rows=updates.map(card=>`<li>${esc(card.title)} · ${esc(game.modules.get(card.id).version)} → <strong>${esc(card.release.version)}</strong></li>`).join("");
        await ChatMessage.create({speaker:{alias:TITLE},whisper:[game.user.id],flags:{[ID]:{updates:true}},
          content:`<h3>Доступны обновления</h3><ul>${rows}</ul><button type="button" data-mjl-hub-updates>Открыть обновления</button>`});
        for(const card of updates)chatVersions[card.id]=card.release.version;
      }catch(error){console.error(ID,error);}
    }
    await savePreferences({initialized:true,announced:[...announced],chatVersions,
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
  selected="";
  scroll=0;

  async _renderHTML(){
    const categories=[...new Set(cards.map(card=>card.category).filter(Boolean))].sort((a,b)=>a.localeCompare(b,"ru"));
    const options=(name,choices)=>choices.map(([value,title])=>
      `<option value="${esc(value)}" ${this.filters[name]===value?"selected":""}>${esc(title)}</option>`).join("");
    const tiles=cards.map(card=>this.tile(card)).join("");
    return `<section class="mjl-hub-shell"><header class="mjl-hub-head">
      <img src="${esc(asset("raspberry"))}" alt=""><div><h2>${TITLE}</h2><p>Версия сервера Foundry ${esc(game.version)}</p></div>
      <div class="mjl-hub-actions">${hubRelease&&stateFor(hubRelease).update?'<button type="button" data-hub="updateHub">Обновить Hub</button>':""}
      <button type="button" data-hub="refresh" ${loading?"disabled":""}><i class="fa-solid fa-rotate" aria-hidden="true"></i> Проверить версии</button></div></header>
      <div class="mjl-hub-status" role="status">${loading?"Проверяем GitHub…":errors?`Не удалось проверить источники GitHub: ${errors}. Карточки каталога доступны.`:""}</div>
      <div class="mjl-hub-layout"><aside class="mjl-hub-filters">
        <label>Поиск<input type="search" name="query" value="${esc(this.filters.query)}" placeholder="Найти модуль"></label>
        <label>Статус<select name="status">${options("status",[["","Все модули"],["active","Включены в мире"],["installed","Установлены"],["update","Есть обновление"],["available","Можно установить"]])}</select></label>
        <label>Категория<select name="category">${options("category",[["","Все категории"],...categories.map(category=>[category,category])])}</select></label>
        <button type="button" data-hub="reset">Сбросить фильтры</button>
      </aside><section class="mjl-hub-results" aria-label="Модули">
        <div class="mjl-hub-grid">${tiles}</div><p data-empty hidden>По этому запросу ничего нет.</p>
      </section><aside class="mjl-hub-details" aria-label="Сведения о модуле"></aside></div></section>`;
  }

  tile(card){
    return `<button type="button" class="mjl-hub-card" data-card="${card.id}" aria-pressed="false">
      <img src="${esc(asset(card.art))}" alt="" loading="lazy">
      <span class="mjl-hub-card-heading"><strong>${esc(card.title)}</strong><small>${esc(card.category)}</small></span></button>`;
  }

  details(card,isNew){
    if(!card)return "<p>Выберите модуль из каталога.</p>";
    const {installed,update,label,compatibility,reason,candidate,canInstall,action}=stateFor(card);
    return `<h3>${esc(card.title)}</h3><p class="mjl-hub-description">${esc(card.description)}</p>
      <p class="mjl-hub-availability" data-update="${update}">${esc(label)}${isNew?" · Новинка":""}</p>
      <p class="mjl-hub-compatibility" data-state="${compatibility.state}" data-tooltip-text="${esc(compatibility.reason)}">${esc(compatibility.requirement)}${compatibility.state==="unverified"?" · не проверено":""}</p>
      <p>${esc(compatibility.reason)}</p>
      ${installed?`<p>На сервере ${esc(installed.version)}</p>`:""}
      ${card.release?`<p>На GitHub ${esc(card.release.version)}${card.release.verified?` · Проверено на Foundry ${esc(card.release.verified)}`:""}</p>`:""}
      <div class="mjl-hub-actions">
      ${candidate?`<span data-tooltip-text="${esc(reason)}"><button type="button" data-hub="install" ${canInstall?"":"disabled"}>${action}</button></span>`:""}
      ${installed&&!installed.active?'<button type="button" data-hub="enable">Включить в мире</button>':""}
      ${card.repo?`<a href="${esc(card.repo)}" target="_blank" rel="noopener noreferrer">GitHub <i class="fa-solid fa-arrow-up-right-from-square" aria-hidden="true"></i></a>`:""}</div>`;
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
    const layout=root.querySelector(".mjl-hub-layout");
    const sidebar=root.querySelector(".mjl-hub-details");
    const seen=new Set(preferences().seen??[]);
    const select=id=>{
      this.selected=id;
      for(const element of elements)element.setAttribute("aria-pressed",String(element.dataset.card===id));
      sidebar.innerHTML=this.details(cards.find(card=>card.id===id),!seen.has(id));
      sidebar.scrollTop=0;
    };
    const filter=()=>{
      for(const field of fields)this.filters[field.name]=field.value;
      for(const element of elements){
        const card=cards.find(card=>card.id===element.dataset.card);
        element.hidden=!card||!matchesCard(card,stateFor(card),this.filters);
      }
      const first=elements.find(element=>!element.hidden);
      const selected=elements.find(element=>element.dataset.card===this.selected&&!element.hidden);
      root.querySelector("[data-empty]").hidden=!!first||!!loading;
      if(!selected||!sidebar.hasChildNodes())select(selected?.dataset.card??first?.dataset.card??"");
    };
    for(const field of fields)field.addEventListener("input",filter);
    root.addEventListener("click",event=>{
      const tile=event.target.closest("[data-card]");
      if(tile){
        select(tile.dataset.card);
        if(getComputedStyle(layout).overflowY==="auto")sidebar.scrollIntoView({block:"nearest"});
        return;
      }
      const action=event.target.closest("[data-hub]")?.dataset.hub;
      if(action==="reset"){for(const field of fields)field.value="";filter();}
      if(action==="refresh"){refresh({notify:false});this.render();}
      if(action==="enable"&&allowed())new foundry.applications.sidebar.apps.ModuleManagement().render({force:true});
      if(action==="install"||action==="updateHub"){
        const card=action==="updateHub"?hubRelease:cards.find(card=>card.id===this.selected);
        if(card)install(card).catch(error=>ui.notifications.error(error.message));
      }
    });
    filter();
    root.querySelector(".mjl-hub-results").scrollTop=this.scroll;
    if(cards.length)savePreferences({...preferences(),initialized:true,seen:cards.map(card=>card.id)}).catch(console.error);
  }
}

function open({updates=false}={}){
  if(!allowed())return;
  instance??=new Hub();
  if(updates)instance.filters={query:"",status:"update",category:""};
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
    onChange:()=>refresh({notify:false})});
  game.settings.register(ID,"autoCheck",{scope:"world",config:true,type:Boolean,default:true,
    name:"Проверять обновления автоматически",hint:"При входе и раз в 30 минут проверять включённые модули и сообщать мастеру в личном чате.",
    onChange:enabled=>{if(enabled)refresh();}});
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
  const check=()=>{if(game.settings.get(ID,"autoCheck"))refresh();};
  check();
  setInterval(check,30*60*1000);
});
Hooks.on("renderChatMessageHTML",(message,html)=>{
  if(allowed()&&message.isContentVisible&&message.getFlag(ID,"updates"))
    html.querySelector("[data-mjl-hub-updates]")?.addEventListener("click",()=>open({updates:true}));
});
