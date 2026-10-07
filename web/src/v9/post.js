// post.js — V9 离线后期:HDR 子帧累积(运动模糊 + 抖动抗锯齿 + 软阴影)→ 景深 → 泛光 → 调色
import * as THREE from 'three';
import { FullScreenQuad } from 'three/addons/postprocessing/Pass.js';
import { UnrealBloomPass } from 'three/addons/postprocessing/UnrealBloomPass.js';
import { ShaderChunk } from 'three';

const VERT = /* glsl */`varying vec2 vUv; void main(){ vUv = uv; gl_Position = vec4(position.xy, 0.0, 1.0); }`;

export class Post {
  constructor(renderer, W, H) {
    this.r = renderer; this.W = W; this.H = H;
    const rtOpt = { type: THREE.HalfFloatType, depthBuffer: true, samples: 4 };
    this.sceneRT = new THREE.WebGLRenderTarget(W, H, rtOpt);
    this.sceneRT.depthTexture = new THREE.DepthTexture(W, H, THREE.FloatType);
    this.accRT = new THREE.WebGLRenderTarget(W, H, { type: THREE.FloatType, depthBuffer: false });
    this.depthRT = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, depthBuffer: false });
    this.dofRT = new THREE.WebGLRenderTarget(W, H, { type: THREE.HalfFloatType, depthBuffer: false });

    this.accQuad = new FullScreenQuad(new THREE.ShaderMaterial({
      uniforms: { tSrc: { value: null }, w: { value: 1 } },
      vertexShader: VERT,
      fragmentShader: /* glsl */`uniform sampler2D tSrc; uniform float w; varying vec2 vUv;
        void main(){ vec3 c = texture2D(tSrc, vUv).rgb; gl_FragColor = vec4(min(c, vec3(64.0)) * w, 1.0); }`,
      blending: THREE.CustomBlending, blendEquation: THREE.AddEquation, blendSrc: THREE.OneFactor, blendDst: THREE.OneFactor,
      depthTest: false, depthWrite: false,
    }));

    // 线性深度拷贝(中心时刻)
    this.depthQuad = new FullScreenQuad(new THREE.ShaderMaterial({
      uniforms: { tDepth: { value: null }, near: { value: 0.05 }, far: { value: 1000 } },
      vertexShader: VERT,
      fragmentShader: /* glsl */`#include <packing>
        uniform sampler2D tDepth; uniform float near, far; varying vec2 vUv;
        void main(){ float d = texture2D(tDepth, vUv).x; float z = -perspectiveDepthToViewZ(d, near, far); gl_FragColor = vec4(z, 0.0, 0.0, 1.0); }`,
      depthTest: false, depthWrite: false,
    }));

    // 景深:CoC 由薄透镜近似,Vogel 螺旋收集,按样本 CoC 覆盖判定避免清晰前景外溢
    this.dofQuad = new FullScreenQuad(new THREE.ShaderMaterial({
      uniforms: {
        tColor: { value: null }, tZ: { value: null }, res: { value: new THREE.Vector2(W, H) },
        focus: { value: 3 }, aperture: { value: 0 }, maxR: { value: 14 },
      },
      vertexShader: VERT,
      fragmentShader: /* glsl */`uniform sampler2D tColor, tZ; uniform vec2 res; uniform float focus, aperture, maxR; varying vec2 vUv;
        // aperture 为人机读数(4~8),×8 换算为像素弥散圈系数(此前缺因子导致虚化几乎不可见)
        float coc(float z){ return clamp(abs(1.0 / focus - 1.0 / max(z, 0.01)) * aperture * 8.0, 0.0, maxR); }
        void main(){
          vec3 c0 = texture2D(tColor, vUv).rgb; float z0 = texture2D(tZ, vUv).r; float r0 = coc(z0);
          if (aperture <= 0.0 || maxR < 0.5) { gl_FragColor = vec4(c0, 1.0); return; }
          vec3 acc = c0; float wsum = 1.0;
          const int N = 64; const float GA = 2.39996323;
          for (int i = 1; i < N; i++) {
            float fi = float(i);
            float rr = sqrt(fi / float(N)) * maxR;
            float a = fi * GA;
            vec2 o = vec2(cos(a), sin(a)) * rr / res;
            vec2 uv = vUv + o;
            float zs = texture2D(tZ, uv).r; float rs = coc(zs);
            // 样本自身模糊圈要能覆盖到当前像素;背景样本不能压到更近的清晰前景
            float cover = smoothstep(rr - 1.5, rr + 0.5, rs);
            float behind = zs > z0 + 0.05 ? smoothstep(rr - 1.5, rr + 0.5, r0) : 1.0;
            float w = cover * behind;
            acc += texture2D(tColor, uv).rgb * w; wsum += w;
          }
          gl_FragColor = vec4(acc / wsum, 1.0);
        }`,
      depthTest: false, depthWrite: false,
    }));

    this.bloom = new UnrealBloomPass(new THREE.Vector2(W, H), 0.22, 0.62, 0.86);

    this.gradeQuad = new FullScreenQuad(new THREE.ShaderMaterial({
      uniforms: {
        tDiffuse: { value: null }, toneMappingExposure: { value: 1.0 }, res: { value: new THREE.Vector2(W, H) },
        saturation: { value: 1.08 }, contrast: { value: 1.04 }, warm: { value: new THREE.Vector3(1.03, 1.0, 0.96) },
        lift: { value: new THREE.Vector3(0.012, 0.008, 0.0) }, vignette: { value: 0.28 }, grain: { value: 0.018 },
        frame: { value: 0 }, fade: { value: 0 }, fadeColor: { value: new THREE.Color('#fff6e8') }, tUI: { value: null },
      },
      vertexShader: VERT,
      fragmentShader: /* glsl */`
        ${ShaderChunk.tonemapping_pars_fragment}
        uniform sampler2D tDiffuse; uniform sampler2D tUI; uniform vec2 res; uniform float saturation, contrast, vignette, grain, frame, fade;
        uniform vec3 warm, lift, fadeColor; varying vec2 vUv;
        float hash(vec2 p){ p = fract(p * vec2(443.897, 441.423)); p += dot(p, p.yx + 19.19); return fract((p.x + p.y) * p.x); }
        void main(){
          vec3 c = texture2D(tDiffuse, vUv).rgb * warm;
          c = ACESFilmicToneMapping(c);
          float l = dot(c, vec3(0.2126, 0.7152, 0.0722));
          c = mix(vec3(l), c, saturation);
          c = (c - 0.18) * contrast + 0.18 + lift * (1.0 - c);
          vec2 q = (vUv - 0.5) * vec2(1.0, 0.78);
          c *= clamp(1.0 - dot(q, q) * vignette * 2.2, 0.0, 1.0);
          c = clamp(c, 0.0, 1.0);
          vec4 o = sRGBTransferOETF(vec4(c, 1.0));
          o.rgb += (hash(vUv * res + frame * 7.13) - 0.5) * grain;
          o.rgb = mix(o.rgb, fadeColor, fade);
          vec4 ui = texture2D(tUI, vUv);
          o.rgb = mix(o.rgb, ui.rgb, ui.a); // 2D 引导 UI 预乘合成
          gl_FragColor = vec4(o.rgb, 1.0);
        }`,
      depthTest: false, depthWrite: false,
    }));
  }

  // renderSample(i) 由调用方在每个子帧设置好场景后调用
  begin() {
    this.r.setRenderTarget(this.accRT);
    this.r.setClearColor(0x000000, 1);
    this.r.clear(true, false, false);
  }
  addSample(scene, camera, weight) {
    const r = this.r;
    r.setRenderTarget(this.sceneRT);
    r.clear(true, true, false);
    r.render(scene, camera);
    this.accQuad.material.uniforms.tSrc.value = this.sceneRT.texture;
    this.accQuad.material.uniforms.w.value = weight;
    r.setRenderTarget(this.accRT);
    this.accQuad.render(r);
  }
  // 中心时刻的深度(景深用):在 addSample 之后立刻调用,读取当前 sceneRT 的深度
  captureDepth(camera) {
    const m = this.depthQuad.material.uniforms;
    m.tDepth.value = this.sceneRT.depthTexture; m.near.value = camera.near; m.far.value = camera.far;
    this.r.setRenderTarget(this.depthRT);
    this.depthQuad.render(this.r);
  }
  finish({ focus = 3, aperture = 0, maxR = 14, exposure = 1, frame = 0, fade = 0, fadeColor, bloom = 0.22, grade = {}, overlay = null } = {}) {
    const r = this.r;
    const d = this.dofQuad.material.uniforms;
    d.tColor.value = this.accRT.texture; d.tZ.value = this.depthRT.texture;
    d.focus.value = focus; d.aperture.value = aperture; d.maxR.value = maxR;
    r.setRenderTarget(this.dofRT);
    this.dofQuad.render(r);
    this.bloom.strength = bloom;
    this.bloom.render(r, null, this.dofRT, 0, false);
    const g = this.gradeQuad.material.uniforms;
    g.tDiffuse.value = this.dofRT.texture;
    g.tUI.value = overlay || this._blankUI || (this._blankUI = new THREE.DataTexture(new Uint8Array([0, 0, 0, 0]), 1, 1));
    if (this._blankUI && !overlay) this._blankUI.needsUpdate = true;
    g.toneMappingExposure.value = exposure;
    g.frame.value = frame; g.fade.value = fade;
    if (fadeColor) g.fadeColor.value.set(fadeColor);
    for (const [k, v] of Object.entries(grade)) {
      if (g[k]?.value?.set && Array.isArray(v)) g[k].value.set(...v); else if (g[k]) g[k].value = v;
    }
    r.setRenderTarget(null);
    this.gradeQuad.render(r);
  }
}
