/* YANAVEGA lobby – 3D character stage (three.js, toon shaded, rigged GLB + jiggle physics) */
(function(){'use strict';
const YV=window.YV,S=YV.stage={models:{},body:null,cur:null,last:0,fps:0,frames:0,fpsT:0,yaw:0,yawV:0,t:0};
const LAY={home:{xf:-.52,y:0,d:2.62,vis:1},chars:{xf:-.08,y:.02,d:2.5,vis:1},wardrobe:{xf:-.2,y:.1,d:2.1,vis:1},none:{xf:0,y:0,d:2.6,vis:0}};
let lay={...LAY.home,vis:1},tgt={...LAY.home},tmpV=new THREE.Vector3(),dV=new THREE.Vector3();
S.init=function(canvas){
 const r=this.r=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});r.outputEncoding=THREE.sRGBEncoding;r.setClearColor(0x000000,0);
 this.scene=new THREE.Scene();this.cam=new THREE.PerspectiveCamera(30,2,.05,40);
 const key=new THREE.DirectionalLight(0xfff0f8,.95);key.position.set(1.6,2.4,2.2);
 this.rimA=new THREE.DirectionalLight(0x6c93ff,.95);this.rimA.position.set(-2.2,1.2,-2);this.rimB=new THREE.DirectionalLight(0xff4fc8,.7);this.rimB.position.set(2.2,.6,-2);
 this.scene.add(key,this.rimA,this.rimB,new THREE.HemisphereLight(0xffffff,0x6a5a90,.42));
 this.pivot=new THREE.Group();this.scene.add(this.pivot);
 const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d'),gr=g.createRadialGradient(128,128,4,128,128,128);gr.addColorStop(0,'rgba(255,90,210,.85)');gr.addColorStop(.35,'rgba(150,110,255,.38)');gr.addColorStop(1,'rgba(92,139,255,0)');g.fillStyle=gr;g.fillRect(0,0,256,256);
 this.glow=new THREE.Mesh(new THREE.CircleGeometry(.85,48),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));this.glow.rotation.x=-Math.PI/2;this.glow.position.y=.005;this.pivot.add(this.glow);
 this.uT={value:.0032};this.setSteps(4);
 const resize=()=>{r.setSize(innerWidth,innerHeight,false);this.cam.aspect=innerWidth/innerHeight;this.cam.updateProjectionMatrix()};addEventListener('resize',resize);this.resize=resize;
 let down=null,moved=0;
 canvas.addEventListener('pointerdown',e=>{down={x:e.clientX};moved=0;canvas.setPointerCapture(e.pointerId)});
 canvas.addEventListener('pointermove',e=>{if(!down)return;const dx=e.clientX-down.x;down.x=e.clientX;moved+=Math.abs(dx);S.yawV=dx*.012;S.yaw+=dx*.012});
 canvas.addEventListener('pointerup',()=>{if(down&&moved<8)S.poke();down=null});
 this.applyGfx();requestAnimationFrame(t=>{this.last=t;this.loop(t)});
};
S.setSteps=function(n){const a=new Uint8Array(n);for(let i=0;i<n;i++)a[i]=Math.round(70+185*i/(n-1));const t=new THREE.DataTexture(a,n,1,THREE.LuminanceFormat);t.minFilter=t.magFilter=THREE.NearestFilter;t.needsUpdate=true;this.grad=t;
 Object.values(this.models).forEach(m=>{m.toon.gradientMap=t;m.toon.needsUpdate=true})};
S.applyGfx=function(){const c=YV.cfg;if(!this.r)return;this.r.setPixelRatio(Math.min(window.devicePixelRatio||1,2.5)*c.get('gfx.resScale')/100);this.resize();
 this.uT.value=.0032*c.get('gfx.outlineW');Object.values(this.models).forEach(m=>{m.out.visible=!!c.get('gfx.outline')});
 const steps=+c.get('gfx.toonSteps');if(this.grad.image.width!==steps)this.setSteps(steps);
 const rim=c.get('gfx.rim')?1:0;this.rimA.intensity=.95*rim;this.rimB.intensity=.7*rim;
 const cap=c.get('gfx.fps');this.cap=cap==='Unlimited'?0:+cap};
S.setSkin=function(v){this.skin=v;Object.values(this.models).forEach(m=>m.toon.color.setRGB(v,v*.94,v*.9))};
S.load=async function(body){
 if(this.models[body])return this.models[body];const k=body==='F'?'female':'male';
 const [buf,img]=await Promise.all([YV.assets.buffer('characters/'+k+'/body.glb'),YV.assets.image('characters/'+k+'/skin.webp')]);
 const tex=new THREE.Texture(img);tex.flipY=false;tex.encoding=THREE.sRGBEncoding;tex.anisotropy=8;tex.needsUpdate=true;
 const gltf=await new Promise((ok,no)=>new THREE.GLTFLoader().parse(buf,'',ok,no));
 const root=gltf.scene;root.position.y=.5;let sm;root.traverse(o=>{if(o.isSkinnedMesh)sm=o});sm.frustumCulled=false;
 const toon=new THREE.MeshToonMaterial({map:tex,gradientMap:this.grad,skinning:true});sm.material=toon;
 const om=new THREE.MeshBasicMaterial({color:0x1b1226,side:THREE.BackSide,skinning:true});const uT=this.uT;
 om.onBeforeCompile=s=>{s.uniforms.uThick=uT;s.vertexShader='uniform float uThick;\n'+s.vertexShader.replace('#include <begin_vertex>','#include <begin_vertex>\ntransformed += normalize(normal)*uThick;')};
 const out=new THREE.SkinnedMesh(sm.geometry,om);out.bind(sm.skeleton,sm.bindMatrix);out.frustumCulled=false;sm.parent.add(out);
 const jig=[];root.traverse(o=>{if(o.isBone&&o.name.indexOf('jig_')===0)jig.push({b:o,rest:o.position.clone(),x:null,v:new THREE.Vector3(),p:YV.stage.bp(o.name)})});
 const m={root,toon,out,jig,mixer:new THREE.AnimationMixer(root),clips:gltf.animations,act:null,body,sm};this.models[body]=m;
 toon.color.setRGB(this.skin||.96,(this.skin||.96)*.94,(this.skin||.96)*.9);out.visible=!!YV.cfg.get('gfx.outline');return m};
