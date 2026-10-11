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

/* ---------------- Characters + Wardrobe (coming soon) */
const soonPanel=(t,s)=>h('div',{style:'flex:1;min-width:0;display:grid;place-items:center'},h('div',{style:'text-align:center'},h('img',{src:YV.assets.url('ui/logo_mark.svg'),style:'height:14vh;margin:0 auto;opacity:.92'}),h('h3',{style:'font-size:1.5rem;margin-top:1.6vh;letter-spacing:.3em'},t),h('p',{class:'desc mut'},s)));
S.chars={title:'Characters',sub:'CAST · COMING SOON',build(body){
 let cur=YV.db.cast[0].id;const info=h('div',{class:'scroll pad',style:'flex:1'}),list=h('div',{class:'tabs scroll',style:'flex:1'});
 const draw=()=>{list.innerHTML='';YV.db.cast.forEach(c=>list.append(h('button',{class:'tab'+(c.id===cur?' on':''),onclick:()=>{YV.audio.play('tap');cur=c.id;draw();show()}},h('i',{style:`width:1vh;height:3.2vh;background:${c.color};flex:0 0 auto;clip-path:polygon(0 0,100% 0,60% 100%,0 100%)`}),h('span',null,c.unlock?c.name:'???'),c.unlock?null:YV.icon('lock'))))};
 const show=()=>{const c=YV.db.cast.find(x=>x.id===cur);info.innerHTML='';info.append(h('div',{class:'ph',style:'padding-left:0'},c.tag),h('h3',{style:'color:'+c.color},c.unlock?c.name:'???'),h('div',{class:'mut',style:'margin:.4vh 0 1vh'},c.unlock?c.role:'Locked'),h('p',{class:'desc'},c.unlock?c.bio:'Meet this character in the story to unlock their profile.'),h('span',{class:'tag',style:'background:var(--brand)'},'3D MODEL · COMING SOON'))};
 body.append(pn('','width:24vh;flex:0 0 auto',h('div',{class:'ph'},'Cast'),list),soonPanel('COMING SOON','Characters arrive with the story update.'),pn('','width:36%;flex:0 0 auto',info));draw();show()}};
