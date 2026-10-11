/* YANAVEGA – OPEN ROAD mode: procedural two-lane road, grass, lakes, trees, sky, arcade driving, spatial engine audio, FSR-style render */
(function(){'use strict';
const YV=window.YV,OR=YV.openroad={running:false,paused:false},h=YV.el,$=YV.$;
const clamp=YV.clamp,lerp=(a,b,t)=>a+(b-a)*t,sm=(a,b,x)=>{x=clamp((x-a)/(b-a),0,1);return x*x*(3-2*x)};
const hash=n=>{const s=Math.sin(n*127.1)*43758.5453;return s-Math.floor(s)};
const vn=(x,y)=>{const xi=Math.floor(x),yi=Math.floor(y),xf=x-xi,yf=y-yi,u=xf*xf*(3-2*xf),v=yf*yf*(3-2*yf),H=(a,b)=>hash(a+b*57);return lerp(lerp(H(xi,yi),H(xi+1,yi),u),lerp(H(xi,yi+1),H(xi+1,yi+1),u),v)};
const SEG=4,CH=16,RW=8.2,DL=[4.1,5.4,8.5,15,27,45,70,100,140],SC=4.6,GOFF=.146*SC;
/* ---------------- road centre-line + terrain functions */
function Road(seed){this.seed=seed;this.p=[{x:0,z:0,h:0}];this.e0=0;this.e0=this.elev(0);this.ensure(800)}
Road.prototype={
 kap(s){const q=this.seed;return .0048*Math.sin(s/270+q)+.0038*Math.sin(s/118+q*1.7)+.002*Math.sin(s/51+q*.6)},
 elev(s){const q=this.seed;return 6*Math.sin(s/340+q)+2.8*Math.sin(s/147+q*2)+Math.sin(s/59+q)-this.e0},
 ensure(m){const p=this.p;while(p.length*SEG<m){const i=p.length,a=p[i-1],hd=a.h+this.kap(i*SEG)*SEG;p.push({x:a.x+Math.sin(hd)*SEG,z:a.z+Math.cos(hd)*SEG,h:hd})}},
 at(s){s=Math.max(s,0);this.ensure(s+SEG*4);const i=Math.floor(s/SEG),t=s/SEG-i,a=this.p[i],b=this.p[i+1],hd=lerp(a.h,b.h,t);return{x:lerp(a.x,b.x,t),z:lerp(a.z,b.z,t),h:hd,y:this.elev(s),nx:Math.cos(hd),nz:-Math.sin(hd)}},
 lake(s,side){return sm(.7,1.3,Math.sin(s/520+side*2.3+this.seed)+.7*Math.sin(s/221+side*1.1+this.seed*.5))},
 ty(s,ad,side,ry){const ramp=sm(7,45,ad),hill=ramp*(11*vn(s*.0045+side*13+this.seed,ad*.0075)+5*vn(s*.012+side*3,ad*.02)-6),lk=this.lake(s,side)*sm(11,26,ad);return ry-.02-sm(4.1,8,ad)*.25+hill*(1-lk)-lk*9.2},
 ground(s,d){const side=d>=0?1:-1,ad=Math.abs(d),ry=this.elev(s);if(ad<=DL[0])return ry;let j=0;while(j<DL.length-2&&ad>DL[j+1])j++;const t=clamp((ad-DL[j])/(DL[j+1]-DL[j]),0,1);return lerp(this.ty(s,DL[j],side,ry),this.ty(s,DL[j+1],side,ry),t)}};
/* ---------------- time of day + weather */
const TOD={
 Dawn:{sun:[.55,.18,.48],col:0xffc9a0,I:1.6,hemi:.5,tint:[1.08,.88,.9],br:.88,fog:0xf0c8b0,env:.6},
 Noon:{sun:[.28,.92,.32],col:0xfff5e8,I:2.6,hemi:1.0,tint:[1,1,1],br:1.05,fog:0xb8d4f0,env:1.1},
 Sunset:{sun:[-.55,.12,.65],col:0xff8a40,I:2.1,hemi:.48,tint:[1.12,.78,.72],br:.95,fog:0xffa878,env:.7},
 Night:{sun:[.15,.55,-.35],col:0x7a92d8,I:.35,hemi:.18,tint:[.12,.16,.35],br:.42,fog:0x0a1020,env:.22}
};
const WX={Clear:{f:1,g:0,d:1,rain:0},Cloudy:{f:1.5,g:.45,d:.8,rain:0},Rain:{f:2.4,g:.7,d:.62,rain:1},Storm:{f:3.2,g:.85,d:.42,rain:2},Fog:{f:5,g:.6,d:.78,rain:0}};
/* ---------------- loading */
const texL=async(p,o)=>{o=o||{};
  const aniso=+String(YV.cfg.get('gfx.aniso')).replace('x','')||8;
  const opts={srgb:!!o.srgb,rep:!!o.rep,mir:!!o.mir,aniso};
  // Real loader path: YV.ktx2 (Basis transcoder) for .ktx2/.basis, else Image
  if(YV.ktx2&&YV.ktx2.loadTexture){
    try{
      return await YV.ktx2.loadTexture('/'+p,opts);
    }catch(e){
      console.warn('ktx2 load failed, trying image',p,e);
    }
  }
  // webp/jpg/png path (and sibling webp for ktx2 assets if present)
  const tryPaths=[p];
  if(/\.ktx2$/i.test(p)) tryPaths.push(p.replace(/\.ktx2$/i,'.webp'), p.replace(/\.ktx2$/i,'.png'));
  let lastErr;
  for(const path of tryPaths){
    try{
      const img=await YV.assets.image(path);
      const t=new THREE.Texture(img);t.flipY=false;
      if(o.srgb)t.encoding=THREE.sRGBEncoding;t.anisotropy=aniso;
      if(o.rep){t.wrapS=t.wrapT=THREE.RepeatWrapping}
      if(o.mir){t.wrapS=t.wrapT=THREE.MirroredRepeatWrapping}
      t.needsUpdate=true;return t;
    }catch(e){lastErr=e}
  }
  throw lastErr||new Error('texture missing '+p);
};
OR.load=async function(prog){
 if(this.ready)return;const steps=[['Car',()=>YV.car.load()],['Road',async()=>{T.roadC=await texL('world/road_color.ktx2',{srgb:1,rep:1});T.roadR=await texL('world/road_rough.ktx2',{rep:1});T.roadA=await texL('world/road_ao.ktx2',{rep:1})}],
  ['Land',async()=>{T.grass=await texL('world/grass.ktx2',{srgb:1,rep:1});T.ground=await texL('world/new/ground_detail.webp',{srgb:1,rep:1});T.water=await texL('world/new/water_photo.webp',{srgb:1,mir:1});T.waterN=await texL('world/new/water_normal.webp',{rep:1});T.sky=await texL('world/sky.ktx2',{srgb:1,mir:1})}],
  ['Trees',async()=>{T.leaf=await texL('world/leaf.ktx2',{srgb:1});T.bark=await texL('world/bark.ktx2',{srgb:1,mir:1});T.tallg=await texL('world/new/tallgrass.webp',{srgb:1});T.plants=await texL('world/new/plants_cluster.webp',{srgb:1});T.flowers=await texL('world/new/flowers_sheet.webp',{srgb:1});T.treesheet=await texL('world/new/trees_sheet.webp',{srgb:1})}],['Engine',()=>loadAudio()]];
 const T=this.T={};for(let i=0;i<steps.length;i++){await steps[i][1]();prog&&prog((i+1)/steps.length)}this.ready=true};
let ABUF=null;
async function loadAudio(){YV.audio.ensure();const ctx=YV.audio.ctx;if(!ctx)return;const dec=async p=>{const ab=await YV.assets.buffer(p);return new Promise((ok,no)=>{const pr=ctx.decodeAudioData(ab.slice(0),ok,no);if(pr&&pr.catch)pr.catch(()=>{})})};
 const get=async n=>{if(YV.cfg.get('aud.spatial')){try{return{b:await dec('audio/eng_'+n+'_sp.m4a'),sp:1}}catch(e){}}return{b:await dec('audio/eng_'+n+'.ogg'),sp:0}};
 try{ABUF={low:await get('low'),mid:await get('mid'),high:await get('high')}}catch(e){console.warn('engine audio',e);ABUF=null}}
/* ---------------- world building */
function buildChunk(k,env){
 const road=env.road,g=new THREE.Group(),N=CH+1,P=[],U=[],I=[],Cc=[];const mk=(pos,uv,idx,col,norm)=>{const geo=new THREE.BufferGeometry();geo.setAttribute('position',new THREE.Float32BufferAttribute(pos,3));geo.setAttribute('uv',new THREE.Float32BufferAttribute(uv,2));if(col)geo.setAttribute('color',new THREE.Float32BufferAttribute(col,3));geo.setIndex(idx);geo.computeVertexNormals();return geo};
 // road ribbon
 for(let i=0;i<N;i++){const s=(k*CH+i)*SEG,q=road.at(s),w=RW/2;P.push(q.x+q.nx*w,q.y+.03,q.z+q.nz*w,q.x-q.nx*w,q.y+.03,q.z-q.nz*w);U.push(s/(RW*2),0,s/(RW*2),1)}
 for(let i=0;i<CH;i++){const a=2*i,b=a+1,c=a+2,d=a+3;I.push(a,b,c,b,d,c)}
 const rg=mk(P,U,I);rg.setAttribute('uv2',new THREE.Float32BufferAttribute(U,2));const rm=new THREE.Mesh(rg,env.roadMat);rm.receiveShadow=true;g.add(rm);
 // --- branching side paths (multiple roads) ---
 (function(){
  const forks=[[0.22,1,0.55],[0.55,-1,0.45],[0.78,1,0.4]]; // t along chunk, side, length factor
  forks.forEach(function(fk){
   const t0=fk[0],side=fk[1],lenF=fk[2];
   const s0=(k*CH+t0*CH)*SEG;
   // only some chunks get a visible fork
   const h=hash(k*17.3+side*9+t0*100);
   if(h>0.38)return;
   const BP=[],BU=[],BI=[];
   const segs=Math.max(4,Math.floor(CH*lenF));
   const wFork=RW*0.55;
   for(let i=0;i<=segs;i++){
    const tt=i/segs;
    const s=s0+tt*segs*SEG*0.85;
    const q=road.at(s);
    // curve away from main road
    const away=(1-Math.cos(tt*Math.PI))*14*side;
    const px=q.x+q.nx*(away), pz=q.z+q.nz*(away);
    const py=road.ground(s,away)+0.04;
    const nx=q.nx, nz=q.nz;
    BP.push(px+nx*wFork,py,pz+nz*wFork, px-nx*wFork,py,pz-nz*wFork);
    BU.push(s/(RW*2),0, s/(RW*2),1);
   }
   for(let i=0;i<segs;i++){const a=2*i,b=a+1,c=a+2,d=a+3;BI.push(a,b,c,b,d,c)}
   if(BP.length>=6){
    const bg=mk(BP,BU,BI);
    const bm=new THREE.Mesh(bg,env.roadMat);bm.receiveShadow=true;g.add(bm);
   }
  });
 })();

 // terrain + water per side
 [1,-1].forEach(side=>{const J=DL.length,tp=[],tu=[],ti=[],tc=[];let lakeMax=0;
  for(let i=0;i<N;i++){const s=(k*CH+i)*SEG,q=road.at(s);lakeMax=Math.max(lakeMax,road.lake(s,side));for(let j=0;j<J;j++){const ad=DL[j],y=road.ty(s,ad,side,q.y);tp.push(q.x+q.nx*side*ad,y,q.z+q.nz*side*ad);tu.push(s/11,side*ad/11);
   const nz=.75+.35*vn(s*.04,ad*.04),dry=sm(3.5,12,ad),dirt=sm(0.2,0.55,vn(s*.02+side*5,ad*.015)),patch=vn(s*.09,ad*.08);const r=lerp(.55,.95,dry)*nz*(1.-dirt*.35),g=lerp(.62,1.05,dry)*nz*(1.-dirt*.45),b=lerp(.35,.7,dry)*nz*(1.-dirt*.2);tc.push(r*(.85+patch*.3),g*(.9+patch*.25),b*(.8+patch*.2))}}
  for(let i=0;i<CH;i++)for(let j=0;j<J-1;j++){const a=i*J+j,b=a+1,c=a+J,d=c+1;if(side>0)ti.push(a,c,b,b,c,d);else ti.push(a,b,c,b,d,c)}
  const tm=new THREE.Mesh(mk(tp,tu,ti,tc),env.grassMat);tm.receiveShadow=true;g.add(tm);
  if(lakeMax>.05){const wp=[],wu=[],wi=[];for(let i=0;i<N;i++){const s=(k*CH+i)*SEG,q=road.at(s);[12,160].forEach(ad=>{const x=q.x+q.nx*side*ad,z=q.z+q.nz*side*ad;wp.push(x,q.y-7.5,z);wu.push(x/24,z/24)})}
   for(let i=0;i<CH;i++){const a=2*i,b=a+1,c=a+2,d=a+3;if(side>0)wi.push(a,c,b,b,c,d);else wi.push(a,b,c,b,d,c)}g.add(new THREE.Mesh(mk(wp,wu,wi),env.waterMat))}});
 // trees (merged): trunk + leaf fronds
 const rnd=(()=>{let a=k*7919+env.road.seed*1000|0;return()=>{a|=0;a=a+0x6D2B79F5|0;let t=Math.imul(a^a>>>15,1|a);t=t+Math.imul(t^t>>>7,61|t)^t;return((t^t>>>14)>>>0)/4294967296}})();
 const tp=[],tn=[],tu=[],ti=[],lp=[],lu=[],lc=[],lw=[],li=[];
 const ntree=18;for(let n=0;n<ntree;n++){const side=rnd()<.5?1:-1,s=(k*CH+rnd()*CH)*SEG,ad=10+Math.pow(rnd(),1.4)*60;if(road.lake(s,side)*sm(11,26,ad)>.3)continue;const q=road.at(s),x=q.x+q.nx*side*ad,z=q.z+q.nz*side*ad,y=road.ty(s,ad,side,q.y),sc=.85+rnd()*.7,H=(4.4+rnd()*2.6)*sc,r0=.42*sc,r1=.14*sc,S=8,b0=tp.length/3;
  for(let a=0;a<=S;a++){const an=a/S*Math.PI*2,cx=Math.cos(an),cz=Math.sin(an);tp.push(x+cx*r0,y-.2,z+cz*r0,x+cx*r1,y+H,z+cz*r1);tn.push(cx,0,cz,cx,0,cz);tu.push(a/S*2,0,a/S*2,H/3.2)}
  for(let a=0;a<S;a++){const A=b0+a*2;ti.push(A,A+2,A+1,A+1,A+2,A+3)}
  const tint=[.82+rnd()*.3,.9+rnd()*.25,.62+rnd()*.3];
  for(let c=0;c<4;c++){const ox=(rnd()-.5)*2.6*sc,oz=(rnd()-.5)*2.6*sc,oy=H*(.8+rnd()*.25);for(let f=0;f<16;f++){const az=rnd()*6.283,pt=-.35+rnd()*1.2,cp=Math.cos(pt),dx=Math.cos(az)*cp,dy=Math.sin(pt),dz=Math.sin(az)*cp,L=(2.7+rnd()*1.3)*sc,Wd=L*.36,roll=rnd()*6.283;
   let sx=-dz,sy=0,sz=dx;const sl=Math.hypot(sx,sz)||1;sx/=sl;sz/=sl;const cr=Math.cos(roll),sr=Math.sin(roll),ux=dy*sz-dz*sy,uy=dz*sx-dx*sz,uz=dx*sy-dy*sx;const sX=sx*cr+ux*sr,sY=sy*cr+uy*sr,sZ=sz*cr+uz*sr;
   const px=x+ox,py=y+oy,pz=z+oz,v0=lp.length/3,hf=Math.min(1,(oy)/8);
   const V=[[px-sX*Wd*.4,py-sY*Wd*.4,pz-sZ*Wd*.4,0,1,.35],[px+sX*Wd*.4,py+sY*Wd*.4,pz+sZ*Wd*.4,1,1,.35],[px+dx*L+sX*Wd*.5,py+dy*L+sY*Wd*.5,pz+dz*L+sZ*Wd*.5,1,0,1],[px+dx*L-sX*Wd*.5,py+dy*L-sY*Wd*.5,pz+dz*L-sZ*Wd*.5,0,0,1]];
   V.forEach(a=>{lp.push(a[0],a[1],a[2]);lu.push(a[3],a[4]);lc.push(tint[0],tint[1],tint[2]);lw.push(a[5]*hf)});li.push(v0,v0+1,v0+2,v0,v0+2,v0+3)}}}
 if(tp.length){const tg=new THREE.BufferGeometry();tg.setAttribute('position',new THREE.Float32BufferAttribute(tp,3));tg.setAttribute('normal',new THREE.Float32BufferAttribute(tn,3));tg.setAttribute('uv',new THREE.Float32BufferAttribute(tu,2));tg.setIndex(ti);g.add(new THREE.Mesh(tg,env.barkMat));
  const lg=new THREE.BufferGeometry();lg.setAttribute('position',new THREE.Float32BufferAttribute(lp,3));lg.setAttribute('uv',new THREE.Float32BufferAttribute(lu,2));lg.setAttribute('color',new THREE.Float32BufferAttribute(lc,3));lg.setAttribute('sway',new THREE.Float32BufferAttribute(lw,1));
  const nn=new Float32Array(lp.length);for(let i=1;i<nn.length;i+=3)nn[i]=1;lg.setAttribute('normal',new THREE.BufferAttribute(nn,3));lg.setIndex(li);const lm=new THREE.Mesh(lg,env.leafMat);lm.frustumCulled=true;g.add(lm)}
 
 // --- low-poly vegetation cards (tall grass / plants / flowers) with wind ---
 if(T.tallg||T.plants||T.flowers){
  const veg=YV.cfg.get('gfx.veg')|0;const nVeg=Math.floor(14*(veg/70));
  const vp=[],vu=[],vc=[],vw=[],vi=[];
  const addCard=(cx,cy,cz,w,h,u0,v0,u1,v1,sw,tint)=>{
   const b=vp.length/3;
   // two crossed quads for volume (lowpoly, not single paper billboard)
   const axes=[[1,0],[0,1]];
   for(let a=0;a<2;a++){
    const ax=axes[a][0],az=axes[a][1];
    const hx=ax*w*.5,hz=az*w*.5;
    vp.push(cx-hx,cy,cz-hz, cx+hx,cy,cz+hz, cx+hx,cy+h,cz+hz, cx-hx,cy+h,cz-hz);
    vu.push(u0,v0, u1,v0, u1,v1, u0,v1);
    for(let k=0;k<4;k++){vc.push(tint[0],tint[1],tint[2]);vw.push(sw*(k>=2?1:.15))}
    const o=b+a*4;vi.push(o,o+1,o+2, o,o+2,o+3);
   }
  };
  for(let n=0;n<nVeg;n++){
   const side=rnd()<.5?1:-1,s=(k*CH+rnd()*CH)*SEG,ad=6+Math.pow(rnd(),1.2)*55;
   if(road.lake(s,side)*sm(11,26,ad)>.25)continue;
   const q=road.at(s),x=q.x+q.nx*side*ad,z=q.z+q.nz*side*ad,y=road.ty(s,ad,side,q.y);
   const kind=rnd();
   if(kind<.45&&T.tallg){
    // tall grass card from sheet (full image)
    const h=1.1+rnd()*1.4,w=.5+rnd()*.4;addCard(x,y,z,w,h,0,0,1,1,.9,[.7+rnd()*.3,.85+rnd()*.2,.55+rnd()*.2]);
   }else if(kind<.75&&T.plants){
    const h=1.4+rnd()*1.8,w=1.2+rnd()*.8;addCard(x,y,z,w,h,0,0,1,1,.7,[.85+rnd()*.2,.9+rnd()*.15,.75+rnd()*.2]);
   }else if(T.flowers){
    const h=.35+rnd()*.5,w=.4+rnd()*.35;addCard(x,y,z,w,h,0,0,1,1,.5,[1,1,1]);
   }
  }
  if(vp.length){
   const vg=new THREE.BufferGeometry();
   vg.setAttribute('position',new THREE.Float32BufferAttribute(vp,3));
   vg.setAttribute('uv',new THREE.Float32BufferAttribute(vu,2));
   vg.setAttribute('color',new THREE.Float32BufferAttribute(vc,3));
   vg.setAttribute('sway',new THREE.Float32BufferAttribute(vw,1));
   // pick best available map
   const vmap=T.tallg||T.plants||T.flowers;
   const vmat=new THREE.MeshLambertMaterial({map:vmap,alphaTest:.4,side:THREE.DoubleSide,vertexColors:true,transparent:true});
   vmat.onBeforeCompile=s=>{
    s.uniforms.uTime=uTime;
    s.vertexShader='attribute float sway;uniform float uTime;\n'+s.vertexShader
     .replace('#include <begin_vertex>',
      '#include <begin_vertex>\n'+
      ' float w=sway;\n'+
      ' transformed.x+=sin(uTime*2.1+position.x*.4)*.18*w;\n'+
      ' transformed.z+=cos(uTime*1.7+position.z*.35)*.14*w;');
   };
   const vm=new THREE.Mesh(vg,vmat);vm.frustumCulled=true;g.add(vm);
  }
 }
 
 g.userData.k=k;return g}
/* ---------------- audio: engine layers + wind / rain / tyres */
function Sound(){const A=YV.audio;A.ensure();const c=this.c=A.ctx;if(!c)return;this.out=c.createGain();this.lp=c.createBiquadFilter();this.lp.type='lowpass';this.lp.frequency.value=6000;const comp=c.createDynamicsCompressor();const dyn=YV.cfg.get('aud.dyn');comp.threshold.value=dyn==='Night'?-32:dyn==='Wide'?-6:-18;comp.ratio.value=dyn==='Night'?8:dyn==='Wide'?1.5:3;
 this.out.connect(this.lp);this.lp.connect(comp);comp.connect(c.destination);this.L=[];
 if(ABUF)['low','mid','high'].forEach(n=>{const s=c.createBufferSource();s.buffer=ABUF[n].b;s.loop=true;const g=c.createGain();g.gain.value=0;s.connect(g);g.connect(this.out);s.start();this.L.push({n,s,g})});
 const nb=c.createBuffer(1,c.sampleRate*2,c.sampleRate),d=nb.getChannelData(0);for(let i=0;i<d.length;i++)d[i]=Math.random()*2-1;const nz=(type,f,q)=>{const s=c.createBufferSource();s.buffer=nb;s.loop=true;const fl=c.createBiquadFilter();fl.type=type;fl.frequency.value=f;fl.Q.value=q||.7;const g=c.createGain();g.gain.value=0;s.connect(fl);fl.connect(g);g.connect(c.destination);s.start();return{g,fl}};
 this.wind=nz('lowpass',300);this.rain=nz('bandpass',3200,.5);this.tyre=nz('bandpass',1100,1.4)}
Sound.prototype.update=function(r,thr,speed,slip,onRoad,rain){if(!this.c)return;const t=this.c.currentTime,A=YV.audio,E=A.vol('aud.engine')*.9,F=A.vol('aud.sfx');
 const R={low:[.62,1.25,1-sm(.15,.45,r)],mid:[.9,1.8,sm(.08,.4,r)*(1-sm(.55,.85,r))],high:[1.35,2.4,sm(.45,.8,r)]};
 this.L.forEach(l=>{const q=R[l.n];l.s.playbackRate.setTargetAtTime(lerp(q[0],q[1],clamp(r,0,1)),t,.05);l.g.gain.setTargetAtTime(q[2]*E*(.5+.5*thr),t,.06)});
 this.lp.frequency.setTargetAtTime(1800+thr*8500,t,.08);const sp=clamp(speed/60,0,1.4);
 this.wind.g.gain.setTargetAtTime(sp*sp*.22*F,t,.1);this.wind.fl.frequency.setTargetAtTime(200+sp*1400,t,.1);
 this.rain.g.gain.setTargetAtTime(rain*.12*F,t,.3);this.tyre.g.gain.setTargetAtTime((clamp(slip,0,1)*.28+(onRoad?clamp(speed/70,0,1)*.035:clamp(speed/40,0,1)*.1))*F,t,.08);this.tyre.fl.frequency.setTargetAtTime(onRoad?1100:420,t,.2)};
Sound.prototype.stop=function(){if(!this.c)return;try{this.L.forEach(l=>l.s.stop());[this.wind,this.rain,this.tyre].forEach(n=>n.g.gain.value=0)}catch(e){}};
/* ---------------- HUD / controls DOM */
function hud(){const root=$('#drive');root.innerHTML='';const cv=h('canvas',{id:'dcanvas'});const mm=h('canvas',{id:'mm',width:200,height:200});
 const btn=(k,l,cls)=>h('div',{class:'pbtn '+(cls||''),'data-k':k},l);const lh=YV.cfg.get('ctl.layout')==='Left-handed';
 const steerMode=YV.cfg.get('ctl.steer');
 const left=h('div',{class:'cl '+(lh?'right':'left')},steerMode==='Touch wheel'?h('div',{class:'wheel',id:'wheel'},h('i'),h('b')):(steerMode==='Tilt'?h('div',{class:'tiltinfo'},'TILT TO STEER'):[btn('left','◀','st'),btn('right','▶','st')]));
 const right=h('div',{class:'cl '+(lh?'left':'right')},btn('brake','BRAKE','ped brk'),btn('gas','GAS','ped gas'));
 root.append(cv,h('div',{class:'vig'}),h('div',{class:'spl',id:'spl'}),h('div',{class:'dgr'}),
  h('div',{class:'dtl'},h('div',{class:'dchip',id:'clk'}),h('div',{class:'dchip',id:'dist'})),mm,
  h('div',{class:'dtr'},h('button',{class:'ibtn',id:'bcam','aria-label':'Camera'},YV.icon('cam')),h('button',{class:'ibtn',id:'bpause','aria-label':'Pause'},h('span',{class:'ico',html:'<svg viewBox="0 0 24 24"><path d="M8 5v14M16 5v14"/></svg>'}))),
  h('div',{class:'dspeed'},h('b',{id:'sp'},'0'),h('small',{id:'un'},'km/h'),h('div',{class:'rpm'},h('i',{id:'rpm'})),h('span',{id:'gr'},'N')),left,right,h('div',{id:'dtoast'}));
 root.style.setProperty('--bs',YV.cfg.get('ctl.btnSize')/100);root.style.setProperty('--bo',YV.cfg.get('ctl.btnOp')/100);return cv}
/* ---------------- start / loop */
OR.begin=function(cfg){
 const cv=hud(),A=YV.audio;cfg=cfg||{};{const sc=YV.store.data.garage.cars.starter;YV.car.setPaint(sc.paint);YV.car.setFinish(sc.finish||'Gloss')}document.body.classList.add('driving');$('#drive').style.display='block';
 if(!this.renderer){this.renderer=new THREE.WebGLRenderer({canvas:cv,antialias:false,powerPreference:'high-performance'})}else{/* reuse GL context: swap canvas contents */this.renderer.dispose();this.renderer=new THREE.WebGLRenderer({canvas:cv,antialias:false,powerPreference:'high-performance'})}
 const R=this.renderer,T=this.T;R.outputEncoding=THREE.sRGBEncoding;R.toneMapping=THREE.ACESFilmicToneMapping;R.autoClear=true;this.fsr=new YV.FSR(R);
 const road=new Road(Math.random()*6.28),scene=new THREE.Scene(),cam=new THREE.PerspectiveCamera(62,2,.1,2600);
 const roadMat=new THREE.MeshStandardMaterial({map:T.roadC,roughnessMap:T.roadR,aoMap:T.roadA,roughness:1,metalness:0,envMapIntensity:1.4});
 const uWet={value:0}; // 0 dry .. 1 fully wet (road + shared for car splash look)
 roadMat.onBeforeCompile=s=>{
  s.uniforms.uWet=uWet;
  s.fragmentShader='uniform float uWet;\n'+s.fragmentShader
   .replace('#include <roughnessmap_fragment>',
    '#include <roughnessmap_fragment>\n roughnessFactor=mix(roughnessFactor, roughnessFactor*0.12+0.05, uWet);\n')
   .replace('#include <metalnessmap_fragment>',
    '#include <metalnessmap_fragment>\n metalnessFactor=mix(metalnessFactor, 0.55, uWet*0.85);\n')
   .replace('#include <map_fragment>',
    '#include <map_fragment>\n diffuseColor.rgb=mix(diffuseColor.rgb, diffuseColor.rgb*0.55, uWet*0.65);\n diffuseColor.rgb+=vec3(0.04,0.05,0.06)*uWet;\n');
 };

 const uTime={value:0};
 const applyToon=(mat,steps)=>{
  const st=steps||4;
  mat.userData.toonSteps=st;
  const prev=mat.onBeforeCompile;
  mat.onBeforeCompile=function(shader){
    if(typeof prev==='function')prev(shader);
    shader.uniforms.uToonSteps={value:st};
    var fs=shader.fragmentShader;
    if(fs.indexOf('lights_lambert_fragment')>=0){
      fs=fs.replace('#include <lights_lambert_fragment>', '#include <lights_lambert_fragment>\n float _td=clamp(dot(normal,normalize(vec3(0.35,0.9,0.25))),0.,1.);\n float _st=floor(_td*uToonSteps)/uToonSteps;\n reflectedLight.directDiffuse*=mix(0.5,1.2,_st);\n reflectedLight.directDiffuse+=vec3(0.06,0.08,0.12)*smoothstep(0.,0.35,_td);');
    }
    if(fs.indexOf('#include <output_fragment>')>=0){
      fs=fs.replace('#include <output_fragment>', 'float _lum=dot(outgoingLight,vec3(0.299,0.587,0.114));\n float _st2=floor(clamp(_lum,0.,1.)*uToonSteps)/uToonSteps;\n outgoingLight=mix(outgoingLight*0.85,outgoingLight*1.1,_st2);\n#include <output_fragment>');
    }
    shader.fragmentShader=fs;
  };
 };








 // Splat-style terrain: blend original grass with detailed ground map, vertex colors drive mix + wind
 const grassMat=new THREE.MeshLambertMaterial({map:T.ground||T.grass,vertexColors:true});
 grassMat.onBeforeCompile=s=>{
  s.uniforms.uTime=uTime;
  s.uniforms.tGrass={value:T.grass};
  s.fragmentShader='uniform sampler2D tGrass;\n'+s.fragmentShader
   .replace('#include <map_fragment>',
    '#include <map_fragment>\n'+
    ' vec4 g2=texture2D(tGrass,vUv*2.7);\n'+
    ' float mixG=smoothstep(0.35,0.75,vColor.g);\n'+
    ' diffuseColor.rgb=mix(diffuseColor.rgb,g2.rgb,mixG*0.55);\n'+
    ' diffuseColor.rgb*=vColor.rgb*1.15;');
  s.vertexShader='uniform float uTime;\n'+s.vertexShader
   .replace('#include <begin_vertex>',
    '#include <begin_vertex>\n'+
    ' float wind=sin(uTime*1.1+position.x*.08+position.z*.06)*.04+sin(uTime*2.3+position.z*.15)*.02;\n'+
    ' transformed.x+=wind*(0.3+position.y*0.15);\n'+
    ' transformed.z+=cos(uTime*0.9+position.x*.1)*.03;');
 };
 // Water: photo albedo + simple animated offset (normal map used as secondary scroll)
 const waterMat=new THREE.MeshStandardMaterial({map:T.water,color:0x3a8fc4,roughness:.05,metalness:.35,transparent:true,opacity:.88,envMapIntensity:2.0});
 waterMat.onBeforeCompile=s=>{
  s.uniforms.uTime=uTime;
  s.vertexShader='uniform float uTime;\n'+s.vertexShader
   .replace('#include <begin_vertex>',
    '#include <begin_vertex>\n'+
    ' transformed.y+=sin(uTime*1.2+position.x*.15+position.z*.12)*.22+sin(uTime*2.4+position.z*.28)*.12+sin(uTime*.7+position.x*.05)*.08;');
 };
 const barkMat=new THREE.MeshLambertMaterial({map:T.bark});
 const leafMat=new THREE.MeshLambertMaterial({map:T.leaf,alphaTest:.45,side:THREE.DoubleSide,vertexColors:true});
 leafMat.onBeforeCompile=s=>{
  s.uniforms.uTime=uTime;
  s.vertexShader='attribute float sway;uniform float uTime;\n'+s.vertexShader
   .replace('#include <begin_vertex>',
    '#include <begin_vertex>\n'+
    ' float w=sway*(0.55+0.45*sin(uTime*0.7+position.y));\n'+
    ' transformed.x+=sin(uTime*1.9+position.x*.28+position.z*.22)*.22*w;\n'+
    ' transformed.z+=cos(uTime*1.5+position.z*.25+position.y*.35)*.18*w;\n'+
    ' transformed.y+=sin(uTime*2.4+position.x*.4)*.06*w;');
 };
 applyToon(grassMat,5);applyToon(barkMat,4);applyToon(leafMat,4);applyToon(roadMat,6);
 const env={road,roadMat,grassMat,waterMat,barkMat,leafMat},chunks=new Map();
 // sky dome
 const skyMat=new THREE.ShaderMaterial({side:THREE.BackSide,depthWrite:false,fog:false,uniforms:{
  tSky:{value:T.sky},uTint:{value:new THREE.Color(1,1,1)},uBr:{value:1},uHaze:{value:new THREE.Color(.75,.85,.95)},uFlash:{value:0},
  uSunDir:{value:new THREE.Vector3(.3,.7,.4)},uSunCol:{value:new THREE.Color(1,.95,.85)},uTod:{value:1},uCloud:{value:.25},uTime:{value:0}
 },
  vertexShader:'varying vec3 vD;void main(){vD=position;gl_Position=projectionMatrix*modelViewMatrix*vec4(position,1.);gl_Position.z=gl_Position.w;}',
  fragmentShader:`uniform sampler2D tSky;uniform vec3 uTint;uniform float uBr;uniform vec3 uHaze;uniform float uFlash;
uniform vec3 uSunDir;uniform vec3 uSunCol;uniform float uTod;uniform float uCloud;uniform float uTime;
varying vec3 vD;
float hash(vec2 p){return fract(sin(dot(p,vec2(127.1,311.7)))*43758.5453);}
float noise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(hash(i),hash(i+vec2(1,0)),f.x),mix(hash(i+vec2(0,1)),hash(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float v=0.,a=.5;for(int i=0;i<5;i++){v+=a*noise(p);p*=2.05;a*=.5;}return v;}
void main(){
  vec3 d=normalize(vD);float el=d.y;float az=atan(d.x,d.z);
  vec2 uv=vec2(az/6.2831853+.5,clamp(.5-el*.48,0.,1.));
  vec3 base=pow(texture2D(tSky,uv).rgb,vec3(2.2));
  // Forza Horizon style: rich saturated blue sky, soft warm-white horizon, cinematic
  vec3 zenith=mix(vec3(.02,.04,.12),vec3(.18,.42,.92),smoothstep(0.,.55,uTod));
  vec3 midSky=mix(vec3(.08,.12,.28),vec3(.45,.68,.98),smoothstep(0.,.5,uTod));
  vec3 horiz=mix(vec3(.25,.22,.35),vec3(.88,.9,.95),smoothstep(0.,.45,uTod));
  // Forza Horizon sunset: golden horizon + soft magenta/pink mid, polished not muddy
  float sunH=max(0.,uSunDir.y);
  float warm=smoothstep(.45,.0,sunH)*smoothstep(-.08,.28,sunH);
  float dusk=smoothstep(.7,.25,uTod)*smoothstep(-.05,.4,uTod); // dawn+sunset
  float w=max(warm, dusk*.85);
  horiz=mix(horiz, vec3(1.0,.55,.28), w*.9);
  horiz=mix(horiz, vec3(1.0,.35,.55), w*.25); // magenta kiss
  midSky=mix(midSky, vec3(.95,.45,.55), w*.45);
  midSky=mix(midSky, vec3(.55,.35,.75), w*.2);
  zenith=mix(zenith, vec3(.25,.2,.55), w*.3);
  float h=smoothstep(-.12,.9,el);
  vec3 grad=mix(horiz,mix(midSky,zenith,smoothstep(.1,.8,el)),h);
  vec3 c=mix(base*uTint,grad,.78)*uBr;
  // clean bright sun (FH style)
  float sd=max(0.,dot(d,normalize(uSunDir)));
  c+=uSunCol*pow(sd,420.)*3.2;
  c+=uSunCol*pow(sd,48.)*.9;
  c+=uSunCol*pow(sd,6.)*.15;
  // soft volumetric godray near sun
  c+=uSunCol*pow(sd,2.)*(.04+.06*warm);
  // soft layered clouds
  if(el>0.01){
    vec2 cu=vec2(az*1.1+uTime*.006,el*2.8+uTime*.0025);
    float cl=smoothstep(.42,.72,fbm(cu*2.2))*uCloud;
    cl*=smoothstep(0.01,.3,el)*smoothstep(1.,.55,el);
    vec3 ccol=mix(vec3(.98,.98,1.),vec3(.95,.88,.82),warm);
    c=mix(c,ccol,cl*.5);
  }
  c=mix(c,uHaze,smoothstep(.3,-.08,el)*.5);
  c+=uFlash;
  // slight FH film contrast
  c=pow(max(c,0.),vec3(.95));
  gl_FragColor=vec4(pow(clamp(c,0.,6.),vec3(1./2.2)),1.);
}`});
const sky=new THREE.Mesh(new THREE.SphereGeometry(2000,32,16),skyMat);sky.frustumCulled=false;sky.renderOrder=-10;scene.add(sky);
 // env map for reflections
 try{const pm=new THREE.PMREMGenerator(R),st=T.sky.clone();st.mapping=THREE.EquirectangularReflectionMapping;st.needsUpdate=true;scene.environment=pm.fromEquirectangular(st).texture;pm.dispose()}catch(e){console.warn('pmrem',e)}
 const sun=new THREE.DirectionalLight(0xffffff,2),hemi=new THREE.HemisphereLight(0xbfd8ff,0x5a6a3a,.8);sun.target=new THREE.Object3D();scene.add(sun,sun.target,hemi);
 // car
 const car=YV.car.create(SC);scene.add(car.root);const blob=document.createElement('canvas');blob.width=blob.height=64;{const g=blob.getContext('2d'),gr=g.createRadialGradient(32,32,2,32,32,32);gr.addColorStop(0,'rgba(0,0,0,.75)');gr.addColorStop(1,'rgba(0,0,0,0)');g.fillStyle=gr;g.fillRect(0,0,64,64)}
 const shadow=new THREE.Mesh(new THREE.PlaneGeometry(6.2,3.2),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(blob),transparent:true,depthWrite:false,fog:false}));shadow.rotation.x=-Math.PI/2;scene.add(shadow);
 const hl=[-.7,.7].map(x=>{const l=new THREE.SpotLight(0xfff1d0,0,110,.5,.6,1);l.position.set(x,.1,2.1);const t=new THREE.Object3D();t.position.set(x,-.4,16);car.root.add(l,t);l.target=t;return l});
 // rain
 const NR=1600,rp=new Float32Array(NR*6),rain=new THREE.LineSegments(new THREE.BufferGeometry().setAttribute('position',new THREE.BufferAttribute(rp,3)),new THREE.LineBasicMaterial({color:0xc8d8ff,transparent:true,opacity:.42,fog:false}));rain.frustumCulled=false;rain.visible=false;scene.add(rain);
 for(let i=0;i<NR;i++){const x=(Math.random()-.5)*60,y=Math.random()*30,z=(Math.random()-.5)*60;rp.set([x,y,z,x,y-.7,z],i*6)}
 // settings-driven state
 const C=YV.cfg,tod=cfg.time==='Live'?(()=>{const hh=new Date().getHours();return hh<6||hh>=20?'Night':hh<9?'Dawn':hh<17?'Noon':'Sunset'})():(cfg.time||'Sunset'),wx=cfg.weather||'Clear',TD=TOD[tod]||TOD.Sunset,WW=WX[wx]||WX.Clear;
 const draw=Math.max(200,+C.get('gfx.draw')*7+100),ahead=Math.ceil(draw/(CH*SEG));
 const gray=new THREE.Color(.55,.58,.62);const tint=new THREE.Color(...TD.tint).lerp(gray,WW.g*.6).multiplyScalar(WW.d);skyMat.uniforms.uTint.value.copy(tint);skyMat.uniforms.uBr.value=TD.br;
 const fogC=new THREE.Color(TD.fog).lerp(gray,WW.g*.6).multiplyScalar(wx==='Clear'?1:Math.max(.5,WW.d));scene.fog=new THREE.FogExp2(fogC,2.1/draw*WW.f);skyMat.uniforms.uHaze.value.copy(fogC).convertSRGBToLinear();
 // GTA sky: sun dir, tod factor (0 night .. 1 noon), cloud amount
 const sunDirV=new THREE.Vector3(...TD.sun).normalize();skyMat.uniforms.uSunDir.value.copy(sunDirV);
 skyMat.uniforms.uSunCol.value.setHex(TD.col).convertSRGBToLinear();
 const todF={'Night':0.05,'Dawn':0.35,'Sunset':0.4,'Noon':1}[tod]||0.5;
 skyMat.uniforms.uTod.value=todF;skyMat.uniforms.uCloud.value=WW.g;
 sun.color.setHex(TD.col);sun.intensity=TD.I*WW.d;hemi.intensity=TD.hemi*WW.d;const sd=new THREE.Vector3(...TD.sun).normalize();
 [roadMat,waterMat,YV.car.mat].forEach(m=>m.envMapIntensity=(m===waterMat?1.3:1)*(TD.env*(.6+.4*WW.d)+(wx==='Rain'||wx==='Storm'?.25:0)));
 roadMat.roughness=wx==='Rain'||wx==='Storm'?.55:wx==='Clear'?.95:.8;roadMat.color.setScalar(wx==='Rain'||wx==='Storm'?.72:1);
 R.toneMappingExposure=tod==='Night'?1.25:1.05;const night=tod==='Night'||wx==='Storm'||(wx==='Fog'&&tod!=='Noon');hl.forEach(l=>l.intensity=night?3.2:0);
 const shQ={Off:0,Low:512,Medium:1024,High:2048,Ultra:3072}[C.get('gfx.shadow')]||0;if(shQ){R.shadowMap.enabled=true;R.shadowMap.type=THREE.PCFSoftShadowMap;sun.castShadow=true;sun.shadow.mapSize.set(shQ,shQ);const sc=sun.shadow.camera;sc.left=sc.bottom=-26;sc.right=sc.top=26;sc.near=1;sc.far=200;sun.shadow.bias=-.0004;car.body.castShadow=true;Object.values(car.wheels).forEach(w=>w.sp.castShadow=true);roadMat.userData.rs=1;shadow.visible=false}
 // state
 const V={x:0,z:0,yaw:0,speed:0,vx:0,vz:0,steer:0,gear:1,rpm:900,s:30,d:-1.9,y:0,pitch:0,roll:0,slip:0,dist:0,thr:0,brk:0};const q0=road.at(V.s);V.yaw=q0.h;V.x=q0.x+q0.nx*V.d;V.z=q0.z+q0.nz*V.d;V.y=road.ground(V.s,V.d)+GOFF;
 const inp={left:0,right:0,gas:0,brake:0,tilt:0,wheel:0,kb:{}};const sound=new Sound();let camMode=({Chase:0,Hood:1,Cockpit:2,Bumper:3,Cinematic:4})[C.get('cam.def')]||0,camPos=new THREE.Vector3(),camInit=false,shake=0,lastT=performance.now(),acc=0,tAbs=0,flash=0,nextFlash=6,paused=false,stopped=false,dtoast=0;
 // chunk streaming
 const ensureChunks=(force)=>{const ck=Math.floor(V.s/(CH*SEG));
  // Build further ahead so the heavy buildChunk work happens while the car is still far away (removes the periodic hitch every ~64 m).
  const wantAhead=Math.max(ahead+2,6);
  let made=0, maxPerFrame=force?99:2;
  for(let k=Math.max(0,ck-1);k<=ck+wantAhead;k++){
    if(!chunks.has(k)){
      if(!force&&made>=maxPerFrame)break;
      const g=buildChunk(k,env);scene.add(g);chunks.set(k,g);made++;
    }
  }
  // Soft dispose: only remove chunks that are well behind, and do at most a couple per frame to avoid GC spikes.
  const toDrop=[];
  chunks.forEach((g,k)=>{if(k<ck-4||k>ck+wantAhead+3)toDrop.push(k)});
  const dropN=force?toDrop.length:Math.min(2,toDrop.length);
  for(let i=0;i<dropN;i++){const k=toDrop[i],g=chunks.get(k);if(!g)continue;scene.remove(g);g.traverse(o=>{if(o.geometry)o.geometry.dispose()});chunks.delete(k)}
};ensureChunks(true);
 // input
 const onKey=(e,v)=>{inp.kb[e.code]=v;if(v&&e.code==='KeyC')cycleCam()};const kd=e=>onKey(e,1),ku=e=>onKey(e,0);addEventListener('keydown',kd);addEventListener('keyup',ku);
 const press=(k,v)=>{inp[k]=v};const pts=new Map();const dr=$('#drive');
 dr.addEventListener('pointerdown',e=>{const b=e.target.closest&&e.target.closest('.pbtn');if(b){b.classList.add('on');pts.set(e.pointerId,b.dataset.k);press(b.dataset.k,1);e.preventDefault()}});
 const up=e=>{const k=pts.get(e.pointerId);if(k){press(k,0);pts.delete(e.pointerId);$$('.pbtn',dr).forEach(b=>{if(![...pts.values()].includes(b.dataset.k))b.classList.remove('on')})}};dr.addEventListener('pointerup',up);dr.addEventListener('pointercancel',up);
 const $$=YV.$$;const wheel=$('#wheel');if(wheel){let a0=null,w0=0;const ang=e=>{const r=wheel.getBoundingClientRect();return Math.atan2(e.clientY-r.top-r.height/2,e.clientX-r.left-r.width/2)};wheel.addEventListener('pointerdown',e=>{wheel.setPointerCapture(e.pointerId);a0=ang(e);w0=inp.wheel});wheel.addEventListener('pointermove',e=>{if(a0==null)return;let da=ang(e)-a0;if(da>Math.PI)da-=6.283;if(da<-Math.PI)da+=6.283;inp.wheel=clamp(w0+da/1.2*(C.get('ctl.touchSens')/55),-1,1);wheel.style.transform='rotate('+inp.wheel*100+'deg)'});const rel=()=>{a0=null;inp.wheel=0;wheel.style.transform=''};wheel.addEventListener('pointerup',rel);wheel.addEventListener('pointercancel',rel)}
 const onTilt=e=>{const a=(screen.orientation&&screen.orientation.angle)||window.orientation||0;let t=(a===90||a===-270)?-e.beta:(a===270||a===-90)?e.beta:e.gamma;t=t||0;const dz=C.get('ctl.tiltDead');t=Math.abs(t)<dz?0:t-Math.sign(t)*dz;inp.tilt=clamp(t/(55*(1.25-C.get('ctl.tiltSens')/100)),-1,1)};if(C.get('ctl.steer')==='Tilt')addEventListener('deviceorientation',onTilt);
 const cycleCam=()=>{camMode=(camMode+1)%5;camInit=false;toast(['Chase camera','Hood camera','Cockpit camera','Bumper camera','Cinematic camera'][camMode])};$('#bcam').onclick=()=>{YV.audio.play('tap');cycleCam()};
 const toast=t=>{const e=$('#dtoast');e.textContent=t;e.classList.add('on');clearTimeout(dtoast);dtoast=setTimeout(()=>e.classList.remove('on'),1800)};
 $('#bpause').onclick=()=>{YV.audio.play('open');pause(true)};
 // pause menu
 const pause=on=>{paused=on;OR.paused=on;let m=$('#pausem');if(m)m.remove();if(!on)return;m=h('div',{id:'pausem'},h('div',{class:'panel cut pm'},h('h3',null,'Paused'),
   h('div',{class:'field'},h('label',null,'Upscaler'),YV.seg(['Off','Ultra Quality','Quality','Balanced','Performance'],C.get('gfx.fsr'),v=>{C.set('gfx.fsr',v);C.set('gfx.preset','Custom');applyRes()})),
   h('div',{class:'field'},h('label',null,'Sharpening (RCAS)'),YV.slider(0,100,5,C.get('gfx.sharpen'),null,v=>C.set('gfx.sharpen',v))),
   h('div',{class:'field'},h('label',null,'Engine volume'),YV.slider(0,100,5,C.get('aud.engine'),null,v=>C.set('aud.engine',v))),
   h('div',{class:'row',style:'margin-top:1.4vh;flex-wrap:wrap'},h('button',{class:'btn p',onclick:()=>{YV.audio.play('confirm');pause(false)}},'Resume'),h('button',{class:'btn',onclick:()=>{cycleCam();YV.audio.play('tap')}},'Camera'),h('button',{class:'btn d',onclick:()=>{YV.audio.play('back');OR.stop(true)}},'Exit to lobby'))));$('#drive').append(m)};
 // resolution / FSR
 const applyRes=()=>{const f=C.get('gfx.fsr'),sc={'Ultra Quality':.77,Quality:.67,Balanced:.59,Performance:.5}[f]||clamp(C.get('gfx.resScale')/100,.4,1.5),dpr=Math.min(window.devicePixelRatio||1,2.5),w=Math.round(innerWidth*dpr),hh=Math.round(innerHeight*dpr);R.setPixelRatio(1);R.setSize(w,hh,false);cam.aspect=w/hh;cam.updateProjectionMatrix();OR.fsr.size(w,hh,Math.min(sc,1.5));OR.scaleInfo=f+' '+Math.round(sc*100)+'%'};applyRes();const onRs=()=>applyRes();addEventListener('resize',onRs);
 $('.vig',dr).style.opacity=C.get('gfx.vig')/100;
 // sim
 const kmh=()=>Math.abs(V.speed)*3.6*(C.get('gp.units')==='mph'?.6214:1);const GR=[0,3.6,2.3,1.6,1.2,.95,.78];
 const step=dt=>{
  const q=road.at(V.s),ds=(V.x-q.x)*Math.sin(q.h)+(V.z-q.z)*Math.cos(q.h);V.s=Math.max(0,V.s+ds);const q2=road.at(V.s);V.d=(V.x-q2.x)*q2.nx+(V.z-q2.z)*q2.nz;
  const kb=inp.kb;let st=(inp.right-inp.left)+inp.wheel+inp.tilt+((kb.ArrowRight||kb.KeyD)?1:0)-((kb.ArrowLeft||kb.KeyA)?1:0);const gp=navigator.getGamepads&&navigator.getGamepads()[0];let thr=inp.gas||(kb.ArrowUp||kb.KeyW)?1:0,brk=inp.brake||(kb.ArrowDown||kb.KeyS||kb.Space)?1:0;
  if(gp){if(Math.abs(gp.axes[0])>C.get('ctl.padDead')/100)st+=gp.axes[0];if(gp.buttons[7])thr=Math.max(thr,gp.buttons[7].value);if(gp.buttons[6])brk=Math.max(brk,gp.buttons[6].value)}
  if(C.get('ctl.autoAcc')&&!brk)thr=1;st=clamp(st,-1,1);V.thr=lerp(V.thr,thr,1-Math.exp(-dt*9));V.brk=lerp(V.brk,brk,1-Math.exp(-dt*14));
  const onRoad=Math.abs(V.d)<RW/2+.4,wet=wx==='Rain'||wx==='Storm',grip=(onRoad?(wet?.82:1):.55)*(1+.0*0),vmax=75;
  const steerT=st*(C.get('ctl.steer')==='Touch buttons'?1:1);V.steer+=(steerT-V.steer)*(1-Math.exp(-dt*(Math.abs(steerT)>.01?(inp.left||inp.right?5.5:12):10)));
  let a=0;if(V.speed>=0&&V.thr>0)a+=V.thr*10.5*(1-Math.pow(V.speed/vmax,1.6));if(V.brk>0){if(V.speed>.6)a-=V.brk*16*grip;else if(V.speed>-9)a-=V.brk*5}
  a-=.0007*V.speed*Math.abs(V.speed)+(onRoad?.12:2.6)*Math.sign(V.speed);if(!onRoad&&V.speed>34)a-=(V.speed-34)*.6;V.speed+=a*dt;if(Math.abs(V.speed)<.02&&!V.thr&&!V.brk)V.speed=0;
  const ang=V.steer*lerp(.55,.07,clamp(Math.abs(V.speed)/55,0,1));let yr=-V.speed*Math.tan(ang)/2.7;const lim=9.5*grip/Math.max(Math.abs(V.speed),1);yr=clamp(yr,-lim,lim);V.yaw+=yr*dt;V.yr=yr;
  const fx=Math.sin(V.yaw),fz=Math.cos(V.yaw),kk=1-Math.exp(-dt*grip*6.5);V.vx+=(fx*V.speed-V.vx)*kk;V.vz+=(fz*V.speed-V.vz)*kk;const lat=V.vx*fz-V.vz*fx;V.slip=clamp(Math.abs(lat)/8+(V.brk>.5&&V.speed>15?.5*V.brk:0)+(wet?.0:0),0,1);V.speed-=Math.abs(lat)*.35*dt*Math.sign(V.speed);
  V.x+=V.vx*dt;V.z+=V.vz*dt;if(Math.abs(V.d)>90){const k2=(Math.abs(V.d)-90)*.5*dt;V.x-=q2.nx*Math.sign(V.d)*k2*10;V.z-=q2.nz*Math.sign(V.d)*k2*10;V.speed*=.98}
  V.dist+=Math.hypot(V.vx,V.vz)*dt;
  let rp=Math.abs(V.speed)*GR[V.gear]*82;if(rp>6100&&V.gear<6)V.gear++;else if(rp<2300&&V.gear>1)V.gear--;rp=Math.abs(V.speed)*GR[V.gear]*82;V.rpmT=clamp(Math.max(rp,900+V.thr*3400*(1-clamp(Math.abs(V.speed)/14,0,1))),900,7000);V.rpm+=(V.rpmT-V.rpm)*(1-Math.exp(-dt*(V.thr>.1?8:5)))};
 // visuals
 const place=dt=>{const gy=road.ground(V.s,V.d)+GOFF;
  // soft suspension spring (more dynamic body, not rigid kinetic)
  const spring=18,damp=9;V.vy=(V.vy||0)+(gy-V.y)*spring*dt-(V.vy||0)*damp*dt;V.y+=V.vy*dt;
  if(Math.abs(V.y-gy)<0.002&&Math.abs(V.vy)<0.05){V.y=gy;V.vy=0}
  const yf=road.ground(V.s+3,V.d),yb=road.ground(V.s-3,V.d),yl=road.ground(V.s,V.d+1.3),yr2=road.ground(V.s,V.d-1.3);
  // stronger pitch (brake dive / accel squat) + body roll from steering + lateral speed
  const pT=-Math.atan2(yf-yb,6)+V.brk*.04*clamp(Math.abs(V.speed)/18,0,1)-V.thr*.022*clamp(Math.abs(V.speed)/25,0,1);
  const rT=Math.atan2(yl-yr2,2.6)*-0.35+clamp(V.steer*Math.abs(V.speed)*.0045,-.12,.12)+clamp((V.speed*(V.yr||0))*.008,-.1,.1);
  V.pitch+=(pT-V.pitch)*(1-Math.exp(-dt*10));V.roll+=(rT-V.roll)*(1-Math.exp(-dt*9));
  car.root.position.set(V.x,V.y,V.z);car.root.rotation.set(V.pitch,V.yaw,V.roll,'YXZ');car.root.updateMatrixWorld();
  const rot=V.speed*dt/(.36);['FL','FR','RL','RR'].forEach(k=>{if(car.wheels[k]&&car.wheels[k].sp)car.wheels[k].sp.rotation.x+=rot});
  const sa=-V.steer*lerp(.55,.07,clamp(Math.abs(V.speed)/55,0,1));
  if(car.wheels.FL)car.wheels.FL.piv.rotation.y=sa;if(car.wheels.FR)car.wheels.FR.piv.rotation.y=sa;
  // tail lights brighter when braking; headlights always on at night
  if(car.tailL){const brkOn=V.brk>.1;car.tailL.material.color.setHex(brkOn?0xff1100:0x880000);car.tailL.material.opacity=brkOn?.95:.55;car.tailR.material.color.copy(car.tailL.material.color);car.tailR.material.opacity=car.tailL.material.opacity}
  if(car.headL){const night=tod==='Night'||tod==='Dawn';car.headL.visible=car.headR.visible=night||tod==='Sunset'}
  shadow.position.set(V.x,V.y-GOFF+.05,V.z);shadow.rotation.set(-Math.PI/2,0,-V.yaw+Math.PI/2*0,'XYZ');shadow.rotation.z=V.yaw;shadow.rotation.x=-Math.PI/2+V.pitch*0;
  sun.position.set(V.x+sd.x*70,V.y+sd.y*70,V.z+sd.z*70);sun.target.position.set(V.x,V.y,V.z);sun.target.updateMatrixWorld();sky.position.copy(cam.position)};
 const camera=dt=>{const fwd=new THREE.Vector3(Math.sin(V.yaw),0,Math.cos(V.yaw)),sp=Math.abs(V.speed);const fovB=C.get('cam.fov'),dyn=C.get('cam.dyn')?sp*.16:0;cam.fov+=((fovB-12+dyn+(camMode===0?0:8))-cam.fov)*(1-Math.exp(-dt*4));cam.updateProjectionMatrix();
  const dm=C.get('cam.dist')/100,hm=C.get('cam.height')/100;let target=new THREE.Vector3(),look=new THREE.Vector3();
  if(camMode===0||camMode===4){const back=(camMode===4?9.5:7.2)*dm,up=(camMode===4?1.7:2.5)*hm;target.set(V.x-fwd.x*back,V.y+up+(V.pitch*-3),V.z-fwd.z*back);look.set(V.x+fwd.x*(5+sp*.12),V.y+1.1,V.z+fwd.z*(5+sp*.12));
   if(camMode===4){const t=tAbs*.12;target.x+=Math.cos(t)*3;target.y+=Math.sin(t*1.3)*.6}
   if(!camInit){camPos.copy(target);camInit=true}const lag=1-Math.exp(-dt*(14-C.get('cam.lag')*.09));camPos.lerp(target,lag);cam.position.copy(camPos);cam.lookAt(look)}
  else{const l=[null,[0,.78,.9],[.35,.42,-.1],[0,-.2,2.5]][camMode];const p=new THREE.Vector3(l[0],l[1],l[2]).applyMatrix4(car.root.matrixWorld);cam.position.copy(p);const lk=new THREE.Vector3(l[0],l[1]-.02,l[2]+20).applyMatrix4(car.root.matrixWorld);cam.lookAt(lk);camInit=false}
  const sh=C.get('cam.shake')/100*clamp(sp/70,0,1)*(camMode===0?.025:.012);cam.position.x+=(Math.random()-.5)*sh;cam.position.y+=(Math.random()-.5)*sh;
  // keep camera above the ground
  const q=road.at(V.s),gy=road.ground(V.s,(cam.position.x-q.x)*q.nx+(cam.position.z-q.z)*q.nz);if(cam.position.y<gy+.5)cam.position.y=gy+.5};
 const updateHud=()=>{const k=kmh(),e=id=>document.getElementById(id);e('sp').textContent=Math.round(k);e('un').textContent=C.get('gp.units');e('gr').textContent=V.speed<-.5?'R':(Math.abs(V.speed)<.3?'N':V.gear);e('rpm').style.width=clamp((V.rpm-900)/6100*100,0,100)+'%';e('rpm').style.background=V.rpm>6200?'#ff5c5c':'';
  e('dist').textContent=(V.dist/1000).toFixed(2)+(C.get('gp.units')==='mph'?' mi':' km');const hh=cfg.time==='Live'?new Date():null;e('clk').textContent=tod.toUpperCase()+' · '+wx.toUpperCase();$('#spl').style.opacity=C.get('gfx.speed')?clamp((V.speed-34)/40,0,.55):0;
  // mini-map
  const m=e('mm').getContext('2d'),W=200;m.clearRect(0,0,W,W);m.save();m.beginPath();m.arc(100,100,98,0,6.283);m.fillStyle='rgba(10,6,20,.62)';m.fill();m.clip();m.translate(100,130);const sc=.42;m.strokeStyle='#ff4fc8';m.lineWidth=5;m.lineCap='round';m.beginPath();let first=true;
  for(let s=V.s-60;s<V.s+240;s+=8){if(s<0)continue;const p=road.at(s),dx=p.x-V.x,dz=p.z-V.z,rx=-(dx*Math.cos(V.yaw)-dz*Math.sin(V.yaw)),ry=-(dx*Math.sin(V.yaw)+dz*Math.cos(V.yaw));const X=rx*sc,Y=ry*sc;if(first){m.moveTo(X,Y);first=false}else m.lineTo(X,Y)}m.stroke();m.fillStyle='#fff';m.beginPath();m.moveTo(0,-9);m.lineTo(7,8);m.lineTo(-7,8);m.closePath();m.fill();m.restore()};
 // main loop
 let rainOn=WW.rain>0;if(rainOn){rain.visible=true;rain.material.opacity=(WW.rain>1?.55:.38)}else{rain.visible=false}
 let wetness=0; // accumulates while raining, dries when clear
 const WET_RATE=0.12, DRY_RATE=0.035; // ~8s to full wet, ~30s to dry
 const loop=now=>{if(stopped)return;requestAnimationFrame(loop);const cap=C.get('gfx.fps')==='Unlimited'?0:+C.get('gfx.fps');if(cap&&now-lastT<1000/cap-3)return;let dt=Math.min((now-lastT)/1000,.05);lastT=now;if(!paused){acc+=dt;tAbs+=dt;while(acc>1/90){step(1/90);acc-=1/90}place(dt);camera(dt);ensureChunks(false);
   // weather fx
   uTime.value=tAbs;if(skyMat.uniforms.uTime)skyMat.uniforms.uTime.value=tAbs;T.water.offset.x=tAbs*.012;T.water.offset.y=tAbs*.008;
   // wet road/car: soak in rain, dry in clear/sun
   if(rainOn){wetness=Math.min(1, wetness + WET_RATE * dt * (WW.rain>1?1.6:1));}
   else{const sunDry=(tod==='Noon'?1.4:tod==='Sunset'||tod==='Dawn'?1.0:0.55);wetness=Math.max(0, wetness - DRY_RATE * dt * sunDry);}
   uWet.value=wetness;
   // car body gets wet look (darker + glossier)
   if(car&&car.body&&car.body.material){
    const m=car.body.material;
    if(m.userData._dryRough==null){m.userData._dryRough=m.roughness;m.userData._dryMetal=m.metalness;m.userData._dryEnv=m.envMapIntensity||1}
    m.roughness=m.userData._dryRough*(1-wetness*0.85)+0.08*wetness;
    m.metalness=Math.min(1, (m.userData._dryMetal||0)+wetness*0.45);
    m.envMapIntensity=(m.userData._dryEnv||1)*(1+wetness*1.2);
   }

   if(rainOn){const p=rain.geometry.attributes.position,a=p.array,sp=(24+Math.abs(V.speed)*.4)*dt,wx0=-V.vx*dt,wz0=-V.vz*dt;for(let i=0;i<NR;i++){const o=i*6;a[o+1]-=sp;a[o+4]-=sp;a[o]+=wx0;a[o+3]+=wx0;a[o+2]+=wz0;a[o+5]+=wz0;if(a[o+1]<-4){const x=(Math.random()-.5)*60,y=26+Math.random()*6,z=(Math.random()-.5)*60;a[o]=a[o+3]=x;a[o+1]=y;a[o+4]=y-.7;a[o+2]=a[o+5]=z}}p.needsUpdate=true;rain.position.set(cam.position.x,cam.position.y-8,cam.position.z)}
   if(WW.rain>1){nextFlash-=dt;if(nextFlash<0){flash=1;nextFlash=5+Math.random()*9}flash=Math.max(0,flash-dt*4);skyMat.uniforms.uFlash.value=flash*.6;hemi.intensity=TD.hemi*WW.d+flash*1.2}
   sound.update(clamp((V.rpm-900)/6100,0,1),V.thr,Math.abs(V.speed),V.slip,Math.abs(V.d)<RW/2+.4,rainOn?WW.rain:0);updateHud()}
  OR.fsr.render(scene,cam,C.get('gfx.sharpen'))};
 OR.state={V,road,pause,toast};OR._cleanup=()=>{stopped=true;removeEventListener('keydown',kd);removeEventListener('keyup',ku);removeEventListener('deviceorientation',onTilt);removeEventListener('resize',onRs);sound.stop();chunks.forEach(g=>{g.traverse(o=>{if(o.geometry)o.geometry.dispose()})});OR.km=V.dist/1000};
 OR.step=(dt,noRender)=>{step(dt);place(dt);camera(dt);ensureChunks(true);if(!noRender){OR.fsr.render(scene,cam,C.get('gfx.sharpen'));updateHud()}};
 this.running=true;requestAnimationFrame(loop);toast(YV.cfg.get('ctl.steer')==='Tilt'?'Tilt your phone to steer':'Hold GAS to drive')};
OR.stop=function(save){if(!this.running)return;this.running=false;this._cleanup();const km=this.km||0,d=YV.store.data;if(save){const cr=Math.floor(km*30),rep=Math.floor(km/2);d.wallet.credits+=cr;d.wallet.rep+=rep;d.garage.cars.starter.km=(d.garage.cars.starter.km||0)+km;YV.store.touch('wallet');setTimeout(()=>YV.toast('Drive complete · '+km.toFixed(2)+' km · +'+YV.fmt(cr)+' credits','ok'),400)}
 document.body.classList.remove('driving');$('#drive').style.display='none';$('#drive').innerHTML='';try{YV.audio.music&&YV.cfg.get('aud.menuMusic')&&YV.audio.music.play()}catch(e){}YV.nav.close();YV.stage.layout('none')};
})();
