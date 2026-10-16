// S5 · Pipeline NPR: inchiostro vivo + carta. InkMaster unico (DissolveAmount, ColorShift, TextureBlend).
import * as THREE from '../vendor/three.module.js?v=1.3.1';

export function paperTexture(size = 512) {
  const c = document.createElement('canvas'); c.width = c.height = size; const g = c.getContext('2d');
  g.fillStyle = '#ece2cc'; g.fillRect(0, 0, size, size);
  const img = g.getImageData(0, 0, size, size), d = img.data;
  for (let i = 0; i < d.length; i += 4) { const n = (Math.random() - 0.5) * 18; d[i] += n; d[i + 1] += n; d[i + 2] += n * 0.8; }
  g.putImageData(img, 0, 0);
  g.globalAlpha = 0.05; for (let i = 0; i < 900; i++) { g.strokeStyle = Math.random() < 0.5 ? '#8a7350' : '#fff'; g.lineWidth = Math.random() * 1.2; g.beginPath(); const x = Math.random() * size, y = Math.random() * size, a = Math.random() * 6.28, l = 4 + Math.random() * 18; g.moveTo(x, y); g.lineTo(x + Math.cos(a) * l, y + Math.sin(a) * l); g.stroke(); }
  g.globalAlpha = 0.07; for (let i = 0; i < 40; i++) { const x = Math.random() * size, y = Math.random() * size, r = 20 + Math.random() * 90; const gr = g.createRadialGradient(x, y, 0, x, y, r); gr.addColorStop(0, '#a08458'); gr.addColorStop(1, 'rgba(160,132,88,0)'); g.fillStyle = gr; g.fillRect(x - r, y - r, r * 2, r * 2); }
  const t = new THREE.CanvasTexture(c); t.wrapS = t.wrapT = THREE.RepeatWrapping; t.colorSpace = THREE.SRGBColorSpace; t.anisotropy = 4; return t;
}
export function splatTexture() {
  const S = 256, c = document.createElement('canvas'); c.width = S * 4; c.height = S; const g = c.getContext('2d');
  for (let v = 0; v < 4; v++) {
    const cx = v * S + S / 2, cy = S / 2; g.fillStyle = '#fff';
    if (v === 3) { // strappo / cancellatura
      g.strokeStyle = '#fff'; g.lineCap = 'round'; for (let k = 0; k < 7; k++) { g.lineWidth = 6 + Math.random() * 10; g.beginPath(); g.moveTo(cx - 90, cy - 50 + k * 15 + Math.random() * 8); for (let x = -90; x <= 90; x += 15) g.lineTo(cx + x, cy - 50 + k * 15 + (Math.random() - 0.5) * 14); g.stroke(); } continue;
    }
    g.beginPath(); const N = 40; for (let i = 0; i <= N; i++) { const a = i / N * 6.283, r = 50 + Math.random() * 25 + (Math.random() < 0.2 ? 30 : 0); g.lineTo(cx + Math.cos(a) * r, cy + Math.sin(a) * r); } g.fill();
    for (let i = 0; i < 18; i++) { const a = Math.random() * 6.28, r = 70 + Math.random() * 50, s = 2 + Math.random() * 9; g.beginPath(); g.arc(cx + Math.cos(a) * r, cy + Math.sin(a) * r, s, 0, 6.28); g.fill(); }
  }
  const t = new THREE.CanvasTexture(c); return t;
}

const NOISE = `
float h21(vec2 p){p=fract(p*vec2(123.34,456.21));p+=dot(p,p+45.32);return fract(p.x*p.y);}
float vnoise(vec2 p){vec2 i=floor(p),f=fract(p);f=f*f*(3.-2.*f);return mix(mix(h21(i),h21(i+vec2(1,0)),f.x),mix(h21(i+vec2(0,1)),h21(i+vec2(1,1)),f.x),f.y);}
float fbm(vec2 p){float s=0.,a=.5;for(int i=0;i<4;i++){s+=a*vnoise(p);p*=2.03;a*=.5;}return s;}`;

