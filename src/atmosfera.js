// v2.6 · Atmosfera (giro grafico parte 2): pulviscolo che galleggia nella luce e aloni caldi intorno a candele e lampade.
// Pensato per l'iPad: 1 draw call per il pulviscolo (punti mossi solo nello shader, la CPU non li tocca) e 1 draw call per
// tutti gli aloni insieme (InstancedMesh: un alone nell'aria + una pozza calda sul pavimento per le 7 luci più vicine).
import * as THREE from '../vendor/three.module.js?v=2.6.1-prova';
import { INK_UNIFORMS, NL } from './art.js?v=2.6.1-prova';

const NOISE = `float h11(float n){return fract(sin(n)*43758.5453);}`;

export class Dust {
  constructor(scene, n = 170) {
    const pos = new Float32Array(n * 3), seed = new Float32Array(n); for (let i = 0; i < n; i++) { pos[i * 3] = Math.random(); pos[i * 3 + 1] = Math.random(); pos[i * 3 + 2] = Math.random(); seed[i] = Math.random(); }
    const g = new THREE.BufferGeometry(); g.setAttribute('position', new THREE.BufferAttribute(pos, 3)); g.setAttribute('aSeed', new THREE.BufferAttribute(seed, 1));
    this.u = { uTime: INK_UNIFORMS.uTime, uPR: INK_UNIFORMS.uPR, uLamp: INK_UNIFORMS.uLamp, uLampR: INK_UNIFORMS.uLampR, uPL: INK_UNIFORMS.uPL, uPC: INK_UNIFORMS.uPC,
      uCenter: { value: new THREE.Vector3() }, uBox: { value: new THREE.Vector3(16, 3.4, 14) }, uK: { value: 1 } };
    const m = new THREE.ShaderMaterial({ uniforms: this.u, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute float aSeed; uniform float uTime,uPR,uLampR,uK; uniform vec3 uCenter,uBox,uLamp; uniform vec4 uPL[${NL}]; uniform vec3 uPC[${NL}]; varying vec3 vC; varying float vA;
        void main(){ float t=uTime, s=aSeed;
          vec3 a=position+vec3(sin(t*.11+s*6.3)*.012+t*.004*(s-.5), t*.006*(.4+s)+sin(t*.23+s*9.)*.01, cos(t*.09+s*4.1)*.012);
          vec3 d=fract(a-uCenter/uBox+.5)-.5; vec3 w=vec3(uCenter.x+d.x*uBox.x, .15+(d.y+.5)*uBox.y, uCenter.z+d.z*uBox.z); // il pulviscolo resta fermo nel mondo
          float edge=(1.-smoothstep(.36,.5,abs(d.x)))*(1.-smoothstep(.36,.5,abs(d.z)))*(1.-smoothstep(.38,.5,abs(d.y)));
          float lamp=1.-smoothstep(.15,.95,length(w.xz-uLamp.xz)/uLampR); vec3 L=vec3(1.,.86,.62)*lamp*.9;
          for(int i=0;i<${NL - 1};i++){ float k=max(0.,1.-length(uPL[i].xyz-w)/(uPL[i].w*.9)); L+=uPC[i]*k*k*2.6; } // brilla di più vicino a candele e lampade
          vC=L; vA=edge*uK*(.55+.45*sin(t*(1.3+s*2.)+s*30.));
          vec4 mv=viewMatrix*vec4(w,1.); gl_PointSize=(.3+s*.36)*uPR*(300./-mv.z); gl_Position=projectionMatrix*mv; }`,
      fragmentShader: `varying vec3 vC; varying float vA; void main(){ vec2 q=gl_PointCoord-.5; float r=length(q); if(r>.5) discard; float a=smoothstep(.5,.0,r); a*=a; gl_FragColor=vec4(vC*a*vA*.8,1.); }` });
    this.points = new THREE.Points(g, m); this.points.frustumCulled = false; this.points.renderOrder = 3; scene.add(this.points); this.points.name = 'pulviscolo';
  }
  update(x, z) { this.u.uCenter.value.set(x, 0, z); }
}

export class Halos {
  constructor(scene, max = 16) {
    this.max = max; const g = new THREE.PlaneGeometry(1, 1); this.col = new Float32Array(max * 3); this.kind = new Float32Array(max); this.seed = new Float32Array(max).map(() => Math.random() * 10);
    g.setAttribute('aCol', new THREE.InstancedBufferAttribute(this.col, 3)); g.setAttribute('aKind', new THREE.InstancedBufferAttribute(this.kind, 1)); g.setAttribute('aSeed', new THREE.InstancedBufferAttribute(this.seed, 1));
    const m = new THREE.ShaderMaterial({ uniforms: { uTime: INK_UNIFORMS.uTime }, transparent: true, depthWrite: false, blending: THREE.AdditiveBlending,
      vertexShader: `attribute vec3 aCol; attribute float aKind,aSeed; varying vec3 vC; varying vec2 vUv; varying float vK,vS;
        void main(){ vC=aCol; vUv=uv; vK=aKind; vS=aSeed; vec3 c=(modelMatrix*instanceMatrix*vec4(0.,0.,0.,1.)).xyz; float sc=length(instanceMatrix[0].xyz); vec3 w;
          if(aKind<.5){ vec3 R=vec3(viewMatrix[0][0],viewMatrix[1][0],viewMatrix[2][0]), U=vec3(viewMatrix[0][1],viewMatrix[1][1],viewMatrix[2][1]); w=c+(R*position.x+U*position.y)*sc; } // alone nell'aria: guarda sempre la camera
          else w=c+vec3(position.x,0.,-position.y)*sc; // pozza calda sul pavimento
          gl_Position=projectionMatrix*viewMatrix*vec4(w,1.); }`,
      fragmentShader: `uniform float uTime; varying vec3 vC; varying vec2 vUv; varying float vK,vS; ${NOISE}
        void main(){ vec2 q=vUv-.5; float r=length(q)*2.; if(r>1.) discard; float a;
          if(vK<.5){ float ang=atan(q.y,q.x); float rays=pow(abs(sin(ang*5.+vS+sin(uTime*.4+vS)*.3)),26.)*.22+pow(abs(sin(ang*3.-vS*2.)),40.)*.15; // raggi tirati a penna, come nelle tavole
            a=exp(-r*r*9.)*.55+pow(1.-r,2.2)*.32+rays*(1.-r)*(1.-r)+smoothstep(.06,0.,abs(r-.62))*.05; }
          else { float wob=sin(atan(q.y,q.x)*7.+vS)*.04; a=pow(max(0.,1.-r-wob),1.8)*.6; }
          gl_FragColor=vec4(vC*a,1.); }` });
    this.mesh = new THREE.InstancedMesh(g, m, max); this.mesh.count = 0; this.mesh.frustumCulled = false; this.mesh.renderOrder = 2; this.mesh.name = 'aloni'; scene.add(this.mesh); this.m4 = new THREE.Matrix4(); this.n = 0;
  }
  // lights: [{x,y,z,kind,col,f,on}] — al massimo max/2 luci
  update(lights) { const M = this.m4; let n = 0;
    for (const l of lights) { if (n + 2 > this.max) break; if (!l.on) continue; const k = l.kind === 'lamp' ? [2.2, 4.4, 0.36] : l.kind === 'jar' ? [1.1, 1.9, 0.5] : [1.7, 2.8, 0.5]; const c = l.col, f = l.f;
      const add = (kind, x, y, z, s, i) => { M.makeScale(s, s, s); M.setPosition(x, y, z); this.mesh.setMatrixAt(n, M); this.kind[n] = kind; this.col[n * 3] = c[0] * i; this.col[n * 3 + 1] = c[1] * i; this.col[n * 3 + 2] = c[2] * i; n++; };
      add(0, l.x, l.y, l.z, k[0] * (0.92 + 0.08 * f), k[2] * f); add(1, l.x, 0.03, l.z, k[1] * (0.95 + 0.05 * f), 0.75 * f); }
    this.mesh.count = n; this.n = n; this.mesh.instanceMatrix.needsUpdate = true; const g = this.mesh.geometry.attributes; g.aCol.needsUpdate = g.aKind.needsUpdate = true; }
}
