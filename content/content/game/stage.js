/* YANAVEGA lobby – 3D showroom stage (garage car preview) */
(function(){'use strict';
const YV=window.YV,S=YV.stage={cur:null,last:0,fps:0,frames:0,fpsT:0,yaw:-.6,yawV:0,t:0,paused:false};
const LAY={none:{xf:0,y:0,d:2.1,vis:0},car:{xf:-.28,y:-.26,d:2.15,vis:1}};let lay={...LAY.none},tgt={...LAY.none};
S.init=function(canvas){
 const r=this.r=new THREE.WebGLRenderer({canvas,antialias:true,alpha:true,powerPreference:'high-performance'});r.outputEncoding=THREE.sRGBEncoding;r.toneMapping=THREE.ACESFilmicToneMapping;r.setClearColor(0x000000,0);
 this.scene=new THREE.Scene();this.cam=new THREE.PerspectiveCamera(30,2,.05,40);
 const key=new THREE.DirectionalLight(0xfff0f8,1.6);key.position.set(1.6,2.4,2.2);const rimA=new THREE.DirectionalLight(0x6c93ff,1.2);rimA.position.set(-2.2,1.2,-2);const rimB=new THREE.DirectionalLight(0xff4fc8,.9);rimB.position.set(2.2,.6,-2);
 this.scene.add(key,rimA,rimB,new THREE.HemisphereLight(0xffffff,0x6a5a90,.5));this.pivot=new THREE.Group();this.scene.add(this.pivot);
 const c=document.createElement('canvas');c.width=c.height=256;const g=c.getContext('2d'),gr=g.createRadialGradient(128,128,4,128,128,128);gr.addColorStop(0,'rgba(255,90,210,.8)');gr.addColorStop(.4,'rgba(150,110,255,.32)');gr.addColorStop(1,'rgba(92,139,255,0)');g.fillStyle=gr;g.fillRect(0,0,256,256);
 this.glow=new THREE.Mesh(new THREE.CircleGeometry(.95,48),new THREE.MeshBasicMaterial({map:new THREE.CanvasTexture(c),transparent:true,blending:THREE.AdditiveBlending,depthWrite:false}));this.glow.rotation.x=-Math.PI/2;this.glow.position.y=.004;this.pivot.add(this.glow);
 const resize=()=>{r.setSize(innerWidth,innerHeight,false);this.cam.aspect=innerWidth/innerHeight;this.cam.updateProjectionMatrix()};addEventListener('resize',resize);this.resize=resize;
 let down=null;canvas.addEventListener('pointerdown',e=>{down={x:e.clientX};canvas.setPointerCapture(e.pointerId)});canvas.addEventListener('pointermove',e=>{if(!down)return;const dx=e.clientX-down.x;down.x=e.clientX;S.yawV=dx*.012;S.yaw+=dx*.012});canvas.addEventListener('pointerup',()=>{down=null});
 this.applyGfx();requestAnimationFrame(t=>{this.last=t;this.loop(t)})};
S.applyGfx=function(){const c=YV.cfg;if(!this.r)return;this.r.setPixelRatio(Math.min(window.devicePixelRatio||1,2.5)*Math.min(c.get('gfx.resScale'),100)/100);this.resize();const cap=c.get('gfx.fps');this.cap=cap==='Unlimited'?0:+cap};
S.layout=function(n){tgt={...(LAY[n]||LAY.none)};this.pivot.visible=true};
S.setModel=function(o){if(this.cur)this.pivot.remove(this.cur);this.cur=o;if(o)this.pivot.add(o)};
S.ensureEnv=async function(){if(this.envDone)return;this.envDone=true;try{const img=await YV.assets.image('world/sky.webp'),t=new THREE.Texture(img);t.mapping=THREE.EquirectangularReflectionMapping;t.encoding=THREE.sRGBEncoding;t.needsUpdate=true;const pm=new THREE.PMREMGenerator(this.r);this.scene.environment=pm.fromEquirectangular(t).texture;pm.dispose()}catch(e){console.warn('env',e)}};
S.loop=function(t){requestAnimationFrame(S.loop);if(document.hidden||document.body.classList.contains('driving'))return;if(S.cap&&t-S.last<1000/S.cap-3)return;const dt=Math.min((t-S.last)/1000||.016,.05);S.last=t;S.t+=dt;
 S.frames++;S.fpsT+=dt;if(S.fpsT>=.5){S.fps=Math.round(S.frames/S.fpsT);S.frames=0;S.fpsT=0;YV.emit('fps',S.fps)}
 const k=1-Math.exp(-dt*6);for(const q of['xf','y','d','vis'])lay[q]+=(tgt[q]-lay[q])*k;if(lay.vis<.02){S.pivot.visible=false;return}
 const cam=S.cam,halfW=Math.tan(cam.fov*Math.PI/360)*lay.d*cam.aspect;S.pivot.position.x=lay.xf*halfW;S.pivot.scale.setScalar(Math.max(.001,lay.vis));S.pivot.visible=true;
 S.yaw+=S.yawV;S.yawV*=.92;if(!document.body.classList.contains('rm')&&Math.abs(S.yawV)<.001)S.yaw+=dt*.12;S.pivot.rotation.y=S.yaw;
 cam.position.set(0,.5+lay.y+.1,lay.d);cam.lookAt(0,.43+lay.y,0);S.r.render(S.scene,cam)};
})();