export const INK_UNIFORMS = { uPR: { value: 1 }, uTime: { value: 0 }, uLight: { value: new THREE.Vector3(-0.45, 0.8, 0.35).normalize() }, uPaper: { value: null }, uContrast: { value: 0 }, uLamp: { value: new THREE.Vector3(0, 0, 0) }, uLampR: { value: 11 },
  uPL: { value: Array.from({ length: 8 }, () => new THREE.Vector4(0, -99, 0, 1)) }, uPC: { value: Array.from({ length: 8 }, () => new THREE.Vector3()) } };

export function inkMaster(opts = {}) {
  const m = new THREE.ShaderMaterial({
    uniforms: {
      ...INK_UNIFORMS,
      uColor: { value: new THREE.Color(opts.color ?? 0xd9ccb0) },
      uInk: { value: new THREE.Color(opts.ink ?? 0x1a1410) },
      uShiftColor: { value: new THREE.Color(opts.shift ?? 0x7a1f14) },
      DissolveAmount: { value: 0 }, ColorShift: { value: 0 }, TextureBlend: { value: opts.texBlend ?? 0.85 },
      uRedraw: { value: -1 }, uMarks: { value: 0 }, uGlow: { value: new THREE.Color(0, 0, 0) }, uCrack: { value: 0 }, uHit: { value: 0 },
      uH: { value: new THREE.Vector2(opts.y0 ?? 0, opts.y1 ?? 2) }, uScale: { value: opts.texScale ?? 0.25 },
    },
    vertexColors: true,
    vertexShader: `varying vec3 vN; varying vec3 vW; varying float vMask; varying vec4 vS;
      void main(){ vec4 w=modelMatrix*vec4(position,1.); vW=w.xyz; vN=normalize(mat3(modelMatrix)*normal); vMask=color.r; gl_Position=projectionMatrix*viewMatrix*w; vS=gl_Position; }`,
    fragmentShader: `uniform vec4 uPL[8]; uniform vec3 uPC[8]; uniform float uHit; uniform float uPR; uniform float uTime,DissolveAmount,ColorShift,TextureBlend,uRedraw,uMarks,uCrack,uScale,uContrast,uLampR; uniform vec3 uLamp,uLight,uColor,uInk,uShiftColor,uGlow; uniform sampler2D uPaper; uniform vec2 uH;
      varying vec3 vN; varying vec3 vW; varying float vMask; varying vec4 vS; ${NOISE}
      void main(){
        vec3 n=normalize(vN); float ndl=dot(n,uLight);
        vec3 an=abs(n); vec2 uv= an.y>.6? vW.xz : (an.x>an.z? vW.zy: vW.xy);
        vec3 paper=texture2D(uPaper,uv*uScale).rgb;
        vec3 base=mix(uColor, uColor*paper*1.25, TextureBlend);
        float wob=vnoise(vW.xz*2.+uTime*.15)*.12;
        float tone=smoothstep(-.15+wob,.05+wob,ndl)*.55+smoothstep(.45,.6+wob,ndl)*.45;
        vec2 sp=gl_FragCoord.xy/uPR; float hv=(sp.x+sp.y)*.16+vnoise(sp*.02)*1.5; float hw=fwidth(hv)*.75+.02; float hatch=smoothstep(.5-hw,.5+hw,fract(hv))*smoothstep(1.,1.-hw,fract(hv));
        float hv2=(sp.x-sp.y)*.16; float hatch2=smoothstep(.5-hw,.5+hw,fract(hv2))*smoothstep(1.,1.-hw,fract(hv2));
        float dark=1.-tone; float hm=mix(1.,.7,hatch*smoothstep(.35,.5,dark))*mix(1.,.78,hatch2*smoothstep(.7,.8,dark));
        float ao=mix(.68,1.,smoothstep(0.,.9,vW.y-uH.x+.05));
        vec3 shadowC=base*vec3(.33,.33,.43); vec3 litC=base*vec3(1.04,1.,.92); vec3 col=mix(shadowC,litC,tone)*hm*ao;
        col+=vec3(1.,.82,.55)*pow(max(ndl,0.),3.)*.12; // luce calda
        float rim=pow(1.-abs(dot(n,normalize(cameraPosition-vW))),3.); col=mix(col,uInk,rim*.35*vMask);
        col=mix(col, uShiftColor*(.6+.4*tone), ColorShift*vMask);
        // segni persistenti delle riscritture (scarabocchi d'inchiostro)
        if(uMarks>0.){ float sc=smoothstep(.62,.66,fbm(vW.xy*3.1+vW.zx*2.3+7.)); col=mix(col,uInk*1.4,sc*min(uMarks,3.)*.22*vMask); }
        // crepe del componente Fragile
        if(uCrack>0.){ float cr=1.-smoothstep(.0,.035,abs(fbm(vW.xz*4.+vW.y*3.)-.5)); col=mix(col,uInk,cr*uCrack*vMask); }
        // eco di riscrittura: linea che ridisegna il componente (0,12–0,35 s)
        if(uRedraw>=0.){ float hy=mix(uH.x,uH.y,uRedraw); float l=1.-smoothstep(0.,.07,abs(vW.y-hy)); col=mix(col,uInk,l*.9); col+=uGlow*l*1.5; }
        col+=uGlow*(.35+.25*sin(uTime*6.));
        // dissoluzione in inchiostro
        if(DissolveAmount>0.){ float dn=fbm(vW.xy*3.+vW.zz*2.); if(dn<DissolveAmount) discard; col=mix(col,uInk,1.-smoothstep(0.,.08,dn-DissolveAmount)); }
        // lampada da lettura che segue il giocatore: il resto della pagina sprofonda nel buio caldo
        float ld=length(vW.xz-uLamp.xz)/uLampR; float lamp=1.-smoothstep(.25,1.,ld+vnoise(vW.xz*.6+uTime*.05)*.18);
        col*=mix(vec3(.17,.14,.17),vec3(1.06,1.,.9),lamp);
        // candele, lampade e inchiostro luminoso
        for(int i=0;i<8;i++){ vec3 dv=uPL[i].xyz-vW; float a=max(0.,1.-length(dv)/uPL[i].w); a*=a; col+=base*uPC[i]*a*1.7*(.45+.55*max(dot(n,normalize(dv)),0.)); }
        col=mix(col, vec3(dot(col,vec3(.33)))*1.1, uContrast*.6);
        col=mix(col,vec3(1.,.96,.88),uHit);
        gl_FragColor=vec4(col,1.);
        #include <colorspace_fragment>
      }`,
  });
  m.userData.ink = true; return m;
}

