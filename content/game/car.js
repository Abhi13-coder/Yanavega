/* YANAVEGA – the starter car: wheels split from the body, paintable body panels (any colour, gloss/metallic/matte) */
(function(){'use strict';
const YV=window.YV,C=YV.car={loaded:false,uPaint:{value:new THREE.Color(1,.6,.1)},uFinR:{value:.2},uFinM:{value:.25},FIN:{Gloss:[.2,.25],Metallic:[.3,.85],Matte:[.78,.1]}};
const tex=async(p,srgb)=>{
  if(YV.ktx2&&YV.ktx2.loadTexture){
    try{return await YV.ktx2.loadTexture('/'+p,{srgb:!!srgb,aniso:8});}catch(e){console.warn('car ktx2',p,e)}
  }
  const tryPaths=[p];
  if(/\.ktx2$/i.test(p)) tryPaths.push(p.replace(/\.ktx2$/i,'.webp'));
  let lastErr;
  for(const path of tryPaths){
    try{
      const img=await YV.assets.image(path);
      const t=new THREE.Texture(img);t.flipY=false;
      if(srgb)t.encoding=THREE.sRGBEncoding;t.anisotropy=8;t.needsUpdate=true;return t;
    }catch(e){lastErr=e}
  }
  throw lastErr||new Error('car texture missing '+p);
};

C.load=async function(){
 if(this.loaded)return;const [buf,col,mr]=await Promise.all([YV.assets.buffer('cars/starter/car.glb'),tex('cars/starter/color.ktx2',true),tex('cars/starter/mr.ktx2',false)]);
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
 ['FL','FR','RL','RR'].forEach(k=>{const piv=new THREE.Group();piv.position.copy(this.pos['wheel_'+k]||new THREE.Vector3());const sp=new THREE.Mesh(this.geo['wheel_'+k]||this.geo.body,this.mat);piv.add(sp);inner.add(piv);wheels[k]={piv,sp}});
 // Chrome-ish glass/trim: high metalness low roughness overlay if window-like meshes exist
 const chrome=new THREE.MeshStandardMaterial({color:0x88aacc,metalness:.95,roughness:.08,envMapIntensity:2.2,transparent:true,opacity:.35});
 Object.keys(this.geo).forEach(name=>{
  if(/window|glass|chrome|trim|mirror/i.test(name)&&name!=='body'){
   const m=new THREE.Mesh(this.geo[name],chrome);inner.add(m);
  }
 });
 // Tail light emissive quads (simple lowpoly glow, bloom picks these up via high emissive)
 const tlMat=new THREE.MeshBasicMaterial({color:0xff2200,transparent:true,opacity:.9});
 const tlGeo=new THREE.PlaneGeometry(.18,.1);
 const tlL=new THREE.Mesh(tlGeo,tlMat),tlR=new THREE.Mesh(tlGeo,tlMat.clone());
 tlL.position.set(-.55,.45,-1.85);tlR.position.set(.55,.45,-1.85);tlL.rotation.y=Math.PI;tlR.rotation.y=Math.PI;
 inner.add(tlL,tlR);
 // headlight points (night)
 const hlMat=new THREE.MeshBasicMaterial({color:0xfff0d0});
 const hlGeo=new THREE.SphereGeometry(.06,6,4);
 const hlL=new THREE.Mesh(hlGeo,hlMat),hlR=new THREE.Mesh(hlGeo,hlMat.clone());
 hlL.position.set(-.5,.4,1.75);hlR.position.set(.5,.4,1.75);inner.add(hlL,hlR);
 return {root,inner,body,wheels,scale,tailL:tlL,tailR:tlR,headL:hlL,headR:hlR}};
})();
