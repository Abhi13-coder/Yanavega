/* YANAVEGA lobby – boot */
(function(){'use strict';
const YV=window.YV;
YV.bootShow=function(ms){const b=YV.$('#boot');b.classList.remove('hide');setTimeout(()=>b.classList.add('hide'),ms||900)};
window.onYanaPack=function(name,pct,done){if(done)YV.toast(pct<0?'Download failed: '+name:name+' pack ready','ok')};
(async function start(){
 try{
  const names=['cast','cars','parts','cosmetics','items','news','phone','settings'];
  const d=await Promise.all(names.map(n=>YV.assets.json('data/'+n+'.json')));YV.db={};names.forEach((n,i)=>YV.db[n]=d[i]);
  YV.cfg.init(YV.db.settings);
  YV.store.load(parseInt(String(YV.cfg.get('data.slot')).replace(/\D/g,''))||1);
  YV.applySettings();YV.buildLobby();
  YV.stage.init(YV.$('#stage'));YV.stage.layout('none');YV.stage.setSkin(YV.store.data.skin);YV.stage.setBody(YV.store.data.body).catch(e=>console.warn('stage',e));
  YV.audio.startMusic();
  document.addEventListener('visibilitychange',()=>{const m=YV.audio.music;if(!m)return;if(document.hidden&&YV.cfg.get('aud.unfocus'))m.pause();else if(!document.hidden&&YV.audio.started)m.play().catch(()=>{})});
  addEventListener('pointerdown',()=>YV.audio.ensure(),{once:true});
  setTimeout(()=>YV.$('#boot').classList.add('hide'),1100);
 }catch(e){console.error(e);const b=YV.$('#boot');b.innerHTML='<div style="padding:4vh;font:14px sans-serif;color:#fff;max-width:80%">Could not start the lobby:<br>'+String(e&&e.message||e)+'</div>'}
})();
})();