// Contorno a scafo invertito con linea "viva" che tremola appena.
export function outlineMat(w = 0.035) {
  return new THREE.ShaderMaterial({
    uniforms: { uTime: INK_UNIFORMS.uTime, uW: { value: w }, uCol: { value: new THREE.Color(0x15100c) } }, side: THREE.BackSide,
    vertexShader: `uniform float uTime,uW; void main(){ vec3 p=position+normal*uW*(1.+.35*sin(uTime*3.+position.y*7.+position.x*5.)); gl_Position=projectionMatrix*modelViewMatrix*vec4(p,1.); }`,
    fragmentShader: `uniform vec3 uCol; void main(){ gl_FragColor=vec4(uCol,1.); }`,
  });
}

export function withMask(geo, mask = 1) { const n = geo.attributes.position.count; const a = new Float32Array(n * 3).fill(mask); geo.setAttribute('color', new THREE.BufferAttribute(a, 3)); return geo; }

// Mesh disegnata a inchiostro: corpo InkMaster + contorno.
export function inked(geo, opts = {}) {
  withMask(geo, opts.mask ?? 1);
  const mat = opts.material || inkMaster(opts); const m = new THREE.Mesh(geo, mat);
  if (opts.outline !== false) { const o = new THREE.Mesh(geo, opts.outlineMat || outlineMat(opts.ow ?? 0.035)); o.renderOrder = -1; m.add(o); m.userData.outline = o; }
  return m;
}