S.wardrobe={title:'Wardrobe',sub:'OUTFITS · HAIR · FACE',build(body){body.append(pn('','flex:1;min-width:0',soonPanel('COMING SOON','Outfits, hair and faces arrive with the characters.')))}};

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
const hsv2hex=(H,Sx,Vx)=>{H=(H%360)/60;const i=Math.floor(H)%6,f=H-Math.floor(H),p=Vx*(1-Sx),q=Vx*(1-Sx*f),t=Vx*(1-Sx*(1-f));const rgb=[[Vx,t,p],[q,Vx,p],[p,Vx,t],[p,q,Vx],[t,p,Vx],[Vx,p,q]][i];return '#'+rgb.map(x=>Math.round(x*255).toString(16).padStart(2,'0')).join('')};
const hex2hsv=hex=>{const r=parseInt(hex.slice(1,3),16)/255,g=parseInt(hex.slice(3,5),16)/255,b=parseInt(hex.slice(5,7),16)/255,mx=Math.max(r,g,b),mn=Math.min(r,g,b),d=mx-mn;let H=0;if(d){H=mx===r?((g-b)/d)%6:mx===g?(b-r)/d+2:(r-g)/d+4;H*=60;if(H<0)H+=360}return[H,mx?d/mx:0,mx]};
S.garage={title:'Garage',sub:'STATS · TUNING · PAINT SHOP',stage:'car',
 onOpen(){YV.car.load().then(()=>{const o=YV.car.create(1);o.root.position.y=.146;YV.stage.setModel(o.root);YV.stage.ensureEnv();YV.car.setPaint(D().garage.cars.starter.paint);YV.car.setFinish(D().garage.cars.starter.finish||'Gloss')}).catch(e=>console.warn('garage car',e))},
 build(body){
 const d=D(),st=d.garage.cars.starter;st.paints=st.paints||[st.paint];let tabn='Stats',open='tires',pend=st.paint,hsv=hex2hsv(st.paint);
 const list=h('div',{class:'scroll',style:'flex:1;padding:1vh;display:flex;flex-direction:column;gap:.8vh'}),right=h('div',{class:'scroll pad',style:'flex:1'});
 list.append(h('div',{class:'tab on',style:'min-height:7vh;flex-direction:column;align-items:flex-start;justify-content:center;gap:.2vh'},h('b',{style:'font-size:.82rem'},carOf('starter').name),h('small',{style:'font-size:.58rem;color:var(--mut)'},'STARTER · ACTIVE')),h('div',{class:'tab',style:'min-height:7vh;opacity:.5;pointer-events:none'},YV.icon('lock'),h('span',null,'More cars coming soon')));
 const hex=x=>x.toLowerCase();
 const drawRight=()=>{right.innerHTML='';const {base,add}=carStats('starter');right.append(YV.seg(['Stats','Tune','Paint'],tabn,v=>{tabn=v;if(v!=='Paint'){YV.car.setPaint(st.paint)}drawRight()}),h('div',{style:'height:1vh'}));
  if(tabn==='Stats'){const perf=Math.round((base.power+(add.power||0))*.3+(base.handling+(add.handling||0))*.3+(base.tech+(add.tech||0))*.2+(base.durability+(add.durability||0))*.2);
   right.append(h('p',{class:'desc'},carOf('starter').desc),h('div',{class:'row',style:'justify-content:space-between;margin:.6vh 0'},h('span',{class:'lbl'},'Performance rating'),h('b',{class:'disp',style:'font-size:1.3rem;color:var(--p1)'},perf)),...['power','handling','energy','durability','tech','rarity','prestige'].map(k=>bar(k,base[k],add[k]||0)),h('div',{class:'mut',style:'font-size:.7rem;margin-top:1vh'},'Distance driven: '+(st.km||0).toFixed(1)+' km'))}
  else if(tabn==='Tune'){YV.db.parts.cats.forEach(p=>{const t=st.tiers[p.id]||0,isOpen=open===p.id,next=t+1;
   const a=h('div',{class:'acc'},h('button',{class:'ah',onclick:()=>{YV.audio.play('tap');open=isOpen?null:p.id;drawRight()}},YV.icon(CATI[p.id]||'wrench'),h('span',null,p.name),h('span',{class:'pips'},[1,2,3,4,5].map(i=>h('i',{class:i<=t?'on':''})))));
   if(isOpen)a.append(h('div',{class:'ab'},h('div',{class:'mut',style:'font-size:.75rem'},'Current: '+YV.db.parts.tiers[t]+' · boosts '+p.main+' (+6/tier), '+p.sub+' (+3/tier)'),next<=5?h('button',{class:'btn p sm',style:'margin-top:1vh',onclick:()=>{if(pay(YV.db.parts.cost[next])){st.tiers[p.id]=next;SAVE();YV.toast(p.name+' → '+YV.db.parts.tiers[next],'ok');drawRight()}}},'Upgrade to '+YV.db.parts.tiers[next]+' · '+YV.fmt(YV.db.parts.cost[next])+' CR'):h('div',{class:'rstart',style:'margin-top:1vh'},'MAX TIER')));right.append(a)})}
  else{const C=YV.db.cosmetics,price=x=>st.paints.includes(hex(x))?0:(C.paints.some(p=>hex(p.hex)===hex(x))?350:900);
   const apply=h('button',{class:'btn p',style:'width:100%;margin-top:1.2vh'}),hexIn=h('input',{type:'text',maxlength:7,value:pend,style:'width:14vh;text-align:center;font-family:Orbitron,sans-serif'});
   const upd=()=>{const same=hex(pend)===hex(st.paint),pr=price(pend);apply.textContent=same?'Current paint':(pr?'Buy paint & apply · '+YV.fmt(pr)+' CR':'Apply · already owned');apply.classList.toggle('dis',same);hexIn.value=pend};
   const setPend=(x,redraw)=>{pend=x;YV.car.setPaint(x);upd();if(redraw){hsv=hex2hsv(x);drawRight()}};
   const hs=h('input',{type:'range',min:0,max:360,step:1,value:Math.round(hsv[0])}),ss=h('input',{type:'range',min:0,max:100,step:1,value:Math.round(hsv[1]*100)}),vs=h('input',{type:'range',min:8,max:100,step:1,value:Math.round(hsv[2]*100)});
   const sl=()=>{[hs,ss,vs].forEach((s,i)=>s.style.setProperty('--f',((s.value-s.min)/(s.max-s.min)*100)+'%'));setPend(hsv2hex(+hs.value,ss.value/100,vs.value/100))};[hs,ss,vs].forEach(s=>s.addEventListener('input',sl));[hs,ss,vs].forEach((s,i)=>s.style.setProperty('--f',((s.value-s.min)/(s.max-s.min)*100)+'%'));
   hexIn.addEventListener('change',()=>{const v=hexIn.value.startsWith('#')?hexIn.value:'#'+hexIn.value;if(/^#[0-9a-f]{6}$/i.test(v))setPend(v,true);else{YV.toast('Use a colour like #ff4fc8','bad');hexIn.value=pend}});
   apply.onclick=()=>{if(hex(pend)===hex(st.paint))return;const pr=price(pend);if(pr&&!pay(pr))return;st.paint=pend;if(!st.paints.includes(hex(pend)))st.paints.push(hex(pend));SAVE();YV.audio.play('equip');YV.toast('Paint applied','ok');upd()};
   right.append(h('div',{class:'field'},h('label',null,'Ready-mixed paints · 350 CR each'),h('div',{class:'sw'},C.paints.map(p=>h('button',{title:p.name+(st.paints.includes(hex(p.hex))?' (owned)':''),class:hex(pend)===hex(p.hex)?'on':'',style:`background:${p.hex};color:${p.hex}`,onclick:()=>{YV.audio.play('tap');setPend(p.hex,true)}})))),
    h('div',{class:'field'},h('label',null,'Mix any colour · 900 CR'),h('div',{class:'row'},h('span',{class:'mut',style:'width:3vh'},'H'),hs),h('div',{class:'row'},h('span',{class:'mut',style:'width:3vh'},'S'),ss),h('div',{class:'row'},h('span',{class:'mut',style:'width:3vh'},'V'),vs),h('div',{class:'row',style:'margin-top:.6vh'},h('span',{class:'lbl'},'Hex'),hexIn)),
    h('div',{class:'field'},h('label',null,'Finish (free)'),YV.seg(['Gloss','Metallic','Matte'],st.finish||'Gloss',v=>{st.finish=v;YV.car.setFinish(v);SAVE()})),apply,h('p',{class:'desc mut',style:'margin-top:1vh'},'Owned paints can be re-applied for free. The car previews every colour live before you pay.'));upd()}};
 body.append(pn('','width:23vh;flex:0 0 auto',h('div',{class:'ph'},'Your cars'),list),h('div',{style:'flex:1;min-width:0'}),pn('','width:38%;flex:0 0 auto',right));drawRight()}};

/* ---------------- Shop */
S.shop={title:'Shop',sub:'SUPPLIES · PAINT · MORE COMING SOON',build(body){
 let cat='Supplies',sel=null,qty=1;const cats=[['Supplies','bolt'],['Paint','paint'],['Cars','garage'],['Clothing','cloth']];
 const tabs=h('div',{class:'tabs scroll',style:'flex:1'}),grid=h('div',{class:'grid scroll',style:'flex:1;padding:1.2vh'}),det=h('div',{class:'scroll pad',style:'flex:1'});
 const pool=()=>YV.db.items.filter(i=>i.price>0&&(i.cat==='Supplies'||i.cat==='Materials'));
 const drawTabs=()=>{tabs.innerHTML='';cats.forEach(([c,ic])=>tabs.append(tab(c,ic,cat===c,()=>{cat=c;sel=null;drawTabs();drawGrid();drawDet()})))};
 const drawGrid=()=>{grid.innerHTML='';if(cat==='Supplies'){pool().forEach(x=>grid.append(tile(x,{price:x.price,on:sel&&sel.id===x.id,click:()=>{YV.audio.play('tap');sel=x;drawGrid();drawDet()}})))}
  else if(cat==='Paint'){grid.style.display='block';grid.append(h('div',{style:'padding:2vh'},h('h3',null,'Paint shop'),h('p',{class:'desc'},'Mix any colour for your car, preview it live and pay with credits. Ready-mixed paints cost 350 CR, a custom colour costs 900 CR.'),h('button',{class:'btn p',onclick:()=>YV.nav.open('garage')},'Open paint shop in Garage')));return}
  else{grid.style.display='block';grid.append(h('div',{style:'padding:3vh;text-align:center'},h('h3',null,'Coming soon'),h('p',{class:'desc mut'},cat==='Cars'?'More cars arrive after Open Road.':'Clothing arrives with the characters.')));return}
  grid.style.display=''};
 const drawDet=()=>{det.innerHTML='';const x=sel;if(!x){det.append(h('p',{class:'desc mut'},'Select something to see details.'));return}
  det.append(h('div',{style:'display:flex;gap:1vh;align-items:center;margin-bottom:.8vh'},rarTag(x)),h('h3',null,x.name),h('p',{class:'desc'},x.desc));
  if(x.stack>1)det.append(h('div',{class:'field'},h('label',null,'Quantity'),YV.seg([1,5,10],qty,v=>{qty=+v;drawDet()})));
  const total=x.price*(x.stack>1?qty:1);det.append(h('div',{class:'row',style:'margin-top:1.6vh'},h('button',{class:'btn p',onclick:async()=>{if(!(await YV.confirm('Confirm purchase','Buy '+x.name+' for '+YV.fmt(total)+' credits?','Buy')))return;if(!pay(total))return;D().inv[x.id]=(D().inv[x.id]||0)+(x.stack>1?qty:1);SAVE();YV.toast(x.name+' purchased','ok');drawDet()}},'Buy · '+YV.fmt(total)+' CR')))};
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
