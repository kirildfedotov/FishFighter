/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { FISH_SKINS } from '../services/storage';
import { FishColorPalette } from '../types';

interface PaletteColors {
  bodyBase: string;
  bodyHighlight: string;
  headMask: string;
  finBase: string;
  finMid: string;
  finRim: string;
  iridescenceTint: string;
  eyeIris: string;
  gillMembrane: string;
  pelvicTip: string;
}

const BETTA_PALETTES: Record<FishColorPalette, PaletteColors> = {
  tropical_paradise: {
    bodyBase: '#0891b2',      // Luminous tropical lagoon turquoise
    bodyHighlight: '#34d399', // Electric emerald-aqua scales
    headMask: '#064e3b',      // Deep tropical jade mask
    finBase: '#f97316',       // Vivid coral tangerine
    finMid: '#ec4899',        // Hibiscus magenta-pink
    finRim: '#fde047',        // Sunburst lemon-gold edge
    iridescenceTint: '#22d3ee',
    eyeIris: '#fde047',
    gillMembrane: '#be123c',
    pelvicTip: '#fef08a',
  },
  royal_blue: {
    bodyBase: '#1e3a8a',
    bodyHighlight: '#3b82f6',
    headMask: '#090d26',
    finBase: '#1d4ed8',
    finMid: '#6d28d9',
    finRim: '#f472b6',
    iridescenceTint: '#38bdf8',
    eyeIris: '#60a5fa',
    gillMembrane: '#7f1d1d',
    pelvicTip: '#f8fafc',
  },
  ruby_dragon: {
    bodyBase: '#b91c1c',
    bodyHighlight: '#f1f5f9', // Metallic dragon scales over crimson flesh
    headMask: '#450a0a',
    finBase: '#dc2626',
    finMid: '#ef4444',
    finRim: '#fbbf24',
    iridescenceTint: '#fb7185',
    eyeIris: '#f59e0b',
    gillMembrane: '#450a0a',
    pelvicTip: '#fef08a',
  },
  cyan_halfmoon: {
    bodyBase: '#0e7490',
    bodyHighlight: '#2dd4bf',
    headMask: '#042f2e',
    finBase: '#06b6d4',
    finMid: '#10b981',
    finRim: '#ecfeff',
    iridescenceTint: '#67e8f9',
    eyeIris: '#34d399',
    gillMembrane: '#881337',
    pelvicTip: '#ffffff',
  },
  black_samurai: {
    bodyBase: '#18181b',
    bodyHighlight: '#e4e4e7', // Platinum samurai armor scales
    headMask: '#09090b',
    finBase: '#18181b',
    finMid: '#3f3f46',
    finRim: '#f4f4f5',
    iridescenceTint: '#cbd5e1',
    eyeIris: '#e2e8f0',
    gillMembrane: '#991b1b',
    pelvicTip: '#ffffff',
  },
  sakura_blossom: {
    bodyBase: '#e11d48',
    bodyHighlight: '#fbcfe8',
    headMask: '#881337',
    finBase: '#f43f5e',
    finMid: '#f9a8d4',
    finRim: '#fff1f2',
    iridescenceTint: '#fda4af',
    eyeIris: '#fbcfe8',
    gillMembrane: '#881337',
    pelvicTip: '#ffffff',
  },
  golden_imperial: {
    bodyBase: '#b45309',
    bodyHighlight: '#fef08a',
    headMask: '#451a03',
    finBase: '#d97706',
    finMid: '#facc15',
    finRim: '#ffffff',
    iridescenceTint: '#fde047',
    eyeIris: '#fde047',
    gillMembrane: '#991b1b',
    pelvicTip: '#ffffff',
  },
};

// Pre-allocated scratch math helpers (zero GC in loop)
const _toTarget = new THREE.Vector3();
const _desiredVel = new THREE.Vector3();

function shortestAngleDiff(from: number, to: number): number {
  let diff = (to - from + Math.PI) % (Math.PI * 2);
  if (diff < 0) diff += Math.PI * 2;
  return diff - Math.PI;
}

export class BettaFish {
  public group: THREE.Group;

  // Sub-assemblies
  private fishRoot: THREE.Group;
  private bodyMesh!: THREE.Mesh;
  private bodyGeom!: THREE.BufferGeometry;
  private bodyOriginalPositions!: Float32Array;

  private lowerJawMesh!: THREE.Mesh;
  private leftEye!: THREE.Group;
  private rightEye!: THREE.Group;
  private leftPupilGroup!: THREE.Group;
  private rightPupilGroup!: THREE.Group;
  private leftOperculum!: THREE.Mesh;
  private rightOperculum!: THREE.Mesh;
  private leftBranchioBeard!: THREE.Mesh;
  private rightBranchioBeard!: THREE.Mesh;

  // Flowing Silk Fins
  private caudalFinMesh!: THREE.Mesh;
  private caudalFinGeom!: THREE.BufferGeometry;
  private caudalOriginalPositions!: Float32Array;

  private dorsalFinMesh!: THREE.Mesh;
  private dorsalFinGeom!: THREE.BufferGeometry;
  private dorsalOriginalPositions!: Float32Array;

  private analFinMesh!: THREE.Mesh;
  private analFinGeom!: THREE.BufferGeometry;
  private analOriginalPositions!: Float32Array;

  private leftPelvicMesh!: THREE.Mesh;
  private leftPelvicGeom!: THREE.BufferGeometry;
  private leftPelvicOrig!: Float32Array;

  private rightPelvicMesh!: THREE.Mesh;
  private rightPelvicGeom!: THREE.BufferGeometry;
  private rightPelvicOrig!: Float32Array;

  private leftPectoralFin!: THREE.Mesh;
  private rightPectoralFin!: THREE.Mesh;

  // VIP Crown
  private vipCrownGroup: THREE.Group;

  // Materials & Procedural Textures
  private bodyMaterial!: THREE.MeshPhysicalMaterial;
  private caudalMaterial!: THREE.MeshPhysicalMaterial;
  private sailMaterial!: THREE.MeshPhysicalMaterial;
  private pectoralMaterial!: THREE.MeshPhysicalMaterial;
  private pelvicMaterial!: THREE.MeshPhysicalMaterial;
  private irisMaterial!: THREE.MeshStandardMaterial;
  private corneaMaterial!: THREE.MeshPhysicalMaterial;
  private pupilMaterial!: THREE.MeshStandardMaterial;
  private gillMembraneMaterial!: THREE.MeshStandardMaterial;
  private goldMaterial!: THREE.MeshStandardMaterial;

  private bodyTexture!: THREE.CanvasTexture;
  private scaleNormalTexture!: THREE.CanvasTexture;
  private caudalTexture!: THREE.CanvasTexture;
  private sailTexture!: THREE.CanvasTexture;
  private pectoralTexture!: THREE.CanvasTexture;

  // Kinematics & State
  public targetPosition: THREE.Vector3 = new THREE.Vector3(0, 0.15, 0);
  public currentPosition: THREE.Vector3 = new THREE.Vector3(0, 0.15, 0);
  public velocity: THREE.Vector3 = new THREE.Vector3(0.4, 0, 0);
  private swimSpeed: number = 0.78;
  private wanderTimer: number = 0;
  private animTime: number = 0;
  private headingAngle: number = 0;
  private pitchAngle: number = 0;
  private rollAngle: number = 0;

  // Emotional & Behavioral states
  public isFlaring: boolean = false;
  public flareIntensity: number = 0;
  public isExcited: boolean = false;
  public isSleeping: boolean = false;
  private mouthGulpTimer: number = 0;
  public currentSkinId: FishColorPalette = 'royal_blue';
  private isSoftwareGl: boolean = false;

