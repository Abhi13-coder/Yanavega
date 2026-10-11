/* YANAVEGA – the starter car: wheels split from the body, paintable body panels (any colour, gloss/metallic/matte) */
(function(){'use strict';
const YV=window.YV,C=YV.car={loaded:false,uPaint:{value:new THREE.Color(1,.6,.1)},uFinR:{value:.2},uFinM:{value:.25},FIN:{Gloss:[.2,.25],Metallic:[.3,.85],Matte:[.78,.1]}};
const tex=async(p,srgb)=>{const img=await YV.assets.image(p),t=new THREE.Texture(img);t.flipY=false;if(srgb)t.encoding=THREE.sRGBEncoding;t.anisotropy=8;t.needsUpdate=true;return t};
C.load=async function(){
 if(this.loaded)return;const [buf,col,mr]=await Promise.all([YV.assets.buffer('cars/starter/car.glb'),tex('cars/starter/color.webp',true),tex('cars/starter/mr.webp',false)]);
 const g=await new Promise((ok,no)=>new THREE.GLTFLoader().parse(buf,'',ok,no));this.geo={};this.pos={};g.scene.traverse(o=>{if(o.isMesh){this.geo[o.name]=o.geometry;this.pos[o.name]=o.position.clone()}});
 const m=this.mat=new THREE.MeshStandardMaterial({map:col,metalnessMap:mr,roughnessMap:mr,metalness:1,roughness:1});
 m.onBeforeCompile=s=>{s.uniforms.uPaint=C.uPaint;s.uniforms.uFinR=C.uFinR;s.uniforms.uFinM=C.uFinM;
  s.fragmentShader='uniform vec3 uPaint;uniform float uFinR;uniform float uFinM;float gPM;\n'+s.fragmentShader
   .replace('#include <map_fragment>','#include <map_fragment>\n float lum=dot(diffuseColor.rgb,vec3(.299,.587,.114));gPM=smoothstep(.03,.075,lum);diffuseColor.rgb=mix(diffuseColor.rgb,uPaint*clamp(lum*2.4+.10,0.,1.5),gPM);')
   .replace('#include <roughnessmap_fragment>','#include <roughnessmap_fragment>\n roughnessFactor=mix(roughnessFactor,uFinR,gPM);')
   .replace('#include <metalnessmap_fragment>','#include <metalnessmap_fragment>\n metalnessFactor=mix(metalnessFactor,uFinM,gPM);')};
 this.loaded=true;const st=YV.store.data.garage.cars.starter;this.setPaint(st.paint);this.setFinish(st.finish||'Gloss')};
C.setPaint=function(hex){this.uPaint.value.set(hex).convertSRGBToLinear()};
C.setFinish=function(n){const f=this.FIN[n]||this.FIN.Gloss;this.uFinR.value=f[0];this.uFinM.value=f[1]};
C.create=function(scale){
 const root=new THREE.Group(),inner=new THREE.Group();inner.scale.setScalar(scale);root.add(inner);
 const body=new THREE.Mesh(this.geo.body,this.mat);inner.add(body);const wheels={};
 ['FL','FR','RL','RR'].forEach(k=>{const piv=new THREE.Group();piv.position.copy(this.pos['wheel_'+k]);const sp=new THREE.Mesh(this.geo['wheel_'+k],this.mat);piv.add(sp);inner.add(piv);wheels[k]={piv,sp}});
 return {root,inner,body,wheels,scale}};
})();
