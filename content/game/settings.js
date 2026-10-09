/* YANAVEGA lobby – deep, schema-driven settings screen + live application of settings */
(function(){'use strict';
const YV=window.YV,h=YV.el,$=YV.$;
const PRE={
 Low:{'gfx.resScale':70,'gfx.fps':'30','gfx.tex':'Low · 512','gfx.aniso':'2x','gfx.draw':35,'gfx.veg':30,'gfx.crowd':25,'gfx.shadow':'Off','gfx.shadowDist':20,'gfx.ao':'Off','gfx.reflect':'Off','gfx.volumetric':'Off','gfx.weatherQ':'Low','gfx.puddles':20,'gfx.bloom':false,'gfx.mblur':false,'gfx.dof':false,'gfx.particles':'Low','gfx.physics':'Low'},
 Medium:{'gfx.resScale':85,'gfx.fps':'45','gfx.tex':'Medium · 1024','gfx.aniso':'4x','gfx.draw':50,'gfx.veg':50,'gfx.crowd':40,'gfx.shadow':'Medium','gfx.shadowDist':40,'gfx.ao':'SSAO','gfx.reflect':'Medium','gfx.volumetric':'Off','gfx.weatherQ':'Medium','gfx.puddles':50,'gfx.bloom':true,'gfx.mblur':false,'gfx.dof':false,'gfx.particles':'Medium','gfx.physics':'Medium'},
 High:{'gfx.resScale':100,'gfx.fps':'60','gfx.tex':'High · 2048','gfx.aniso':'8x','gfx.draw':70,'gfx.veg':70,'gfx.crowd':60,'gfx.shadow':'High','gfx.shadowDist':60,'gfx.ao':'SSAO','gfx.reflect':'High','gfx.volumetric':'Low','gfx.weatherQ':'High','gfx.puddles':70,'gfx.bloom':true,'gfx.mblur':true,'gfx.dof':true,'gfx.particles':'High','gfx.physics':'Medium'},
 Ultra:{'gfx.resScale':110,'gfx.fps':'90','gfx.tex':'Ultra · 4096','gfx.aniso':'16x','gfx.draw':100,'gfx.veg':100,'gfx.crowd':90,'gfx.shadow':'Ultra','gfx.shadowDist':100,'gfx.ao':'HBAO+','gfx.reflect':'Ultra','gfx.volumetric':'High','gfx.weatherQ':'High','gfx.puddles':100,'gfx.bloom':true,'gfx.mblur':true,'gfx.dof':true,'gfx.particles':'High','gfx.physics':'High'}};
const KEYS=Object.keys(PRE.Low);
YV.infoVal=function(key){const N=window.YanaNative,f={contentVersion:()=>N?(N.getContentVersion()||'—'):'preview build',appVersion:()=>N?N.getAppVersion():'preview',
 gpu:()=>{try{const g=document.createElement('canvas').getContext('webgl'),e=g.getExtension('WEBGL_debug_renderer_info');return e?g.getParameter(e.UNMASKED_RENDERER_WEBGL):'WebGL'}catch(x){return 'n/a'}},
 screen:()=>innerWidth+'×'+innerHeight+' @'+(devicePixelRatio||1).toFixed(1)+'x',cores:()=>navigator.hardwareConcurrency||'?',memory:()=>navigator.deviceMemory?navigator.deviceMemory+' GB':'n/a',credits:()=>'YANAVERSE'};return f[key]?f[key]():''};
YV.applySettings=function(){const c=YV.cfg,r=document.documentElement,b=document.body;
 r.style.setProperty('--uis',(c.get('dsp.ui')/100)*(c.get('acc.text')/100));r.dataset.theme=c.get('dsp.theme');
 const sf=1.2+c.get('dsp.safe')*.5;r.style.setProperty('--sl','calc(env(safe-area-inset-left,0px) + '+sf+'vh)');r.style.setProperty('--sr','calc(env(safe-area-inset-right,0px) + '+sf+'vh)');
 const br=c.get('dsp.bright'),co=c.get('dsp.contrast'),sa=c.get('dsp.sat'),cb=c.get('dsp.cb');const f=[];if(br!==100)f.push('brightness('+br/100+')');if(co!==100)f.push('contrast('+co/100+')');if(sa!==100)f.push('saturate('+sa/100+')');if(cb!=='Off')f.push('url(#cb-'+cb+')');
 $('#app').style.filter=f.length?f.join(' '):'none';
 b.classList.toggle('rm',!!c.get('acc.motion'));b.classList.toggle('hc',!!c.get('acc.contrast'));b.classList.toggle('dys',!!c.get('acc.dys'));
 const fp=$('#fps');fp.style.display=(c.get('dsp.fps')||c.get('dsp.info'))?'block':'none';
 YV.audio.applyVol();if(YV.stage&&YV.stage.r)YV.stage.applyGfx()};
YV.on('cfg',()=>YV.applySettings());
YV.on('fps',v=>{const c=YV.cfg,el=$('#fps');if(el.style.display==='none')return;el.textContent=(c.get('dsp.fps')?v+' FPS':'')+(c.get('dsp.info')?'  '+YV.infoVal('screen')+'  '+YV.infoVal('gpu').slice(0,28):'')});
const D=()=>YV.store.data;
YV.actions={
 hudEditor:()=>YV.toast('The HUD editor opens once the driving build exists'),padMap:()=>YV.toast('Gamepad mapping arrives with driving gameplay'),keyMap:()=>YV.toast('Keyboard bindings arrive with driving gameplay'),
 exportSave(){const t=JSON.stringify(D());const done=()=>YV.toast('Save copied. Keep it somewhere safe.','ok');if(navigator.clipboard&&navigator.clipboard.writeText)navigator.clipboard.writeText(t).then(done,()=>fallback(t));else fallback(t);
  function fallback(t){const ta=h('textarea',{rows:6,readonly:true},t);YV.dialog({title:'Export save',node:h('div',{class:'bd'},h('p',{class:'desc'},'Select all and copy:'),ta),cancel:false,ok:'Close'});setTimeout(()=>{ta.select()},50)}},
 importSave(){const ta=h('textarea',{rows:6,placeholder:'Paste an exported save here'});YV.dialog({title:'Import save',node:h('div',{class:'bd'},h('p',{class:'desc'},'This replaces the active slot.'),ta),ok:'Import'}).then(ok=>{if(!ok)return;try{const o=JSON.parse(ta.value);if(!o||o.v!==1)throw 0;localStorage.setItem(YV.store.key(YV.store.slot),JSON.stringify(o));YV.store.load(YV.store.slot);YV.buildLobby();YV.nav.close();YV.toast('Save imported','ok')}catch(e){YV.toast('That is not a valid save','bad')}})},
 async wipeSave(){if(!(await YV.confirm('Delete save','Delete everything in the active save slot? This cannot be undone.','Delete',true)))return;YV.store.wipe(YV.store.slot);YV.store.load(YV.store.slot);YV.buildLobby();YV.nav.close();YV.toast('Slot cleared')},
 getHd(){if(window.YanaNative){YanaNative.requestPack('hd');YV.toast('Downloading the HD pack…')}else YV.toast('The HD pack is available in the installed app')},
 async resetSettings(){if(!(await YV.confirm('Reset settings','Restore every option to its default?','Reset',true)))return;YV.cfg.resetAll();YV.nav.open('settings');YV.toast('Settings reset','ok')},
 replayIntro(){YV.bootShow(1600)}};
function row(k){const r=h('div',{class:'crow'});
 const commit=v=>{YV.cfg.set(k.id,v);if(KEYS.indexOf(k.id)>=0&&YV.cfg.get('gfx.preset')!=='Custom'){YV.cfg.set('gfx.preset','Custom');const p=$('[data-id="gfx.preset"]');if(p&&p.rebuild)p.rebuild()}
  if(k.id==='gfx.preset'&&v!=='Custom'){const P=PRE[v];KEYS.forEach(x=>YV.cfg.set(x,P[x],true));YV.emit('cfg','*');YV.$$('.crow[data-id]').forEach(e=>e.rebuild&&e.rebuild())}
  if(k.id==='data.slot'){const n=parseInt(v.replace(/\D/g,''));YV.store.save();YV.store.load(n);YV.buildLobby();YV.toast('Loaded '+v,'ok')}};
 const build=()=>{r.innerHTML='';r.classList.toggle('mod',YV.cfg.isMod(k.id));r.dataset.id=k.id;r.rebuild=build;
  const lab=h('div',{class:'cl'},k.label,k.restart?h('span',{class:'rstart'},'  RESTART'):null,k.desc?h('small',null,k.desc):null),cc=h('div',{class:'cc'});const cur=YV.cfg.get(k.id);
  if(k.type!=='action'&&k.type!=='info'&&YV.cfg.isMod(k.id))cc.append(h('button',{class:'rs',title:'Reset',onclick:()=>{YV.cfg.reset(k.id);if(k.id==='gfx.preset')YV.cfg.set('gfx.preset','High');build()}},YV.icon('reset')));
  if(k.type==='toggle')cc.append(YV.toggle(cur,v=>{commit(v);r.classList.toggle('mod',YV.cfg.isMod(k.id))},k.disabled));
  else if(k.type==='slider'){const val=h('span',{class:'val'},+(+cur).toFixed(2)+(k.unit||''));cc.append(val,YV.slider(k.min,k.max,k.step,cur,x=>{val.textContent=+(+x).toFixed(2)+(k.unit||'')},x=>{commit(x);r.classList.toggle('mod',YV.cfg.isMod(k.id))}))}
  else if(k.type==='select'){if(k.options.length<=5&&k.options.join('').length<34)cc.append(YV.seg(k.options,cur,v=>{commit(v);r.classList.toggle('mod',YV.cfg.isMod(k.id))}));
   else cc.append(h('select',{onchange:e=>{commit(e.target.value);YV.audio.play('tap');r.classList.toggle('mod',YV.cfg.isMod(k.id))}},k.options.map(o=>h('option',{selected:o===cur},o))))}
  else if(k.type==='action')cc.append(h('button',{class:'btn sm'+(k.danger?' d':''),onclick:()=>{YV.audio.play('tap');YV.actions[k.action]&&YV.actions[k.action](k)}},k.btn||'Open'));
  else cc.append(h('span',{class:'val',style:'min-width:0;text-align:right;color:var(--ink);font-family:Rajdhani;font-size:.85rem'},YV.infoVal(k.key)));
  r.append(lab,cc)};build();return r}
YV.screens.settings={title:'Settings',sub:'DEEP OPTIONS · SAVED ON THIS DEVICE',build(body){
 let cat=YV.cfg.schema[0].id,q='';const tabs=h('div',{class:'tabs scroll',style:'flex:1'}),list=h('div',{class:'scroll',style:'flex:1'});
 const drawTabs=()=>{tabs.innerHTML='';YV.cfg.schema.forEach(c=>tabs.append(h('button',{class:'tab'+(cat===c.id&&!q?' on':''),onclick:()=>{YV.audio.play('tap');q='';search.value='';cat=c.id;drawTabs();drawList()}},YV.icon(c.icon),h('span',null,c.label),h('span',{class:'n'},c.groups.reduce((s,g)=>s+g.controls.length,0)))))};
 const drawList=()=>{list.innerHTML='';list.scrollTop=0;
  if(q){let n=0;YV.cfg.schema.forEach(c=>c.groups.forEach(g=>{const m=g.controls.filter(k=>(k.label+' '+(k.desc||'')).toLowerCase().indexOf(q)>=0);if(m.length){list.append(h('div',{class:'gh'},c.label+' › '+g.label));m.forEach(k=>{list.append(row(k));n++})}}));if(!n)list.append(h('div',{class:'mut',style:'padding:3vh;text-align:center'},'No settings match "'+q+'".'));return}
  const c=YV.cfg.schema.find(x=>x.id===cat);list.append(h('div',{class:'row',style:'justify-content:space-between;padding:1.4vh 1.6vh .2vh'},h('h3',null,c.label),h('button',{class:'btn sm',onclick:async()=>{if(await YV.confirm('Reset '+c.label,'Reset every '+c.label+' option to default?','Reset',true)){c.groups.forEach(g=>g.controls.forEach(k=>YV.cfg.vals[k.id]!==undefined&&delete YV.cfg.vals[k.id]));YV.cfg.save();YV.emit('cfg','*');drawList();YV.toast(c.label+' reset','ok')}}},YV.icon('reset'),'Reset section')));
  c.groups.forEach(g=>{list.append(h('div',{class:'gh'},g.label));g.controls.forEach(k=>list.append(row(k)))})};
 const search=h('input',{type:'search',placeholder:'Search 180+ settings…',style:'margin:1vh;width:calc(100% - 2vh)',oninput:e=>{q=e.target.value.toLowerCase().trim();drawTabs();drawList()}});
 body.append(h('div',{class:'panel cut',style:'width:25vh;flex:0 0 auto;display:flex;flex-direction:column'},search,tabs),h('div',{class:'panel cut',style:'flex:1;min-width:0;display:flex;flex-direction:column'},list));drawTabs();drawList()}};
})();
