/* YANAVEGA lobby – core: helpers, asset access, settings, save system, audio, icons, dialogs */
(function(){'use strict';
const YV=window.YV=window.YV||{};
YV.$=(s,r)=>(r||document).querySelector(s); YV.$$=(s,r)=>Array.from((r||document).querySelectorAll(s));
YV.el=function(tag,attrs){const e=document.createElement(tag);if(attrs)for(const k in attrs){const v=attrs[k];if(v==null||v===false)continue;
  if(k==='class')e.className=v;else if(k==='html')e.innerHTML=v;else if(k==='style')e.style.cssText=v;else if(k.slice(0,2)==='on')e.addEventListener(k.slice(2),v);else e.setAttribute(k,v===true?'':v);}
 for(let i=2;i<arguments.length;i++){[].concat(arguments[i]).forEach(c=>{if(c!=null&&c!==false)e.append(c.nodeType?c:document.createTextNode(c))})}return e};
YV.clamp=(v,a,b)=>Math.max(a,Math.min(b,v)); YV.fmt=n=>Math.round(n).toLocaleString('en-US');
const L={};YV.on=(e,f)=>{(L[e]=L[e]||[]).push(f)};YV.emit=(e,d)=>{(L[e]||[]).forEach(f=>{try{f(d)}catch(x){console.error(x)}})};

/* ---- assets: real files in the game, or an embedded bundle for the in-chat preview */
YV.assets={embed:window.__EMBED||null,
 url(p){const e=this.embed;if(e){if(!e[p])throw new Error('missing '+p);return 'data:'+e[p].m+';base64,'+e[p].d}return '/'+p},
 async buffer(p){const e=this.embed;if(e){const b=atob(e[p].d),u=new Uint8Array(b.length);for(let i=0;i<b.length;i++)u[i]=b.charCodeAt(i);return u.buffer}
  const r=await fetch('/'+p);if(!r.ok)throw new Error(r.status+' '+p);return r.arrayBuffer()},
 async json(p){return JSON.parse(new TextDecoder().decode(await this.buffer(p)))},
 image(p){return new Promise((ok,no)=>{const i=new Image();i.onload=()=>ok(i);i.onerror=()=>no(new Error('img '+p));i.src=this.url(p)})}};

/* ---- icons (24px stroke) */
const P={
 chars:'<circle cx="12" cy="8" r="4"/><path d="M4 21c0-4.4 3.6-8 8-8s8 3.6 8 8"/>',
 wardrobe:'<path d="M8 3 3 6l2.5 4L8 9v12h8V9l2.5 1L21 6l-5-3c-.5 1.7-2 3-4 3S8.5 4.7 8 3z"/>',
 inv:'<path d="M4 8l8-5 8 5v9l-8 5-8-5V8z"/><path d="M4 8l8 5 8-5M12 13v9"/>',
 garage:'<path d="M3 15l1.6-5A2 2 0 0 1 6.5 8.5h11a2 2 0 0 1 1.9 1.5L21 15v4h-3v-2H6v2H3v-4z"/><circle cx="7.5" cy="13.2" r="1"/><circle cx="16.5" cy="13.2" r="1"/>',
 shop:'<path d="M6 7h12l1 13H5L6 7z"/><path d="M9 7V5a3 3 0 0 1 6 0v2"/>',
 wrench:'<path d="M14.7 6.3a4 4 0 0 0-5.4 5.2L3 17.8 6.2 21l6.3-6.3a4 4 0 0 0 5.2-5.4l-2.6 2.6-2.4-.6-.6-2.4 2.6-2.6z"/>',
 gear:'<circle cx="12" cy="12" r="3"/><path d="M19.4 15a1.7 1.7 0 0 0 .3 1.8l.1.1a2 2 0 1 1-2.8 2.8l-.1-.1a1.7 1.7 0 0 0-1.8-.3 1.7 1.7 0 0 0-1 1.5V21a2 2 0 1 1-4 0v-.1a1.7 1.7 0 0 0-1.1-1.5 1.7 1.7 0 0 0-1.8.3l-.1.1a2 2 0 1 1-2.8-2.8l.1-.1a1.7 1.7 0 0 0 .3-1.8 1.7 1.7 0 0 0-1.5-1H3a2 2 0 1 1 0-4h.1a1.7 1.7 0 0 0 1.5-1.1 1.7 1.7 0 0 0-.3-1.8l-.1-.1a2 2 0 1 1 2.8-2.8l.1.1a1.7 1.7 0 0 0 1.8.3H9a1.7 1.7 0 0 0 1-1.5V3a2 2 0 1 1 4 0v.1a1.7 1.7 0 0 0 1 1.5 1.7 1.7 0 0 0 1.8-.3l.1-.1a2 2 0 1 1 2.8 2.8l-.1.1a1.7 1.7 0 0 0-.3 1.8V9a1.7 1.7 0 0 0 1.5 1H21a2 2 0 1 1 0 4h-.1a1.7 1.7 0 0 0-1.5 1z"/>',
 phone:'<rect x="7" y="2.5" width="10" height="19" rx="2"/><path d="M11 18h2"/>',
 news:'<path d="M4 5h16v14H4z"/><path d="M8 9h8M8 13h8M8 16h4"/>',
 back:'<path d="M15 5l-7 7 7 7"/>',play:'<path d="M8 5l11 7-11 7z"/>',
 road:'<path d="M9 3 5 21M15 3l4 18M12 5v3M12 11v3M12 17v3"/>',flag:'<path d="M5 21V4M5 4h12l-2 4 2 4H5"/>',
 book:'<path d="M12 6c-2-1.5-5-2-8-1.5V19c3-.5 6 0 8 1.5 2-1.5 5-2 8-1.5V4.5c-3-.5-6 0-8 1.5zM12 6v14.5"/>',
 coin:'<circle cx="12" cy="12" r="9"/><path d="M9 9.5h4.5a1.5 1.5 0 0 1 0 3H10a1.5 1.5 0 0 0 0 3h5M12 7v10"/>',
 star:'<path d="M12 3l2.7 5.6 6.1.9-4.4 4.3 1 6.1L12 17l-5.4 2.9 1-6.1L3.2 9.5l6.1-.9z"/>',
 lock:'<rect x="5" y="11" width="14" height="10" rx="2"/><path d="M8 11V8a4 4 0 0 1 8 0v3"/>',check:'<path d="M5 12.5l4.5 4.5L19 7.5"/>',
 x:'<path d="M6 6l12 12M18 6L6 18"/>',reset:'<path d="M4 12a8 8 0 1 0 2.5-5.8M4 4v5h5"/>',search:'<circle cx="11" cy="11" r="6"/><path d="M20 20l-4.2-4.2"/>',
 cloth:'<path d="M8 3 3 6l2.5 4L8 9v12h8V9l2.5 1L21 6l-5-3c-.5 1.7-2 3-4 3S8.5 4.7 8 3z"/>',
 gfx:'<rect x="3" y="5" width="18" height="12" rx="2"/><path d="M8 21h8M12 17v4"/>',dsp:'<circle cx="12" cy="12" r="4"/><path d="M12 2v3M12 19v3M2 12h3M19 12h3M5 5l2 2M17 17l2 2M19 5l-2 2M7 17l-2 2"/>',
 aud:'<path d="M4 9v6h4l5 4V5L8 9H4z"/><path d="M16.5 8.5a5 5 0 0 1 0 7M19 6a8.5 8.5 0 0 1 0 12"/>',ctl:'<rect x="2" y="7" width="20" height="10" rx="5"/><path d="M7 10v4M5 12h4M16 11h.01M18 13h.01"/>',
 gp:'<path d="M12 3l8 4v5c0 5-3.5 8-8 9-4.5-1-8-4-8-9V7l8-4z"/>',cam:'<path d="M3 8h4l2-3h6l2 3h4v11H3V8z"/><circle cx="12" cy="13" r="3.5"/>',
 hud:'<rect x="3" y="4" width="18" height="16" rx="2"/><path d="M7 15l3-4 3 3 4-5"/>',acc:'<circle cx="12" cy="5" r="2"/><path d="M5 9h14M12 9v6M8 21l4-6 4 6"/>',
 lang:'<circle cx="12" cy="12" r="9"/><path d="M3 12h18M12 3c3 3 3 15 0 18M12 3c-3 3-3 15 0 18"/>',data:'<ellipse cx="12" cy="6" rx="8" ry="3"/><path d="M4 6v12c0 1.7 3.6 3 8 3s8-1.3 8-3V6M4 12c0 1.7 3.6 3 8 3s8-1.3 8-3"/>',about:'<circle cx="12" cy="12" r="9"/><path d="M12 11v6M12 7.5h.01"/>',
 shirt:'<path d="M8 3 3 6l2.5 4L8 9v12h8V9l2.5 1L21 6l-5-3c-.5 1.7-2 3-4 3S8.5 4.7 8 3z"/>',bolt:'<path d="M13 2L4 14h7l-1 8 9-12h-7l1-8z"/>',gem:'<path d="M6 3h12l3 6-9 12L3 9l3-6zM3 9h18"/>',key:'<circle cx="8" cy="15" r="4"/><path d="M11 12l9-9M16 7l3 3"/>',
 tire:'<circle cx="12" cy="12" r="9"/><circle cx="12" cy="12" r="3.5"/><path d="M12 3v5.5M12 15.5V21M3 12h5.5M15.5 12H21"/>',eng:'<path d="M4 9h3l2-2h6l2 2h3v7h-3l-2 2H9l-2-2H4V9z"/>',brake:'<circle cx="12" cy="12" r="8"/><circle cx="12" cy="12" r="3"/><path d="M12 4a8 8 0 0 1 6 3"/>',
 batt:'<rect x="3" y="7" width="16" height="10" rx="2"/><path d="M21 10v4M8 10v4M12 10v4"/>',chip:'<rect x="6" y="6" width="12" height="12" rx="1.5"/><path d="M9 2v4M15 2v4M9 18v4M15 18v4M2 9h4M2 15h4M18 9h4M18 15h4"/>',
 body:'<path d="M3 15l1.6-5A2 2 0 0 1 6.5 8.5h11a2 2 0 0 1 1.9 1.5L21 15v4H3v-4z"/>',paint:'<path d="M12 3c5 0 9 3.5 9 8 0 3-2 3.5-4 3.5-1.7 0-2.5 1-2.5 2.2 0 1.6-1 4.3-3 4.3-5 0-8.5-4-8.5-8.5S7 3 12 3z"/><circle cx="8" cy="10" r="1"/><circle cx="12" cy="7.5" r="1"/><circle cx="16" cy="10" r="1"/>',
 mic:'<rect x="9" y="3" width="6" height="11" rx="3"/><path d="M5 11a7 7 0 0 0 14 0M12 18v3"/>',pose:'<circle cx="12" cy="4.5" r="2"/><path d="M6 9l6 2 6-2M12 11v4l-3 6M12 15l3 6"/>'};
YV.icon=(n,cls)=>YV.el('span',{class:'ico'+(cls?' '+cls:''),html:'<svg viewBox="0 0 24 24">'+(P[n]||P.about)+'</svg>'});
YV.iconHTML=n=>'<span class="ico"><svg viewBox="0 0 24 24">'+(P[n]||P.about)+'</svg></span>';

/* ---- settings (schema driven, persisted) */
const SK='yv.settings.v1';
YV.cfg={schema:[],ctl:{},defs:{},vals:{},
 init(schema){this.schema=schema;schema.forEach(c=>c.groups.forEach(g=>g.controls.forEach(k=>{this.ctl[k.id]=k;if(k.type!=='action'&&k.type!=='info')this.defs[k.id]=k.default})));
  try{this.vals=JSON.parse(localStorage.getItem(SK)||'{}')}catch(e){this.vals={}}},
 get(id){return id in this.vals?this.vals[id]:this.defs[id]},
 set(id,v,quiet){if(v===this.defs[id])delete this.vals[id];else this.vals[id]=v;this.save();if(!quiet)YV.emit('cfg',id)},
 isMod(id){return id in this.vals},reset(id){delete this.vals[id];this.save();YV.emit('cfg',id)},
 resetAll(){this.vals={};this.save();YV.emit('cfg','*')},save(){try{localStorage.setItem(SK,JSON.stringify(this.vals))}catch(e){}}};

/* ---- save system (offline, 3 slots) */
YV.store={data:null,slot:1,_t:0,
 key(s){return 'yv.save.'+s},
 fresh(){const eq={};YV.db.items.forEach(i=>{if(i.default)eq[i.slot]=i.id});const inv={};YV.db.items.forEach(i=>{if(i.default||i.hidden)inv[i.id]=1});
  Object.assign(inv,{cell:6,repair_kit:2,coffee:5,snack:4,tuner_parts:40,map_frag:1,photo_card:3,badge:1,garage_key:1,out_night:1,hair_long:1});
  const cars={};YV.db.cars.forEach(c=>{cars[c.id]={tiers:{},paint:c.paint,wrap:'None',wheels:'Stock',light:'#ffffff',decal:'None',interior:'Standard',aero:'Stock',plate:'YANAVEGA',height:50,health:{},wear:0}});
  return {v:1,name:'Slot',created:Date.now(),updated:Date.now(),profile:{name:'Driver',level:1,xp:35},wallet:{credits:12500,rep:0},body:'F',skin:0.96,equipped:eq,inv,
   garage:{owned:['aster_taxi'],active:'aster_taxi',cars},unlocked:{paint:[],wrap:[],decal:[]},story:{act:'ACT 0',chapter:'First Fare',progress:6},phone:{read:{}},playtime:0}},
 load(s){this.slot=s;try{const r=localStorage.getItem(this.key(s));this.data=r?JSON.parse(r):this.fresh()}catch(e){this.data=this.fresh()}
  const f=this.fresh();for(const k in f)if(!(k in this.data))this.data[k]=f[k];YV.db.cars.forEach(c=>{if(!this.data.garage.cars[c.id])this.data.garage.cars[c.id]=f.garage.cars[c.id]});return this.data},
 save(){if(!this.data)return;this.data.updated=Date.now();try{localStorage.setItem(this.key(this.slot),JSON.stringify(this.data))}catch(e){}},
 touch(ev){clearTimeout(this._t);this._t=setTimeout(()=>this.save(),400);if(ev)YV.emit(ev)},
 summary(s){try{const r=JSON.parse(localStorage.getItem(this.key(s))||'null');return r}catch(e){return null}},
 wipe(s){try{localStorage.removeItem(this.key(s))}catch(e){}}};

/* ---- audio */
YV.audio={ctx:null,music:null,started:false,
 ensure(){if(!this.ctx){const C=window.AudioContext||window.webkitAudioContext;if(C)try{this.ctx=new C()}catch(e){}}if(this.ctx&&this.ctx.state==='suspended')this.ctx.resume().catch(()=>{})},
 vol(ch){return YV.cfg.get('aud.master')/100*YV.cfg.get(ch)/100},
 tone(f,d,type,g,slide,delay){if(!this.ctx)return;const t=this.ctx.currentTime+(delay||0),o=this.ctx.createOscillator(),a=this.ctx.createGain();o.type=type||'sine';o.frequency.setValueAtTime(f,t);if(slide)o.frequency.exponentialRampToValueAtTime(Math.max(30,f*slide),t+d);
  a.gain.setValueAtTime(0.0001,t);a.gain.exponentialRampToValueAtTime(Math.max(.0002,g),t+.008);a.gain.exponentialRampToValueAtTime(.0001,t+d);o.connect(a);a.connect(this.ctx.destination);o.start(t);o.stop(t+d+.02)},
 play(n){const v=this.vol('aud.ui')*0.5;if(v<=0.001)return;this.ensure();if(!this.ctx)return;
  const T={hover:()=>this.tone(1400,.03,'sine',v*.25),tap:()=>{this.tone(520,.06,'square',v*.35,1.6)},confirm:()=>{this.tone(520,.09,'triangle',v);this.tone(780,.12,'triangle',v,1,.07);this.tone(1040,.16,'triangle',v*.8,1,.14)},
   back:()=>this.tone(420,.1,'triangle',v,.6),error:()=>{this.tone(180,.14,'sawtooth',v*.7,.7);this.tone(150,.16,'sawtooth',v*.7,.7,.1)},equip:()=>{this.tone(300,.05,'square',v*.4);this.tone(900,.1,'triangle',v*.8,1.3,.04)},
   buy:()=>{[660,880,1320].forEach((f,i)=>this.tone(f,.1,'triangle',v*.8,1,i*.06))},open:()=>this.tone(300,.18,'sawtooth',v*.35,2.4)};(T[n]||T.tap)()},
 initMusic(){if(this.music)return;try{this.music=new Audio(YV.assets.url('audio/lobby_theme.ogg'));this.music.loop=true;this.music.preload='auto'}catch(e){}},
 applyVol(){if(this.music){this.music.volume=YV.clamp(this.vol('aud.music'),0,1);this.music.muted=!YV.cfg.get('aud.menuMusic')}},
 startMusic(){this.initMusic();this.applyVol();if(!this.music||this.started)return;const p=this.music.play();if(p&&p.then)p.then(()=>{this.started=true}).catch(()=>{const f=()=>{this.music.play().then(()=>{this.started=true});removeEventListener('pointerdown',f)};addEventListener('pointerdown',f,{once:true})});else this.started=true}};

/* ---- toast / dialogs */
YV.toast=function(msg,kind){const t=YV.el('div',{class:'toast '+(kind||'')},msg);YV.$('#toasts').append(t);setTimeout(()=>t.remove(),3100)};
YV.dialog=function(o){return new Promise(res=>{const m=YV.$('#modal');m.innerHTML='';const close=v=>{m.classList.remove('open');m.innerHTML='';res(v)};
 const body=o.node?o.node:YV.el('div',{class:'bd',html:o.body||''});
 const btns=[];if(o.cancel!==false)btns.push(YV.el('button',{class:'btn',onclick:()=>{YV.audio.play('back');close(null)}},o.cancel||'Cancel'));
 btns.push(YV.el('button',{class:'btn '+(o.danger?'d':'p'),onclick:()=>{YV.audio.play('confirm');close(o.value?o.value():true)}},o.ok||'OK'));
 m.append(YV.el('div',{class:'dlg panel cut'},YV.el('div',{class:'hd'},o.title||''),body,YV.el('div',{class:'ft'},btns)));m.classList.add('open');
 m.onclick=e=>{if(e.target===m&&o.cancel!==false){close(null)}}})};
YV.confirm=(title,body,ok,danger)=>YV.dialog({title,body,ok:ok||'Confirm',danger}).then(v=>!!v);

YV.rarityColor=r=>({common:'#a7adb8',uncommon:'#41ffb0',rare:'#5c8bff',epic:'#b57cff',legendary:'#ffb347'}[r]||'#a7adb8');
YV.slider=function(min,max,step,val,oninput,onchange){const s=YV.el('input',{type:'range',min,max,step,value:val});const f=()=>s.style.setProperty('--f',((s.value-min)/(max-min)*100)+'%');f();
 s.addEventListener('input',()=>{f();oninput&&oninput(+s.value)});s.addEventListener('change',()=>onchange&&onchange(+s.value));return s};
YV.seg=function(opts,val,on){const w=YV.el('div',{class:'seg'});opts.forEach(o=>{const b=YV.el('button',{class:String(o)===String(val)?'on':'',onclick:()=>{YV.audio.play('tap');YV.$$('button',w).forEach(x=>x.classList.toggle('on',x===b));on(o)}},o);w.append(b)});return w};
YV.toggle=function(val,on,dis){const t=YV.el('button',{class:'tgl'+(val?' on':'')+(dis?' dis':''),role:'switch','aria-checked':!!val,onclick:()=>{const v=!t.classList.contains('on');t.classList.toggle('on',v);YV.audio.play('tap');on(v)}});return t};
})();
