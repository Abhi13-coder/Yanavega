/* YANAVEGA lobby – Characters, Wardrobe, Inventory, Garage, Shop, Maintenance */
(function(){'use strict';
const YV=window.YV,h=YV.el,$=YV.$,S=YV.screens;
const D=()=>YV.store.data,itemOf=id=>YV.db.items.find(i=>i.id===id),carOf=id=>YV.db.cars.find(i=>i.id===id),SAVE=ev=>YV.store.touch(ev);
const CATICON={Clothing:'cloth',Supplies:'bolt',Materials:'gem',Collectibles:'star','Key Items':'key',Cosmetics:'paint'};
const pn=(cls,st,...k)=>h('div',{class:'panel cut '+(cls||''),style:st||''},k);
const tab=(label,icon,on,fn,n)=>h('button',{class:'tab'+(on?' on':''),onclick:()=>{YV.audio.play('tap');fn()}},icon?YV.icon(icon):null,h('span',null,label),n!=null?h('span',{class:'n'},n):null);
function tile(it,o){o=o||{};return h('button',{class:'it'+(o.on?' on':'')+(o.locked?' locked':''),style:'--rc:'+YV.rarityColor(it.rarity),onpointerenter:()=>YV.audio.play('hover'),onclick:o.click},o.eq?h('span',{class:'eq'},'EQUIPPED'):null,o.count>1?h('span',{class:'cnt'},'×'+o.count):null,YV.icon(CATICON[it.cat]||'inv'),h('b',null,it.name),o.price!=null?h('div',{class:'price'},o.price>0?YV.fmt(o.price)+' CR':'FREE'):h('small',null,it.rarity))}
const rarTag=it=>h('span',{class:'rar',style:'--rc:'+YV.rarityColor(it.rarity)},it.rarity);
function bar(l,v,delta){return h('div',{class:'sbar'},h('span',{class:'l'},l),h('div',{class:'t'},h('i',{style:'width:'+Math.min(100,v)+'%'}),delta?h('u',{style:`left:${v}%;width:${Math.min(delta,100-v)}%`}):null),h('span',{class:'v'},Math.round(v+(delta||0)),delta?h('em',null,' +'+delta):null))}
const pay=(n)=>{if(D().wallet.credits<n){YV.toast('Not enough credits','bad');YV.audio.play('error');return false}D().wallet.credits-=n;YV.audio.play('buy');SAVE('wallet');return true};
const owned=id=>(D().inv[id]||0)>0;

/* ---------------- Characters */
S.chars={title:'Characters',sub:'CAST · BODY · POSES',stage:'chars',build(body){
 let cur=YV.db.cast[0].id;const info=h('div',{class:'scroll pad',style:'flex:1'}),list=h('div',{class:'tabs scroll',style:'flex:1'});
 const draw=()=>{list.innerHTML='';YV.db.cast.forEach(c=>list.append(h('button',{class:'tab'+(c.id===cur?' on':''),onclick:()=>{YV.audio.play('tap');cur=c.id;draw();show()}},h('i',{style:`width:1vh;height:3.2vh;background:${c.color};flex:0 0 auto;clip-path:polygon(0 0,100% 0,60% 100%,0 100%)`}),h('span',null,c.unlock?c.name:'???'),c.unlock?null:YV.icon('lock'))))};
 const show=()=>{const c=YV.db.cast.find(x=>x.id===cur);info.innerHTML='';
  if(!c.unlock){info.append(h('div',{class:'ph',style:'padding-left:0'},c.tag),h('h3',null,'Locked'),h('p',{class:'desc'},'Meet this character in the story to unlock their profile.'));return}
  const m=c.model==='player'?D().body:c.model;if(m)YV.stage.setBody(m);
  info.append(h('div',{class:'ph',style:'padding-left:0'},c.tag),h('h3',{style:'color:'+c.color},c.name),h('div',{class:'mut',style:'margin:.4vh 0 1vh'},c.role),h('p',{class:'desc'},c.bio),
   h('div',{class:'sbar',style:'grid-template-columns:11vh 1fr 5vh'},h('span',{class:'l'},'Bond'),h('div',{class:'t'},h('i',{style:'width:'+(c.id==='driver'?100:12)+'%'})),h('span',{class:'v'},c.id==='driver'?'—':'LV 1')));
  if(c.model==='player')info.append(h('div',{class:'field'},h('label',null,'Body type'),YV.seg(['Female','Male'],D().body==='F'?'Female':'Male',v=>{D().body=v==='Female'?'F':'M';SAVE();YV.stage.setBody(D().body)})));
  const pose=h('div',{class:'seg',style:'flex-wrap:wrap'});['idle','walk','run','wave','bounce','dance','flex'].forEach(n=>{if(YV.stage.clipNames().length&&YV.stage.clipNames().indexOf(n)<0)return;pose.append(h('button',{onclick:()=>{YV.audio.play('tap');YV.stage.play(n)}},n))});
  info.append(h('div',{class:'field'},h('label',null,'Pose'),pose),h('p',{class:'desc mut'},'Drag the model to rotate · tap it for a reaction. Preview uses the shared base body; face and outfit parts attach to the same rig.'))};
 body.append(pn('','width:24vh;flex:0 0 auto',h('div',{class:'ph'},'Cast'),list),h('div',{style:'flex:1;min-width:0'}),pn('','width:36%;flex:0 0 auto',info));draw();show()}};

/* ---------------- Wardrobe */
S.wardrobe={title:'Wardrobe',sub:'OUTFIT · HAIR · FACE · BODY',stage:'wardrobe',build(body){
 const slots=[['outfit','Outfit','shirt'],['hair','Hair','chars'],['face','Face','pose'],['top','Top','shirt'],['bottom','Bottom','shirt'],['shoes','Shoes','tire'],['accessory','Accessories','gem'],['body','Body','chars']];
 let cur='outfit';const tabs=h('div',{class:'tabs scroll',style:'flex:1'}),right=h('div',{class:'scroll pad',style:'flex:1'});
 const draw=()=>{tabs.innerHTML='';slots.forEach(([id,l,ic])=>tabs.append(tab(l,ic,cur===id,()=>{cur=id;draw();fill()})))};
 const fill=()=>{right.innerHTML='';const d=D();
  if(cur==='body'){right.append(h('div',{class:'field'},h('label',null,'Body type'),YV.seg(['Female','Male'],d.body==='F'?'Female':'Male',v=>{d.body=v==='Female'?'F':'M';SAVE();YV.stage.setBody(d.body)})),
   h('div',{class:'field'},h('label',null,'Skin tone'),YV.slider(55,100,1,Math.round(d.skin*100),v=>YV.stage.setSkin(v/100),v=>{d.skin=v/100;SAVE()})),
   h('div',{class:'field'},h('label',null,'Character physics'),YV.seg(['Off','Low','Medium','High'],YV.cfg.get('gfx.physics'),v=>{YV.cfg.set('gfx.physics',v);YV.cfg.set('gfx.preset','Custom')})),
   h('div',{class:'field'},h('label',null,'Name'),h('input',{type:'text',maxlength:16,value:d.profile.name,oninput:e=>{d.profile.name=e.target.value||'Driver';YV.refreshChips();SAVE()}})));return}
  const its=YV.db.items.filter(i=>i.slot===cur&&(owned(i.id)||i.default));const g=h('div',{class:'grid'});
  its.forEach(it=>g.append(tile(it,{eq:d.equipped[cur]===it.id,on:d.equipped[cur]===it.id,click:()=>{YV.audio.play('equip');d.equipped[cur]=it.id;SAVE();fill();YV.toast(it.name+' equipped','ok')}})));
  right.append(g,h('p',{class:'desc mut',style:'margin-top:1.4vh'},'Equipped looks are saved. Outfit, hair and face meshes plug into the same skeleton as the body.'),h('button',{class:'btn sm',onclick:()=>{YV.audio.play('tap');YV.nav.open('shop')}},YV.icon('shop'),'Get more in Shop'))};
 body.append(pn('','width:22vh;flex:0 0 auto',h('div',{class:'ph'},'Customize'),tabs),h('div',{style:'flex:1;min-width:0'}),pn('','width:44%;flex:0 0 auto',right));draw();fill()}};

/* ---------------- Inventory */
S.inventory={title:'Inventory',sub:'ITEMS · SUPPLIES · COLLECTION',build(body){
 let cat='All',q='',sort='Rarity',sel=null;const cats=['All','Clothing','Supplies','Materials','Collectibles','Key Items','Cosmetics'];
 const tabs=h('div',{class:'tabs scroll',style:'flex:1'}),grid=h('div',{class:'grid scroll',style:'flex:1;padding:1.2vh'}),det=h('div',{class:'scroll pad',style:'flex:1'}),cap=h('div',{class:'mut',style:'font-size:.7rem;padding:0 1.6vh'});
 const rank={legendary:0,epic:1,rare:2,uncommon:3,common:4};
 const list=()=>YV.db.items.filter(i=>(D().inv[i.id]||0)>0&&!i.hidden&&(cat==='All'||i.cat===cat)&&(!q||i.name.toLowerCase().indexOf(q)>=0)).sort((a,b)=>sort==='Name'?a.name.localeCompare(b.name):sort==='Count'?(D().inv[b.id]-D().inv[a.id]):rank[a.rarity]-rank[b.rarity]);
 const drawTabs=()=>{tabs.innerHTML='';cats.forEach(c=>tabs.append(tab(c,CATICON[c]||'inv',cat===c,()=>{cat=c;drawTabs();drawGrid()},YV.db.items.filter(i=>(D().inv[i.id]||0)>0&&!i.hidden&&(c==='All'||i.cat===c)).length)))};
 const drawGrid=()=>{grid.innerHTML='';const l=list();l.forEach(it=>grid.append(tile(it,{count:D().inv[it.id],on:sel===it.id,click:()=>{YV.audio.play('tap');sel=it.id;drawGrid();drawDet()}})));if(!l.length)grid.append(h('div',{class:'mut',style:'grid-column:1/-1;padding:3vh;text-align:center'},'Nothing here yet.'));
  const used=YV.db.items.filter(i=>(D().inv[i.id]||0)>0&&!i.hidden).length;cap.textContent='SLOTS '+used+' / 60'};
 const drawDet=()=>{det.innerHTML='';const it=itemOf(sel);if(!it){det.append(h('p',{class:'desc mut'},'Select an item to see details.'));return}
  const n=D().inv[it.id]||0;det.append(h('div',{style:'display:flex;gap:1vh;align-items:center;margin-bottom:.8vh'},rarTag(it),h('span',{class:'mut'},it.cat)),h('h3',null,it.name),h('p',{class:'desc'},it.desc),h('div',{class:'mut',style:'font-size:.75rem'},'Owned: '+n+(it.price?'  ·  Value: '+YV.fmt(it.price*.4)+' CR':'')));
  const act=h('div',{class:'row',style:'margin-top:1.6vh;flex-wrap:wrap'});
  if(it.slot&&it.slot!=='accessory'||it.slot==='accessory')if(it.slot)act.append(h('button',{class:'btn p sm',onclick:()=>{YV.audio.play('equip');D().equipped[it.slot]=it.id;SAVE();YV.toast(it.name+' equipped','ok');drawDet()}},D().equipped[it.slot]===it.id?'Equipped':'Equip'));
  if(it.use)act.append(h('button',{class:'btn p sm',onclick:()=>{D().inv[it.id]--;YV.audio.play('confirm');YV.toast({energy:'Vehicle energy restored',repair:'Use it from Maintenance for a free repair',focus:'Focus boosted for the next drive'}[it.use],'ok');SAVE();drawGrid();drawDet()}},'Use'));
  if(!it.key&&!it.default)act.append(h('button',{class:'btn d sm',onclick:async()=>{if(await YV.confirm('Discard item','Discard one '+it.name+'?','Discard',true)){D().inv[it.id]--;SAVE();if(D().inv[it.id]<=0)sel=null;drawGrid();drawDet()}}},'Discard'));det.append(act)};
 const tools=h('div',{class:'stick'},h('input',{type:'search',placeholder:'Search items…',oninput:e=>{q=e.target.value.toLowerCase();drawGrid()}}),h('select',{style:'width:14vh',onchange:e=>{sort=e.target.value;drawGrid()}},['Rarity','Name','Count'].map(o=>h('option',null,o))));
 body.append(pn('','width:23vh;flex:0 0 auto',h('div',{class:'ph'},'Categories'),tabs,cap),pn('','flex:1;min-width:0',tools,grid),pn('','width:32%;flex:0 0 auto',h('div',{class:'ph'},'Details'),det));drawTabs();drawGrid();drawDet()}};

/* ---------------- Garage */
const CATI={tires:'tire',suspension:'wrench',brakes:'brake',power:'eng',aero:'body',drivetrain:'gear',cooling:'dsp',energy:'batt',electronics:'chip',weight:'inv'};
function carStats(id){const c=carOf(id),st=D().garage.cars[id],base=Object.assign({},c.stats),add={};YV.db.parts.cats.forEach(p=>{const t=st.tiers[p.id]||0;add[p.main]=(add[p.main]||0)+t*6;add[p.sub]=(add[p.sub]||0)+t*3});Object.keys(add).forEach(k=>add[k]=Math.min(add[k],100-base[k]));return{base,add}}
S.garage={title:'Garage',sub:'STATS · TUNING · STYLE',build(body){
 const d=D();let cur=d.garage.active,tabn='Stats',open='tires';
 const list=h('div',{class:'scroll',style:'flex:1;padding:1vh;display:flex;flex-direction:column;gap:.8vh'}),mid=h('div',{style:'flex:1;min-width:0;display:flex;flex-direction:column;gap:1.2vh'}),right=h('div',{class:'scroll pad',style:'flex:1'});
 const drawList=()=>{list.innerHTML='';YV.db.cars.forEach(c=>{const o=d.garage.owned.includes(c.id);list.append(h('button',{class:'tab'+(cur===c.id?' on':''),style:'min-height:7vh;flex-direction:column;align-items:flex-start;justify-content:center;gap:.2vh',onclick:()=>{YV.audio.play('tap');cur=c.id;drawList();drawMid();drawRight()}},h('b',{style:'font-size:.82rem'},c.name),h('small',{style:'font-size:.58rem;color:var(--mut)'},c.cls+(o?(d.garage.active===c.id?' · ACTIVE':' · OWNED'):' · '+YV.fmt(c.price)+' CR'))))})};
 const drawMid=()=>{mid.innerHTML='';const c=carOf(cur),o=d.garage.owned.includes(cur),st=d.garage.cars[cur];
  mid.append(h('div',{class:'hero cut',style:'flex:1;--cut:1.8vh'},h('div',{class:'img',style:`background-image:url(${YV.assets.url('ui/car_hero.webp')});filter:hue-rotate(${c.hue}deg) saturate(1.15)${o?'':' grayscale(.85) brightness(.55)'}`}),
   h('div',{class:'cap'},h('span',{class:'tag'},c.cls),h('h3',{style:'font-size:1.3rem;margin:.7vh 0 .2vh'},c.name),h('div',{class:'mut',style:'font-size:.75rem'},c.maker+(o?'':' · NOT OWNED'))),
   o?h('div',{style:'position:absolute;right:1.6vh;top:1.4vh;z-index:2;display:flex;gap:.8vh;align-items:center'},h('span',{style:`width:3vh;height:3vh;background:${st.paint};box-shadow:0 0 0 .25vh #fff`}),h('span',{class:'tag'},st.plate)):h('div',{style:'position:absolute;right:1.6vh;top:1.4vh;z-index:2'},YV.icon('lock','',null))),
   h('div',{class:'row',style:'flex:0 0 auto'},o?(d.garage.active===cur?h('button',{class:'btn dis'},'Active car'):h('button',{class:'btn p',onclick:()=>{YV.audio.play('confirm');d.garage.active=cur;SAVE();drawList();drawMid();YV.toast(c.name+' set as active','ok')}},'Set active')):h('button',{class:'btn p',onclick:()=>{YV.audio.play('tap');YV.nav.open('shop')}},'Buy in Shop · '+YV.fmt(c.price)+' CR'),h('p',{class:'desc mut',style:'flex:1;margin:0'},c.desc)))};
 const drawRight=()=>{right.innerHTML='';const c=carOf(cur),o=d.garage.owned.includes(cur),st=d.garage.cars[cur];const {base,add}=carStats(cur);
  right.append(YV.seg(['Stats','Tune','Style'],tabn,v=>{tabn=v;drawRight()}),h('div',{style:'height:1vh'}));
  if(!o){right.append(h('p',{class:'desc'},'Purchase this car to tune and style it.'),...['power','handling','energy','durability','tech','rarity','prestige'].map(k=>bar(k,base[k])));return}
  if(tabn==='Stats'){const perf=Math.round((base.power+add.power||base.power)*0.3+(base.handling+(add.handling||0))*.3+(base.tech+(add.tech||0))*.2+(base.durability+(add.durability||0))*.2);
   right.append(h('div',{class:'row',style:'justify-content:space-between;margin-bottom:.6vh'},h('span',{class:'lbl'},'Performance rating'),h('b',{class:'disp',style:'font-size:1.3rem;color:var(--p1)'},perf)),...['power','handling','energy','durability','tech','rarity','prestige'].map(k=>bar(k,base[k],add[k]||0)))}
  else if(tabn==='Tune'){YV.db.parts.cats.forEach(p=>{const t=st.tiers[p.id]||0,isOpen=open===p.id,next=t+1;
   const a=h('div',{class:'acc'},h('button',{class:'ah',onclick:()=>{YV.audio.play('tap');open=isOpen?null:p.id;drawRight()}},YV.icon(CATI[p.id]||'wrench'),h('span',null,p.name),h('span',{class:'pips'},[1,2,3,4,5].map(i=>h('i',{class:i<=t?'on':''})))));
   if(isOpen)a.append(h('div',{class:'ab'},h('div',{class:'mut',style:'font-size:.75rem'},'Current: '+YV.db.parts.tiers[t]+' · boosts '+p.main+' (+6/tier), '+p.sub+' (+3/tier)'),next<=5?h('button',{class:'btn p sm',style:'margin-top:1vh',onclick:()=>{if(pay(YV.db.parts.cost[next])){st.tiers[p.id]=next;SAVE();YV.toast(p.name+' → '+YV.db.parts.tiers[next],'ok');drawRight()}}},'Upgrade to '+YV.db.parts.tiers[next]+' · '+YV.fmt(YV.db.parts.cost[next])+' CR'):h('div',{class:'rstart',style:'margin-top:1vh'},'MAX TIER')));right.append(a)})}
  else{const C=YV.db.cosmetics,lockd=(i,pack,from)=>i>=from&&!owned(pack);
   right.append(h('div',{class:'field'},h('label',null,'Paint'),h('div',{class:'sw'},C.paints.map((p,i)=>h('button',{title:p.name,class:st.paint===p.hex?'on':'',style:`background:${p.hex};color:${p.hex};${lockd(i,'pack_paint',6)?'opacity:.35':''}`,onclick:()=>{if(lockd(i,'pack_paint',6)){YV.toast('Unlock with the Paint Pack in Shop','bad');YV.audio.play('error');return}YV.audio.play('equip');st.paint=p.hex;SAVE();drawRight();drawMid()}})))),
    ...[['wrap','Wrap',C.wraps,'pack_wrap',3],['wheels','Wheels',C.wheels,null,99],['aero','Body kit',C.aero,null,99],['interior','Interior',C.interiors,null,99],['decal','Decal',C.decals,'pack_decal',2]].map(([k,l,opts,pack,from])=>h('div',{class:'field'},h('label',null,l),h('select',{onchange:e=>{const i=opts.indexOf(e.target.value);if(pack&&lockd(i,pack,from)){YV.toast('Unlock the pack in Shop','bad');e.target.value=st[k];YV.audio.play('error');return}st[k]=e.target.value;YV.audio.play('equip');SAVE()}},opts.map((o2,i)=>h('option',{selected:st[k]===o2},o2+(pack&&lockd(i,pack,from)?' 🔒':'')))))),
    h('div',{class:'field'},h('label',null,'Light signature'),h('div',{class:'sw'},C.lights.map(l=>h('button',{title:l.name,class:st.light===l.hex?'on':'',style:`background:${l.hex};color:${l.hex}`,onclick:()=>{YV.audio.play('equip');st.light=l.hex;SAVE();drawRight()}})))),
    h('div',{class:'field'},h('label',null,'Plate'),h('input',{type:'text',maxlength:8,value:st.plate,oninput:e=>{e.target.value=e.target.value.toUpperCase();st.plate=e.target.value||'YANAVEGA';SAVE()}})),
    h('div',{class:'field'},h('label',null,'Ride height'),YV.slider(0,100,1,st.height,null,v=>{st.height=v;SAVE()})))}};
 body.append(pn('','width:23vh;flex:0 0 auto',h('div',{class:'ph'},'Your cars'),list),mid,pn('','width:38%;flex:0 0 auto',right));drawList();drawMid();drawRight()}};

/* ---------------- Shop */
const daySeed=()=>{const t=new Date();return t.getFullYear()*372+t.getMonth()*31+t.getDate()};
S.shop={title:'Shop',sub:'CARS · CLOTHING · SUPPLIES · COSMETICS',build(body){
 let cat='Daily Deals',sel=null,qty=1;const cats=[['Daily Deals','star'],['Cars','garage'],['Clothing','cloth'],['Supplies','bolt'],['Cosmetics','paint']];
 const tabs=h('div',{class:'tabs scroll',style:'flex:1'}),grid=h('div',{class:'grid scroll',style:'flex:1;padding:1.2vh'}),det=h('div',{class:'scroll pad',style:'flex:1'});
 const pool=()=>{const cars=YV.db.cars.filter(c=>c.price>0).map(c=>({kind:'car',id:c.id,name:c.name,rarity:c.cls==='LEGENDARY'?'legendary':c.price>150000?'epic':c.price>80000?'rare':'uncommon',price:c.price,cat:'Cars',desc:c.desc,car:c}));
  const its=YV.db.items.filter(i=>i.price>0&&!i.collect&&!i.key).map(i=>Object.assign({kind:'item'},i));return cars.concat(its)};
 const view=()=>{const all=pool();if(cat==='Daily Deals'){const s=daySeed();const picks=all.map((x,i)=>({x,k:(Math.sin(s*12.9898+i*78.233)*43758.5453)%1})).sort((a,b)=>a.k-b.k).slice(0,6).map(o=>Object.assign({},o.x,{deal:true,price:Math.round(o.x.price*.75)}));return picks}return all.filter(x=>x.cat===cat)};
 const isOwned=x=>x.kind==='car'?D().garage.owned.includes(x.id):(x.slot||x.unlock)&&owned(x.id);
 const drawTabs=()=>{tabs.innerHTML='';cats.forEach(([c,ic])=>tabs.append(tab(c,ic,cat===c,()=>{cat=c;sel=null;drawTabs();drawGrid();drawDet()})))};
 const drawGrid=()=>{grid.innerHTML='';view().forEach(x=>grid.append(tile(x,{price:x.price,locked:isOwned(x),on:sel&&sel.id===x.id,click:()=>{YV.audio.play('tap');sel=x;drawGrid();drawDet()}})))};
 const drawDet=()=>{det.innerHTML='';const x=sel;if(!x){det.append(h('p',{class:'desc mut'},'Select something to see details.'));return}
  det.append(h('div',{style:'display:flex;gap:1vh;align-items:center;margin-bottom:.8vh'},rarTag(x),x.deal?h('span',{class:'tag',style:'background:var(--brand)'},'-25% TODAY'):null),h('h3',null,x.name),h('p',{class:'desc'},x.desc));
  if(x.kind==='car'){['power','handling','durability','tech'].forEach(k=>det.append(bar(k,x.car.stats[k])))}
  if(x.kind==='item'&&x.stack>1)det.append(h('div',{class:'field'},h('label',null,'Quantity'),YV.seg([1,5,10],qty,v=>{qty=+v;drawDet()})));
  const total=x.price*(x.kind==='item'&&x.stack>1?qty:1),dis=isOwned(x);
  det.append(h('div',{class:'row',style:'margin-top:1.6vh'},h('button',{class:'btn p'+(dis?' dis':''),onclick:async()=>{if(dis)return;if(!(await YV.confirm('Confirm purchase','Buy '+x.name+' for '+YV.fmt(total)+' credits?','Buy')))return;if(!pay(total))return;
    if(x.kind==='car'){D().garage.owned.push(x.id)}else D().inv[x.id]=(D().inv[x.id]||0)+(x.stack>1?qty:1);SAVE();YV.toast(x.name+' purchased','ok');drawGrid();drawDet()}},dis?'Owned':'Buy · '+YV.fmt(total)+' CR')))};
 body.append(pn('','width:23vh;flex:0 0 auto',h('div',{class:'ph'},'Store'),tabs),pn('','flex:1;min-width:0',grid),pn('','width:32%;flex:0 0 auto',h('div',{class:'ph'},'Details'),det));drawTabs();drawGrid();drawDet()}};

/* ---------------- Maintenance */
const COMP=[['engine','Motor & drivetrain','eng',5.2],['tires','Tires','tire',3.4],['brakes','Brakes','brake',3.8],['suspension','Suspension','wrench',4.2],['energy','Energy system','batt',4.6],['body','Body panels','body',6],['electronics','Electronics','chip',3]];
S.maint={title:'Maintenance',sub:'DIAGNOSE · REPAIR · CARE',build(body){
 const d=D();let cur=d.garage.active,scan=false;const list=h('div',{class:'scroll',style:'flex:1'}),top=h('div',{style:'padding:1.4vh 1.6vh'});
 const hp=id=>{const st=d.garage.cars[id];COMP.forEach(([k],i)=>{if(st.health[k]==null)st.health[k]=62+((id.length*7+i*13)%34)});return st.health};
 const stat=v=>v>=70?['GOOD','var(--ok)']:v>=40?['WORN','var(--warn)']:['DAMAGED','var(--bad)'];
 const draw=()=>{const H=hp(cur);top.innerHTML='';top.append(h('div',{class:'field'},h('label',null,'Vehicle'),h('select',{onchange:e=>{cur=e.target.value;draw()}},d.garage.owned.map(id=>h('option',{value:id,selected:id===cur},carOf(id).name)))));
  list.innerHTML='';const tot=COMP.reduce((s,[k,,,r])=>s+Math.round((100-H[k])*r),0);
  COMP.forEach(([k,l,ic,rate])=>{const v=Math.round(H[k]),st2=stat(v),t=st2[0],c=st2[1],cost=Math.round((100-v)*rate);
   const rep=()=>{if(v>=100)return;if((d.inv.repair_kit||0)>0&&v<70){d.inv.repair_kit--;H[k]=100;YV.audio.play('confirm');YV.toast(l+' repaired with a repair kit','ok');SAVE();draw();return}if(pay(cost)){H[k]=100;YV.toast(l+' repaired','ok');SAVE();draw()}};
   list.append(h('div',{class:'mrow'},YV.icon(ic),
    h('div',null,h('div',null,l,h('span',{style:'color:'+c+';font-family:Orbitron,sans-serif;font-size:.5rem;letter-spacing:.2em;margin-left:1vh'},t)),h('div',{class:'hp',style:'margin-top:.6vh'},h('i',{style:'width:'+(scan?v:0)+'%;background:'+c}))),
    h('b',{class:'disp',style:'font-size:.7rem'},scan?v+'%':'—'),
    h('button',{class:'btn sm'+(v>=100?' dis':''),onclick:rep},v>=100?'Perfect':'Repair '+YV.fmt(cost))))});
  top.append(h('div',{class:'row',style:'margin-top:.4vh;flex-wrap:wrap'},h('button',{class:'btn p sm',onclick:()=>{YV.audio.play('open');scan=false;draw();let i=0;const iv=setInterval(()=>{i++;scan=true;draw();clearInterval(iv)},350)}},'Run diagnostics'),h('button',{class:'btn sm',onclick:()=>{if(!tot){YV.toast('Everything is already perfect');return}if(pay(tot)){COMP.forEach(([k])=>H[k]=100);SAVE();draw();YV.toast('Full service complete','ok')}}},'Repair all · '+YV.fmt(tot)),h('button',{class:'btn sm',onclick:()=>{COMP.forEach(([k],i)=>{H[k]=Math.max(8,H[k]-8-((i*5)%14))});SAVE();draw();YV.toast('Wear test applied (dev tool)')}},'Test wear'),h('span',{class:'mut',style:'font-size:.65rem'},'Repair kits: '+(d.inv.repair_kit||0))))};
 body.append(pn('','flex:1;min-width:0',top,h('div',{class:'ph'},'Components'),list),pn('','width:30%;flex:0 0 auto;padding:1.6vh',h('div',{class:'ph',style:'padding-left:0'},'How damage works'),h('p',{class:'desc'},'Damage is readable and repairable, never permanently punishing. Wear builds from hard driving, wet roads and neglected parts.'),h('p',{class:'desc'},'Repair kits fix one worn component for free. Full services at the garage restore everything for credits.'),h('p',{class:'desc mut'},'Run diagnostics to reveal exact component health.')));draw()}};
})();