  constructor(skinId: FishColorPalette = 'tropical_paradise', isSoftwareGl = false) {
    this.isSoftwareGl = isSoftwareGl;
    this.group = new THREE.Group();
    this.fishRoot = new THREE.Group();
    this.vipCrownGroup = new THREE.Group();
    this.currentSkinId = skinId;

    this.initTextures(BETTA_PALETTES[skinId] || BETTA_PALETTES.tropical_paradise);
    this.initMaterials();
    this.buildSculptedBody();
    this.buildMouthAndGills();
    this.buildEyes();
    this.buildShowFins();
    this.buildVipCrown();
    this.updateSkin(skinId);

    this.fishRoot.scale.setScalar(0.56);
    this.group.add(this.fishRoot);
    this.fishRoot.add(this.vipCrownGroup);
    this.vipCrownGroup.visible = false;
  }

  private initTextures(palette: PaletteColors) {
    // 1. Body Scale Albedo Texture (1024x512: Head Mask -> Iridescent Scales -> Belly Gradient)
    const bCanvas = document.createElement('canvas');
    bCanvas.width = 1024;
    bCanvas.height = 512;
    const bCtx = bCanvas.getContext('2d')!;
    this.paintBodySkin(bCtx, palette);

    this.bodyTexture = new THREE.CanvasTexture(bCanvas);
    this.bodyTexture.colorSpace = THREE.SRGBColorSpace;
    this.bodyTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.bodyTexture.wrapT = THREE.RepeatWrapping;

    // 2. Matching Cycloid Scale Normal Map
    const nCanvas = document.createElement('canvas');
    nCanvas.width = 512;
    nCanvas.height = 256;
    const nCtx = nCanvas.getContext('2d')!;
    nCtx.fillStyle = 'rgb(128, 128, 255)';
    nCtx.fillRect(0, 0, 512, 256);

    const rows = 20;
    const cols = 42;
    const cw = 512 / cols;
    const ch = 256 / rows;
    for (let c = 0; c < cols; c++) {
      // Smooth skin on head region (u < 0.22)
      if (c / cols < 0.22) continue;
      for (let r = 0; r < rows; r++) {
        const cx = c * cw;
        const cy = (r + (c % 2 === 0 ? 0 : 0.5)) * ch;
        const grad = nCtx.createRadialGradient(cx + cw * 0.2, cy, 0, cx, cy, ch * 0.65);
        grad.addColorStop(0, 'rgb(165, 138, 255)');
        grad.addColorStop(0.65, 'rgb(128, 128, 255)');
        grad.addColorStop(1, 'rgb(95, 118, 240)');
        nCtx.fillStyle = grad;
        nCtx.beginPath();
        nCtx.arc(cx, cy, ch * 0.62, 0, Math.PI * 2);
        nCtx.fill();
      }
    }
    this.scaleNormalTexture = new THREE.CanvasTexture(nCanvas);
    this.scaleNormalTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.scaleNormalTexture.wrapT = THREE.RepeatWrapping;

    // 3. Polar-mapped Halfmoon Caudal Fin Texture (u = radial 0..1, v = angular 0..1)
    const cCanvas = document.createElement('canvas');
    cCanvas.width = 512;
    cCanvas.height = 512;
    const cCtx = cCanvas.getContext('2d')!;
    this.paintCaudalTexture(cCtx, palette);

    this.caudalTexture = new THREE.CanvasTexture(cCanvas);
    this.caudalTexture.colorSpace = THREE.SRGBColorSpace;
    this.caudalTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.caudalTexture.wrapT = THREE.ClampToEdgeWrapping;

    // 4. Dorsal & Anal Sail Fin Texture (u = anterior->posterior 0..1, v = base->tip 0..1)
    const sCanvas = document.createElement('canvas');
    sCanvas.width = 512;
    sCanvas.height = 512;
    const sCtx = sCanvas.getContext('2d')!;
    this.paintSailTexture(sCtx, palette);

    this.sailTexture = new THREE.CanvasTexture(sCanvas);
    this.sailTexture.colorSpace = THREE.SRGBColorSpace;
    this.sailTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.sailTexture.wrapT = THREE.ClampToEdgeWrapping;

    // 5. Delicate Translucent Pectoral Fin Texture
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 256;
    pCanvas.height = 256;
    const pCtx = pCanvas.getContext('2d')!;
    this.paintPectoralTexture(pCtx, palette);

    this.pectoralTexture = new THREE.CanvasTexture(pCanvas);
    this.pectoralTexture.colorSpace = THREE.SRGBColorSpace;
  }

  private paintBodySkin(ctx: CanvasRenderingContext2D, p: PaletteColors, skinId: FishColorPalette = this.currentSkinId) {
    const isTropical = skinId === 'tropical_paradise';

    // U runs 0 (snout) -> 1 (peduncle). V runs around circumference.
    const baseGrad = ctx.createLinearGradient(0, 0, 1024, 0);
    if (isTropical) {
      baseGrad.addColorStop(0.0, p.headMask);
      baseGrad.addColorStop(0.16, '#0f766e');
      baseGrad.addColorStop(0.32, '#06b6d4');
      baseGrad.addColorStop(0.62, '#10b981');
      baseGrad.addColorStop(0.84, '#f97316');
      baseGrad.addColorStop(1.0, '#ec4899');
    } else {
      baseGrad.addColorStop(0.0, p.headMask);
      baseGrad.addColorStop(0.18, p.headMask);
      baseGrad.addColorStop(0.32, p.bodyBase);
      baseGrad.addColorStop(0.85, p.bodyBase);
      baseGrad.addColorStop(1.0, p.finBase);
    }
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, 1024, 512);

