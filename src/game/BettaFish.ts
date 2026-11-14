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
    bodyHighlight: '#60a5fa',
    headMask: '#11131a',
    finBase: '#172554',
    finMid: '#2563eb',
    finRim: '#dbeafe',
    iridescenceTint: '#93c5fd',
    eyeIris: '#1e293b',
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
  private headMaterial!: THREE.MeshPhysicalMaterial;
  private caudalMaterial!: THREE.MeshPhysicalMaterial;
  private sailMaterial!: THREE.MeshPhysicalMaterial;
  private pectoralMaterial!: THREE.MeshPhysicalMaterial;
  private pelvicMaterial!: THREE.MeshPhysicalMaterial;
  private irisMaterial!: THREE.MeshStandardMaterial;
  private corneaMaterial!: THREE.MeshPhysicalMaterial;
  private pupilMaterial!: THREE.MeshStandardMaterial;
  private eyeSparkMaterial!: THREE.MeshBasicMaterial;
  private gillMembraneMaterial!: THREE.MeshStandardMaterial;
  private goldMaterial!: THREE.MeshStandardMaterial;

  private bodyTexture!: THREE.CanvasTexture;
  private scaleNormalTexture!: THREE.CanvasTexture;
  private caudalTexture!: THREE.CanvasTexture;
  private caudalNormalTexture!: THREE.CanvasTexture;
  private sailTexture!: THREE.CanvasTexture;
  private sailNormalTexture!: THREE.CanvasTexture;
  private pectoralTexture!: THREE.CanvasTexture;
  private pelvicTexture!: THREE.CanvasTexture;
  private irisTexture!: THREE.CanvasTexture;

  // Kinematics & State
  public targetPosition: THREE.Vector3 = new THREE.Vector3(0, 0.15, 0);
  public currentPosition: THREE.Vector3 = new THREE.Vector3(0, 0.15, 0);
  public velocity: THREE.Vector3 = new THREE.Vector3(0.4, 0, 0);
  private swimSpeed: number = 0.78;
  private wanderTimer: number = 0;
  private hoverPauseTimer: number = 0;
  private isHovering: boolean = false;
  private returningHome: boolean = false;
  private currentSwimSpeed: number = 0;
  private animTime: number = 0;
  private headingAngle: number = 0;
  private pitchAngle: number = 0;
  private rollAngle: number = 0;

  // Emotional & Behavioral states
  public isFlaring: boolean = false;
  public flareIntensity: number = 0;
  public isExcited: boolean = false;
  private excitedTimer: number = 0;
  public isSleeping: boolean = false;
  private mouthGulpTimer: number = 0;
  private mouthAnticipate: number = 0;
  public currentSkinId: FishColorPalette = 'royal_blue';
  private isSoftwareGl: boolean = false;

  // PvP Combat Choreography states
  public combatMode: boolean = false;
  private combatPreview: boolean = false;
  private combatHomePos: THREE.Vector3 = new THREE.Vector3();
  private combatFacing: number = 0;
  private combatDashOffset: THREE.Vector3 = new THREE.Vector3();
  private combatRecoil: number = 0;
  private combatSpin: number = 0;
  private shieldMesh!: THREE.Mesh;
  private shieldMaterial!: THREE.MeshBasicMaterial;
  private combatGuardActive: boolean = false;

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
    this.buildCombatShield();
    this.updateSkin(skinId);

    this.fishRoot.scale.setScalar(0.62);
    this.group.add(this.fishRoot);
    this.fishRoot.add(this.vipCrownGroup);
    this.vipCrownGroup.visible = false;
  }

  private buildCombatShield() {
    const geom = new THREE.SphereGeometry(1.45, 22, 16);
    this.shieldMaterial = new THREE.MeshBasicMaterial({
      color: 0x38bdf8,
      transparent: true,
      opacity: 0.24,
      wireframe: false,
      side: THREE.DoubleSide,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });
    this.shieldMesh = new THREE.Mesh(geom, this.shieldMaterial);
    this.shieldMesh.position.set(-0.35, 0, 0);
    this.shieldMesh.visible = false;
    this.fishRoot.add(this.shieldMesh);
  }

  private initTextures(palette: PaletteColors) {
    // 1. Body Scale Albedo Texture (1024x512: Smooth Velvet Head -> Interlocking Diamond Scales -> Belly Gradient)
    const bCanvas = document.createElement('canvas');
    bCanvas.width = 1024;
    bCanvas.height = 512;
    this.paintBodySkin(bCanvas.getContext('2d')!, palette);

    this.bodyTexture = new THREE.CanvasTexture(bCanvas);
    this.bodyTexture.colorSpace = THREE.SRGBColorSpace;
    this.bodyTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.bodyTexture.wrapT = THREE.RepeatWrapping;

    // 2. High-Resolution Matching Cycloid Scale Normal Map (1024x512, 48x22 interlocking shields)
    const nCanvas = document.createElement('canvas');
    nCanvas.width = 1024;
    nCanvas.height = 512;
    this.paintScaleNormalMap(nCanvas.getContext('2d')!);
    this.scaleNormalTexture = new THREE.CanvasTexture(nCanvas);
    this.scaleNormalTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.scaleNormalTexture.wrapT = THREE.RepeatWrapping;

    // 3. Polar-mapped Halfmoon Caudal Fin Texture & Branching Ray Normal Map (1024x1024)
    const cCanvas = document.createElement('canvas');
    cCanvas.width = 1024;
    cCanvas.height = 1024;
    this.paintCaudalTexture(cCanvas.getContext('2d')!, palette);

    this.caudalTexture = new THREE.CanvasTexture(cCanvas);
    this.caudalTexture.colorSpace = THREE.SRGBColorSpace;
    this.caudalTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.caudalTexture.wrapT = THREE.ClampToEdgeWrapping;

    const cnCanvas = document.createElement('canvas');
    cnCanvas.width = 1024;
    cnCanvas.height = 1024;
    this.paintCaudalNormalMap(cnCanvas.getContext('2d')!);
    this.caudalNormalTexture = new THREE.CanvasTexture(cnCanvas);
    this.caudalNormalTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.caudalNormalTexture.wrapT = THREE.ClampToEdgeWrapping;

    // 4. Dorsal & Anal Sail Fin Texture & Sweeping Ray Normal Map (1024x1024)
    const sCanvas = document.createElement('canvas');
    sCanvas.width = 1024;
    sCanvas.height = 1024;
    this.paintSailTexture(sCanvas.getContext('2d')!, palette);

    this.sailTexture = new THREE.CanvasTexture(sCanvas);
    this.sailTexture.colorSpace = THREE.SRGBColorSpace;
    this.sailTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.sailTexture.wrapT = THREE.ClampToEdgeWrapping;

    const snCanvas = document.createElement('canvas');
    snCanvas.width = 1024;
    snCanvas.height = 1024;
    this.paintSailNormalMap(snCanvas.getContext('2d')!);
    this.sailNormalTexture = new THREE.CanvasTexture(snCanvas);
    this.sailNormalTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.sailNormalTexture.wrapT = THREE.ClampToEdgeWrapping;

    // 5. Delicate Translucent Pectoral Fin Texture (512x512)
    const pCanvas = document.createElement('canvas');
    pCanvas.width = 512;
    pCanvas.height = 512;
    this.paintPectoralTexture(pCanvas.getContext('2d')!, palette);

    this.pectoralTexture = new THREE.CanvasTexture(pCanvas);
    this.pectoralTexture.colorSpace = THREE.SRGBColorSpace;

    // 6. Sculpted Scimitar Pelvic Fin Texture (256x512)
    const pvCanvas = document.createElement('canvas');
    pvCanvas.width = 256;
    pvCanvas.height = 512;
    this.paintPelvicTexture(pvCanvas.getContext('2d')!, palette);

    this.pelvicTexture = new THREE.CanvasTexture(pvCanvas);
    this.pelvicTexture.colorSpace = THREE.SRGBColorSpace;

    // 7. Organic Radial Iris Texture
    const iCanvas = document.createElement('canvas');
    iCanvas.width = 128;
    iCanvas.height = 128;
    this.paintIrisTexture(iCanvas.getContext('2d')!, palette);
    this.irisTexture = new THREE.CanvasTexture(iCanvas);
    this.irisTexture.colorSpace = THREE.SRGBColorSpace;
  }

  private paintIrisTexture(ctx: CanvasRenderingContext2D, p: PaletteColors) {
    ctx.fillStyle = '#0b0e17';
    ctx.fillRect(0, 0, 128, 128);
    const rg = ctx.createRadialGradient(64, 64, 16, 64, 64, 62);
    rg.addColorStop(0.0, '#04060c');
    rg.addColorStop(0.32, p.eyeIris);
    rg.addColorStop(0.68, p.bodyHighlight);
    rg.addColorStop(0.92, '#111827');
    rg.addColorStop(1.0, '#05070e');
    ctx.fillStyle = rg;
    ctx.beginPath();
    ctx.arc(64, 64, 62, 0, Math.PI * 2);
    ctx.fill();

    // Fine iris striation fibers
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 1;
    for (let i = 0; i < 32; i++) {
      const a = (i / 32) * Math.PI * 2;
      ctx.beginPath();
      ctx.moveTo(64 + Math.cos(a) * 22, 64 + Math.sin(a) * 22);
      ctx.lineTo(64 + Math.cos(a) * 52, 64 + Math.sin(a) * 52);
      ctx.stroke();
    }
  }

  private paintScaleNormalMap(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'rgb(128, 128, 255)';
    ctx.fillRect(0, 0, 1024, 512);

    const rows = 22;
    const cols = 48;
    const cw = 1024 / cols;
    const ch = 512 / rows;
    for (let c = 0; c < cols; c++) {
      const u = c / cols;
      for (let r = 0; r < rows; r++) {
        const cy = (r + (c % 2 === 0 ? 0 : 0.5)) * ch;
        const vNorm = cy / 512;
        const flankFactor = Math.abs(Math.cos(vNorm * Math.PI * 2));
        const gillBoundaryU = 0.215 + flankFactor * 0.055;
        if (u < gillBoundaryU) continue;

        const cx = c * cw;
        const grad = ctx.createRadialGradient(cx + cw * 0.22, cy - ch * 0.08, 1, cx, cy, ch * 0.68);
        grad.addColorStop(0.0, 'rgb(184, 148, 255)');
        grad.addColorStop(0.58, 'rgb(128, 128, 255)');
        grad.addColorStop(0.88, 'rgb(82, 108, 228)');
        grad.addColorStop(1.0, 'rgb(128, 128, 255)');
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.ellipse(cx, cy, cw * 0.68, ch * 0.64, 0, 0, Math.PI * 2);
        ctx.fill();
      }
    }
  }

  private paintCaudalNormalMap(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'rgb(128, 128, 255)';
    ctx.fillRect(0, 0, 1024, 1024);

    // Soft macro velvet silk pleats across the fan
    for (let y = 0; y < 1024; y += 2) {
      const t = y / 1024;
      const pleatSlope = Math.cos(t * Math.PI * 7) * 26 + Math.cos(t * Math.PI * 15) * 14;
      const gVal = Math.round(THREE.MathUtils.clamp(128 + pleatSlope, 78, 178));
      ctx.fillStyle = `rgb(128, ${gVal}, 250)`;
      ctx.fillRect(0, y, 1024, 2);
    }

    // Dichotomous primary -> secondary -> tertiary branching ray relief
    const numPrimary = 28;
    const step = 1024 / numPrimary;
    const drawRayNormal = (x0: number, y0: number, x1: number, y1: number, width: number) => {
      ctx.strokeStyle = 'rgba(154, 144, 255, 0.72)';
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo((x0 + x1) * 0.5, y0 * 0.72 + y1 * 0.28, x1, y1);
      ctx.stroke();

      ctx.strokeStyle = 'rgba(104, 112, 232, 0.52)';
      ctx.lineWidth = width * 0.55;
      ctx.beginPath();
      ctx.moveTo(x0, y0 + width * 0.45);
      ctx.quadraticCurveTo((x0 + x1) * 0.5, y0 * 0.72 + y1 * 0.28 + width * 0.45, x1, y1 + width * 0.45);
      ctx.stroke();
    };

    for (let i = 0; i < numPrimary; i++) {
      const y = (i + 0.5) * step;
      const curveBend = (i / numPrimary - 0.5) * 28;
      drawRayNormal(0, y, 310, y + curveBend * 0.25, 6.0);
      const y1a = y + curveBend * 0.25 - 6.5;
      const y1b = y + curveBend * 0.25 + 6.5;
      drawRayNormal(310, y + curveBend * 0.25, 650, y1a + curveBend * 0.35, 3.8);
      drawRayNormal(310, y + curveBend * 0.25, 650, y1b + curveBend * 0.35, 3.8);

      const y2a = y1a + curveBend * 0.35;
      const y2b = y1b + curveBend * 0.35;
      drawRayNormal(650, y2a, 1020, y2a - 4.0 + curveBend * 0.4, 2.2);
      drawRayNormal(650, y2a, 1020, y2a + 4.0 + curveBend * 0.4, 2.2);
      drawRayNormal(650, y2b, 1020, y2b - 4.0 + curveBend * 0.4, 2.2);
      drawRayNormal(650, y2b, 1020, y2b + 4.0 + curveBend * 0.4, 2.2);
    }
  }

  private paintSailNormalMap(ctx: CanvasRenderingContext2D) {
    ctx.fillStyle = 'rgb(128, 128, 255)';
    ctx.fillRect(0, 0, 1024, 1024);
    const numRays = 32;
    const step = 1024 / numRays;
    for (let i = 0; i < numRays; i++) {
      const baseX = (i + 0.5) * step;
      const tipX = Math.min(1016, baseX + 125 + (i / numRays) * 65);
      const midX = (baseX + tipX) * 0.5 + 16;

      ctx.strokeStyle = 'rgba(164, 134, 255, 0.72)';
      ctx.lineWidth = 4.5;
      ctx.beginPath();
      ctx.moveTo(baseX, 1024);
      ctx.quadraticCurveTo(baseX + 35, 560, midX, 460);
      ctx.stroke();

      ctx.lineWidth = 2.6;
      ctx.beginPath();
      ctx.moveTo(midX, 460);
      ctx.lineTo(Math.max(4, tipX - 10), 0);
      ctx.moveTo(midX, 460);
      ctx.lineTo(Math.min(1020, tipX + 12), 0);
      ctx.stroke();
    }
  }

  private paintBodySkin(ctx: CanvasRenderingContext2D, p: PaletteColors, skinId: FishColorPalette = this.currentSkinId) {
    const isTropical = skinId === 'tropical_paradise';
    const isRoyal = skinId === 'royal_blue';

    const baseGrad = ctx.createLinearGradient(0, 0, 1024, 0);
    if (isTropical) {
      baseGrad.addColorStop(0.0, p.headMask);
      baseGrad.addColorStop(0.18, '#0f766e');
      baseGrad.addColorStop(0.34, '#06b6d4');
      baseGrad.addColorStop(0.64, '#10b981');
      baseGrad.addColorStop(0.84, '#f97316');
      baseGrad.addColorStop(1.0, '#ec4899');
    } else if (isRoyal) {
      baseGrad.addColorStop(0.0, p.headMask);
      baseGrad.addColorStop(0.22, p.headMask);
      baseGrad.addColorStop(0.32, '#1e3a8a');
      baseGrad.addColorStop(0.75, '#1d4ed8');
      baseGrad.addColorStop(1.0, '#172554');
    } else {
      baseGrad.addColorStop(0.0, p.headMask);
      baseGrad.addColorStop(0.2, p.headMask);
      baseGrad.addColorStop(0.32, p.bodyBase);
      baseGrad.addColorStop(0.85, p.bodyBase);
      baseGrad.addColorStop(1.0, p.finBase);
    }
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, 1024, 512);

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

    // Anatomical dorsal-to-ventral depth shading
    const flankGrad = ctx.createLinearGradient(0, 0, 0, 512);
    flankGrad.addColorStop(0.0, 'rgba(255,255,255,0.06)');
    flankGrad.addColorStop(0.25, isRoyal ? 'rgba(191, 219, 254, 0.34)' : 'rgba(255,255,255,0.16)');
    flankGrad.addColorStop(0.5, 'rgba(255,255,255,0.04)');
    flankGrad.addColorStop(0.75, 'rgba(2, 4, 14, 0.42)');
    flankGrad.addColorStop(1.0, 'rgba(255,255,255,0.06)');
    ctx.fillStyle = flankGrad;
    ctx.fillRect(0, 0, 1024, 512);

    // Smooth dark matte head mask following anatomical gill-cover crescent
    ctx.fillStyle = p.headMask;
    ctx.beginPath();
    ctx.moveTo(0, 0);
    for (let y = 0; y <= 512; y += 8) {
      const vNorm = y / 512;
      const flankFactor = Math.abs(Math.cos(vNorm * Math.PI * 2));
      const gillX = (0.215 + flankFactor * 0.055) * 1024;
      ctx.lineTo(gillX, y);
    }
    ctx.lineTo(0, 512);
    ctx.closePath();
    ctx.fill();

    // Subtle dark opercular margin groove
    ctx.strokeStyle = 'rgba(0, 0, 0, 0.65)';
    ctx.lineWidth = 9;
    ctx.beginPath();
    for (let y = 0; y <= 512; y += 8) {
      const vNorm = y / 512;
      const flankFactor = Math.abs(Math.cos(vNorm * Math.PI * 2));
      const gillX = (0.22 + flankFactor * 0.055) * 1024;
      if (y === 0) ctx.moveTo(gillX, y);
      else ctx.lineTo(gillX, y);
    }
    ctx.stroke();

    // Subtle iridescent cheek sheen dots on head
    ctx.fillStyle = this.hexToRgba(p.bodyHighlight, 0.14);
    for (let i = 0; i < 6; i++) {
      ctx.beginPath();
      ctx.ellipse(185 - i * 8, 225 + (i % 2) * 52, 12, 8, 0.3, 0, Math.PI * 2);
      ctx.fill();
    }

    // Crisp Overlapping Cycloid/Diamond Betta Scales (48x22)
    const rows = 22;
    const cols = 48;
    const cw = 1024 / cols;
    const ch = 512 / rows;

    for (let c = 0; c < cols; c++) {
      const u = c / cols;
      for (let r = 0; r < rows; r++) {
        const cx = c * cw;
        const cy = (r + (c % 2 === 0 ? 0 : 0.5)) * ch;
        const vNorm = cy / 512;
        const flankFactor = Math.abs(Math.cos(vNorm * Math.PI * 2));
        const gillBoundaryU = 0.215 + flankFactor * 0.055;
        if (u < gillBoundaryU) continue;

        const scaleAlpha = Math.min(1, (u - gillBoundaryU) / 0.07);
        const dorsalSheen = Math.max(0, 1 - Math.abs(vNorm - 0.25) / 0.24);
        const bellyShade = Math.max(0, 1 - Math.abs(vNorm - 0.75) / 0.2);

        const tropicalShift = (c * 7 + r * 11) % 9;
        const centerColor = isTropical
          ? tropicalShift === 0
            ? '#fde047'
            : tropicalShift === 3
            ? '#22d3ee'
            : tropicalShift === 6
            ? '#fb7185'
            : p.bodyHighlight
          : isRoyal && dorsalSheen > 0.3 && u < 0.65
          ? '#dbeafe'
          : p.bodyHighlight;

        ctx.save();
        ctx.globalAlpha = (isTropical ? 0.8 : isRoyal ? 0.92 : 0.82) * scaleAlpha * (1 - bellyShade * 0.28);
        const sg = ctx.createRadialGradient(cx - cw * 0.22, cy - ch * 0.06, 0.5, cx, cy, ch * 0.64);
        sg.addColorStop(0.0, centerColor);
        sg.addColorStop(0.45, isTropical && u > 0.72 ? p.finBase : p.bodyBase);
        sg.addColorStop(0.88, isRoyal ? '#091438' : 'rgba(4, 8, 22, 0.88)');
        sg.addColorStop(1.0, 'rgba(2, 4, 12, 0.92)');
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.ellipse(cx, cy, cw * 0.66, ch * 0.6, 0, 0, Math.PI * 2);
        ctx.fill();

        // Crisp dark pocket rim around each scale
        ctx.globalAlpha = (isRoyal ? 0.74 : 0.52) * scaleAlpha;
        ctx.strokeStyle = '#02040b';
        ctx.lineWidth = 1.9;
        ctx.beginPath();
        ctx.ellipse(cx, cy, cw * 0.63, ch * 0.57, 0, -Math.PI * 0.5, Math.PI * 0.5);
        ctx.stroke();

        // Delicate metallic rim catchlight on leading upper edge
        ctx.globalAlpha = (isRoyal ? 0.42 : 0.28) * scaleAlpha * (0.4 + dorsalSheen * 0.6);
        ctx.strokeStyle = centerColor;
        ctx.lineWidth = 1.1;
        ctx.beginPath();
        ctx.ellipse(cx - 1.5, cy - 1, cw * 0.46, ch * 0.42, 0, Math.PI * 0.75, Math.PI * 1.45);
        ctx.stroke();
        ctx.restore();
      }
    }
  }

  private paintCaudalTexture(ctx: CanvasRenderingContext2D, p: PaletteColors, skinId: FishColorPalette = this.currentSkinId) {
    const isTropical = skinId === 'tropical_paradise';
    const isRoyal = skinId === 'royal_blue';
    ctx.clearRect(0, 0, 1024, 1024);

    // Rich silky fan base gradient with soft feathered outer alpha
    const grad = ctx.createLinearGradient(0, 0, 1024, 0);
    if (isTropical) {
      grad.addColorStop(0.0, 'rgba(6, 182, 212, 0.98)');
      grad.addColorStop(0.24, 'rgba(249, 115, 22, 0.94)');
      grad.addColorStop(0.56, 'rgba(236, 72, 153, 0.86)');
      grad.addColorStop(0.84, 'rgba(250, 204, 21, 0.76)');
      grad.addColorStop(0.95, 'rgba(103, 232, 249, 0.52)');
      grad.addColorStop(1.0, 'rgba(254, 240, 138, 0.08)');
    } else if (isRoyal) {
      grad.addColorStop(0.0, 'rgba(17, 29, 74, 0.99)');
      grad.addColorStop(0.18, 'rgba(29, 78, 216, 0.96)');
      grad.addColorStop(0.54, 'rgba(37, 99, 235, 0.91)');
      grad.addColorStop(0.73, 'rgba(15, 23, 48, 0.89)');
      grad.addColorStop(0.84, 'rgba(147, 197, 253, 0.83)');
      grad.addColorStop(0.95, 'rgba(226, 238, 255, 0.72)');
      grad.addColorStop(1.0, 'rgba(248, 250, 252, 0.16)');
    } else {
      grad.addColorStop(0.0, this.hexToRgba(p.bodyBase, 0.98));
      grad.addColorStop(0.18, this.hexToRgba(p.finBase, 0.94));
      grad.addColorStop(0.56, this.hexToRgba(p.finMid, 0.86));
      grad.addColorStop(0.84, this.hexToRgba(p.finRim, 0.76));
      grad.addColorStop(0.96, this.hexToRgba(p.finRim, 0.52));
      grad.addColorStop(1.0, this.hexToRgba(p.finRim, 0.12));
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);

    if (isTropical) {
      const spots = [
        { x: 220, y: 240, r: 68, c: 'rgba(253, 224, 71, 0.32)' },
        { x: 340, y: 520, r: 84, c: 'rgba(34, 211, 238, 0.28)' },
        { x: 260, y: 780, r: 72, c: 'rgba(253, 224, 71, 0.32)' },
        { x: 590, y: 350, r: 60, c: 'rgba(251, 113, 133, 0.3)' },
        { x: 560, y: 690, r: 64, c: 'rgba(52, 211, 153, 0.26)' },
      ];
      for (const sp of spots) {
        const sg = ctx.createRadialGradient(sp.x, sp.y, 4, sp.x, sp.y, sp.r);
        sg.addColorStop(0, sp.c);
        sg.addColorStop(1, 'rgba(0,0,0,0)');
        ctx.fillStyle = sg;
        ctx.beginPath();
        ctx.arc(sp.x, sp.y, sp.r, 0, Math.PI * 2);
        ctx.fill();
      }
    }

    if (isRoyal) {
      const lobeShade = ctx.createLinearGradient(0, 0, 0, 1024);
      lobeShade.addColorStop(0.0, 'rgba(6, 10, 24, 0.54)');
      lobeShade.addColorStop(0.2, 'rgba(6, 10, 24, 0.0)');
      lobeShade.addColorStop(0.8, 'rgba(6, 10, 24, 0.0)');
      lobeShade.addColorStop(1.0, 'rgba(6, 10, 24, 0.48)');
      ctx.fillStyle = lobeShade;
      ctx.fillRect(380, 0, 480, 1024);
    }

    // Dichotomous Branching Fin Rays (28 primary -> 56 secondary -> 112 fine outer rays)
    const numPrimary = 28;
    const step = 1024 / numPrimary;
    const strokeCurved = (x0: number, y0: number, x1: number, y1: number, color: string, width: number) => {
      ctx.strokeStyle = color;
      ctx.lineWidth = width;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(x0, y0);
      ctx.quadraticCurveTo((x0 + x1) * 0.5, y0 * 0.72 + y1 * 0.28, x1, y1);
      ctx.stroke();
    };

    const rayPrimaryCol = this.hexToRgba(isTropical ? '#67e8f9' : p.bodyHighlight, isRoyal ? 0.78 : 0.65);
    const rayMidCol = this.hexToRgba(p.finRim, isRoyal ? 0.62 : 0.5);
    const rayTipCol = this.hexToRgba(isTropical ? '#fef08a' : p.finRim, isRoyal ? 0.8 : 0.52);

    for (let i = 0; i < numPrimary; i++) {
      const y = (i + 0.5) * step;
      const curveBend = (i / numPrimary - 0.5) * 28;
      const midY = y + curveBend * 0.25;

      // Primary root ray
      strokeCurved(0, y, 310, midY, rayPrimaryCol, 3.6);

      // Inter-ray dark shadow groove
      strokeCurved(18, y + step * 0.5, 995, y + step * 0.5 + curveBend * 0.9, isRoyal ? 'rgba(4, 7, 22, 0.36)' : 'rgba(0, 0, 10, 0.22)', 2.1);

      // Secondary split
      const s1 = midY - 6.5 + curveBend * 0.35;
      const s2 = midY + 6.5 + curveBend * 0.35;
      strokeCurved(310, midY, 650, s1, rayMidCol, 2.2);
      strokeCurved(310, midY, 650, s2, rayMidCol, 2.2);

      // Tertiary outer split
      strokeCurved(650, s1, 1018, s1 - 4.0 + curveBend * 0.4, rayTipCol, 1.35);
      strokeCurved(650, s1, 1018, s1 + 4.0 + curveBend * 0.4, rayTipCol, 1.35);
      strokeCurved(650, s2, 1018, s2 - 4.0 + curveBend * 0.4, rayTipCol, 1.35);
      strokeCurved(650, s2, 1018, s2 + 4.0 + curveBend * 0.4, rayTipCol, 1.35);
    }

    // Fine scalloped lacy outer margin alpha cutout matching 112 ray tips
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    const scallops = numPrimary * 4;
    for (let i = 0; i < scallops; i++) {
      const y = (i + 0.5) * (1024 / scallops);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.9)';
      ctx.beginPath();
      ctx.arc(1024, y, 4.4, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private paintSailTexture(ctx: CanvasRenderingContext2D, p: PaletteColors, skinId: FishColorPalette = this.currentSkinId) {
    const isTropical = skinId === 'tropical_paradise';
    const isRoyal = skinId === 'royal_blue';
    ctx.clearRect(0, 0, 1024, 1024);

    const grad = ctx.createLinearGradient(0, 1024, 0, 0);
    if (isTropical) {
      grad.addColorStop(0.0, 'rgba(8, 145, 178, 0.98)');
      grad.addColorStop(0.24, 'rgba(249, 115, 22, 0.92)');
      grad.addColorStop(0.58, 'rgba(236, 72, 153, 0.84)');
      grad.addColorStop(0.86, 'rgba(250, 204, 21, 0.72)');
      grad.addColorStop(1.0, 'rgba(103, 232, 249, 0.14)');
    } else if (isRoyal) {
      grad.addColorStop(0.0, 'rgba(18, 30, 74, 0.99)');
      grad.addColorStop(0.28, 'rgba(29, 78, 216, 0.95)');
      grad.addColorStop(0.66, 'rgba(37, 99, 235, 0.89)');
      grad.addColorStop(0.8, 'rgba(15, 23, 42, 0.88)');
      grad.addColorStop(0.89, 'rgba(148, 163, 184, 0.8)');
      grad.addColorStop(0.97, 'rgba(226, 232, 240, 0.7)');
      grad.addColorStop(1.0, 'rgba(248, 250, 252, 0.18)');
    } else {
      grad.addColorStop(0.0, this.hexToRgba(p.bodyBase, 0.98));
      grad.addColorStop(0.22, this.hexToRgba(p.finBase, 0.94));
      grad.addColorStop(0.6, this.hexToRgba(p.finMid, 0.85));
      grad.addColorStop(0.88, this.hexToRgba(p.finRim, 0.72));
      grad.addColorStop(1.0, this.hexToRgba(p.finRim, 0.16));
    }
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 1024, 1024);

    // Sweeping branching sail rays
    const numRays = 32;
    const step = 1024 / numRays;
    for (let i = 0; i < numRays; i++) {
      const baseX = (i + 0.5) * step * 0.88 + 12;
      const tipX = Math.min(1012, baseX + 125 + (i / numRays) * 65);
      const midX = (baseX + tipX) * 0.5 + 16;

      ctx.strokeStyle = this.hexToRgba(isTropical ? '#67e8f9' : p.bodyHighlight, isRoyal ? 0.72 : 0.6);
      ctx.lineWidth = 3.2;
      ctx.lineCap = 'round';
      ctx.beginPath();
      ctx.moveTo(baseX, 1024);
      ctx.quadraticCurveTo(baseX + 35, 560, midX, 460);
      ctx.stroke();

      ctx.strokeStyle = this.hexToRgba(p.finRim, isRoyal ? 0.64 : 0.5);
      ctx.lineWidth = 1.85;
      ctx.beginPath();
      ctx.moveTo(midX, 460);
      ctx.lineTo(Math.max(4, tipX - 10), 4);
      ctx.moveTo(midX, 460);
      ctx.lineTo(Math.min(1020, tipX + 12), 4);
      ctx.stroke();

      ctx.strokeStyle = isRoyal ? 'rgba(4, 7, 22, 0.32)' : 'rgba(0, 0, 10, 0.18)';
      ctx.lineWidth = 2.0;
      ctx.beginPath();
      ctx.moveTo(baseX + step * 0.45, 1024);
      ctx.quadraticCurveTo(baseX + step * 0.45 + 36, 560, Math.min(1020, tipX + step * 0.45), 16);
      ctx.stroke();
    }

    // Feathered scalloped top margin
    ctx.save();
    ctx.globalCompositeOperation = 'destination-out';
    const scallops = numRays * 2;
    for (let i = 0; i < scallops; i++) {
      const x = (i + 0.5) * (1024 / scallops);
      ctx.fillStyle = 'rgba(0, 0, 0, 0.85)';
      ctx.beginPath();
      ctx.arc(x, 0, 5.2, 0, Math.PI * 2);
      ctx.fill();
    }
    ctx.restore();
  }

  private paintPectoralTexture(ctx: CanvasRenderingContext2D, p: PaletteColors, skinId: FishColorPalette = this.currentSkinId) {
    const isTropical = skinId === 'tropical_paradise';
    ctx.clearRect(0, 0, 512, 512);
    const grad = ctx.createRadialGradient(36, 256, 8, 220, 256, 320);
    grad.addColorStop(0.0, this.hexToRgba(isTropical ? '#22d3ee' : p.bodyHighlight, 0.72));
    grad.addColorStop(0.45, this.hexToRgba(isTropical ? '#fb923c' : p.finRim, 0.42));
    grad.addColorStop(0.84, this.hexToRgba(isTropical ? '#fde047' : '#ffffff', 0.28));
    grad.addColorStop(1.0, 'rgba(255, 255, 255, 0.0)');
    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, 512, 512);

    ctx.strokeStyle = isTropical ? 'rgba(254, 240, 138, 0.55)' : 'rgba(255, 255, 255, 0.48)';
    ctx.lineWidth = 2.0;
    for (let i = -9; i <= 9; i++) {
      const angle = i * 0.075;
      ctx.beginPath();
      ctx.moveTo(24, 256);
      ctx.lineTo(24 + Math.cos(angle) * 465, 256 + Math.sin(angle) * 465);
      ctx.stroke();
    }
  }

  private paintPelvicTexture(ctx: CanvasRenderingContext2D, p: PaletteColors) {
    ctx.clearRect(0, 0, 256, 512);
    const baseGrad = ctx.createLinearGradient(0, 0, 256, 512);
    baseGrad.addColorStop(0.0, this.hexToRgba(p.finBase, 0.96));
    baseGrad.addColorStop(0.42, this.hexToRgba(p.finMid, 0.92));
    baseGrad.addColorStop(0.74, this.hexToRgba(p.pelvicTip, 0.96));
    baseGrad.addColorStop(1.0, '#ffffff');
    ctx.fillStyle = baseGrad;
    ctx.fillRect(0, 0, 256, 512);

    // Subtle ray lines & luminous white leading scimitar margin
    ctx.strokeStyle = 'rgba(255,255,255,0.22)';
    ctx.lineWidth = 2.0;
    for (let i = 1; i <= 4; i++) {
      const x = (i / 5) * 256;
      ctx.beginPath();
      ctx.moveTo(x, 0);
      ctx.lineTo(x * 0.65 + 75, 512);
      ctx.stroke();
    }

    const leadGrad = ctx.createLinearGradient(0, 0, 256, 0);
    leadGrad.addColorStop(0.0, 'rgba(0,0,0,0)');
    leadGrad.addColorStop(0.6, 'rgba(255,255,255,0.25)');
    leadGrad.addColorStop(1.0, 'rgba(255,255,255,0.95)');
    ctx.fillStyle = leadGrad;
    ctx.fillRect(0, 0, 256, 512);
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
      normalScale: new THREE.Vector2(0.62, 0.62),
      roughness: 0.22,
      metalness: 0.44,
      clearcoat: 1.0,
      clearcoatRoughness: 0.06,
      iridescence: 1.0,
      iridescenceIOR: 1.44,
      iridescenceThicknessRange: [160, 520],
      sheen: 0.9,
      sheenRoughness: 0.28,
      sheenColor: new THREE.Color('#60a5fa'),
    });

    this.headMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x11131a,
      roughness: 0.36,
      metalness: 0.1,
      clearcoat: 0.78,
      clearcoatRoughness: 0.12,
      side: THREE.DoubleSide,
    });

    const createSilkMaterial = (tex: THREE.CanvasTexture, normalTex: THREE.CanvasTexture, opacity: number) =>
      new THREE.MeshPhysicalMaterial({
        map: tex,
        normalMap: normalTex,
        normalScale: new THREE.Vector2(0.62, 0.62),
        transparent: true,
        opacity,
        alphaTest: 0.04,
        roughness: 0.28,
        metalness: 0.1,
        clearcoat: 0.82,
        clearcoatRoughness: 0.14,
        iridescence: 0.9,
        iridescenceIOR: 1.36,
        iridescenceThicknessRange: [200, 500],
        sheen: 1.0,
        sheenRoughness: 0.32,
        sheenColor: new THREE.Color('#dbeafe'),
        side: THREE.DoubleSide,
        depthWrite: false,
      });

    this.caudalMaterial = createSilkMaterial(this.caudalTexture, this.caudalNormalTexture, 0.96);
    this.sailMaterial = createSilkMaterial(this.sailTexture, this.sailNormalTexture, 0.95);
    this.pectoralMaterial = new THREE.MeshPhysicalMaterial({
      map: this.pectoralTexture,
      transparent: true,
      opacity: 0.72,
      alphaTest: 0.02,
      roughness: 0.26,
      metalness: 0.1,
      clearcoat: 0.75,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    this.pelvicMaterial = new THREE.MeshPhysicalMaterial({
      map: this.pelvicTexture,
      roughness: 0.24,
      metalness: 0.18,
      clearcoat: 0.88,
      iridescence: 0.82,
      transparent: true,
      opacity: 0.96,
      side: THREE.DoubleSide,
    });

    this.irisMaterial = new THREE.MeshStandardMaterial({
      map: this.irisTexture,
      color: 0xffffff,
      roughness: 0.16,
      metalness: 0.38,
    });

    this.corneaMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      roughness: 0.03,
      metalness: 0.0,
      clearcoat: 1.0,
      clearcoatRoughness: 0.02,
      transparent: true,
      opacity: 0.26,
      depthWrite: false,
    });

    this.pupilMaterial = new THREE.MeshStandardMaterial({
      color: 0x020205,
      roughness: 0.03,
      metalness: 0.1,
    });

    this.gillMembraneMaterial = new THREE.MeshStandardMaterial({
      color: 0x7f1d1d,
      roughness: 0.42,
      metalness: 0.06,
      side: THREE.DoubleSide,
    });

    this.goldMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.95,
      roughness: 0.16,
    });
  }

  // Anatomically faithful high-resolution sculpted Betta splendens torso (56x36)
  private buildSculptedBody() {
    const numRings = this.isSoftwareGl ? 44 : 56;
    const radialSegs = this.isSoftwareGl ? 26 : 36;

    // Sleek Betta splendens profile: upturned superior mouth (x=0.90) -> muscular arched shoulders -> tapered peduncle (x=-1.16)
    const profiles: { x: number; yOff: number; rY: number; rZ: number; ridge: number }[] = [
      { x: 0.90,  yOff: 0.095, rY: 0.024, rZ: 0.026, ridge: 0.0  }, // Upturned snout tip
      { x: 0.83,  yOff: 0.088, rY: 0.058, rZ: 0.048, ridge: 0.01 }, // Snout bridge
      { x: 0.71,  yOff: 0.085, rY: 0.104, rZ: 0.078, ridge: 0.03 }, // Sloped forehead
      { x: 0.56,  yOff: 0.088, rY: 0.158, rZ: 0.110, ridge: 0.06 }, // Eye socket plane
      { x: 0.39,  yOff: 0.090, rY: 0.216, rZ: 0.136, ridge: 0.09 }, // Cranial arch / operculum crest
      { x: 0.19,  yOff: 0.074, rY: 0.264, rZ: 0.146, ridge: 0.13 }, // Muscular shoulders & chest
      { x: -0.04, yOff: 0.056, rY: 0.258, rZ: 0.134, ridge: 0.14 }, // Full flank & dorsal arch
      { x: -0.30, yOff: 0.040, rY: 0.230, rZ: 0.108, ridge: 0.12 }, // Mid-posterior body
      { x: -0.58, yOff: 0.026, rY: 0.188, rZ: 0.080, ridge: 0.08 }, // Posterior taper
      { x: -0.84, yOff: 0.015, rY: 0.146, rZ: 0.052, ridge: 0.04 }, // Peduncle neck
      { x: -1.03, yOff: 0.008, rY: 0.124, rZ: 0.036, ridge: 0.02 }, // Muscular caudal peduncle
      { x: -1.16, yOff: 0.004, rY: 0.108, rZ: 0.024, ridge: 0.0  }, // Tail fan root
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
      const smoothF = f * f * (3 - 2 * f);

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

        // Muscular dorsal arch & sculpted laterally-compressed Betta cross-section
        const dorsalBoost = sinT > 0 ? 1 + ridge * Math.pow(sinT, 2.1) : 1;
        const ventralRound = sinT < 0 ? 1 + 0.05 * Math.pow(-sinT, 1.8) : 1;
        const lateralPinch = 1 - Math.abs(sinT) * 0.14;
        const flankCurve = Math.sign(cosT) * Math.pow(Math.abs(cosT), 0.92);

        const y = yOff + sinT * rY * dorsalBoost * ventralRound;
        const z = flankCurve * rZ * lateralPinch;

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

  // Sculpted Superior Betta Mouth (Upper Lip + Articulated Lower Jaw) + Flush Cheek Operculum + Flare Beard
  private buildMouthAndGills() {
    // Upper lip arch integrated smoothly into upturned snout
    const upperLipGeom = new THREE.SphereGeometry(0.036, 14, 12);
    upperLipGeom.scale(1.25, 0.58, 0.92);
    const upperLip = new THREE.Mesh(upperLipGeom, this.headMaterial);
    upperLip.position.set(0.885, 0.105, 0);
    upperLip.rotation.z = -0.22;
    this.fishRoot.add(upperLip);

    // Sculpted upturned lower jaw & chin bridge
    const jawGeom = new THREE.SphereGeometry(0.048, 16, 14);
    jawGeom.scale(1.45, 0.56, 0.9);
    this.lowerJawMesh = new THREE.Mesh(jawGeom, this.headMaterial);
    this.lowerJawMesh.position.set(0.855, 0.072, 0);
    this.lowerJawMesh.rotation.z = 0.34;
    this.fishRoot.add(this.lowerJawMesh);

    // Flush Contoured Cheek Operculum plates (hug cheeks smoothly without sticking out)
    const opGeom = new THREE.SphereGeometry(0.148, 18, 16, 0, Math.PI * 0.62, Math.PI * 0.24, Math.PI * 0.56);
    opGeom.scale(1.14, 1.12, 0.44);

    this.leftOperculum = new THREE.Mesh(opGeom, this.headMaterial);
    this.leftOperculum.position.set(0.41, 0.068, 0.056);
    this.leftOperculum.rotation.y = Math.PI * 0.18;
    this.fishRoot.add(this.leftOperculum);

    this.rightOperculum = new THREE.Mesh(opGeom, this.headMaterial);
    this.rightOperculum.position.set(0.41, 0.068, -0.056);
    this.rightOperculum.rotation.y = -Math.PI * 0.18;
    this.rightOperculum.scale.z = -1;
    this.fishRoot.add(this.rightOperculum);

    // Dramatic Branchiostegal Gill Flare Beard tucked under throat
    const beardShape = new THREE.Shape();
    beardShape.moveTo(0, 0);
    beardShape.quadraticCurveTo(0.085, -0.14, 0.0, -0.205);
    beardShape.quadraticCurveTo(-0.125, -0.185, -0.145, -0.02);
    beardShape.closePath();

    const beardGeom = new THREE.ShapeGeometry(beardShape, 14);
    this.leftBranchioBeard = new THREE.Mesh(beardGeom, this.gillMembraneMaterial);
    this.leftBranchioBeard.position.set(0.45, 0.005, 0.064);
    this.leftBranchioBeard.rotation.set(0.35, 0.4, 0);
    this.leftBranchioBeard.scale.set(0.08, 0.08, 0.08);
    this.fishRoot.add(this.leftBranchioBeard);

    this.rightBranchioBeard = new THREE.Mesh(beardGeom, this.gillMembraneMaterial);
    this.rightBranchioBeard.position.set(0.45, 0.005, -0.064);
    this.rightBranchioBeard.rotation.set(-0.35, -0.4, 0);
    this.rightBranchioBeard.scale.set(0.08, 0.08, 0.08);
    this.fishRoot.add(this.rightBranchioBeard);
  }

  private buildEyes() {
    this.eyeSparkMaterial = new THREE.MeshBasicMaterial({ color: 0xffffff });
    this.leftEye = this.createRealisticEye(true);
    this.rightEye = this.createRealisticEye(false);
    this.fishRoot.add(this.leftEye);
    this.fishRoot.add(this.rightEye);
  }

  private createRealisticEye(isLeft: boolean): THREE.Group {
    const eye = new THREE.Group();
    const zSign = isLeft ? 1 : -1;

    // Flush subtle dark orbital socket cushion (no chunky protruding torus)
    const socketGeom = new THREE.SphereGeometry(0.052, 18, 16);
    socketGeom.scale(1.06, 1.02, 0.46);
    const socket = new THREE.Mesh(socketGeom, this.headMaterial);
    socket.position.set(-0.003, 0, -0.004 * zSign);
    eye.add(socket);

    // Metallic striated iris dome
    const irisGeom = new THREE.SphereGeometry(0.045, 20, 20);
    irisGeom.scale(1.0, 1.0, 0.54);
    const iris = new THREE.Mesh(irisGeom, this.irisMaterial);
    iris.position.set(0, 0, 0.004 * zSign);
    eye.add(iris);

    // Movable pupil + catchlight group
    const pupilGroup = new THREE.Group();
    const pupilGeom = new THREE.SphereGeometry(0.028, 18, 18);
    pupilGeom.scale(1.0, 1.0, 0.48);
    const pupil = new THREE.Mesh(pupilGeom, this.pupilMaterial);
    pupil.position.set(0.006, 0.002, 0.021 * zSign);
    pupilGroup.add(pupil);

    // Crisp specular wet catchlight dot
    const sparkGeom = new THREE.SphereGeometry(0.0075, 10, 10);
    const spark = new THREE.Mesh(sparkGeom, this.eyeSparkMaterial);
    spark.position.set(0.014, 0.012, 0.032 * zSign);
    pupilGroup.add(spark);

    eye.add(pupilGroup);
    if (isLeft) this.leftPupilGroup = pupilGroup;
    else this.rightPupilGroup = pupilGroup;

    // Glossy outer convex cornea lens
    const corneaGeom = new THREE.SphereGeometry(0.049, 20, 20);
    corneaGeom.scale(1.0, 1.0, 0.62);
    const cornea = new THREE.Mesh(corneaGeom, this.corneaMaterial);
    cornea.position.set(0, 0, 0.004 * zSign);
    eye.add(cornea);

    // Positioned flush inside the sleek facial cheek contour
    eye.position.set(0.625, 0.114, 0.072 * zSign);
    eye.rotation.y = 0.24 * zSign;
    return eye;
  }

  // Photo-proportioned Show-Grade Halfmoon Caudal, Sweeping Dorsal & Anal Sails, Sculpted Pelvics, Gossamer Pectorals
  private buildShowFins() {
    const cRadSegs = this.isSoftwareGl ? 56 : 84;
    const cLenSegs = this.isSoftwareGl ? 24 : 34;

    // 1. Halfmoon 196-degree Caudal Fin (silky macro silk drapes + fine ray normals)
    this.caudalFinGeom = this.createHalfmoonCaudal(1.66, 1.56, Math.PI * 1.09, cRadSegs, cLenSegs);
    this.caudalFinMesh = new THREE.Mesh(this.caudalFinGeom, this.caudalMaterial);
    this.caudalFinMesh.position.set(-1.07, 0.004, 0);
    this.caudalFinMesh.rotation.y = Math.PI;
    this.fishRoot.add(this.caudalFinMesh);
    this.caudalOriginalPositions = new Float32Array(this.caudalFinGeom.attributes.position.array);

    // 2. Seamless Broad Fan-Shaped Dorsal Fin
    this.dorsalFinGeom = this.createShowSail(true, this.isSoftwareGl ? 36 : 48, this.isSoftwareGl ? 18 : 24);
    this.dorsalFinMesh = new THREE.Mesh(this.dorsalFinGeom, this.sailMaterial);
    this.fishRoot.add(this.dorsalFinMesh);
    this.dorsalOriginalPositions = new Float32Array(this.dorsalFinGeom.attributes.position.array);

    // 3. Seamless Broad Sweeping Anal Curtain Fin
    this.analFinGeom = this.createShowSail(false, this.isSoftwareGl ? 38 : 50, this.isSoftwareGl ? 18 : 24);
    this.analFinMesh = new THREE.Mesh(this.analFinGeom, this.sailMaterial);
    this.fishRoot.add(this.analFinMesh);
    this.analOriginalPositions = new Float32Array(this.analFinGeom.attributes.position.array);

    // 4. Sweeping Scimitar Pelvic Blade Fins
    this.leftPelvicGeom = this.createPelvicRibbon();
    this.leftPelvicOrig = new Float32Array(this.leftPelvicGeom.attributes.position.array);
    this.leftPelvicMesh = new THREE.Mesh(this.leftPelvicGeom, this.pelvicMaterial);
    this.leftPelvicMesh.position.set(0.29, -0.142, 0.04);
    this.leftPelvicMesh.rotation.set(0.15, 0.1, -0.45);
    this.fishRoot.add(this.leftPelvicMesh);

    this.rightPelvicGeom = this.createPelvicRibbon();
    this.rightPelvicOrig = new Float32Array(this.rightPelvicGeom.attributes.position.array);
    this.rightPelvicMesh = new THREE.Mesh(this.rightPelvicGeom, this.pelvicMaterial);
    this.rightPelvicMesh.position.set(0.26, -0.148, -0.04);
    this.rightPelvicMesh.rotation.set(-0.15, -0.1, -0.64);
    this.fishRoot.add(this.rightPelvicMesh);

    // 5. Muscular Pectoral Buds + Delicate Gossamer Pectoral Fans
    const pBudGeom = new THREE.SphereGeometry(0.036, 12, 10);
    pBudGeom.scale(1.15, 0.85, 0.55);
    const leftBud = new THREE.Mesh(pBudGeom, this.bodyMaterial);
    leftBud.position.set(0.30, -0.025, 0.118);
    this.fishRoot.add(leftBud);

    const rightBud = new THREE.Mesh(pBudGeom, this.bodyMaterial);
    rightBud.position.set(0.30, -0.025, -0.118);
    this.fishRoot.add(rightBud);

    const pectoralGeom = this.createPectoralFan();
    this.leftPectoralFin = new THREE.Mesh(pectoralGeom, this.pectoralMaterial);
    this.leftPectoralFin.position.set(0.30, -0.025, 0.128);
    this.leftPectoralFin.rotation.set(0.15, 0.48, -0.18);
    this.fishRoot.add(this.leftPectoralFin);

    this.rightPectoralFin = new THREE.Mesh(pectoralGeom, this.pectoralMaterial);
    this.rightPectoralFin.position.set(0.30, -0.025, -0.128);
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

    const rowSize = radialSegs + 1;
    for (let r = 0; r <= lengthSegs; r++) {
      const radiusRatio = r / lengthSegs;
      const baseR = 0.085 + Math.pow(radiusRatio, 0.88) * length;

      for (let s = 0; s <= radialSegs; s++) {
        const v = s / radialSegs;
        const angle = -arc / 2 + v * arc;

        // Classic Halfmoon D-shape profile + gentle ray-tip scalloping near outer margin
        const edgeDist = Math.abs(v - 0.5) * 2;
        const dShapeBoost = 1.0 - 0.065 * Math.pow(edgeDist, 2.2);
        let rad = baseR * dShapeBoost;
        if (radiusRatio > 0.86) {
          const tipT = (radiusRatio - 0.86) / 0.14;
          rad += Math.abs(Math.sin(v * Math.PI * 28)) * 0.026 * tipT * tipT;
        }

        const x = Math.cos(angle) * rad * (width / length);
        const y = Math.sin(angle) * rad;
        // Organic flowing silk drape folds (smooth low-frequency folds; fine ray relief handled by 1024px normal map)
        const drape1 = Math.sin(v * Math.PI * 7) * 0.032 * Math.pow(radiusRatio, 1.15);
        const drape2 = Math.cos(v * Math.PI * 15) * 0.012 * Math.pow(radiusRatio, 1.5);
        const z = drape1 + drape2;

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

  private createShowSail(isDorsal: boolean, segX: number, segY: number): THREE.BufferGeometry {
    const geom = new THREE.BufferGeometry();
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const rowSize = segX + 1;

    // Exact spine/belly attachment endpoints matching buildSculptedBody()
    const frontX = isDorsal ? 0.02 : 0.19;
    const backX = isDorsal ? -0.99 : -1.01;

    for (let iy = 0; iy <= segY; iy++) {
      const v = iy / segY; // 0 = embedded seamlessly along torso, 1 = flowing outer margin

      for (let ix = 0; ix <= segX; ix++) {
        const u = ix / segX; // 0 = front leading edge, 1 = rear trailing edge
        const baseX = THREE.MathUtils.lerp(frontX, backX, u);

        // Compute exact embedded root Y hugging the torso profile
        const rootY = isDorsal
          ? THREE.MathUtils.lerp(0.31, 0.108, Math.pow(u, 0.9))
          : THREE.MathUtils.lerp(-0.16, -0.098, Math.pow(u, 1.25));

        let tipX: number;
        let tipY: number;
        if (isDorsal) {
          // Graceful sweeping crest arching up and back over the upper caudal fan
          const frontArc = (1 - u) * 0.11 * Math.sin(u * Math.PI * 0.9 + 0.25);
          tipX = baseX - u * 0.82 - (1 - u) * 0.08 + frontArc;
          tipY = 0.90 + Math.sin(Math.pow(u, 0.72) * Math.PI * 0.88) * 0.34 - Math.pow(u, 2.0) * 0.2;
        } else {
          // Anal curtain sweeps down behind pelvics and extends smoothly back beneath lower caudal
          tipX = baseX - (0.30 + Math.pow(u, 1.06) * 0.70);
          tipY = -0.97 - Math.sin(u * Math.PI * 0.86) * 0.27 + Math.pow(u, 2.1) * 0.21;
        }

        const curvePower = Math.pow(v, 0.86);
        const bowX = isDorsal && u < 0.28 ? Math.sin(v * Math.PI) * 0.08 * (1 - u / 0.28) : 0;
        const ruffle = v > 0.84 ? Math.abs(Math.sin(u * Math.PI * 18)) * 0.018 * Math.pow((v - 0.84) / 0.16, 2) : 0;

        const x = THREE.MathUtils.lerp(baseX, tipX, curvePower) + bowX;
        const y = THREE.MathUtils.lerp(rootY, tipY, v) + (isDorsal ? ruffle : -ruffle);
        // Soft natural silk pleats
        const z = (Math.sin(u * Math.PI * 6) * 0.026 + Math.cos(u * Math.PI * 13) * 0.01) * v;

        positions.push(x, y, z);
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
    const lengthSegs = 22;
    const widthSegs = 8;
    const geom = new THREE.BufferGeometry();
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];
    const len = 0.90;

    for (let iy = 0; iy <= lengthSegs; iy++) {
      const t = iy / lengthSegs;
      const halfW = Math.sin(Math.pow(t, 0.46) * Math.PI) * 0.095 * (1 - t * 0.42) + 0.004 * (1 - t);
      const y = -t * len;
      const curveX = -Math.pow(t, 1.5) * 0.24;

      for (let ix = 0; ix <= widthSegs; ix++) {
        const u = ix / widthSegs;
        const x = curveX + (u - 0.5) * 2 * halfW;
        const z = Math.sin(u * Math.PI) * 0.016 * (1 - t * 0.85);
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

    const geom = new THREE.ShapeGeometry(shape, 16);
    geom.computeBoundingBox();
    const bb = geom.boundingBox!;
    const uvAttr = geom.attributes.uv;
    const posAttr = geom.attributes.position;
    const spanX = bb.max.x - bb.min.x || 1;
    const spanY = bb.max.y - bb.min.y || 1;
    for (let i = 0; i < posAttr.count; i++) {
      uvAttr.setXY(i, (posAttr.getX(i) - bb.min.x) / spanX, (posAttr.getY(i) - bb.min.y) / spanY);
    }
    geom.scale(0.86, 0.86, 0.86);
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

    this.vipCrownGroup.position.set(0.46, 0.31, 0);
    this.vipCrownGroup.rotation.z = -0.15;
  }

  public setVip(isVip: boolean) {
    this.vipCrownGroup.visible = isVip;
  }

  public triggerGulp() {
    this.mouthGulpTimer = 0.42;
    this.mouthAnticipate = 0;
  }

  public setHeading(angle: number) {
    this.headingAngle = angle;
    this.group.rotation.y = angle;
  }

  public prepareBite(active: boolean) {
    this.mouthAnticipate = active ? 1.0 : 0.0;
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

    this.paintPelvicTexture(this.pelvicTexture.image.getContext('2d')!, palette);
    this.pelvicTexture.needsUpdate = true;

    this.paintIrisTexture(this.irisTexture.image.getContext('2d')!, palette);
    this.irisTexture.needsUpdate = true;

    this.bodyMaterial.sheenColor = new THREE.Color(palette.iridescenceTint);
    this.headMaterial.color.set(palette.headMask);
    this.caudalMaterial.sheenColor = new THREE.Color(palette.finRim);
    this.sailMaterial.sheenColor = new THREE.Color(palette.finRim);
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
    if (this.excitedTimer > 0) {
      this.excitedTimer = Math.max(0, this.excitedTimer - delta);
      if (this.excitedTimer === 0) {
        this.isExcited = false;
      }
    }

    const speedNow = this.velocity.length();
    this.currentSwimSpeed = THREE.MathUtils.damp(this.currentSwimSpeed, speedNow, 5.5, delta);
    const motionFactor = THREE.MathUtils.clamp(this.currentSwimSpeed / 0.85, 0.28, 1.9);

    const speedMult = this.combatMode
      ? this.combatPreview
        ? 3.1
        : 5.2
      : this.isFlaring
      ? 4.4
      : this.isExcited
      ? 2.8 + motionFactor * 1.15
      : 1.45 + motionFactor * 1.4;
    this.animTime += delta * speedMult;

    if (this.combatMode) {
      // PvP Arena combat positioning: spring toward stance + strike dash + recoil
      const hoverX = Math.sin(this.animTime * 0.65) * (this.combatPreview ? 0.06 : 0.09);
      const hoverY = Math.cos(this.animTime * 0.85) * (this.combatPreview ? 0.06 : 0.08) + (this.combatGuardActive ? 0.14 : 0);

      _toTarget.set(
        this.combatHomePos.x + this.combatDashOffset.x + hoverX,
        this.combatHomePos.y + this.combatDashOffset.y + hoverY,
        this.combatHomePos.z + this.combatDashOffset.z
      );

      this.currentPosition.x = THREE.MathUtils.damp(this.currentPosition.x, _toTarget.x, 8.5, delta);
      this.currentPosition.y = THREE.MathUtils.damp(this.currentPosition.y, _toTarget.y, 8.5, delta);
      this.currentPosition.z = THREE.MathUtils.damp(this.currentPosition.z, _toTarget.z, 8.5, delta);

      this.combatDashOffset.x = THREE.MathUtils.damp(this.combatDashOffset.x, 0, 5.2, delta);
      this.combatDashOffset.y = THREE.MathUtils.damp(this.combatDashOffset.y, 0, 5.2, delta);
      this.combatDashOffset.z = THREE.MathUtils.damp(this.combatDashOffset.z, 0, 5.2, delta);

      this.combatRecoil = THREE.MathUtils.damp(this.combatRecoil, 0, 6.0, delta);
      if (this.combatSpin > 0.01) {
        this.combatSpin = THREE.MathUtils.damp(this.combatSpin, 0, 6.8, delta);
      } else {
        this.combatSpin = 0;
      }

      const headingDelta = shortestAngleDiff(this.headingAngle, this.combatFacing);
      this.headingAngle += headingDelta * (1 - Math.exp(-8.0 * delta));
      this.pitchAngle = THREE.MathUtils.damp(
        this.pitchAngle,
        this.combatRecoil * 0.35 + this.combatDashOffset.y * 0.3,
        8.0,
        delta
      );
      this.rollAngle = THREE.MathUtils.damp(
        this.rollAngle,
        this.combatRecoil * 0.55 * Math.sin(this.animTime * 4) + this.combatSpin,
        8.0,
        delta
      );

      this.group.position.copy(this.currentPosition);
      this.group.rotation.set(this.rollAngle, this.headingAngle, this.pitchAngle, 'ZYX');

      if (this.shieldMesh) {
        this.shieldMesh.visible = this.combatGuardActive;
        if (this.combatGuardActive) {
          const pulse = 1.0 + Math.sin(this.animTime * 2.5) * 0.05;
          this.shieldMesh.scale.setScalar(pulse);
          this.shieldMesh.rotation.y += delta * 1.8;
        }
      }
    } else {
      if (this.shieldMesh) this.shieldMesh.visible = false;

      // 1. Lifelike Betta Swimming: Burst-Cruise + Poised Mid-Water Hover Cycles
      _toTarget.subVectors(this.targetPosition, this.currentPosition);
      const dist = _toTarget.length();

      if (this.returningHome) {
        // Locked direct return to main aquarium after Fighter mode
        if (dist < 0.24 && this.currentPosition.x < 2.5) {
          this.returningHome = false;
          this.isHovering = true;
          this.hoverPauseTimer = 1.5;
          this.wanderTimer = 2.8;
        }
      } else if (this.isHovering) {
        if (this.isExcited || this.isFlaring) {
          this.isHovering = false;
          this.hoverPauseTimer = 0;
        } else {
          this.hoverPauseTimer -= delta;
          if (this.hoverPauseTimer <= 0) {
            this.isHovering = false;
            this.wanderTimer = 0;
          }
        }
      } else {
        this.wanderTimer -= delta;
        if ((dist <= 0.18 && !this.isExcited && !this.isFlaring) || this.wanderTimer <= 0) {
          if (dist <= 0.18 && !this.isExcited && !this.isFlaring) {
            // Arrived smoothly -> pause & hover like a real Betta inspecting its territory
            this.isHovering = true;
            this.hoverPauseTimer = 1.4 + Math.random() * 2.3;
          } else {
            this.wanderTimer = 3.4 + Math.random() * 3.2;
            const marginX = 0.7;
            const marginY = 0.55;
            const zRange = this.isFlaring ? 0.35 : 0.85;
            const roll = Math.random();
            // Real Bettas favor mid-to-upper water levels (labyrinth fish breathing near surface + patrolling center)
            const chosenY =
              roll < 0.32
                ? THREE.MathUtils.randFloat(boundBox.maxY - 0.88, boundBox.maxY - 0.32)
                : THREE.MathUtils.randFloat(boundBox.minY + marginY + 0.32, boundBox.maxY - marginY);
            this.targetPosition.set(
              THREE.MathUtils.randFloat(boundBox.minX + marginX, boundBox.maxX - marginX),
              chosenY,
              THREE.MathUtils.randFloat(-zRange, zRange)
            );
          }
        }
      }

      if (this.isHovering) {
        // Gentle stationary poise: forward drift decays, body levels upright with curious slight nose-up tilt
        this.velocity.multiplyScalar(Math.exp(-4.2 * delta));
        this.currentPosition.addScaledVector(this.velocity, delta);
        this.pitchAngle = THREE.MathUtils.damp(
          this.pitchAngle,
          0.035 + Math.sin(this.animTime * 0.7) * 0.025,
          2.6,
          delta
        );
        this.rollAngle = THREE.MathUtils.damp(this.rollAngle, 0, 3.2, delta);
      } else {
        const targetSpeed = this.isSleeping
          ? 0.24
          : this.returningHome
          ? 2.45
          : this.isFlaring
          ? 0.44
          : this.isExcited
          ? 1.85
          : this.swimSpeed;

        if (dist > 0.01) {
          _toTarget.normalize();
          const arriveScale = this.isExcited
            ? THREE.MathUtils.clamp(dist / 0.4, 0.38, 1.0)
            : THREE.MathUtils.clamp(dist / 0.7, 0.2, 1.0);
          _desiredVel.copy(_toTarget).multiplyScalar(targetSpeed * arriveScale);
          const steerRate = this.isExcited || this.returningHome ? 5.2 : 3.1;
          this.velocity.lerp(_desiredVel, 1 - Math.exp(-steerRate * delta));
        }
        this.currentPosition.addScaledVector(this.velocity, delta);

        const velLen = this.velocity.length();
        if (velLen > 0.025) {
          const targetHeading = Math.atan2(-this.velocity.z, this.velocity.x);
          const headingDelta = shortestAngleDiff(this.headingAngle, targetHeading);
          const turnRate = this.isExcited ? 6.2 : 3.8;
          this.headingAngle += headingDelta * (1 - Math.exp(-turnRate * delta));

          const targetPitch = Math.asin(
            THREE.MathUtils.clamp(this.velocity.y / (velLen + 0.06), -0.68, 0.68)
          );
          this.pitchAngle = THREE.MathUtils.damp(this.pitchAngle, targetPitch, 4.0, delta);

          const targetRoll = THREE.MathUtils.clamp(headingDelta * 0.42, -0.26, 0.26);
          this.rollAngle = THREE.MathUtils.damp(this.rollAngle, targetRoll, 3.4, delta);
        }
      }

      if (!this.returningHome) {
        this.currentPosition.x = THREE.MathUtils.clamp(this.currentPosition.x, boundBox.minX + 0.48, boundBox.maxX - 0.48);
        this.currentPosition.y = THREE.MathUtils.clamp(this.currentPosition.y, boundBox.minY + 0.42, boundBox.maxY - 0.24);
        this.currentPosition.z = THREE.MathUtils.clamp(this.currentPosition.z, boundBox.minZ + 0.35, boundBox.maxZ - 0.35);
      }

      this.group.position.copy(this.currentPosition);
      this.group.rotation.set(this.rollAngle, this.headingAngle, this.pitchAngle, 'ZYX');
    }

    // 2. Gill Breathing & Mirror Flare Animation
    const targetFlare = this.isFlaring ? 1.0 : 0.0;
    this.flareIntensity = THREE.MathUtils.damp(this.flareIntensity, targetFlare, 6.0, delta);

    const breathe = Math.sin(this.animTime * 2.2) * 0.035;
    const opOpen = 0.04 + breathe + this.flareIntensity * (this.combatPreview ? 0.32 : 0.48);
    this.leftOperculum.rotation.y = Math.PI * 0.18 - opOpen;
    this.rightOperculum.rotation.y = -Math.PI * 0.18 + opOpen;

    // Throat flare beard unfolds dramatically during flare
    const beardScale = 0.08 + this.flareIntensity * (this.combatPreview ? 0.72 : 1.15);
    this.leftBranchioBeard.scale.set(beardScale, beardScale, beardScale);
    this.rightBranchioBeard.scale.set(beardScale, beardScale, beardScale);

    // Jaw breathing + gulp / food anticipation
    if (this.mouthGulpTimer > 0) this.mouthGulpTimer = Math.max(0, this.mouthGulpTimer - delta);
    const gulpAngle = this.mouthGulpTimer > 0 ? Math.sin((this.mouthGulpTimer / 0.42) * Math.PI) * 0.46 : 0;
    const anticipateOpen = this.mouthAnticipate * 0.18;
    this.lowerJawMesh.rotation.z = 0.34 - Math.max(0, breathe * 1.2) - gulpAngle - anticipateOpen;

    // 3. Seamless S-Wave Spinal Deformation on Body + Synchronized Tail Root Offset!
    const peduncleOffset = this.deformBodySpine(motionFactor);

    // 4. Pectoral Hummingbird Flutter (stabilizing faster when hovering/turning)
    const flutterFreq = this.animTime * (this.isHovering ? 10.8 : 9.2);
    const flutterAmp = (this.isHovering ? 0.46 : 0.38) + this.flareIntensity * 0.25;
    this.leftPectoralFin.rotation.y = 0.48 + Math.sin(flutterFreq) * flutterAmp;
    this.rightPectoralFin.rotation.y = -0.48 - Math.sin(flutterFreq + 0.35) * flutterAmp;

    // 5. Flowing Fins Synchronized with Body Wave
    this.animateCaudalFin(peduncleOffset, motionFactor);
    this.animateSails(motionFactor);
    this.animatePelvicRibbons();

    // 6. Subtle Eye Saccades (alert curious gaze)
    const eyeSaccade = Math.sin(this.animTime * 1.2) * 0.14;
    if (this.leftPupilGroup && this.rightPupilGroup) {
      this.leftPupilGroup.rotation.y = eyeSaccade;
      this.rightPupilGroup.rotation.y = -eyeSaccade;
    }

    // Gentle hover buoyancy
    this.group.position.y += Math.sin(this.animTime * 1.35) * (this.isHovering ? 0.008 : 0.004);
  }

  // Real traveling sinusoidal S-wave along the body spine (head stays steady, tail sweeps cleanly)
  private deformBodySpine(motionFactor = 1.0): number {
    const pos = this.bodyGeom.attributes.position;
    const orig = this.bodyOriginalPositions;
    const count = pos.count;
    const amp = this.isFlaring
      ? 0.095
      : this.isExcited
      ? 0.082
      : THREE.MathUtils.lerp(0.032, 0.068, THREE.MathUtils.clamp((motionFactor - 0.28) / 1.2, 0, 1));

    let peduncleZ = 0;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const ox = orig[idx];
      const oy = orig[idx + 1];
      const oz = orig[idx + 2];

      // Normalize X from 0 (head/shoulders x=0.40) to 1 (tail root x=-1.16)
      const bodyT = THREE.MathUtils.clamp((0.40 - ox) / 1.56, 0, 1);
      const flexWeight = bodyT * bodyT;
      const wave = Math.sin(this.animTime * 3.1 - bodyT * 2.4) * amp * flexWeight;

      pos.setXYZ(i, ox, oy, oz + wave);
      if (ox < -1.12) {
        peduncleZ = wave;
      }
    }

    pos.needsUpdate = true;
    this.bodyGeom.computeVertexNormals();
    return peduncleZ;
  }

  private animateCaudalFin(peduncleZ: number, motionFactor = 1.0) {
    // Anchor tail root cleanly to moving peduncle
    this.caudalFinMesh.position.z = peduncleZ;

    const pos = this.caudalFinGeom.attributes.position;
    const orig = this.caudalOriginalPositions;
    const count = pos.count;
    const flareScale = 1.0 + this.flareIntensity * (this.combatPreview ? 0.14 : 0.22);
    const waveScale = this.isFlaring ? 1.1 : THREE.MathUtils.clamp(0.68 + motionFactor * 0.38, 0.7, 1.25);

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const ox = orig[idx];
      const oy = orig[idx + 1];
      const oz = orig[idx + 2];

      const dist = Math.sqrt(ox * ox + oy * oy);
      const ratio = THREE.MathUtils.clamp(dist / 1.56, 0, 1);

      const wave1 = Math.sin(this.animTime * 3.1 - 2.4 - ratio * 3.2) * 0.21 * waveScale * Math.pow(ratio, 1.3);
      const wave2 = Math.cos(this.animTime * 4.8 - ratio * 5.0 + oy * 1.6) * 0.06 * waveScale * Math.pow(ratio, 1.8);
      const verticalLilt = Math.cos(this.animTime * 2.3 - ratio * 2.4) * 0.04 * ratio;

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

  private animateSails(motionFactor = 1.0) {
    const spineAmp = this.isFlaring
      ? 0.095
      : this.isExcited
      ? 0.082
      : THREE.MathUtils.lerp(0.032, 0.068, THREE.MathUtils.clamp((motionFactor - 0.28) / 1.2, 0, 1));
    const sailWaveScale = this.isFlaring ? 1.05 : THREE.MathUtils.clamp(0.7 + motionFactor * 0.35, 0.7, 1.2);

    // Dorsal sail (positioned at 0,0,0 so ox is exact body space X)
    const dPos = this.dorsalFinGeom.attributes.position;
    const dOrig = this.dorsalOriginalPositions;
    for (let i = 0; i < dPos.count; i++) {
      const idx = i * 3;
      const ox = dOrig[idx];
      const oy = dOrig[idx + 1];
      const oz = dOrig[idx + 2];

      const bodyT = THREE.MathUtils.clamp((0.40 - ox) / 1.56, 0, 1);
      const spineZ = Math.sin(this.animTime * 3.1 - bodyT * 2.4) * spineAmp * bodyT * bodyT;
      const tipRatio = THREE.MathUtils.clamp((oy - 0.15) / 0.95, 0, 1);

      const wave = Math.sin(this.animTime * 3.1 - 1.2 - tipRatio * 2.2 + ox * 1.5) * 0.135 * sailWaveScale * Math.pow(tipRatio, 1.35);
      dPos.setXYZ(i, ox, oy, oz + spineZ + wave);
    }
    dPos.needsUpdate = true;
    this.dorsalFinGeom.computeVertexNormals();

    // Anal curtain (positioned at 0,0,0 so ox is exact body space X)
    const aPos = this.analFinGeom.attributes.position;
    const aOrig = this.analOriginalPositions;
    for (let i = 0; i < aPos.count; i++) {
      const idx = i * 3;
      const ox = aOrig[idx];
      const oy = aOrig[idx + 1];
      const oz = aOrig[idx + 2];

      const bodyT = THREE.MathUtils.clamp((0.40 - ox) / 1.56, 0, 1);
      const spineZ = Math.sin(this.animTime * 3.1 - bodyT * 2.4) * spineAmp * bodyT * bodyT;
      const tipRatio = THREE.MathUtils.clamp((-oy - 0.12) / 1.02, 0, 1);

      const wave = Math.sin(this.animTime * 3.1 - 1.5 - tipRatio * 2.4 + ox * 1.6) * 0.155 * sailWaveScale * Math.pow(tipRatio, 1.35);
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
        const t = THREE.MathUtils.clamp(-oy / 0.88, 0, 1);

        const swayZ = Math.sin(this.animTime * 2.6 - t * 2.8 + m * 0.8) * 0.09 * t * t;
        const sweepX = -this.velocity.length() * 0.11 * t * t;
        const flareOut = this.flareIntensity * 0.1 * t * sideSign;

        pos.setXYZ(i, ox + sweepX, oy, oz + swayZ + flareOut);
      }
      pos.needsUpdate = true;
    }
  }

  public swimTo(point: THREE.Vector3, isUrgent = false) {
    this.returningHome = false;
    this.isHovering = false;
    this.hoverPauseTimer = 0;
    this.targetPosition.copy(point);
    this.wanderTimer = isUrgent ? 3.5 : 4.2;
    if (isUrgent) {
      this.isExcited = true;
      this.excitedTimer = 3.2;
    } else {
      this.isExcited = false;
      this.excitedTimer = 0;
    }
  }

  public triggerFlare(active: boolean) {
    this.isFlaring = active;
    if (active && !this.combatMode) {
      this.returningHome = false;
      this.isHovering = false;
      this.targetPosition.set(0, 0.1, 0.5);
      this.wanderTimer = 5.0;
    }
  }

  public enterCombat(homePos: THREE.Vector3, facing: number, previewOnly = false) {
    this.combatMode = true;
    this.combatPreview = previewOnly;
    this.returningHome = false;
    this.isHovering = false;
    this.isFlaring = true;
    this.combatHomePos.copy(homePos);
    this.combatFacing = facing;
    this.combatDashOffset.set(0, 0, 0);
    this.combatRecoil = 0;
    this.combatSpin = 0;
    this.combatGuardActive = false;
  }

  public setCombatPreview(previewOnly: boolean) {
    this.combatPreview = previewOnly;
  }

  public exitCombat(aquariumReturnPos: THREE.Vector3) {
    this.combatMode = false;
    this.combatPreview = false;
    this.isFlaring = false;
    this.combatGuardActive = false;
    this.mouthAnticipate = 0;
    if (this.shieldMesh) this.shieldMesh.visible = false;
    this.returningHome = true;
    this.isHovering = false;
    this.hoverPauseTimer = 0;
    this.isExcited = false;
    this.excitedTimer = 0;
    this.targetPosition.copy(aquariumReturnPos);
    this.wanderTimer = 8.0;
  }

  public triggerCombatStrike(dirX: number, power: 'light' | 'heavy' | 'ultimate') {
    this.combatDashOffset.x = dirX * (power === 'ultimate' ? 2.1 : power === 'heavy' ? 1.55 : 1.15);
    this.combatDashOffset.y = power === 'heavy' ? 0.14 : 0.04;
    this.triggerGulp();
    if (power === 'ultimate') {
      this.combatSpin = Math.PI * 2;
    }
  }

  public triggerCombatHit(pushDirX: number) {
    this.combatRecoil = 1.0;
    this.combatDashOffset.x = pushDirX * 0.55;
    this.combatDashOffset.y = 0.18;
  }

  public setCombatGuard(active: boolean) {
    this.combatGuardActive = active;
  }

  public dispose() {
    this.bodyGeom.dispose();
    this.caudalFinGeom.dispose();
    this.dorsalFinGeom.dispose();
    this.analFinGeom.dispose();
    this.leftPelvicGeom.dispose();
    this.rightPelvicGeom.dispose();
    this.shieldMesh.geometry.dispose();
    this.shieldMaterial.dispose();
    this.bodyMaterial.dispose();
    this.headMaterial.dispose();
    this.caudalMaterial.dispose();
    this.sailMaterial.dispose();
    this.pectoralMaterial.dispose();
    this.pelvicMaterial.dispose();
    this.irisMaterial.dispose();
    this.corneaMaterial.dispose();
    this.pupilMaterial.dispose();
    this.eyeSparkMaterial.dispose();
    this.gillMembraneMaterial.dispose();
    this.goldMaterial.dispose();
    this.bodyTexture.dispose();
    this.scaleNormalTexture.dispose();
    this.caudalTexture.dispose();
    this.caudalNormalTexture.dispose();
    this.sailTexture.dispose();
    this.sailNormalTexture.dispose();
    this.pectoralTexture.dispose();
    this.pelvicTexture.dispose();
    this.irisTexture.dispose();
  }
}
