/* YANAVEGA lobby – home (full-bleed split mode panels), top bar, nav, mode sheets, phone, launch overlay */
(function(){'use strict';
const YV=window.YV,h=YV.el,$=YV.$,$$=YV.$$;YV.screens={};
const MODES=[
 {id:'story',title:'Story Mode',kicker:'ACT 0 · FIRST FARE',tag:'CAMPAIGN',icon:'book',art:'ui/mode_story.webp',pos:'27% 40%',line:'100+ missions. Every choice becomes history.',cta:'Continue'},
 {id:'open',title:'Open Road',kicker:'SOLARA CITY · SUNSET',tag:'FREE ROAM',icon:'road',art:'ui/mode_open.webp',pos:'52% 50%',line:'No objectives. Just you, the car and the city.',cta:'Cruise'},
 {id:'race',title:'Race Mode',kicker:'9 EVENT TYPES',tag:'COMPETE',icon:'flag',art:'ui/mode_race.webp',pos:'38% 58%',line:'Circuit, drift, touge, drag, rally and more.',cta:'Race'}];
YV.MODES=MODES;
const NAV=[['chars','chars','Characters'],['wardrobe','wardrobe','Wardrobe'],['inventory','inv','Inventory'],['garage','garage','Garage'],['shop','shop','Shop'],['maint','wrench','Maintenance'],['settings','gear','Settings']];
const TIPS=['Reputation opens doors that money cannot.','A friend who stops answering is a story, not a coincidence.','Wet roads reward patience. Dry roads reward nerve.','Every car remembers how it was driven.','Not every road on the map is on the map.','Good tires are the cheapest horsepower you can buy.'];
YV.modeCfg=Object.assign({open:{region:'Solara City',time:'Sunset',weather:'Clear',traffic:60,peds:60,photo:false},race:{type:'Street Race',diff:'Standard',laps:3,opp:5,time:'Night',weather:'Clear'}},(()=>{try{return JSON.parse(localStorage.getItem('yv.modecfg')||'{}')}catch(e){return {}}})());
const saveCfg=()=>{try{localStorage.setItem('yv.modecfg',JSON.stringify(YV.modeCfg))}catch(e){}};

YV.refreshChips=function(){const d=YV.store.data;$$('.v-cr').forEach(e=>e.textContent=YV.fmt(d.wallet.credits));$$('.v-rep').forEach(e=>e.textContent='REP '+d.wallet.rep);$$('.v-name').forEach(e=>e.textContent=d.profile.name)};
const chips=()=>[h('div',{class:'chip'},YV.icon('coin'),h('span',{class:'v-cr'})),h('div',{class:'chip rep'},YV.icon('star'),h('span',{class:'v-rep'}))];

/* ---------------- home: three full-bleed, slanted mode panels (no frames, no boxes) */
function strip(m,i){
 const d=YV.store.data,sel=YV.home.sel===m.id;
 const meta=m.id==='story'?h('div',{class:'meta'},h('span',null,'CH. '+d.story.chapter),h('div',{class:'prog'},h('i',{style:'width:'+d.story.progress+'%'})),h('span',null,d.story.progress+'%')):
  m.id==='open'?h('div',{class:'meta'},h('span',null,'GARAGE · '+YV.db.cars.find(c=>c.id===d.garage.active).name.toUpperCase())):h('div',{class:'meta'},h('span',null,'BEST · NO RECORDS YET'));
 const s=h('button',{class:'strip '+m.id+(sel?' sel':''),style:'animation-delay:'+(.05+i*.1)+'s',onpointerenter:()=>YV.audio.play('hover'),onclick:()=>{if(YV.home.sel===m.id)openMode(m.id);else{YV.audio.play('tap');YV.home.select(m.id)}}},
  h('div',{class:'art',style:`background-image:url(${YV.assets.url(m.art)});background-position:${m.pos}`}),h('div',{class:'scrim'}),
  h('div',{class:'stop'},h('span',{class:'tg'},m.tag),YV.icon(m.icon)),
  h('div',{class:'sbody'},h('small',null,m.kicker),h('h2',{class:'disp'},m.title),h('div',{class:'more'},h('p',null,m.line),meta,h('span',{class:'cta'},m.cta,YV.icon('play')))));
 return s};
YV.home={sel:'story',el:null,
 select(id){this.sel=id;$$('.strip',this.el).forEach(s=>s.classList.toggle('sel',s.classList.contains(id)))},
 build(){const el=this.el=h('section',{id:'home'},MODES.map(strip));
  el.addEventListener('pointermove',e=>{if(document.body.classList.contains('rm'))return;const x=(e.clientX/innerWidth-.5)*-2.2;el.style.setProperty('--ax',x+'vh')});return el}};

/* ---------------- top bar + nav */
function buildTop(){const d=YV.store.data;
 return h('header',{id:'topbar'},
  h('button',{class:'player',onclick:()=>{YV.audio.play('tap');YV.nav.open('chars')}},h('div',{class:'avatar'}),h('div',{class:'pinfo'},h('b',{class:'v-name'}),h('span',{class:'lv'},'LV '+d.profile.level),h('div',{class:'xp'},h('i',{style:'width:'+d.profile.xp+'%'})))),
  h('div',{class:'brand'},h('img',{src:YV.assets.url('ui/logo_mark.svg'),alt:''}),h('span',null,'YANAVEGA')),
  h('div',{class:'right'},chips(),
   h('button',{class:'ibtn',onclick:()=>{YV.audio.play('open');YV.phone.toggle()},'aria-label':'Phone'},YV.icon('phone'),YV.db.phone.some(t=>t.unread&&!d.phone.read[t.id])?h('i',{class:'dot'}):null),
   h('button',{class:'ibtn',onclick:()=>{YV.audio.play('open');showNews()},'aria-label':'News'},YV.icon('news')),
   h('button',{class:'ibtn',onclick:()=>{YV.audio.play('tap');YV.nav.open('settings')},'aria-label':'Settings'},YV.icon('gear'))))}
function buildNav(){return h('nav',{id:'nav',class:'panel cut'},NAV.map(([id,ic,lb])=>h('button',{class:'navb','data-s':id,onpointerenter:()=>YV.audio.play('hover'),onclick:()=>{YV.audio.play('tap');YV.nav.toggle(id)}},YV.icon(ic),h('span',{class:'l'},lb))))}

/* ---------------- screen manager */
YV.nav={cur:null,
 toggle(id){this.cur===id?this.close():this.open(id)},
 open(id){const sc=YV.screens[id];if(!sc)return;YV.phone.close(true);closeSheet();
  let root=$('#scr-'+id);if(root)root.remove();
  root=h('div',{class:'screen open',id:'scr-'+id});const body=h('div',{class:'sc-body'});
  root.append(h('div',{class:'sc-head'},h('button',{class:'ibtn',onclick:()=>{YV.audio.play('back');YV.nav.close()},'aria-label':'Back'},YV.icon('back')),h('h1',null,sc.title),h('span',{class:'sub'},sc.sub||''),h('div',{class:'grow'}),chips()),body);
  $$('.screen').forEach(s=>s.remove());$('#ui').append(root);sc.build(body);YV.refreshChips();
  this.cur=id;document.body.dataset.screen=id;$$('.navb').forEach(b=>b.classList.toggle('on',b.dataset.s===id));YV.audio.play('open');
  YV.stage.layout(sc.stage||'none');if(sc.stage)YV.stage.setBody(YV.store.data.body)},
 close(){$$('.screen').forEach(s=>s.remove());this.cur=null;delete document.body.dataset.screen;$$('.navb').forEach(b=>b.classList.remove('on'));YV.stage.layout('none')}};

/* ---------------- mode sheets */
function closeSheet(){const s=$('.sheet');if(s)s.remove();document.body.classList.remove('sheet-open')}
function carSelect(val,on){const d=YV.store.data;const s=h('select',{onchange:e=>on(e.target.value)},d.garage.owned.map(id=>{const c=YV.db.cars.find(x=>x.id===id);return h('option',{value:id,selected:id===val},c.name)}));return s}
function field(label,node){return h('div',{class:'field'},h('label',null,label),node)}
function openMode(id){
 const m=MODES.find(x=>x.id===id),d=YV.store.data;closeSheet();YV.audio.play('open');
 const body=h('div',{class:'scroll pad',style:'flex:1'});let startFn;
 if(id==='story'){
  d.garage.active&&YV.store.save();let slot=YV.store.slot;
  const list=h('div',null);const draw=()=>{list.innerHTML='';[1,2,3].forEach(s=>{const sm=YV.store.summary(s);const on=s===slot;
   list.append(h('button',{class:'slot'+(on?' on':''),onclick:()=>{YV.audio.play('tap');slot=s;draw()}},h('b',{class:'disp'},'SLOT '+s),sm?h('span',null,sm.story.act+' · '+sm.story.chapter+' · '+sm.story.progress+'%'):h('span',{class:'mut'},'EMPTY — new game'),sm?h('small',null,'Credits '+YV.fmt(sm.wallet.credits)+' · saved '+new Date(sm.updated).toLocaleDateString()):null))})};draw();
  body.append(h('div',{class:'lbl'},'Choose a save slot'),list,h('p',{class:'desc'},'The campaign is fully offline. The online layer arrives later as an update and never replaces your story saves.'));
  startFn=()=>{YV.store.load(slot);YV.cfg.set('data.slot','Slot '+slot);YV.refreshChips();launch(m,{slot})};
 }else if(id==='open'){
  const c=YV.modeCfg.open;c.car=c.car&&d.garage.owned.includes(c.car)?c.car:d.garage.active;
  body.append(field('Region',YV.seg(['Solara City','Kurohana 🔒','Azure Coast 🔒','Ironvale 🔒','Verdant 🔒'],c.region==='Solara City'?'Solara City':c.region,v=>{if(v.indexOf('🔒')>0){YV.toast('Unlocks as the story reaches that region','bad');YV.audio.play('error');return}c.region=v;saveCfg()})),
   field('Car',carSelect(c.car,v=>{c.car=v;saveCfg()})),field('Time of day',YV.seg(['Dawn','Noon','Sunset','Night','Live'],c.time,v=>{c.time=v;saveCfg()})),field('Weather',YV.seg(['Clear','Cloudy','Rain','Storm','Fog'],c.weather,v=>{c.weather=v;saveCfg()})),
   field('Traffic density',YV.slider(0,100,5,c.traffic,null,v=>{c.traffic=v;saveCfg()})),field('Pedestrians',YV.slider(0,100,5,c.peds,null,v=>{c.peds=v;saveCfg()})),
   h('div',{class:'crow'},h('div',{class:'cl'},'Social cruise',h('small',null,'Meet other drivers on the road (online update).')),h('div',{class:'cc'},YV.toggle(false,()=>{},true))),
   h('div',{class:'crow'},h('div',{class:'cl'},'Start in photo mode'),h('div',{class:'cc'},YV.toggle(c.photo,v=>{c.photo=v;saveCfg()}))));
  startFn=()=>launch(m,c);
 }else{
  const c=YV.modeCfg.race;c.car=c.car&&d.garage.owned.includes(c.car)?c.car:d.garage.active;
  const types=['Street Race','Circuit','Drift','Drag','Rally','Touge','Endurance','Time Attack','Championship'];const ic=['road','flag','pose','bolt','gem','tire','batt','chip','star'];
  const grid=h('div',{class:'tiles'});const dr=()=>{grid.innerHTML='';types.forEach((t,i)=>grid.append(h('button',{class:'tile'+(c.type===t?' on':''),onclick:()=>{YV.audio.play('tap');c.type=t;saveCfg();dr()}},YV.icon(ic[i]),h('span',null,t))))};dr();
  body.append(h('div',{class:'lbl'},'Event type'),grid,field('Car',carSelect(c.car,v=>{c.car=v;saveCfg()})),field('Difficulty',YV.seg(['Relaxed','Standard','Hard','Realistic'],c.diff,v=>{c.diff=v;saveCfg()})),
   field('Laps',YV.seg([1,3,5,10],c.laps,v=>{c.laps=+v;saveCfg()})),field('Opponents',YV.slider(1,11,1,c.opp,null,v=>{c.opp=v;saveCfg()})),field('Time of day',YV.seg(['Dawn','Noon','Sunset','Night'],c.time,v=>{c.time=v;saveCfg()})),field('Weather',YV.seg(['Clear','Cloudy','Rain','Storm','Fog'],c.weather,v=>{c.weather=v;saveCfg()})));
  startFn=()=>launch(m,c);}
 const sheet=h('aside',{class:'sheet panel cut'},h('div',{class:'sh-head',style:`background-image:url(${YV.assets.url(m.art)});background-position:${m.pos}`},h('div',{class:'shade'}),h('div',{class:'t'},h('small',null,m.kicker),h('h3',null,m.title)),h('button',{class:'ibtn',onclick:()=>{YV.audio.play('back');closeSheet()}},YV.icon('x'))),body,
  h('div',{class:'sh-foot'},h('button',{class:'btn p go',style:'flex:1;min-height:6.4vh',onclick:()=>{YV.audio.play('confirm');startFn()}},id==='story'?'Continue / New':m.cta,YV.icon('play'))));
 $('#ui').append(sheet);document.body.classList.add('sheet-open')}
YV.openMode=openMode;

/* ---------------- launch overlay (hand-off point to the future gameplay build) */
function launch(m,cfg){closeSheet();const L=$('#launch');L.innerHTML='';const bar=h('i',{style:'width:0%'});
 L.style.backgroundImage=`url(${YV.assets.url(m.art)})`;L.append(h('div',{class:'lc'},h('small',{class:'disp',style:'color:var(--p1);font-size:.55rem'},m.kicker),h('h3',{style:'font-size:1.6rem;margin:.6vh 0'},m.title),h('div',{class:'tip'},TIPS[Math.floor(Math.random()*TIPS.length)]),h('div',{class:'bar'},bar)));
 L.classList.add('open');let p=0;const iv=setInterval(()=>{p+=3+Math.random()*7;bar.style.width=Math.min(100,p)+'%';if(p>=100){clearInterval(iv);setTimeout(()=>{L.classList.remove('open');YV.emit('startMode',{mode:m.id,cfg});YV.toast('Gameplay is the next build. The lobby is ready and saves everything you set.','ok')},350)}},90)}

/* ---------------- phone + news */
YV.phone={open:false,
 toggle(){this.open?this.close():this.show()},
 close(quiet){const d=$('#drawer');d.classList.remove('open');d.innerHTML='';this.open=false;if(!quiet)YV.audio.play('back')},
 show(){const d=$('#drawer');this.open=true;d.classList.add('open');this.list()},
 list(){const d=$('#drawer'),s=YV.store.data;d.innerHTML='';d.append(h('div',{class:'phone panel cut'},h('div',{class:'th',style:'cursor:default;justify-content:space-between'},h('b',{class:'disp',style:'font-size:.7rem'},'Messages'),h('button',{class:'ibtn',style:'width:4.4vh;height:4.4vh',onclick:()=>this.close()},YV.icon('x'))),
  h('div',{class:'scroll',style:'flex:1'},YV.db.phone.map(t=>{const last=t.msgs[t.msgs.length-1],un=t.unread&&!s.phone.read[t.id];return h('button',{class:'th',onclick:()=>{YV.audio.play('tap');s.phone.read[t.id]=1;YV.store.touch();this.chat(t)}},h('div',{class:'av',style:'background:'+t.color},t.name[0]),h('div',null,h('b',null,t.name),h('small',null,last[1])),un?h('i',{class:'dot',style:'position:static;margin-left:auto'}):null)}))))},
 chat(t){const d=$('#drawer');d.innerHTML='';d.append(h('div',{class:'phone panel cut'},h('div',{class:'th',style:'cursor:default'},h('button',{class:'ibtn',style:'width:4.4vh;height:4.4vh',onclick:()=>{YV.audio.play('back');this.list()}},YV.icon('back')),h('div',{class:'av',style:'background:'+t.color},t.name[0]),h('b',null,t.name)),
  h('div',{class:'scroll chat',style:'flex:1'},t.msgs.map(m=>h('div',{class:'bub '+(m[0]==='out'?'out':'')},m[1]))),
  h('div',{class:'th',style:'cursor:default'},h('span',{class:'mut',style:'font-size:.7rem'},'Replies appear during story missions.'))))}};
function showNews(){const n=h('div',{class:'bd scroll',style:'max-height:46vh'},YV.db.news.map(x=>h('div',{style:'margin-bottom:1.6vh'},h('span',{class:'tag',style:'background:var(--brand)'},x.tag),h('h3',{style:'margin:.8vh 0 .3vh'},x.title),h('div',{class:'mut'},x.body))));
 YV.dialog({title:'News & updates',node:n,cancel:false,ok:'Close'})}

YV.buildLobby=function(){const ui=$('#ui');ui.innerHTML='';ui.append(YV.home.build(),buildTop(),buildNav());YV.refreshChips();YV.on('wallet',YV.refreshChips)};
})();