    // Tropical Reef Koi Saddle Patches (coral-orange, hibiscus magenta & sunlit gold splashes)
    if (isTropical) {
      const patches = [
        { x: 380, y: 125, rx: 120, ry: 58, color: 'rgba(249, 115, 22, 0.72)' },
        { x: 380, y: 385, rx: 120, ry: 58, color: 'rgba(249, 115, 22, 0.72)' },
        { x: 640, y: 256, rx: 145, ry: 72, color: 'rgba(236, 72, 153, 0.65)' },
        { x: 520, y: 85, rx: 95, ry: 44, color: 'rgba(250, 204, 21, 0.68)' },
        { x: 520, y: 425, rx: 95, ry: 44, color: 'rgba(250, 204, 21, 0.68)' },
        { x: 850, y: 180, rx: 110, ry: 60, color: 'rgba(251, 146, 60, 0.75)' },
        { x: 850, y: 332, rx: 110, ry: 60, color: 'rgba(251, 146, 60, 0.75)' },
      ];
      for (const patch of patches) {
        const pg = ctx.createRadialGradient(patch.x, patch.y, 8, patch.x, patch.y, patch.rx);
        pg.addColorStop(0, patch.color);
        pg.addColorStop(0.65, patch.color.replace(/0\.\d+/, '0.35'));
        pg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = pg;
        ctx.beginPath();
        ctx.ellipse(patch.x, patch.y, patch.rx, patch.ry, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Subtle lateral iridescent sheen band
    const flankGrad = ctx.createLinearGradient(0, 0, 0, 512);
    flankGrad.addColorStop(0.0, 'rgba(0,0,0,0.22)'); // belly/ventral
    flankGrad.addColorStop(0.25, 'rgba(255,255,255,0.1)'); // flank
    flankGrad.addColorStop(0.5, isTropical ? 'rgba(6, 78, 59, 0.25)' : 'rgba(0,0,0,0.35)'); // dorsal spine
    flankGrad.addColorStop(0.75, 'rgba(255,255,255,0.1)'); // opposite flank
    flankGrad.addColorStop(1.0, 'rgba(0,0,0,0.22)');
    ctx.fillStyle = flankGrad;
    ctx.fillRect(0, 0, 1024, 512);

    // Overlapping metallic dragon/cycloid scales from shoulder (u=0.22) to peduncle (u=0.98)
    const rows = 20;
    const cols = 42;
    const cw = 1024 / cols;
    const ch = 512 / rows;

    for (let c = 0; c < cols; c++) {
      const u = c / cols;
      if (u < 0.21) continue;
      const scaleAlpha = Math.min(1, (u - 0.21) / 0.14);

      for (let r = 0; r < rows; r++) {
        const cx = c * cw;
        const cy = (r + (c % 2 === 0 ? 0 : 0.5)) * ch;

        // Pick sparkling jewel-tone accents on tropical fish
        const tropicalShift = (c * 7 + r * 11) % 9;
        const centerColor = isTropical
          ? tropicalShift === 0
            ? '#fde047'
            : tropicalShift === 3
            ? '#22d3ee'
            : tropicalShift === 6
            ? '#fb7185'
            : p.bodyHighlight
          : p.bodyHighlight;

        // Scale metallic center highlight
        ctx.save();
        ctx.globalAlpha = (isTropical ? 0.78 : 0.72) * scaleAlpha;
        const sg = ctx.createRadialGradient(cx - cw * 0.1, cy, 1, cx, cy, ch * 0.58);
        sg.addColorStop(0, centerColor);
        sg.addColorStop(0.65, isTropical && u > 0.72 ? p.finBase : p.bodyBase);
        sg.addColorStop(1, 'rgba(0,0,0,0.48)');
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.arc(cx, cy, ch * 0.56, 0, Math.PI * 2);
        ctx.fill();

        // Crisp dark pocket rim
        ctx.globalAlpha = 0.4 * scaleAlpha;
        ctx.strokeStyle = '#05050a';
        ctx.lineWidth = 1.6;
        ctx.beginPath();
        ctx.arc(cx, cy, ch * 0.54, -Math.PI * 0.45, Math.PI * 0.45);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  private paintCaudalTexture(ctx: CanvasRenderingContext2D, p: PaletteColors, skinId: FishColorPalette = this.currentSkinId) {
    const isTropical = skinId === 'tropical_paradise';
    ctx.clearRect(0, 0, 512, 512);

    // U (x: 0..512) = radial distance from root (0) to outer tip (512)
    // V (y: 0..512) = angular span across fan
    const grad = ctx.createLinearGradient(0, 0, 512, 0);
    if (isTropical) {
      grad.addColorStop(0.0, 'rgba(6, 182, 212, 0.98)');   // Electric lagoon turquoise root
      grad.addColorStop(0.22, 'rgba(249, 115, 22, 0.94)'); // Coral tangerine mid-inner
      grad.addColorStop(0.55, 'rgba(236, 72, 153, 0.86)'); // Hibiscus magenta middle
      grad.addColorStop(0.82, 'rgba(250, 204, 21, 0.76)'); // Sunburst gold outer band
      grad.addColorStop(0.95, 'rgba(103, 232, 249, 0.5)'); // Aqua translucent lace trim
      grad.addColorStop(1.0, 'rgba(254, 240, 138, 0.08)');
    } else {
      grad.addColorStop(0.0, this.hexToRgba(p.bodyBase, 0.98));
      grad.addColorStop(0.18, this.hexToRgba(p.finBase, 0.92));
      grad.addColorStop(0.55, this.hexToRgba(p.finMid, 0.82));
      grad.addColorStop(0.82, this.hexToRgba(p.finRim, 0.72));
      grad.addColorStop(0.95, this.hexToRgba(p.finRim, 0.45));
      grad.addColorStop(1.0, this.hexToRgba(p.finRim, 0.05));
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Tropical Koi spotting along fin fan
    if (isTropical) {
      const spots = [
        { x: 110, y: 120, r: 34, c: 'rgba(253, 224, 71, 0.32)' },
        { x: 170, y: 260, r: 42, c: 'rgba(34, 211, 238, 0.28)' },
        { x: 130, y: 390, r: 36, c: 'rgba(253, 224, 71, 0.32)' },
        { x: 295, y: 175, r: 30, c: 'rgba(251, 113, 133, 0.3)' },
        { x: 280, y: 345, r: 32, c: 'rgba(52, 211, 153, 0.26)' },
      ];
      for (const sp of spots) {
        const sg = ctx.createRadialGradient(sp.x, sp.y, 2, sp.x, sp.y, sp.r);
        sg.addColorStop(0, sp.c);
        sg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    // Delicate butterfly banding / marbled veining
    ctx.fillStyle = this.hexToRgba(p.bodyHighlight, 0.14);
    for (let band = 0; band < 3; band++) {
      const bx = 130 + band * 105;
      ctx.beginPath();
      for (let y = 0; y <= 512; y += 16) {
        const x = bx + Math.sin(y * 0.05 + band) * 14;
        if (y === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.lineTo(bx + 28, 512);
      ctx.lineTo(bx + 28, 0);
      ctx.closePath();
      ctx.fill();
    }

    // Bifurcating cartilaginous fin rays (Lepidotrichia) along U!
    const numRays = 42;
    for (let i = 0; i < numRays; i++) {
      const y = (i + 0.5) * (512 / numRays);

      // Thick primary ray from base to bifurcation point
      ctx.strokeStyle = this.hexToRgba(isTropical ? '#67e8f9' : p.bodyHighlight, 0.62);
      ctx.lineWidth = 2.4;
      ctx.beginPath();
      ctx.moveTo(0, y);
      ctx.lineTo(170, y);
      ctx.stroke();

      // Secondary split
      ctx.strokeStyle = this.hexToRgba(p.finRim, 0.48);
      ctx.lineWidth = 1.4;
      ctx.beginPath();
      ctx.moveTo(170, y);
      ctx.lineTo(350, y - 3.2);
      ctx.moveTo(170, y);
      ctx.lineTo(350, y + 3.2);
      ctx.stroke();

      // Tertiary delicate split to edge
      ctx.strokeStyle = this.hexToRgba(isTropical ? '#fef08a' : p.finRim, 0.38);
      ctx.lineWidth = 0.9;
      ctx.beginPath();
      ctx.moveTo(350, y - 3.2);
      ctx.lineTo(506, y - 5.0);
      ctx.moveTo(350, y - 3.2);
      ctx.lineTo(506, y - 1.4);
      ctx.moveTo(350, y + 3.2);
      ctx.lineTo(506, y + 1.4);
      ctx.moveTo(350, y + 3.2);
      ctx.lineTo(506, y + 5.0);
      ctx.stroke();
    }

    // Subtle dark inter-ray shadows for silk pleat depth
    for (let i = 0; i < numRays; i++) {
      const y = i * (512 / numRays);
      ctx.strokeStyle = 'rgba(0, 0, 10, 0.16)';
      ctx.lineWidth = 1.5;
      ctx.beginPath();
      ctx.moveTo(20, y);
      ctx.lineTo(490, y);
      ctx.stroke();
    }
  }

  private paintSailTexture(ctx: CanvasRenderingContext2D, p: PaletteColors, skinId: FishColorPalette = this.currentSkinId) {
    const isTropical = skinId === 'tropical_paradise';
    ctx.clearRect(0, 0, 512, 512);

    const grad = ctx.createLinearGradient(0, 512, 0, 0);
    if (isTropical) {
      grad.addColorStop(0.0, 'rgba(8, 145, 178, 0.98)');
      grad.addColorStop(0.24, 'rgba(249, 115, 22, 0.92)');
      grad.addColorStop(0.58, 'rgba(236, 72, 153, 0.84)');
      grad.addColorStop(0.86, 'rgba(250, 204, 21, 0.7)');
      grad.addColorStop(1.0, 'rgba(103, 232, 249, 0.16)');
    } else {
      grad.addColorStop(0.0, this.hexToRgba(p.bodyBase, 0.98));
      grad.addColorStop(0.22, this.hexToRgba(p.finBase, 0.92));
      grad.addColorStop(0.6, this.hexToRgba(p.finMid, 0.8));
      grad.addColorStop(0.88, this.hexToRgba(p.finRim, 0.65));
      grad.addColorStop(1.0, this.hexToRgba(p.finRim, 0.12));
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    // Sweeping curved fin rays fanning backward (increasing X as Y goes from base 512 to tip 0)
    const numRays = 28;
    for (let i = 0; i < numRays; i++) {
      const baseX = (i / numRays) * 440 + 10;
      const tipX = Math.min(508, baseX + 65 + (i / numRays) * 35);

      ctx.strokeStyle = this.hexToRgba(isTropical ? '#67e8f9' : p.bodyHighlight, 0.56);
      ctx.lineWidth = 2.2;
      ctx.beginPath();
      ctx.moveTo(baseX, 512);
      ctx.quadraticCurveTo(baseX + 20, 270, tipX, 8);
      ctx.stroke();

      // Secondary ray highlight
      ctx.strokeStyle = this.hexToRgba(p.finRim, 0.42);
      ctx.lineWidth = 1.1;
      ctx.beginPath();
      ctx.moveTo((baseX + tipX) * 0.5, 256);
      ctx.lineTo(Math.min(510, tipX + 8), 8);
      ctx.stroke();
    }
  }

  private paintPectoralTexture(ctx: CanvasRenderingContext2D, p: PaletteColors, skinId: FishColorPalette = this.currentSkinId) {
    const isTropical = skinId === 'tropical_paradise';
    ctx.clearRect(0, 0, 256, 256);
    const grad = ctx.createRadialGradient(20, 128, 5, 110, 128, 160);
    grad.addColorStop(0.0, this.hexToRgba(isTropical ? '#22d3ee' : p.bodyHighlight, 0.72));
    grad.addColorStop(0.45, this.hexToRgba(isTropical ? '#fb923c' : p.finRim, 0.42));
    grad.addColorStop(0.85, this.hexToRgba(isTropical ? '#fde047' : '#ffffff', 0.28));
    grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.02)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = isTropical ? 'rgba(254, 240, 138, 0.55)' : 'rgba(255, 255, 255, 0.45)';
    ctx.lineWidth = 1.2;
    for (let i = -8; i <= 8; i++) {
      const angle = i * 0.08;
      ctx.beginPath();
      ctx.moveTo(12, 128);
      ctx.lineTo(12 + Math.cos(angle) * 230, 128 + Math.sin(angle) * 230);
      ctx.stroke();
    }
  }

  private hexToRgba(hex: string, alpha: number): string {
    const clean = hex.replace('#', '');
    const num = parseInt(clean, 16);
    const r = (num >> 16) & 255;
    const g = (num >> 8) & 255;
    const b = num & 255;
    return `rgba(${r}, ${g}, ${b}, ${alpha})`;
  }

  private initMaterials() {
    this.bodyMaterial = new THREE.MeshPhysicalMaterial({
      map: this.bodyTexture,
      normalMap: this.scaleNormalTexture,
      normalScale: new THREE.Vector2(0.42, 0.42),
      roughness: 0.24,
      metalness: 0.38,
      clearcoat: 1.0,
      clearcoatRoughness: 0.08,
      iridescence: 1.0,
      iridescenceIOR: 1.42,
      iridescenceThicknessRange: [160, 520],
      sheen: 0.85,
      sheenRoughness: 0.3,
      sheenColor: new THREE.Color('#38bdf8'),
    });

    const createSilkMaterial = (tex: THREE.CanvasTexture, opacity: number) =>
      new THREE.MeshPhysicalMaterial({
        map: tex,
        transparent: true,
        opacity,
        alphaTest: 0.02,
        roughness: 0.28,
        metalness: 0.12,
        clearcoat: 0.7,
        clearcoatRoughness: 0.18,
        iridescence: 0.85,
        iridescenceIOR: 1.35,
        iridescenceThicknessRange: [200, 480],
        sheen: 1.0,
        sheenColor: new THREE.Color('#f472b6'),
        side: THREE.DoubleSide,
        depthWrite: false,
      });

    this.caudalMaterial = createSilkMaterial(this.caudalTexture, 0.94);
    this.sailMaterial = createSilkMaterial(this.sailTexture, 0.92);
    this.pectoralMaterial = createSilkMaterial(this.pectoralTexture, 0.72);
    this.pelvicMaterial = new THREE.MeshPhysicalMaterial({
      color: '#3b82f6',
      roughness: 0.25,
      metalness: 0.2,
      clearcoat: 0.8,
      iridescence: 0.8,
      transparent: true,
      opacity: 0.92,
      side: THREE.DoubleSide,
    });

    this.irisMaterial = new THREE.MeshStandardMaterial({
      color: 0x60a5fa,
      roughness: 0.18,
      metalness: 0.5,
    });

    this.corneaMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.04,
      metalness: 0.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.03,
      transparent: true,
      opacity: 0.28,
      depthWrite: false,
    });

    this.pupilMaterial = new THREE.MeshStandardMaterial({
      color: 0x020205,
      roughness: 0.04,
      metalness: 0.1,
    });

    this.gillMembraneMaterial = new THREE.MeshStandardMaterial({
      color: 0x7f1d1d,
      roughness: 0.45,
      metalness: 0.05,
      side: THREE.DoubleSide,
    });

    this.goldMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.95,
      roughness: 0.16,
    });
  }

  // Anatomically faithful sculpted Betta splendens torso (44 longitudinal rings x 28 radial segments)
  private buildSculptedBody() {
    const numRings = 44;
    const radialSegs = 28;

    // Longitudinal profile from upturned mouth tip (x=0.92) to tail fan base (x=-1.18)
    const profiles: { x: number; yOff: number; rY: number; rZ: number; ridge: number }[] = [
      { x: 0.92,  yOff: 0.115, rY: 0.022, rZ: 0.024, ridge: 0.0  }, // Upper snout tip
      { x: 0.86,  yOff: 0.105, rY: 0.055, rZ: 0.045, ridge: 0.02 }, // Mouth bridge
      { x: 0.76,  yOff: 0.10,  rY: 0.095, rZ: 0.072, ridge: 0.04 }, // Forehead concavity
      { x: 0.62,  yOff: 0.115, rY: 0.145, rZ: 0.098, ridge: 0.06 }, // Eye socket plane
      { x: 0.46,  yOff: 0.12,  rY: 0.192, rZ: 0.122, ridge: 0.09 }, // Cranial arch / operculum
      { x: 0.28,  yOff: 0.105, rY: 0.228, rZ: 0.132, ridge: 0.12 }, // Deep chest & pectoral root
      { x: 0.08,  yOff: 0.08,  rY: 0.225, rZ: 0.126, ridge: 0.14 }, // Full flank
      { x: -0.16, yOff: 0.055, rY: 0.198, rZ: 0.102, ridge: 0.12 }, // Dorsal/anal insertion
      { x: -0.44, yOff: 0.032, rY: 0.152, rZ: 0.072, ridge: 0.09 }, // Posterior taper
      { x: -0.72, yOff: 0.018, rY: 0.105, rZ: 0.046, ridge: 0.05 }, // Peduncle start
      { x: -0.98, yOff: 0.008, rY: 0.072, rZ: 0.032, ridge: 0.02 }, // Caudal peduncle
      { x: -1.18, yOff: 0.0,   rY: 0.045, rZ: 0.02,  ridge: 0.0  }, // Tail fan root
    ];

    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    for (let r = 0; r < numRings; r++) {
      const u = r / (numRings - 1);
      const scaled = u * (profiles.length - 1);
      const i0 = Math.floor(scaled);
      const i1 = Math.min(profiles.length - 1, i0 + 1);
      const f = scaled - i0;
      const smoothF = f * f * (3 - 2 * f); // smoothstep interpolation

      const p0 = profiles[i0];
      const p1 = profiles[i1];

      const x = THREE.MathUtils.lerp(p0.x, p1.x, smoothF);
      const yOff = THREE.MathUtils.lerp(p0.yOff, p1.yOff, smoothF);
      const rY = THREE.MathUtils.lerp(p0.rY, p1.rY, smoothF);
      const rZ = THREE.MathUtils.lerp(p0.rZ, p1.rZ, smoothF);
      const ridge = THREE.MathUtils.lerp(p0.ridge, p1.ridge, smoothF);

      for (let s = 0; s <= radialSegs; s++) {
        const v = s / radialSegs;
        const theta = v * Math.PI * 2;
        const sinT = Math.sin(theta);
        const cosT = Math.cos(theta);

        // Keel shaping: sharper dorsal spine and fuller rounded chest
        const dorsalBoost = sinT > 0 ? 1 + ridge * Math.pow(sinT, 2.2) : 1;
        const lateralPinch = 1 - Math.abs(sinT) * 0.12;

        const y = yOff + sinT * rY * dorsalBoost;
        const z = cosT * rZ * lateralPinch;

        positions.push(x, y, z);
        uvs.push(u, v);
      }
    }

    const rowSize = radialSegs + 1;
    for (let r = 0; r < numRings - 1; r++) {
      for (let s = 0; s < radialSegs; s++) {
        const a = r * rowSize + s;
        const b = (r + 1) * rowSize + s;
        const c = r * rowSize + (s + 1);
        const d = (r + 1) * rowSize + (s + 1);
        indices.push(a, b, c);
        indices.push(c, b, d);
      }
    }

    this.bodyGeom = new THREE.BufferGeometry();
    this.bodyGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.bodyGeom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    this.bodyGeom.setIndex(indices);
    this.bodyGeom.computeVertexNormals();

    this.bodyOriginalPositions = new Float32Array(positions);

    this.bodyMesh = new THREE.Mesh(this.bodyGeom, this.bodyMaterial);
    this.bodyMesh.castShadow = true;
    this.bodyMesh.receiveShadow = true;
    this.fishRoot.add(this.bodyMesh);
  }

  // Sculpted Upturned Betta Lower Jaw + Curved Cheek Operculum + Crimson Flare Beard
  private buildMouthAndGills() {
    // Upturned lower lip / jaw (can subtly open when gulping/breathing)
    const jawGeom = new THREE.SphereGeometry(0.042, 12, 12);
    jawGeom.scale(1.35, 0.55, 0.85);
    this.lowerJawMesh = new THREE.Mesh(jawGeom, this.bodyMaterial);
    this.lowerJawMesh.position.set(0.89, 0.088, 0);
    this.lowerJawMesh.rotation.z = 0.25;
    this.fishRoot.add(this.lowerJawMesh);

    // Curved contoured Operculum plates (hug the cheeks cleanly!)
    const opGeom = new THREE.SphereGeometry(0.16, 16, 14, 0, Math.PI * 0.72, Math.PI * 0.22, Math.PI * 0.62);
    opGeom.scale(1.15, 1.15, 0.58);

    this.leftOperculum = new THREE.Mesh(opGeom, this.bodyMaterial);
    this.leftOperculum.position.set(0.44, 0.11, 0.035);
    this.leftOperculum.rotation.y = Math.PI * 0.18;
    this.fishRoot.add(this.leftOperculum);

    this.rightOperculum = new THREE.Mesh(opGeom, this.bodyMaterial);
    this.rightOperculum.position.set(0.44, 0.11, -0.035);
    this.rightOperculum.rotation.y = -Math.PI * 0.18;
    this.rightOperculum.scale.z = -1;
    this.fishRoot.add(this.rightOperculum);

    // Dramatic Branchiostegal Gill Flare Beard (emerges from under gill covers on flare)
    const beardShape = new THREE.Shape();
    beardShape.moveTo(0, 0);
    beardShape.quadraticCurveTo(0.08, -0.14, 0.0, -0.2);
    beardShape.quadraticCurveTo(-0.12, -0.18, -0.14, -0.02);
    beardShape.closePath();

    const beardGeom = new THREE.ShapeGeometry(beardShape, 12);
    this.leftBranchioBeard = new THREE.Mesh(beardGeom, this.gillMembraneMaterial);
    this.leftBranchioBeard.position.set(0.48, 0.03, 0.06);
    this.leftBranchioBeard.rotation.set(0.35, 0.4, 0);
    this.leftBranchioBeard.scale.set(0.1, 0.1, 0.1);
    this.fishRoot.add(this.leftBranchioBeard);

    this.rightBranchioBeard = new THREE.Mesh(beardGeom, this.gillMembraneMaterial);
    this.rightBranchioBeard.position.set(0.48, 0.03, -0.06);
    this.rightBranchioBeard.rotation.set(-0.35, -0.4, 0);
    this.rightBranchioBeard.scale.set(0.1, 0.1, 0.1);
    this.fishRoot.add(this.rightBranchioBeard);
  }

  private buildEyes() {
    this.leftEye = this.createRealisticEye(true);
    this.rightEye = this.createRealisticEye(false);
    this.fishRoot.add(this.leftEye);
    this.fishRoot.add(this.rightEye);
  }

  private createRealisticEye(isLeft: boolean): THREE.Group {
    const eye = new THREE.Group();
    const zSign = isLeft ? 1 : -1;

    // Metallic iridescent iris sphere
    const irisGeom = new THREE.SphereGeometry(0.056, 18, 18);
    irisGeom.scale(1.0, 1.0, 0.65);
    const iris = new THREE.Mesh(irisGeom, this.irisMaterial);
    eye.add(iris);

    // Movable pupil + catchlight group
    const pupilGroup = new THREE.Group();
    const pupilGeom = new THREE.SphereGeometry(0.036, 16, 16);
    pupilGeom.scale(1.0, 1.0, 0.55);
    const pupil = new THREE.Mesh(pupilGeom, this.pupilMaterial);
    pupil.position.set(0.012, 0.002, 0.022 * zSign);
    pupilGroup.add(pupil);

    // Crisp catchlight dot
    const sparkGeom = new THREE.SphereGeometry(0.011, 8, 8);
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const spark = new THREE.Mesh(sparkGeom, sparkMat);
    spark.position.set(0.022, 0.018, 0.038 * zSign);
    pupilGroup.add(spark);

    eye.add(pupilGroup);
    if (isLeft) this.leftPupilGroup = pupilGroup;
    else this.rightPupilGroup = pupilGroup;

    // Glossy outer cornea lens (no opaque occlusion)
    const corneaGeom = new THREE.SphereGeometry(0.06, 18, 18);
    corneaGeom.scale(1.0, 1.0, 0.72);
    const cornea = new THREE.Mesh(corneaGeom, this.corneaMaterial);
    eye.add(cornea);

    eye.position.set(0.67, 0.135, 0.072 * zSign);
    eye.rotation.y = 0.2 * zSign;
    return eye;
  }

  // Show-grade Halfmoon Caudal, Sweeping Dorsal, Full Anal Curtain, Ribbon Pelvics, Hummingbird Pectorals
  private buildShowFins() {
    // 1. Halfmoon 180-degree Caudal Fin (Tail)
    // Built cleanly WITHOUT duplicate reversed triangles so normals & iridescence shine!
    this.caudalFinGeom = this.createHalfmoonCaudal(1.95, 2.25, Math.PI * 1.04, 44, 28);
    this.caudalFinMesh = new THREE.Mesh(this.caudalFinGeom, this.caudalMaterial);
    this.caudalFinMesh.position.set(-1.16, 0.0, 0);
    this.caudalFinMesh.rotation.y = Math.PI;
    this.fishRoot.add(this.caudalFinMesh);
    this.caudalOriginalPositions = new Float32Array(this.caudalFinGeom.attributes.position.array);

    // 2. Majestic Crested Dorsal Fin (Sits flush along upper back from x=0.05 to x=-0.95)
    this.dorsalFinGeom = this.createShowSail(1.22, 0.92, 32, 18, true);
    this.dorsalFinMesh = new THREE.Mesh(this.dorsalFinGeom, this.sailMaterial);
    this.dorsalFinMesh.position.set(-0.32, 0.18, 0);
    this.fishRoot.add(this.dorsalFinMesh);
    this.dorsalOriginalPositions = new Float32Array(this.dorsalFinGeom.attributes.position.array);

    // 3. Long Sweeping Anal Curtain Fin (Stretches from belly x=0.05 all the way into tail overlap)
    this.analFinGeom = this.createShowSail(1.42, 1.04, 34, 18, false);
    this.analFinMesh = new THREE.Mesh(this.analFinGeom, this.sailMaterial);
    this.analFinMesh.position.set(-0.22, -0.14, 0);
    this.fishRoot.add(this.analFinMesh);
    this.analOriginalPositions = new Float32Array(this.analFinGeom.attributes.position.array);

    // 4. Graceful Sweeping Pelvic Ribbon Fins (Tapered curved blades instead of stiff sticks!)
    this.leftPelvicGeom = this.createPelvicRibbon();
    this.leftPelvicOrig = new Float32Array(this.leftPelvicGeom.attributes.position.array);
    this.leftPelvicMesh = new THREE.Mesh(this.leftPelvicGeom, this.pelvicMaterial);
    this.leftPelvicMesh.position.set(0.24, -0.14, 0.048);
    this.leftPelvicMesh.rotation.set(0.18, 0.08, -0.58); // Sweeps gracefully backward!
    this.fishRoot.add(this.leftPelvicMesh);

    this.rightPelvicGeom = this.createPelvicRibbon();
    this.rightPelvicOrig = new Float32Array(this.rightPelvicGeom.attributes.position.array);
    this.rightPelvicMesh = new THREE.Mesh(this.rightPelvicGeom, this.pelvicMaterial);
    this.rightPelvicMesh.position.set(0.24, -0.14, -0.048);
    this.rightPelvicMesh.rotation.set(-0.18, -0.08, -0.58);
    this.fishRoot.add(this.rightPelvicMesh);

    // 5. Delicate Gossamer Pectoral Fins
    const pectoralGeom = this.createPectoralFan();
    this.leftPectoralFin = new THREE.Mesh(pectoralGeom, this.pectoralMaterial);
    this.leftPectoralFin.position.set(0.32, 0.01, 0.115);
    this.leftPectoralFin.rotation.set(0.15, 0.48, -0.18);
    this.fishRoot.add(this.leftPectoralFin);

    this.rightPectoralFin = new THREE.Mesh(pectoralGeom, this.pectoralMaterial);
    this.rightPectoralFin.position.set(0.32, 0.01, -0.115);
    this.rightPectoralFin.rotation.set(-0.15, -0.48, -0.18);
    this.rightPectoralFin.scale.set(1, 1, -1);
    this.fishRoot.add(this.rightPectoralFin);
  }

  private createHalfmoonCaudal(
    width: number,
    length: number,
    arc: number,
    radialSegs: number,
    lengthSegs: number
  ): THREE.BufferGeometry {
    const geom = new THREE.BufferGeometry();
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    // Create fan grid (including r=0 arc of tiny peduncle vertices so UVs stay polar-clean without distortion!)
    const rowSize = radialSegs + 1;
    for (let r = 0; r <= lengthSegs; r++) {
      const radiusRatio = r / lengthSegs;
      const baseR = 0.04 + Math.pow(radiusRatio, 0.92) * length;

      for (let s = 0; s <= radialSegs; s++) {
        const v = s / radialSegs;
        const angle = -arc / 2 + v * arc;

        // Subtle Halfmoon D-shape profile + gentle rosetail edge frill
        const dShapeBoost = 1.0 - 0.12 * Math.pow(Math.abs(v - 0.5) * 2, 2);
        let rad = baseR * dShapeBoost;
        if (radiusRatio > 0.78) {
          const tipT = (radiusRatio - 0.78) / 0.22;
          rad += Math.sin(v * Math.PI * 22) * 0.045 * tipT * tipT;
        }

        const x = Math.cos(angle) * rad * (width / length);
        const y = Math.sin(angle) * rad;
        // Pleated silk fold depth along rays
        const z = Math.sin(v * Math.PI * 28) * 0.022 * radiusRatio;

        positions.push(x, y, z);
        uvs.push(radiusRatio, v);
      }
    }

    for (let r = 0; r < lengthSegs; r++) {
      for (let s = 0; s < radialSegs; s++) {
        const a = r * rowSize + s;
        const b = (r + 1) * rowSize + s;
        const c = r * rowSize + (s + 1);
        const d = (r + 1) * rowSize + (s + 1);
        indices.push(a, b, c);
        indices.push(c, b, d);
      }
    }

    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }

  private createShowSail(
    length: number,
    height: number,
    segX: number,
    segY: number,
    isDorsal: boolean
  ): THREE.BufferGeometry {
    const geom = new THREE.BufferGeometry();
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const ySign = isDorsal ? 1 : -1;
    const rowSize = segX + 1;

    for (let iy = 0; iy <= segY; iy++) {
      const v = iy / segY; // 0 = attached to body, 1 = flowing outer tip

      for (let ix = 0; ix <= segX; ix++) {
        const u = ix / segX; // 0 = front leading edge, 1 = rear trailing edge

        // Base attachment curves along body back/belly; outer tip sweeps boldly back
        const baseCurveY = -Math.sin(u * Math.PI * 0.75) * 0.05 * ySign;
        const crestShape = isDorsal
          ? Math.sin(Math.pow(u, 0.75) * Math.PI * 0.85) * 0.92 + Math.pow(u, 1.5) * 0.35
          : 0.45 + Math.sin(u * Math.PI * 0.8) * 0.42 + Math.pow(u, 1.4) * 0.38;

        const sweepX = -u * length * (1 + v * 0.48) + length * 0.45;
        const ruffle = v > 0.75 ? Math.sin(u * Math.PI * 16) * 0.03 * Math.pow((v - 0.75) / 0.25, 2) : 0;
        const y = baseCurveY + ySign * (v * height * crestShape + ruffle);

        // Silk pleating along Z
        const z = Math.sin(u * Math.PI * 18) * 0.018 * v;

        positions.push(sweepX, y, z);
        uvs.push(u, v);
      }
    }

    for (let iy = 0; iy < segY; iy++) {
      for (let ix = 0; ix < segX; ix++) {
        const a = iy * rowSize + ix;
        const b = (iy + 1) * rowSize + ix;
        const c = iy * rowSize + (ix + 1);
        const d = (iy + 1) * rowSize + (ix + 1);
        indices.push(a, b, c);
        indices.push(c, b, d);
      }
    }

    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }

  private createPelvicRibbon(): THREE.BufferGeometry {
    const lengthSegs = 16;
    const widthSegs = 4;
    const geom = new THREE.BufferGeometry();
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const len = 1.05;

    for (let iy = 0; iy <= lengthSegs; iy++) {
      const t = iy / lengthSegs; // 0 = chest attachment, 1 = pointed tip
      const halfW = Math.sin(Math.pow(t, 0.55) * Math.PI) * 0.085 * (1 - t * 0.45) + 0.004 * (1 - t);
      const y = -t * len;
      const curveX = -Math.pow(t, 1.6) * 0.25; // graceful sweep backward

      for (let ix = 0; ix <= widthSegs; ix++) {
        const u = ix / widthSegs;
        const x = curveX + (u - 0.5) * 2 * halfW;
        const z = Math.sin(u * Math.PI) * 0.012 * (1 - t);
        positions.push(x, y, z);
        uvs.push(u, t);
      }
    }

    const rowSize = widthSegs + 1;
    for (let iy = 0; iy < lengthSegs; iy++) {
      for (let ix = 0; ix < widthSegs; ix++) {
        const a = iy * rowSize + ix;
        const b = (iy + 1) * rowSize + ix;
        const c = iy * rowSize + (ix + 1);
        const d = (iy + 1) * rowSize + (ix + 1);
        indices.push(a, b, c);
        indices.push(c, b, d);
      }
    }

    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }

  private createPectoralFan(): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.bezierCurveTo(0.08, 0.16, 0.22, 0.25, 0.36, 0.16);
    shape.bezierCurveTo(0.44, 0.08, 0.42, -0.1, 0.3, -0.16);
    shape.bezierCurveTo(0.18, -0.2, 0.06, -0.1, 0, 0);

    const geom = new THREE.ShapeGeometry(shape, 14);
    // Normalize UVs to 0..1 across bounding box so pectoralTexture maps accurately
    geom.computeBoundingBox();
    const bb = geom.boundingBox!;
    const uvAttr = geom.attributes.uv;
    const posAttr = geom.attributes.position;
    const spanX = bb.max.x - bb.min.x || 1;
    const spanY = bb.max.y - bb.min.y || 1;
    for (let i = 0; i < posAttr.count; i++) {
      uvAttr.setXY(i, (posAttr.getX(i) - bb.min.x) / spanX, (posAttr.getY(i) - bb.min.y) / spanY);
    }
    geom.scale(0.85, 0.85, 0.85);
    return geom;
  }

  private buildVipCrown() {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.12, 0.05, 8), this.goldMaterial);
    this.vipCrownGroup.add(ring);

    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const peak = new THREE.Mesh(new THREE.ConeGeometry(0.032, 0.095, 4), this.goldMaterial);
      peak.position.set(Math.cos(angle) * 0.095, 0.06, Math.sin(angle) * 0.095);
      this.vipCrownGroup.add(peak);
    }

    const gem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.028),
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.1, metalness: 0.2 })
    );
    gem.position.set(0.105, 0.025, 0);
    this.vipCrownGroup.add(gem);

    this.vipCrownGroup.position.set(0.5, 0.34, 0);
    this.vipCrownGroup.rotation.z = -0.15;
  }

  public setVip(isVip: boolean) {
    this.vipCrownGroup.visible = isVip;
  }

  public triggerGulp() {
    this.mouthGulpTimer = 0.45;
  }

  public updateSkin(skinId: FishColorPalette) {
    this.currentSkinId = skinId;
    const palette = BETTA_PALETTES[skinId] || BETTA_PALETTES.tropical_paradise;
    const preset = FISH_SKINS[skinId] || FISH_SKINS.tropical_paradise;

    // Repaint all procedural textures with the exact palette
    this.paintBodySkin(this.bodyTexture.image.getContext('2d')!, palette, skinId);
    this.bodyTexture.needsUpdate = true;

    this.paintCaudalTexture(this.caudalTexture.image.getContext('2d')!, palette, skinId);
    this.caudalTexture.needsUpdate = true;

    this.paintSailTexture(this.sailTexture.image.getContext('2d')!, palette, skinId);
    this.sailTexture.needsUpdate = true;

    this.paintPectoralTexture(this.pectoralTexture.image.getContext('2d')!, palette, skinId);
    this.pectoralTexture.needsUpdate = true;

    this.bodyMaterial.sheenColor = new THREE.Color(palette.iridescenceTint);
    this.caudalMaterial.sheenColor = new THREE.Color(palette.finRim);
    this.sailMaterial.sheenColor = new THREE.Color(palette.finRim);
    this.pelvicMaterial.color = new THREE.Color(palette.finMid);
    this.irisMaterial.color = new THREE.Color(palette.eyeIris);
    this.gillMembraneMaterial.color = new THREE.Color(palette.gillMembrane);

    if (skinId === 'golden_imperial') {
      this.bodyMaterial.metalness = 0.82;
      this.bodyMaterial.roughness = 0.18;
      this.caudalMaterial.metalness = 0.45;
      this.sailMaterial.metalness = 0.45;
    } else if (skinId === 'black_samurai') {
      this.bodyMaterial.metalness = 0.55;
      this.bodyMaterial.roughness = 0.28;
      this.caudalMaterial.metalness = 0.15;
      this.sailMaterial.metalness = 0.15;
    } else {
      this.bodyMaterial.metalness = 0.4;
      this.bodyMaterial.roughness = 0.22;
      this.caudalMaterial.metalness = 0.14;
      this.sailMaterial.metalness = 0.14;
    }
    void preset;
  }

  public update(
    delta: number,
    boundBox: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number }
  ) {
    const speedMult = this.isFlaring ? 4.4 : this.isExcited ? 3.8 : 2.3;
    this.animTime += delta * speedMult;

    // 1. Graceful Natural Cruising Pathfinding (prefers broadside showcase angles)
    this.wanderTimer -= delta;
    if (this.wanderTimer <= 0) {
      this.wanderTimer = 3.2 + Math.random() * 3.8;
      const marginX = 0.65;
      const marginY = 0.55;
      // Keep Z closer to 0 so the full broadside silhouette & flowing fins shine
      const zRange = this.isFlaring ? 0.35 : 0.9;
      this.targetPosition.set(
        THREE.MathUtils.randFloat(boundBox.minX + marginX, boundBox.maxX - marginX),
        THREE.MathUtils.randFloat(boundBox.minY + marginY + 0.25, boundBox.maxY - marginY),
        THREE.MathUtils.randFloat(-zRange, zRange)
      );
    }

    _toTarget.subVectors(this.targetPosition, this.currentPosition);
    const dist = _toTarget.length();
    const targetSpeed = this.isSleeping
      ? 0.22
      : this.isFlaring
      ? 0.35
      : this.isExcited
      ? 1.55
      : this.swimSpeed;

    if (dist > 0.08) {
      _toTarget.normalize();
      // Gently slow down as fish arrives near target
      const arriveScale = THREE.MathUtils.clamp(dist / 0.8, 0.25, 1.0);
      _desiredVel.copy(_toTarget).multiplyScalar(targetSpeed * arriveScale);
      this.velocity.lerp(_desiredVel, 1 - Math.exp(-3.0 * delta));
      this.currentPosition.addScaledVector(this.velocity, delta);

      const speedNow = this.velocity.length();
      if (speedNow > 0.03) {
        const targetHeading = Math.atan2(-this.velocity.z, this.velocity.x);
        const headingDelta = shortestAngleDiff(this.headingAngle, targetHeading);
        this.headingAngle += headingDelta * (1 - Math.exp(-3.6 * delta));

        const targetPitch = Math.asin(
          THREE.MathUtils.clamp(this.velocity.y / (speedNow + 0.05), -0.65, 0.65)
        );
        this.pitchAngle = THREE.MathUtils.damp(this.pitchAngle, targetPitch, 3.2, delta);

        const targetRoll = THREE.MathUtils.clamp(headingDelta * 0.45, -0.28, 0.28);
        this.rollAngle = THREE.MathUtils.damp(this.rollAngle, targetRoll, 3.0, delta);
      }

      this.group.position.copy(this.currentPosition);
      this.group.rotation.set(this.rollAngle, this.headingAngle, this.pitchAngle, 'ZYX');
    }

    // 2. Gill Breathing & Mirror Flare Animation
    const targetFlare = this.isFlaring ? 1.0 : 0.0;
    this.flareIntensity = THREE.MathUtils.damp(this.flareIntensity, targetFlare, 6.0, delta);

    const breathe = Math.sin(this.animTime * 2.2) * 0.035;
    const opOpen = 0.04 + breathe + this.flareIntensity * 0.48;
    this.leftOperculum.rotation.y = Math.PI * 0.18 - opOpen;
    this.rightOperculum.rotation.y = -Math.PI * 0.18 + opOpen;

    // Throat flare beard unfolds dramatically during flare
    const beardScale = 0.08 + this.flareIntensity * 1.15;
    this.leftBranchioBeard.scale.set(beardScale, beardScale, beardScale);
    this.rightBranchioBeard.scale.set(beardScale, beardScale, beardScale);

    // Jaw breathing + gulp when eating
    if (this.mouthGulpTimer > 0) this.mouthGulpTimer = Math.max(0, this.mouthGulpTimer - delta);
    const gulpAngle = this.mouthGulpTimer > 0 ? Math.sin((this.mouthGulpTimer / 0.45) * Math.PI) * 0.45 : 0;
    this.lowerJawMesh.rotation.z = 0.25 - Math.max(0, breathe * 1.2) - gulpAngle;

    // 3. Seamless S-Wave Spinal Deformation on Body + Synchronized Tail Root Offset!
    const peduncleOffset = this.deformBodySpine();

    // 4. Pectoral Hummingbird Flutter
    const flutterFreq = this.animTime * 9.5;
    const flutterAmp = 0.42 + this.flareIntensity * 0.28;
    this.leftPectoralFin.rotation.y = 0.48 + Math.sin(flutterFreq) * flutterAmp;
    this.rightPectoralFin.rotation.y = -0.48 - Math.sin(flutterFreq + 0.35) * flutterAmp;

    // 5. Flowing Fins Synchronized with Body Wave
    this.animateCaudalFin(peduncleOffset);
    this.animateSails();
    this.animatePelvicRibbons();

    // 6. Subtle Eye Saccades (alert curious gaze)
    const eyeSaccade = Math.sin(this.animTime * 1.2) * 0.14;
    if (this.leftPupilGroup && this.rightPupilGroup) {
      this.leftPupilGroup.rotation.y = eyeSaccade;
      this.rightPupilGroup.rotation.y = -eyeSaccade;
    }

    // Gentle hover buoyancy
    this.group.position.y += Math.sin(this.animTime * 1.4) * 0.004;
  }

  // Real traveling sinusoidal S-wave along the body spine (head stays steady, tail sweeps cleanly)
  private deformBodySpine(): number {
    const pos = this.bodyGeom.attributes.position;
    const orig = this.bodyOriginalPositions;
    const count = pos.count;
    const amp = this.isFlaring ? 0.11 : 0.075;

    let peduncleZ = 0;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const ox = orig[idx];
      const oy = orig[idx + 1];
      const oz = orig[idx + 2];

      // Normalize X from 0 (head/shoulders x=0.45) to 1 (tail root x=-1.18)
      const bodyT = THREE.MathUtils.clamp((0.45 - ox) / 1.63, 0, 1);
      const flexWeight = bodyT * bodyT;
      const wave = Math.sin(this.animTime * 3.1 - bodyT * 2.4) * amp * flexWeight;

      pos.setXYZ(i, ox, oy, oz + wave);
      if (ox < -1.14) {
        peduncleZ = wave;
      }
    }

    pos.needsUpdate = true;
    this.bodyGeom.computeVertexNormals();
    return peduncleZ;
  }

  private animateCaudalFin(peduncleZ: number) {
    // Anchor tail root cleanly to moving peduncle
    this.caudalFinMesh.position.z = peduncleZ;

    const pos = this.caudalFinGeom.attributes.position;
    const orig = this.caudalOriginalPositions;
    const count = pos.count;
    const flareScale = 1.0 + this.flareIntensity * 0.28;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const ox = orig[idx];
      const oy = orig[idx + 1];
      const oz = orig[idx + 2];

      const dist = Math.sqrt(ox * ox + oy * oy);
      const ratio = THREE.MathUtils.clamp(dist / 2.25, 0, 1);

      // Note: caudalFinMesh is rotated PI around Y, so local +Z corresponds to world -Z!
      // Match peduncle phase smoothly at ratio -> 0, then ripple outward
      const wave1 = Math.sin(this.animTime * 3.1 - 2.4 - ratio * 3.4) * 0.28 * Math.pow(ratio, 1.25);
      const wave2 = Math.cos(this.animTime * 4.8 - ratio * 5.2 + oy * 1.4) * 0.08 * Math.pow(ratio, 1.8);
      const verticalLilt = Math.cos(this.animTime * 2.3 - ratio * 2.6) * 0.06 * ratio;

      pos.setXYZ(
        i,
        ox * flareScale,
        (oy + verticalLilt) * flareScale,
        oz + wave1 + wave2
      );
    }

    pos.needsUpdate = true;
    this.caudalFinGeom.computeVertexNormals();
  }

  private animateSails() {
    // Dorsal sail
    const dPos = this.dorsalFinGeom.attributes.position;
    const dOrig = this.dorsalOriginalPositions;
    for (let i = 0; i < dPos.count; i++) {
      const idx = i * 3;
      const ox = dOrig[idx];
      const oy = dOrig[idx + 1];
      const oz = dOrig[idx + 2];

      const bodyT = THREE.MathUtils.clamp((0.45 - (ox - 0.32)) / 1.63, 0, 1);
      const spineZ = Math.sin(this.animTime * 3.1 - bodyT * 2.4) * 0.075 * bodyT * bodyT;
      const tipRatio = THREE.MathUtils.clamp(Math.abs(oy) / 0.92, 0, 1);

      const wave = Math.sin(this.animTime * 3.1 - 1.2 - tipRatio * 2.2 + ox * 1.5) * 0.16 * Math.pow(tipRatio, 1.3);
      dPos.setXYZ(i, ox, oy, oz + spineZ + wave);
    }
    dPos.needsUpdate = true;
    this.dorsalFinGeom.computeVertexNormals();

    // Anal curtain
    const aPos = this.analFinGeom.attributes.position;
    const aOrig = this.analOriginalPositions;
    for (let i = 0; i < aPos.count; i++) {
      const idx = i * 3;
      const ox = aOrig[idx];
      const oy = aOrig[idx + 1];
      const oz = aOrig[idx + 2];

      const bodyT = THREE.MathUtils.clamp((0.45 - (ox - 0.22)) / 1.63, 0, 1);
      const spineZ = Math.sin(this.animTime * 3.1 - bodyT * 2.4) * 0.075 * bodyT * bodyT;
      const tipRatio = THREE.MathUtils.clamp(Math.abs(oy) / 1.04, 0, 1);

      const wave = Math.sin(this.animTime * 3.1 - 1.5 - tipRatio * 2.4 + ox * 1.6) * 0.18 * Math.pow(tipRatio, 1.3);
      aPos.setXYZ(i, ox, oy, oz + spineZ + wave);
    }
    aPos.needsUpdate = true;
    this.analFinGeom.computeVertexNormals();
  }

  private animatePelvicRibbons() {
    const meshes = [this.leftPelvicMesh, this.rightPelvicMesh];
    const origs = [this.leftPelvicOrig, this.rightPelvicOrig];

    for (let m = 0; m < 2; m++) {
      const pos = meshes[m].geometry.attributes.position;
      const orig = origs[m];
      const sideSign = m === 0 ? 1 : -1;

      for (let i = 0; i < pos.count; i++) {
        const idx = i * 3;
        const ox = orig[idx];
        const oy = orig[idx + 1];
        const oz = orig[idx + 2];
        const t = THREE.MathUtils.clamp(-oy / 1.05, 0, 1);

        const swayZ = Math.sin(this.animTime * 2.6 - t * 2.8 + m * 0.8) * 0.11 * t * t;
        const sweepX = -this.velocity.length() * 0.12 * t * t;
        const flareOut = this.flareIntensity * 0.12 * t * sideSign;

        pos.setXYZ(i, ox + sweepX, oy, oz + swayZ + flareOut);
      }
      pos.needsUpdate = true;
    }
  }

  public swimTo(point: THREE.Vector3, isUrgent = false) {
    this.targetPosition.copy(point);
    this.wanderTimer = 4.2;
    this.isExcited = isUrgent;
    if (isUrgent) {
      setTimeout(() => {
        this.isExcited = false;
      }, 3200);
    }
  }

  public triggerFlare(active: boolean) {
    this.isFlaring = active;
    if (active) {
      // Swim front-and-center to show off flaring display!
      this.targetPosition.set(0, 0.1, 0.5);
      this.wanderTimer = 5.0;
    }
  }

  public dispose() {
    this.bodyGeom.dispose();
    this.caudalFinGeom.dispose();
    this.dorsalFinGeom.dispose();
    this.analFinGeom.dispose();
    this.leftPelvicGeom.dispose();
    this.rightPelvicGeom.dispose();
    this.bodyMaterial.dispose();
    this.caudalMaterial.dispose();
    this.sailMaterial.dispose();
    this.pectoralMaterial.dispose();
    this.pelvicMaterial.dispose();
    this.irisMaterial.dispose();
    this.corneaMaterial.dispose();
    this.pupilMaterial.dispose();
    this.gillMembraneMaterial.dispose();
    this.goldMaterial.dispose();
    this.bodyTexture.dispose();
    this.scaleNormalTexture.dispose();
    this.caudalTexture.dispose();
    this.sailTexture.dispose();
    this.pectoralTexture.dispose();
  }
}