// Tracce persistenti: macchie che si allargano, bagnate → asciutte, mai rimosse.
export class Traces {
  constructor(scene, max = 400) {
    this.max = max; this.n = 0; const geo = new THREE.PlaneGeometry(1, 1); geo.rotateX(-Math.PI / 2);
    this.birth = new Float32Array(max); this.seed = new Float32Array(max); this.kind = new Float32Array(max);
    geo.setAttribute('aBirth', new THREE.InstancedBufferAttribute(this.birth, 1)); geo.setAttribute('aSeed', new THREE.InstancedBufferAttribute(this.seed, 1)); geo.setAttribute('aKind', new THREE.InstancedBufferAttribute(this.kind, 1));
    const mat = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, polygonOffset: true, polygonOffsetFactor: -2,
      uniforms: { uTime: INK_UNIFORMS.uTime, uTex: { value: splatTexture() } },
      vertexShader: `attribute float aBirth,aSeed,aKind; uniform float uTime; varying vec2 vUv; varying float vAge,vK,vS;
        void main(){ vAge=uTime-aBirth; vK=aKind; vS=aSeed; float s=mix(.2,1.,smoothstep(0.,.35,vAge)); vec3 p=position*vec3(s,1.,s);
          vUv=vec2((uv.x+aKind)/4.,uv.y); gl_Position=projectionMatrix*viewMatrix*instanceMatrix*vec4(p,1.); }`,
      fragmentShader: `uniform sampler2D uTex; uniform float uTime; varying vec2 vUv; varying float vAge,vK,vS;
        void main(){ float a=texture2D(uTex,vUv).r; if(a<.4) discard; float dry=smoothstep(0.,9.,vAge);
          vec3 wet=vec3(.03,.02,.03), dried=vec3(.32,.22,.15); vec3 c=mix(wet,dried,dry*.75);
          float gloss=(1.-dry)*smoothstep(.85,1.,a)*(.5+.5*sin(uTime*2.+vS*20.)); c+=gloss*.25;
          gl_FragColor=vec4(c,mix(.92,.62,dry)*smoothstep(.4,.55,a)); }` });
    this.mesh = new THREE.InstancedMesh(geo, mat, max); this.mesh.count = 0; this.mesh.frustumCulled = false; scene.add(this.mesh); this.m = new THREE.Matrix4(); this.q = new THREE.Quaternion();
  }
  add(x, z, size, kind, now, y = 0.012) {
    const i = this.n % this.max; this.n++; this.q.setFromAxisAngle(new THREE.Vector3(0, 1, 0), Math.random() * 6.28);
    this.m.compose(new THREE.Vector3(x, y + (i % 50) * 0.0004, z), this.q, new THREE.Vector3(size, 1, size)); this.mesh.setMatrixAt(i, this.m);
    this.birth[i] = now; this.seed[i] = Math.random(); this.kind[i] = kind;
    this.mesh.count = Math.min(this.n, this.max); this.mesh.instanceMatrix.needsUpdate = true;
    for (const a of ['aBirth', 'aSeed', 'aKind']) this.mesh.geometry.attributes[a].needsUpdate = true;
  }
}