S.bp=function(n){if(n.indexOf('up_')>0||n.indexOf('up')>0&&n.indexOf('breastup')>=0||n.indexOf('buttup')>=0)return[1.15,1];if(n.indexOf('low')>0)return[.85,1.1];if(n.indexOf('thigh')>0)return[1.4,.6];if(n.indexOf('belly')>0)return[1.3,.55];return[1,1]};
S.setBody=async function(body){let m;try{m=await this.load(body)}catch(e){YV.toast('That body model is not included in this build');return}if(this.cur&&this.cur!==m)this.pivot.remove(this.cur.root);this.cur=m;this.body=body;this.pivot.add(m.root);this.play('idle',0);return m};
S.play=function(name,fade){const m=this.cur;if(!m)return;const cl=m.clips.find(c=>c.name===name);if(!cl)return;const a=m.mixer.clipAction(cl);if(m.act&&m.act!==a)m.act.fadeOut(fade==null?.3:fade);a.reset().fadeIn(fade==null?.3:fade).play();m.act=a;m.name=name};
S.clipNames=function(){return this.cur?this.cur.clips.map(c=>c.name):[]};
S.poke=function(){const m=this.cur;if(!m)return;const n=m.clips.some(c=>c.name==='wave')?'wave':'dance';this.play(n);YV.audio.play('hover');clearTimeout(this._pk);this._pk=setTimeout(()=>this.play('idle'),(m.clips.find(c=>c.name===n).duration||2)*1000)};
S.layout=function(n){tgt={...(LAY[n]||LAY.home)};this.pivot.visible=true};
S.physics=function(m,dt){const lvl=YV.cfg.get('gfx.physics'),g0={Off:0,Low:2.2,Medium:3.6,High:7}[lvl]||0,g=g0*YV.cfg.get('gfx.physStr')/50,K={Low:330,Medium:250,High:170}[lvl]||250,CD={Low:11,Medium:8,High:5.5}[lvl]||8;
 if(!m.jig.length)return;m.root.updateMatrixWorld(true);
 for(const j of m.jig){const p=j.b.parent;if(g<=0){j.b.position.copy(j.rest);j.b.scale.set(1,1,1);j.x=null;continue}
  const t=p.localToWorld(tmpV.copy(j.rest));if(!j.x){j.x=t.clone();j.v.set(0,0,0)}
  const k=K*j.p[0],cd=CD*Math.sqrt(j.p[0]),steps=Math.max(1,Math.ceil(dt/.006)),h=dt/steps;
  for(let i=0;i<steps;i++){dV.copy(t).sub(j.x).multiplyScalar(k).addScaledVector(j.v,-cd);j.v.addScaledVector(dV,h);j.x.addScaledVector(j.v,h)}
  dV.copy(j.x).sub(t);const mm=dV.length();if(mm>.06){dV.multiplyScalar(.06/mm);j.x.copy(t).add(dV)}
  dV.copy(j.x).sub(t);dV.y*=1.25;dV.multiplyScalar(g*j.p[1]/5);{const L=dV.length(),mf=(.006+.0026*g)*j.p[1];if(L>1e-6)dV.multiplyScalar(mf*Math.tanh(L/mf)/L)}
  const sq=Math.max(.88,Math.min(1.12,1+dV.y*3));j.b.scale.set(1-(sq-1)*.5,sq,1-(sq-1)*.5);j.b.position.copy(p.worldToLocal(t.clone().add(dV)))}};
S.loop=function(t){requestAnimationFrame(S.loop);if(document.hidden)return;if(S.cap&&t-S.last<1000/S.cap-3)return;const dt=Math.min((t-S.last)/1000||.016,.05);S.last=t;S.t+=dt;
 S.frames++;S.fpsT+=dt;if(S.fpsT>=.5){S.fps=Math.round(S.frames/S.fpsT);S.frames=0;S.fpsT=0;YV.emit('fps',S.fps)}
 const k=1-Math.exp(-dt*6);for(const q of['xf','y','d','vis'])lay[q]+=(tgt[q]-lay[q])*k;
 const cam=S.cam,halfW=Math.tan(cam.fov*Math.PI/360)*lay.d*cam.aspect;
 S.pivot.position.x=lay.xf*halfW;S.pivot.scale.setScalar(Math.max(.001,lay.vis));S.pivot.visible=lay.vis>.02;
 S.yaw+=S.yawV;S.yawV*=.9;const rm=document.body.classList.contains('rm');S.pivot.rotation.y=S.yaw+(rm?0:Math.sin(S.t*.5)*.05);
 cam.position.set(0,.5+lay.y+.1,lay.d);cam.lookAt(0,.43+lay.y,0);
 if(S.cur&&lay.vis>.02){S.cur.mixer.update(dt);S.physics(S.cur,dt)}
 S.r.render(S.scene,cam)};
})();
