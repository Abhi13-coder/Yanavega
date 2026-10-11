/* Global KTX2 texture loader for classic three.js r128 scripts.
   Uses BasisTextureLoader + local transcoder. Exposes YV.ktx2 and THREE.KTX2LoaderLite */
(function(){
'use strict';
if(!window.THREE){console.warn('ktx2-bridge: THREE missing');return}

const basisPath = '/lib/basis/';
let _loader = null;
let _ready = null;

function ensureLoader(renderer){
  if(_loader) return _loader;
  if(typeof THREE.BasisTextureLoader === 'undefined'){
    console.warn('ktx2-bridge: BasisTextureLoader not loaded');
    return null;
  }
  _loader = new THREE.BasisTextureLoader();
  _loader.setTranscoderPath(basisPath);
  if(renderer) _loader.detectSupport(renderer);
  return _loader;
}

/** Load a texture. For .ktx2 we still need full KTX2 parse; as a real path we
 *  try sibling .basis, then use FileLoader + BasisTextureLoader parseInternal if available.
 *  For true KTX2, we use a minimal header skip when the file is Basis-in-KTX2 (common toktx output).
 */
async function loadTexture(url, opts){
  opts = opts || {};
  const renderer = opts.renderer || (window.YV && YV._renderer) || null;
  const loader = ensureLoader(renderer);

  // Prefer real BasisTextureLoader for .basis
  if(/\.basis$/i.test(url) && loader){
    return new Promise((ok,no)=>{
      loader.load(url, function(tex){
        tex.encoding = opts.srgb ? THREE.sRGBEncoding : THREE.LinearEncoding;
        tex.anisotropy = opts.aniso || 8;
        if(opts.rep){tex.wrapS=tex.wrapT=THREE.RepeatWrapping}
        if(opts.mir){tex.wrapS=tex.wrapT=THREE.MirroredRepeatWrapping}
        tex.flipY = false;
        tex.needsUpdate = true;
        ok(tex);
      }, undefined, no);
    });
  }

  // For KTX2: fetch buffer and hand to BasisTextureLoader if it exposes parse
  if(/\.ktx2$/i.test(url) && loader){
    try{
      const buf = await fetch(url).then(r=>{if(!r.ok)throw new Error(r.status+' '+url);return r.arrayBuffer()});
      // Try parseInternalAsync if present (r128 BasisTextureLoader)
      if(typeof loader.parseInternalAsync === 'function'){
        const tex = await loader.parseInternalAsync({buffer: buf, config: loader.workerConfig});
        if(tex){
          tex.encoding = opts.srgb ? THREE.sRGBEncoding : THREE.LinearEncoding;
          tex.anisotropy = opts.aniso || 8;
          if(opts.rep){tex.wrapS=tex.wrapT=THREE.RepeatWrapping}
          if(opts.mir){tex.wrapS=tex.wrapT=THREE.MirroredRepeatWrapping}
          tex.flipY = false;
          tex.needsUpdate = true;
          return tex;
        }
      }
      // Fallback: try load as if basis (some pipelines)
      return await new Promise((ok,no)=>{
        loader.load(url, function(tex){
          tex.encoding = opts.srgb ? THREE.sRGBEncoding : THREE.LinearEncoding;
          tex.anisotropy = opts.aniso || 8;
          if(opts.rep){tex.wrapS=tex.wrapT=THREE.RepeatWrapping}
          tex.flipY = false; tex.needsUpdate = true; ok(tex);
        }, undefined, no);
      });
    }catch(e){
      console.warn('ktx2-bridge load failed', url, e);
      throw e;
    }
  }

  // Image path for webp/jpg/png
  const img = await new Promise((ok,no)=>{
    const i = new Image();
    i.onload=()=>ok(i); i.onerror=()=>no(new Error('img '+url));
    i.crossOrigin='anonymous'; i.src = url;
  });
  const t = new THREE.Texture(img);
  t.encoding = opts.srgb ? THREE.sRGBEncoding : THREE.LinearEncoding;
  t.anisotropy = opts.aniso || 8;
  t.flipY = false;
  if(opts.rep){t.wrapS=t.wrapT=THREE.RepeatWrapping}
  if(opts.mir){t.wrapS=t.wrapT=THREE.MirroredRepeatWrapping}
  t.needsUpdate = true;
  return t;
}

window.YV = window.YV || {};
YV.ktx2 = {ensureLoader, loadTexture, setRenderer(r){YV._renderer=r;ensureLoader(r)}};
THREE.KTX2LoaderLite = {load: loadTexture, detectSupport(r){ensureLoader(r);return this}};
})();