// Particelle: gocce che colano, schizzi, frammenti di carta, polvere di luce.
export class Particles {
  constructor(scene, max = 700) {
    this.max = max; this.pos = new Float32Array(max * 3); this.vel = new Float32Array(max * 3); this.life = new Float32Array(max); this.size = new Float32Array(max); this.col = new Float32Array(max * 3); this.grav = new Float32Array(max); this.i = 0;
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(this.pos, 3)); g.setAttribute('aSize', new THREE.BufferAttribute(this.size, 1)); g.setAttribute('aCol', new THREE.BufferAttribute(this.col, 3)); g.setAttribute('aLife', new THREE.BufferAttribute(this.life, 1));
    const m = new THREE.ShaderMaterial({ transparent: true, depthWrite: false, uniforms: { uPR: { value: 1 } },
      vertexShader: `attribute float aSize,aLife; attribute vec3 aCol; varying vec3 vC; varying float vL; uniform float uPR; void main(){ vC=aCol; vL=aLife; vec4 mv=modelViewMatrix*vec4(position,1.); gl_PointSize=aSize*uPR*(300./-mv.z)*step(.001,aLife); gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `varying vec3 vC; varying float vL; void main(){ vec2 d=gl_PointCoord-.5; float r=length(d); if(r>.5) discard; gl_FragColor=vec4(vC,smoothstep(.5,.3,r)*min(1.,vL*3.)); }` });
    this.points = new THREE.Points(g, m); this.points.frustumCulled = false; scene.add(this.points); this.onLand = null;
  }
  emit(x, y, z, vx, vy, vz, life, size, r, g, b, grav = 9) {
    const i = this.i++ % this.max; this.pos.set([x, y, z], i * 3); this.vel.set([vx, vy, vz], i * 3); this.life[i] = life; this.size[i] = size; this.col.set([r, g, b], i * 3); this.grav[i] = grav;
  }
  burst(x, y, z, n, speed, color = [0.05, 0.04, 0.04], size = 0.12, up = 3) {
    for (let k = 0; k < n; k++) { const a = Math.random() * 6.28, s = speed * (0.3 + Math.random()); this.emit(x, y, z, Math.cos(a) * s, up * Math.random() + 1, Math.sin(a) * s, 0.6 + Math.random() * 0.6, size * (0.5 + Math.random()), ...color); }
  }
  update(dt) {
    for (let i = 0; i < this.max; i++) { if (this.life[i] <= 0) continue; this.life[i] -= dt; const j = i * 3;
      this.vel[j + 1] -= this.grav[i] * dt; this.pos[j] += this.vel[j] * dt; this.pos[j + 1] += this.vel[j + 1] * dt; this.pos[j + 2] += this.vel[j + 2] * dt;
      if (this.pos[j + 1] < 0.02 && this.grav[i] > 0) { this.pos[j + 1] = 0.02; if (this.onLand && this.size[i] > 0.1 && Math.random() < 0.08) this.onLand(this.pos[j], this.pos[j + 2]); this.life[i] = Math.min(this.life[i], 0.15); this.vel[j] *= 0.2; this.vel[j + 2] *= 0.2; this.vel[j + 1] = 0; }
      if (this.life[i] <= 0) this.life[i] = 0; }
    const a = this.points.geometry.attributes; a.position.needsUpdate = a.aLife.needsUpdate = a.aSize.needsUpdate = a.aCol.needsUpdate = true;
  }
}

// Post-processing: bloom morbido, vignetta, grana di carta, sanguinamento d'inchiostro ai bordi.
export class Post {
  constructor(renderer, samples = 4) {
    this.r = renderer; this.bloom = true; this.rt = new THREE.WebGLRenderTarget(4, 4, { samples: renderer.capabilities.isWebGL2 ? samples : 0, type: THREE.HalfFloatType }); this.rtB = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType }); this.rtC = new THREE.WebGLRenderTarget(4, 4, { type: THREE.HalfFloatType });
    this.cam = new THREE.OrthographicCamera(-1, 1, 1, -1, 0, 1); const quad = new THREE.Mesh(new THREE.PlaneGeometry(2, 2)); this.scene = new THREE.Scene(); this.scene.add(quad); this.quad = quad;
    const vs = `varying vec2 vUv; void main(){ vUv=uv; gl_Position=vec4(position.xy,0.,1.); }`;
    this.blur = new THREE.ShaderMaterial({ uniforms: { t: { value: null }, dir: { value: new THREE.Vector2() }, thr: { value: 0.8 } }, vertexShader: vs,
      fragmentShader: `uniform sampler2D t; uniform vec2 dir; uniform float thr; varying vec2 vUv; void main(){ vec3 s=vec3(0.); float w[5]; w[0]=.227;w[1]=.195;w[2]=.122;w[3]=.054;w[4]=.016;
        for(int i=-4;i<=4;i++){ vec3 c=texture2D(t,vUv+dir*float(i)).rgb; c=max(c-thr,0.)*(thr>0.?2.:1.); s+=c*w[i<0?-i:i]; } gl_FragColor=vec4(s,1.); }` });
    this.comp = new THREE.ShaderMaterial({ uniforms: { t: { value: null }, b: { value: null }, time: INK_UNIFORMS.uTime, res: { value: new THREE.Vector2() }, sbiadito: { value: 0 }, flash: { value: 0 }, reduce: { value: 0 }, focus: { value: 0 } }, vertexShader: vs,
      fragmentShader: `uniform sampler2D t,b; uniform float time,sbiadito,flash,reduce,focus; uniform vec2 res; varying vec2 vUv; ${NOISE}
        void main(){ vec2 uv=vUv; vec2 c=uv-.5; float r=length(c);
          float bleed=(.0015+focus*.002)*(1.-reduce); vec3 col; col.r=texture2D(t,uv+c*bleed).r; col.g=texture2D(t,uv).g; col.b=texture2D(t,uv-c*bleed).b;
          col+=texture2D(b,uv).rgb*.55;
          float lum=dot(col,vec3(.299,.587,.114)); col=mix(col,vec3(lum)*vec3(1.05,.97,.86),.18+focus*.45);
          col=pow(col,vec3(1.03)); col*=vec3(1.03,1.,.95);
          float vig=smoothstep(.85,.25,r+vnoise(uv*3.+time*.02)*.12); col*=mix(.42,1.,vig);
          // bordi della pagina che si inchiostrano durante la lettura
          if(focus>.01){ float edge=smoothstep(.36,.75,r+fbm(uv*6.+time*.1)*.2)*focus; col=mix(col,vec3(.05,.035,.03),edge*.8); }
          col=mix(col,vec3(lum*.9+.1),sbiadito*.5);
          col+=(vnoise(uv*res*.35)-.5)*.018;
          col=mix(col,vec3(.98,.95,.88),flash);
          gl_FragColor=vec4(col,1.);
          #include <colorspace_fragment>
        }` });
    this.enabled = true;
  }
  setSamples(n) { this.rt.dispose(); this.rt.samples = n; }
  setSize(w, h) { this.rt.setSize(w, h); this.rtB.setSize(w >> 2, h >> 2); this.rtC.setSize(w >> 2, h >> 2); this.comp.uniforms.res.value.set(w, h); }
  render(scene, camera) {
    const r = this.r; if (!this.enabled) { r.setRenderTarget(null); r.render(scene, camera); return; }
    r.setRenderTarget(this.rt); r.render(scene, camera);
    const bw = this.rtB.width, bh = this.rtB.height;
    if (this.bloom) { this.quad.material = this.blur; this.blur.uniforms.t.value = this.rt.texture; this.blur.uniforms.dir.value.set(1.5 / bw, 0); this.blur.uniforms.thr.value = 0.92; r.setRenderTarget(this.rtB); r.render(this.scene, this.cam);
    this.blur.uniforms.t.value = this.rtB.texture; this.blur.uniforms.dir.value.set(0, 1.5 / bh); this.blur.uniforms.thr.value = 0; r.setRenderTarget(this.rtC); r.render(this.scene, this.cam); } else { r.setRenderTarget(this.rtC); r.clear(); }
    this.quad.material = this.comp; this.comp.uniforms.t.value = this.rt.texture; this.comp.uniforms.b.value = this.rtC.texture; r.setRenderTarget(null); r.render(this.scene, this.cam);
  }
}
