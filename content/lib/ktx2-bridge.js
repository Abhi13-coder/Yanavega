/* YANAVEGA real KTX2 loader – classic scripts, three r128 compatible.
   Uses Basis Universal transcoder (KTX2File) in a worker. No WebP fallback. */
(function () {
'use strict';
if (!window.THREE) { console.error('ktx2-bridge: THREE missing'); return; }

var BASIS_PATH = '/lib/basis/';

var EngineFormat = {
  RGBAFormat: THREE.RGBAFormat,
  RGBA_ASTC_4x4_Format: THREE.RGBA_ASTC_4x4_Format,
  RGBA_BPTC_Format: THREE.RGBA_BPTC_Format,
  RGBA_ETC2_EAC_Format: THREE.RGBA_ETC2_EAC_Format,
  RGBA_PVRTC_4BPPV1_Format: THREE.RGBA_PVRTC_4BPPV1_Format,
  RGBA_S3TC_DXT5_Format: THREE.RGBA_S3TC_DXT5_Format,
  RGB_ETC1_Format: THREE.RGB_ETC1_Format,
  RGB_ETC2_Format: THREE.RGB_ETC2_Format,
  RGB_PVRTC_4BPPV1_Format: THREE.RGB_PVRTC_4BPPV1_Format,
  RGB_S3TC_DXT1_Format: THREE.RGB_S3TC_DXT1_Format
};

var TranscoderFormat = {
  ETC1: 0, ETC2: 1, BC1: 2, BC3: 3, BC4: 4, BC5: 5,
  BC7_M6_OPAQUE_ONLY: 6, BC7_M5: 7,
  PVRTC1_4_RGB: 8, PVRTC1_4_RGBA: 9, ASTC_4x4: 10,
  ATC_RGB: 11, ATC_RGBA_INTERPOLATED_ALPHA: 12,
  RGBA32: 13, RGB565: 14, BGR565: 15, RGBA4444: 16
};

var BasisFormat = { ETC1S: 0, UASTC_4x4: 1 };

var workerConfig = null;
var workerSourceURL = null;
var transcoderBinary = null;
var transcoderPending = null;
var worker = null;
var taskId = 1;
var callbacks = {};

function detectSupport(renderer) {
  if (!renderer || !renderer.extensions) {
    // Create temp canvas GL context for capability probe
    try {
      var c = document.createElement('canvas');
      var gl = c.getContext('webgl2') || c.getContext('webgl');
      if (gl) {
        workerConfig = {
          astcSupported: !!gl.getExtension('WEBGL_compressed_texture_astc'),
          etc1Supported: !!gl.getExtension('WEBGL_compressed_texture_etc1'),
          etc2Supported: !!gl.getExtension('WEBGL_compressed_texture_etc'),
          dxtSupported: !!gl.getExtension('WEBGL_compressed_texture_s3tc'),
          bptcSupported: !!gl.getExtension('EXT_texture_compression_bptc'),
          pvrtcSupported: !!(gl.getExtension('WEBGL_compressed_texture_pvrtc') || gl.getExtension('WEBKIT_WEBGL_compressed_texture_pvrtc'))
        };
      }
    } catch (e) {}
  } else {
    workerConfig = {
      astcSupported: renderer.extensions.has('WEBGL_compressed_texture_astc'),
      etc1Supported: renderer.extensions.has('WEBGL_compressed_texture_etc1'),
      etc2Supported: renderer.extensions.has('WEBGL_compressed_texture_etc'),
      dxtSupported: renderer.extensions.has('WEBGL_compressed_texture_s3tc'),
      bptcSupported: renderer.extensions.has('EXT_texture_compression_bptc'),
      pvrtcSupported: renderer.extensions.has('WEBGL_compressed_texture_pvrtc') || renderer.extensions.has('WEBKIT_WEBGL_compressed_texture_pvrtc')
    };
  }
  if (!workerConfig) {
    workerConfig = { astcSupported: true, etc1Supported: true, etc2Supported: true, dxtSupported: true, bptcSupported: false, pvrtcSupported: false };
  }
  return workerConfig;
}

function initTranscoder() {
  if (transcoderPending) return transcoderPending;
  detectSupport(window.YV && YV._renderer);

  transcoderPending = Promise.all([
    fetch(BASIS_PATH + 'basis_transcoder.js').then(function (r) { if (!r.ok) throw new Error('basis js ' + r.status); return r.text(); }),
    fetch(BASIS_PATH + 'basis_transcoder.wasm').then(function (r) { if (!r.ok) throw new Error('basis wasm ' + r.status); return r.arrayBuffer(); })
  ]).then(function (pair) {
    var jsContent = pair[0];
    var binaryContent = pair[1];
    transcoderBinary = binaryContent;

    // Worker source: constants + basis js + worker body
    var workerBody = [
      'let _EngineFormat = ' + JSON.stringify(EngineFormat) + ';',
      'let _TranscoderFormat = ' + JSON.stringify(TranscoderFormat) + ';',
      'let _BasisFormat = ' + JSON.stringify(BasisFormat) + ';',
      jsContent,
      '(',
      BasisWorker.toString(),
      ')();'
    ].join('\n');

    workerSourceURL = URL.createObjectURL(new Blob([workerBody], { type: 'application/javascript' }));
    worker = new Worker(workerSourceURL);
    worker.onmessage = function (e) {
      var msg = e.data;
      var cb = callbacks[msg.id];
      if (!cb) return;
      delete callbacks[msg.id];
      if (msg.type === 'error' || msg.error) cb.reject(new Error(msg.error || 'ktx2 transcode failed'));
      else cb.resolve(msg);
    };
    worker.onerror = function (e) {
      console.error('ktx2 worker error', e);
    };

    // init worker with wasm
    var wasmCopy = binaryContent.slice(0);
    worker.postMessage({ type: 'init', config: workerConfig, transcoderBinary: wasmCopy }, [wasmCopy]);
  });
  return transcoderPending;
}

function BasisWorker() {
  var config;
  var transcoderPending;
  var BasisModule;
  var EngineFormat = _EngineFormat;
  var TranscoderFormat = _TranscoderFormat;
  var BasisFormat = _BasisFormat;

  self.addEventListener('message', function (e) {
    var message = e.data;
    switch (message.type) {
      case 'init':
        config = message.config;
        init(message.transcoderBinary);
        break;
      case 'transcode':
        transcoderPending.then(function () {
          try {
            var result = transcode(message.buffer);
            var buffers = [];
            for (var i = 0; i < result.faces.length; i++) {
              for (var j = 0; j < result.faces[i].length; j++) {
                buffers.push(result.faces[i][j].data.buffer);
              }
            }
            self.postMessage({
              type: 'transcode',
              id: message.id,
              hasAlpha: result.hasAlpha,
              width: result.width,
              height: result.height,
              format: result.format,
              faces: result.faces
            }, buffers);
          } catch (err) {
            self.postMessage({ type: 'error', id: message.id, error: err.message || String(err) });
          }
        });
        break;
    }
  });

  function init(wasmBinary) {
    transcoderPending = new Promise(function (resolve) {
      BasisModule = { wasmBinary: wasmBinary, onRuntimeInitialized: resolve };
      BASIS(BasisModule);
    }).then(function () {
      BasisModule.initializeBasis();
      if (BasisModule.KTX2File === undefined) {
        throw new Error('KTX2File missing – transcoder too old');
      }
    });
  }

  function transcode(buffer) {
    var ktx2File = new BasisModule.KTX2File(new Uint8Array(buffer));
    function cleanup() { try { ktx2File.close(); ktx2File.delete(); } catch (e) {} }

    if (!ktx2File.isValid()) {
      cleanup();
      throw new Error('Invalid or unsupported .ktx2 file');
    }

    var basisFormat = ktx2File.isUASTC() ? BasisFormat.UASTC_4x4 : BasisFormat.ETC1S;
    var width = ktx2File.getWidth();
    var height = ktx2File.getHeight();
    var levelCount = ktx2File.getLevels();
    var hasAlpha = ktx2File.getHasAlpha();
    var tf = getTranscoderFormat(basisFormat, width, height, hasAlpha);
    var transcoderFormat = tf.transcoderFormat;
    var engineFormat = tf.engineFormat;

    if (!width || !height || !levelCount) {
      cleanup();
      throw new Error('Invalid .ktx2 dimensions');
    }
    if (!ktx2File.startTranscoding()) {
      cleanup();
      throw new Error('startTranscoding failed');
    }

    var mipmaps = [];
    for (var mip = 0; mip < levelCount; mip++) {
      var levelInfo = ktx2File.getImageLevelInfo(mip, 0, 0);
      var mw = levelCount > 1 ? levelInfo.origWidth : levelInfo.width;
      var mh = levelCount > 1 ? levelInfo.origHeight : levelInfo.height;
      var dst = new Uint8Array(ktx2File.getImageTranscodedSizeInBytes(mip, 0, 0, transcoderFormat));
      var ok = ktx2File.transcodeImage(dst, mip, 0, 0, transcoderFormat, 0, -1, -1);
      if (!ok) {
        cleanup();
        throw new Error('transcodeImage failed level ' + mip);
      }
      mipmaps.push({ data: dst, width: mw, height: mh });
    }
    cleanup();
    return { faces: [mipmaps], width: width, height: height, hasAlpha: hasAlpha, format: engineFormat };
  }

  function getTranscoderFormat(basisFormat, width, height, hasAlpha) {
    var options = needsPowerOfTwo(width, height)
      ? (hasAlpha ? FORMAT_OPTIONS_POT_ALPHA : FORMAT_OPTIONS_POT)
      : (hasAlpha ? FORMAT_OPTIONS_ALPHA : FORMAT_OPTIONS);
    for (var i = 0; i < options.length; i++) {
      var opt = options[i];
      if (basisFormat === opt.if && config[opt.basisKey] !== false && isSupported(opt.transcoderFormat)) {
        return { transcoderFormat: opt.transcoderFormat, engineFormat: opt.engineFormat };
      }
    }
    return { transcoderFormat: TranscoderFormat.RGBA32, engineFormat: EngineFormat.RGBAFormat };
  }

  function isSupported(tf) {
    return BasisModule.isFormatSupported(tf);
  }

  function needsPowerOfTwo(w, h) {
    return (w & (w - 1)) !== 0 || (h & (h - 1)) !== 0;
  }

  var FORMAT_OPTIONS = [
    { if: BasisFormat.UASTC_4x4, basisKey: 'astcSupported', transcoderFormat: TranscoderFormat.ASTC_4x4, engineFormat: EngineFormat.RGBA_ASTC_4x4_Format },
    { if: BasisFormat.ETC1S, basisKey: 'etc2Supported', transcoderFormat: TranscoderFormat.ETC2, engineFormat: EngineFormat.RGBA_ETC2_EAC_Format },
    { if: BasisFormat.ETC1S, basisKey: 'etc1Supported', transcoderFormat: TranscoderFormat.ETC1, engineFormat: EngineFormat.RGB_ETC1_Format },
    { if: BasisFormat.UASTC_4x4, basisKey: 'bptcSupported', transcoderFormat: TranscoderFormat.BC7_M5, engineFormat: EngineFormat.RGBA_BPTC_Format },
    { if: BasisFormat.ETC1S, basisKey: 'dxtSupported', transcoderFormat: TranscoderFormat.BC3, engineFormat: EngineFormat.RGBA_S3TC_DXT5_Format },
    { if: BasisFormat.ETC1S, basisKey: 'dxtSupported', transcoderFormat: TranscoderFormat.BC1, engineFormat: EngineFormat.RGB_S3TC_DXT1_Format },
    { if: BasisFormat.UASTC_4x4, basisKey: 'dxtSupported', transcoderFormat: TranscoderFormat.BC3, engineFormat: EngineFormat.RGBA_S3TC_DXT5_Format }
  ];
  var FORMAT_OPTIONS_ALPHA = FORMAT_OPTIONS;
  var FORMAT_OPTIONS_POT = FORMAT_OPTIONS;
  var FORMAT_OPTIONS_POT_ALPHA = FORMAT_OPTIONS;
}

async function loadTexture(url, opts) {
  opts = opts || {};
  await initTranscoder();

  var buffer = await fetch(url).then(function (r) {
    if (!r.ok) throw new Error(r.status + ' ' + url);
    return r.arrayBuffer();
  });

  // verify ktx2 magic
  var magic = new Uint8Array(buffer, 0, 12);
  var isKtx2 = magic[0] === 0xAB && magic[1] === 0x4B && magic[2] === 0x54 && magic[3] === 0x58;
  if (!isKtx2) throw new Error('Not a KTX2 file: ' + url);

  var id = taskId++;
  var result = await new Promise(function (resolve, reject) {
    callbacks[id] = { resolve: resolve, reject: reject };
    // transfer buffer to worker
    worker.postMessage({ type: 'transcode', id: id, buffer: buffer }, [buffer]);
  });

  var mipmaps = result.faces[0];
  var texture = new THREE.CompressedTexture(
    mipmaps,
    result.width,
    result.height,
    result.format,
    THREE.UnsignedByteType
  );
  texture.minFilter = mipmaps.length > 1 ? THREE.LinearMipmapLinearFilter : THREE.LinearFilter;
  texture.magFilter = THREE.LinearFilter;
  texture.generateMipmaps = false;
  texture.flipY = false;
  texture.encoding = opts.srgb ? THREE.sRGBEncoding : THREE.LinearEncoding;
  texture.anisotropy = opts.aniso || 8;
  if (opts.rep) { texture.wrapS = texture.wrapT = THREE.RepeatWrapping; }
  if (opts.mir) { texture.wrapS = texture.wrapT = THREE.MirroredRepeatWrapping; }
  texture.needsUpdate = true;
  return texture;
}

window.YV = window.YV || {};
YV.ktx2 = {
  loadTexture: loadTexture,
  detectSupport: detectSupport,
  setRenderer: function (r) { YV._renderer = r; detectSupport(r); },
  init: initTranscoder
};
THREE.KTX2LoaderLite = { load: loadTexture, detectSupport: detectSupport };
})();
