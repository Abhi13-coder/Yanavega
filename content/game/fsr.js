/* FSR-style upscaling: render at a lower internal resolution, EASU-style edge-preserving upscale (Catmull-Rom 5-tap), then RCAS contrast-adaptive sharpening. */
(function(){'use strict';
const YV=window.YV;
const VS='varying vec2 vUv;void main(){vUv=uv;gl_Position=vec4(position.xy,0.,1.);}';
const EASU='precision highp float;uniform sampler2D tSrc;uniform vec2 srcSize;varying vec2 vUv;vec3 T(vec2 p){return texture2D(tSrc,p).rgb;}void main(){vec2 pos=vUv*srcSize;vec2 c=floor(pos-.5)+.5;vec2 f=pos-c;vec2 w0=f*(-.5+f*(1.-.5*f));vec2 w1=1.+f*f*(-2.5+1.5*f);vec2 w2=f*(.5+f*(2.-1.5*f));vec2 w3=f*f*(-.5+.5*f);vec2 w12=w1+w2;vec2 t12=w2/w12;vec2 p0=(c-1.)/srcSize;vec2 p3=(c+2.)/srcSize;vec2 p12=(c+t12)/srcSize;'+
 'vec3 col=T(vec2(p12.x,p0.y))*(w12.x*w0.y)+T(vec2(p0.x,p12.y))*(w0.x*w12.y)+T(p12)*(w12.x*w12.y)+T(vec2(p3.x,p12.y))*(w3.x*w12.y)+T(vec2(p12.x,p3.y))*(w12.x*w3.y);float ws=(w12.x*w0.y)+(w0.x*w12.y)+(w12.x*w12.y)+(w3.x*w12.y)+(w12.x*w3.y);'+
 'vec3 mn=min(min(T(p12),T(vec2(p0.x,p12.y))),min(T(vec2(p3.x,p12.y)),min(T(vec2(p12.x,p0.y)),T(vec2(p12.x,p3.y)))));vec3 mx=max(max(T(p12),T(vec2(p0.x,p12.y))),max(T(vec2(p3.x,p12.y)),max(T(vec2(p12.x,p0.y)),T(vec2(p12.x,p3.y)))));gl_FragColor=vec4(clamp(col/ws,mn,mx),1.);}';
const RCAS='precision highp float;uniform sampler2D tSrc;uniform vec2 px;uniform float att;varying vec2 vUv;void main(){vec3 e=texture2D(tSrc,vUv).rgb;vec3 b=texture2D(tSrc,vUv+vec2(0.,-px.y)).rgb;vec3 d=texture2D(tSrc,vUv+vec2(-px.x,0.)).rgb;vec3 f=texture2D(tSrc,vUv+vec2(px.x,0.)).rgb;vec3 h=texture2D(tSrc,vUv+vec2(0.,px.y)).rgb;'+
 'vec3 mn=min(min(b,d),min(f,h));vec3 mx=max(max(b,d),max(f,h));vec3 hitMin=mn/(4.*mx+1e-5);vec3 hitMax=(1.-mx)/(4.*mn-4.-1e-5);vec3 lobeRGB=max(-hitMin,hitMax);float lobe=max(-.1875,min(max(lobeRGB.r,max(lobeRGB.g,lobeRGB.b)),0.))*att;gl_FragColor=vec4((lobe*(b+d+f+h)+e)/(4.*lobe+1.),1.);}';
YV.FSR=function(renderer){this.r=renderer;this.scene=new THREE.Scene();this.cam=new THREE.OrthographicCamera(-1,1,1,-1,0,1);this.mesh=new THREE.Mesh(new THREE.PlaneBufferGeometry(2,2),null);this.mesh.frustumCulled=false;this.scene.add(this.mesh);
 this.easu=new THREE.ShaderMaterial({vertexShader:VS,fragmentShader:EASU,uniforms:{tSrc:{value:null},srcSize:{value:new THREE.Vector2(1,1)}},depthTest:false,depthWrite:false});
 this.rcas=new THREE.ShaderMaterial({vertexShader:VS,fragmentShader:RCAS,uniforms:{tSrc:{value:null},px:{value:new THREE.Vector2(1,1)},att:{value:1}},depthTest:false,depthWrite:false});this.w=0;this.h=0;this.scale=0};
YV.FSR.prototype.size=function(w,h,scale){if(this.w===w&&this.h===h&&this.scale===scale)return;this.w=w;this.h=h;this.scale=scale;['lo','mid'].forEach(k=>{if(this[k])this[k].dispose()});
 const lw=Math.max(64,Math.round(w*scale)),lh=Math.max(64,Math.round(h*scale)),o={minFilter:THREE.LinearFilter,magFilter:THREE.LinearFilter,format:THREE.RGBAFormat};
 this.lo=(this.r.capabilities.isWebGL2&&THREE.WebGLMultisampleRenderTarget)?new THREE.WebGLMultisampleRenderTarget(lw,lh,o):new THREE.WebGLRenderTarget(lw,lh,o);this.lo.texture.encoding=THREE.sRGBEncoding;this.lo.samples=4;
 this.mid=new THREE.WebGLRenderTarget(w,h,o);this.mid.texture.encoding=THREE.sRGBEncoding;this.lw=lw;this.lh=lh};
/* sharp: 0..100 (%). upscale when scale < 1; RCAS always when sharp > 0 */
YV.FSR.prototype.render=function(scene,camera,sharp){const r=this.r;r.setRenderTarget(this.lo);r.clear();r.render(scene,camera);let src=this.lo.texture;
 if(this.scale<0.999||this.scale>1.001){this.easu.uniforms.tSrc.value=src;this.easu.uniforms.srcSize.value.set(this.lw,this.lh);this.mesh.material=this.easu;r.setRenderTarget(this.mid);r.render(this.scene,this.cam);src=this.mid.texture}
 this.rcas.uniforms.tSrc.value=src;this.rcas.uniforms.px.value.set(1/this.w,1/this.h);this.rcas.uniforms.att.value=Math.pow(2,-(2-2*sharp/100))*(sharp>0?1:0);this.mesh.material=this.rcas;r.setRenderTarget(null);r.render(this.scene,this.cam)};
})();
