/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { RoomEnvironment } from 'three/examples/jsm/environments/RoomEnvironment.js';
import { BettaFish } from './BettaFish';
import { AQUARIUM_THEMES } from '../services/storage';
import { AquariumThemeId, FishColorPalette } from '../types';
import { retroAudio } from '../services/retroAudio';

export interface FoodPellet {
  mesh: THREE.Mesh;
  velocity: THREE.Vector3;
  type: string;
  nutrition: number;
  settledAt?: number;
}

interface ActiveRipple {
  mesh: THREE.Mesh;
  material: THREE.MeshBasicMaterial;
  progress: number;
  maxScale: number;
}

// Pre-allocated scratch helpers (zero GC in 60fps loop)
const _dummy = new THREE.Object3D();
const _mouthPos = new THREE.Vector3();
const _hitPoint = new THREE.Vector3();
const _planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);

export class AquariumScene {
  private container: HTMLElement;
  public renderer!: THREE.WebGLRenderer;
  public scene!: THREE.Scene;
  public camera!: THREE.PerspectiveCamera;
  public fish!: BettaFish;

  private isSoftwareGl: boolean = false;
  private animFrameId: number = 0;
  private isDisposed: boolean = false;
  private clock: THREE.Clock = new THREE.Clock();

  private tankBounds = {
    minX: -3.2,
    maxX: 3.2,
    minY: -2.0,
    maxY: 2.2,
    minZ: -1.8,
    maxZ: 1.8,
  };

  // Scene Elements
  private sandMesh!: THREE.Mesh;
  private sandMaterial!: THREE.MeshStandardMaterial;
  private sandTexture!: THREE.CanvasTexture;
  private causticPlane!: THREE.Mesh;
  private causticCanvas!: HTMLCanvasElement;
  private causticCtx!: CanvasRenderingContext2D;
  private causticTexture!: THREE.CanvasTexture;
  private waterSurfaceMesh!: THREE.Mesh;

  private plantMeshes: THREE.Mesh[] = [];
  private plantOriginalVertices: Float32Array[] = [];

  // Air Bubbles & Floating Plankton
  private bubbleParticles!: THREE.InstancedMesh;
  private bubbleData: { x: number; y: number; z: number; speed: number; wobbleSpeed: number; size: number; isBurst?: boolean }[] = [];
  private bubbleCount = 55;

  private planktonParticles!: THREE.InstancedMesh;
  private planktonData: { x: number; y: number; z: number; vx: number; vy: number; vz: number }[] = [];
  private planktonCount = 65;

  // Volumetric God Rays & Theme Animation Props
  private godRaysGroup: THREE.Group = new THREE.Group();
  private godRayMaterial!: THREE.MeshBasicMaterial;
  private themeAnimatedNodes: {
    obj: THREE.Object3D;
    kind: 'spin' | 'spinY' | 'bob' | 'petal';
    baseY: number;
    baseX: number;
    baseZ: number;
    phase: number;
    speed: number;
  }[] = [];

  // Falling Food & Decorations & Ripples
  private foodPellets: FoodPellet[] = [];
  private decorGroup: THREE.Group = new THREE.Group();
  private tapRipplesGroup: THREE.Group = new THREE.Group();
  private activeRipples: ActiveRipple[] = [];

  // Lighting
  private keyLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private waterTopLight!: THREE.SpotLight;
  private rimLight!: THREE.PointLight;

  // Cleanliness / Water Clarity state
  private currentThemeId: AquariumThemeId = 'tokyo_neon_96';
  private cleanlinessLevel: number = 100;

  // Fighter PvP Arena Mode (sits to the right at X = 12 so camera glide slides aquarium left)
  private readonly arenaCenterX = 12.0;
  public fighterMode: boolean = false;
  private fighterBlend = 0;
  public opponentFish!: BettaFish;
  private arenaGroup: THREE.Group = new THREE.Group();
  private arenaAnimatedNodes: { obj: THREE.Object3D; baseY: number; phase: number }[] = [];
  private arenaCyanLight!: THREE.PointLight;
  private arenaCrimsonLight!: THREE.PointLight;
  private arenaBackRedLight!: THREE.PointLight;
  private arenaAspectZ: number = 5.5;

  // Pre-allocated Atmosphere Colors (zero GC in 60fps loop)
  private themeWaterColor = new THREE.Color('#092747');
  private themeFogColor = new THREE.Color('#092747');
  private themeTopColor = new THREE.Color(0x38bdf8);
  private themeRimColor = new THREE.Color(0xa5f3fc);
  private themeTopIntensity = 2.2;
  private themeFogDensity = 0.08;
  private readonly themeHemiSkyColor = new THREE.Color(0xc7e9ff);
  private readonly themeWaterSurfColor = new THREE.Color(0x38bdf8);

  private readonly arenaWaterColor = new THREE.Color('#3b0714');
  private readonly arenaFogColor = new THREE.Color('#24040c');
  private readonly arenaTopColor = new THREE.Color(0xfb7185);
  private readonly arenaRimColor = new THREE.Color(0xef4444);
  private readonly arenaHemiSkyColor = new THREE.Color(0xfda4af);
  private readonly arenaWaterSurfColor = new THREE.Color(0xf43f5e);
  private readonly _blendColor = new THREE.Color();

  // Interactivity & Resize
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private cameraTarget = new THREE.Vector3(0, 0.12, 0);
  private cameraBasePos = new THREE.Vector3(0, 0.28, 5.25);
  private currentCameraPos = new THREE.Vector3(0, 0.28, 5.25);
  private resizeObserver: ResizeObserver | null = null;
  private onPointerDownBound!: (e: PointerEvent) => void;
  private onResizeBound!: () => void;

  // Callbacks
  public onFishFed?: (nutrition: number) => void;
  public onFishTapped?: () => void;

  constructor(container: HTMLElement, initialSkin: FishColorPalette, initialTheme: AquariumThemeId) {
    this.container = container;
    this.currentThemeId = initialTheme;
    this.initRenderer();
    this.initScene(initialTheme);
    this.initFish(initialSkin);
    this.initDynamicCaustics();
    this.initAquariumWorld(initialTheme);
    this.initFighterArena();
    this.initBubbles();
    this.initPlankton();
    this.initGodRays();
    this.setupEvents();

    if (!this.isSoftwareGl) {
      this.renderer.compile(this.scene, this.camera);
    }
    this.startLoop();
  }

  private initRenderer() {
    this.isSoftwareGl = (() => {
      const gl = document.createElement('canvas').getContext('webgl2');
      if (!gl) return true;
      const ext = gl.getExtension('WEBGL_debug_renderer_info');
      const param = ext ? ext.UNMASKED_RENDERER_WEBGL : gl.RENDERER;
      const gpu = String(gl.getParameter(param));
      gl.getExtension('WEBGL_lose_context')?.loseContext();
      return /SwiftShader|llvmpipe|softpipe|Software|Basic Render/i.test(gpu);
    })();

    this.renderer = new THREE.WebGLRenderer({
      antialias: !this.isSoftwareGl,
      powerPreference: 'high-performance',
      alpha: false,
    });

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;

    this.renderer.setSize(width, height);
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.24;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);
  }

  private initScene(initialTheme: AquariumThemeId) {
    this.scene = new THREE.Scene();
    const theme = AQUARIUM_THEMES[initialTheme] || AQUARIUM_THEMES.tokyo_neon_96;

    this.scene.background = new THREE.Color(theme.waterColor);
    this.scene.fog = new THREE.FogExp2(theme.fogColor, 0.1);

    const width = this.container.clientWidth || window.innerWidth;
    const height = this.container.clientHeight || window.innerHeight;
    const aspect = width / Math.max(1, height);
    this.camera = new THREE.PerspectiveCamera(45, aspect, 0.1, 50);
    this.camera.position.copy(this.cameraBasePos);
    this.adjustCameraForAspect(aspect);

    // Studio Environment Reflection for metallic Betta scales & eyes
    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    // Balanced 3-Point Aquarium Studio Lighting
    this.hemiLight = new THREE.HemisphereLight(0xc7e9ff, 0x0f172a, 1.35);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xfffbeb, 2.5);
    this.keyLight.position.set(2.4, 4.8, 3.6);
    if (!this.isSoftwareGl) {
      this.keyLight.castShadow = true;
      this.keyLight.shadow.mapSize.width = 1024;
      this.keyLight.shadow.mapSize.height = 1024;
      this.keyLight.shadow.camera.near = 0.5;
      this.keyLight.shadow.camera.far = 15;
      this.keyLight.shadow.camera.left = -4;
      this.keyLight.shadow.camera.right = 4;
      this.keyLight.shadow.camera.top = 4;
      this.keyLight.shadow.camera.bottom = -4;
      this.keyLight.shadow.bias = -0.0004;
      this.keyLight.shadow.normalBias = 0.02;
    }
    this.scene.add(this.keyLight);

    this.waterTopLight = new THREE.SpotLight(0x7dd3fc, 2.2, 12, Math.PI / 2.6, 0.5, 1.3);
    this.waterTopLight.position.set(0, 3.6, 0.8);
    this.scene.add(this.waterTopLight);
    this.scene.add(this.waterTopLight.target);

    // Backlight to illuminate translucent silk Betta fins from behind!
    this.rimLight = new THREE.PointLight(0xa5f3fc, 1.8, 10);
    this.rimLight.position.set(-1.5, 0.8, -2.0);
    this.scene.add(this.rimLight);

    this.scene.add(this.decorGroup);
    this.scene.add(this.tapRipplesGroup);
    this.scene.add(this.godRaysGroup);
  }

  private adjustCameraForAspect(aspect: number) {
    // Pull camera back on narrow portrait mobile screens so both grand scenery and fish shine
    const targetZ = aspect < 0.85 ? 6.6 : aspect < 1.1 ? 5.8 : 5.2;
    this.currentCameraPos.z = targetZ;
    this.arenaAspectZ = aspect < 0.85 ? 7.2 : aspect < 1.1 ? 6.15 : 5.55;
  }

  private initFish(skinId: FishColorPalette) {
    this.fish = new BettaFish(skinId, this.isSoftwareGl);
    this.fish.group.position.set(0, 0.18, 0.2);
    this.fish.currentPosition.set(0, 0.18, 0.2);
    this.fish.targetPosition.set(0.25, 0.2, 0.25);
    this.scene.add(this.fish.group);

    this.opponentFish = new BettaFish('ruby_dragon', this.isSoftwareGl);
    this.opponentFish.group.position.set(this.arenaCenterX + 1.4, 0.22, 0.15);
    this.opponentFish.currentPosition.set(this.arenaCenterX + 1.4, 0.22, 0.15);
    this.opponentFish.group.visible = false;
    this.scene.add(this.opponentFish.group);
  }

  private initDynamicCaustics() {
    this.causticCanvas = document.createElement('canvas');
    this.causticCanvas.width = 256;
    this.causticCanvas.height = 256;
    this.causticCtx = this.causticCanvas.getContext('2d')!;

    this.causticTexture = new THREE.CanvasTexture(this.causticCanvas);
    this.causticTexture.wrapS = THREE.RepeatWrapping;
    this.causticTexture.wrapT = THREE.RepeatWrapping;
    this.causticTexture.repeat.set(9, 4);

    const causticGeom = new THREE.PlaneGeometry(34, 12);
    causticGeom.rotateX(-Math.PI / 2);

    const causticMat = new THREE.MeshBasicMaterial({
      map: this.causticTexture,
      transparent: true,
      opacity: 0.3,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.causticPlane = new THREE.Mesh(causticGeom, causticMat);
    this.causticPlane.position.set(6.5, this.tankBounds.minY + 0.14, 0);
    this.scene.add(this.causticPlane);
  }

  private updateCaustics(time: number) {
    const ctx = this.causticCtx;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = 'rgba(190, 240, 255, 0.45)';
    ctx.lineWidth = 3.2;

    const t = time * 1.6;
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      for (let x = 0; x <= 256; x += 16) {
        const y = i * 22 + Math.sin(x * 0.04 + t + i) * 14 + Math.cos(x * 0.02 - t * 0.7) * 8;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    for (let j = 0; j < 12; j++) {
      ctx.beginPath();
      for (let y = 0; y <= 256; y += 16) {
        const x = j * 22 + Math.cos(y * 0.04 - t * 1.2 + j) * 14 + Math.sin(y * 0.02 + t * 0.5) * 8;
        if (y === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    this.causticTexture.needsUpdate = true;
  }

  private paintSandTexture(sandColor: string) {
    const canvas = this.sandTexture ? (this.sandTexture.image as HTMLCanvasElement) : document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 512;
    const sCtx = canvas.getContext('2d')!;
    sCtx.fillStyle = sandColor;
    sCtx.fillRect(0, 0, 512, 512);

    // Multi-scale mineral grain & zen ripple shading
    for (let y = 0; y < 512; y += 16) {
      sCtx.fillStyle = y % 32 === 0 ? 'rgba(255,255,255,0.035)' : 'rgba(0,0,0,0.05)';
      sCtx.fillRect(0, y, 512, 6);
    }

    for (let i = 0; i < 6500; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const lum = Math.random() > 0.45 ? 255 : 0;
      const sz = Math.random() > 0.85 ? 3 : 2;
      sCtx.fillStyle = `rgba(${lum}, ${lum}, ${lum}, ${Math.random() * 0.14})`;
      sCtx.fillRect(x, y, sz, sz);
    }

    if (!this.sandTexture) {
      this.sandTexture = new THREE.CanvasTexture(canvas);
      this.sandTexture.colorSpace = THREE.SRGBColorSpace;
      this.sandTexture.wrapS = THREE.RepeatWrapping;
      this.sandTexture.wrapT = THREE.RepeatWrapping;
      this.sandTexture.repeat.set(13, 5);
    } else {
      this.sandTexture.needsUpdate = true;
    }
  }

  private initAquariumWorld(themeId: AquariumThemeId) {
    const theme = AQUARIUM_THEMES[themeId] || AQUARIUM_THEMES.tokyo_neon_96;

    this.paintSandTexture(theme.sandColor);

    // Wide panoramic terraced seabed spanning both Aquarium (x=0) and PvP Fighter Arena (x=12)
    const sandGeom = new THREE.PlaneGeometry(36, 14, 72, 40);
    sandGeom.rotateX(-Math.PI / 2);
    const pos = sandGeom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i) + 6.5; // world X
      const pz = pos.getZ(i);
      const backSlope = Math.max(0, -pz - 0.9) * 0.22;
      const wave =
        Math.sin(px * 1.5 + 0.4) * Math.cos(pz * 1.3) * 0.09 +
        Math.sin(px * 3.2 - pz * 2.1) * 0.03;
      // Flatten seabed gently right under the Arena octagon (around X=12)
      const distArena = Math.hypot(px - this.arenaCenterX, pz);
      const arenaFlat = THREE.MathUtils.clamp((distArena - 2.6) / 1.4, 0, 1);
      pos.setY(i, (wave + backSlope) * arenaFlat);
    }
    sandGeom.computeVertexNormals();

    this.sandMaterial = new THREE.MeshStandardMaterial({
      map: this.sandTexture,
      roughness: 0.88,
      metalness: 0.05,
    });
    this.sandMesh = new THREE.Mesh(sandGeom, this.sandMaterial);
    this.sandMesh.position.set(6.5, this.tankBounds.minY, 0);
    this.sandMesh.receiveShadow = true;
    this.scene.add(this.sandMesh);

    this.buildBackCliffSilhouettes();
    this.buildAquaticDriftwood();
    this.buildRiverStones();
    this.buildAirstoneDiffuser();
    this.buildSunkenCartridge();
    this.buildAquaticFlora();

    // Expansive Shimmering Water Surface across both Aquarium & Arena
    const surfGeom = new THREE.PlaneGeometry(36, 14, 36, 20);
    surfGeom.rotateX(Math.PI / 2);
    const surfMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      transmission: this.isSoftwareGl ? 0 : 0.85,
      roughness: 0.09,
      metalness: 0.1,
      transparent: true,
      opacity: this.isSoftwareGl ? 0.35 : 0.46,
      ior: 1.33,
      depthWrite: false,
    });
    this.waterSurfaceMesh = new THREE.Mesh(surfGeom, surfMat);
    this.waterSurfaceMesh.position.set(6.5, this.tankBounds.maxY, 0);
    this.scene.add(this.waterSurfaceMesh);

    // Floating surface lily pads at top flanks for natural depth
    const padMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.4,
      side: THREE.DoubleSide,
    });
    const lilySpots = [
      { x: -2.4, z: -0.6, r: 0.24 },
      { x: -2.05, z: -0.35, r: 0.16 },
      { x: 2.35, z: -0.75, r: 0.26 },
      { x: 1.95, z: -0.95, r: 0.18 },
    ];
    lilySpots.forEach((p, idx) => {
      const padGeom = new THREE.CircleGeometry(p.r, 14, 0.25, Math.PI * 1.85);
      padGeom.rotateX(-Math.PI / 2);
      const pad = new THREE.Mesh(padGeom, padMat);
      pad.position.set(p.x, this.tankBounds.maxY - 0.04, p.z);
      pad.rotation.y = idx * 1.3;
      this.scene.add(pad);
    });

    this.buildThemeDecorations(themeId);
    this.applyAtmosphere();
  }

  private buildBackCliffSilhouettes() {
    // Distant rock ridges along the rear horizon so the tank feels vast & deep
    const cliffMat = new THREE.MeshStandardMaterial({
      color: 0x1e293b,
      roughness: 0.92,
      metalness: 0.05,
    });
    const ridgeConfigs = [
      { x: -4.2, y: 0.5, z: -3.7, rx: 1.8, ry: 2.8, rz: 1.1 },
      { x: -2.1, y: -0.2, z: -3.9, rx: 1.5, ry: 2.1, rz: 1.0 },
      { x: 0.0, y: -0.5, z: -4.2, rx: 2.0, ry: 1.8, rz: 1.0 },
      { x: 2.3, y: -0.1, z: -3.8, rx: 1.6, ry: 2.2, rz: 1.1 },
      { x: 4.3, y: 0.6, z: -3.6, rx: 1.9, ry: 2.9, rz: 1.1 },
    ];
    ridgeConfigs.forEach((rc, i) => {
      const geom = new THREE.DodecahedronGeometry(1, 1);
      geom.scale(rc.rx, rc.ry, rc.rz);
      const mesh = new THREE.Mesh(geom, cliffMat);
      mesh.position.set(rc.x, this.tankBounds.minY + rc.ry * 0.55 + rc.y, rc.z);
      mesh.rotation.y = i * 0.7;
      this.scene.add(mesh);
    });
  }

  private buildAquaticDriftwood() {
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x3b2416,
      roughness: 0.84,
      metalness: 0.06,
    });
    const mossCapMat = new THREE.MeshStandardMaterial({
      color: 0x166534,
      roughness: 0.92,
      metalness: 0.02,
    });

    // Sweeping Dragonwood Bonsai Arch on the left-back
    const trunkCurve = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-2.6, this.tankBounds.minY + 0.05, -1.1),
      new THREE.Vector3(-1.85, this.tankBounds.minY + 0.75, -0.85),
      new THREE.Vector3(-1.15, this.tankBounds.minY + 1.15, -0.95),
      new THREE.Vector3(-0.35, this.tankBounds.minY + 0.85, -1.25),
    ]);
    const trunkMesh = new THREE.Mesh(new THREE.TubeGeometry(trunkCurve, 28, 0.14, 9, false), woodMat);
    trunkMesh.castShadow = true;
    trunkMesh.receiveShadow = true;
    this.scene.add(trunkMesh);

    const upperBranch = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.6, this.tankBounds.minY + 0.88, -0.88),
      new THREE.Vector3(-1.25, this.tankBounds.minY + 1.58, -0.65),
      new THREE.Vector3(-0.8, this.tankBounds.minY + 1.98, -0.8),
    ]);
    const branchMesh = new THREE.Mesh(new THREE.TubeGeometry(upperBranch, 20, 0.07, 8, false), woodMat);
    branchMesh.castShadow = true;
    this.scene.add(branchMesh);

    const lowRoot = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.85, this.tankBounds.minY + 0.72, -0.85),
      new THREE.Vector3(-1.4, this.tankBounds.minY + 0.35, -0.35),
      new THREE.Vector3(-0.95, this.tankBounds.minY + 0.08, -0.15),
    ]);
    const rootMesh = new THREE.Mesh(new THREE.TubeGeometry(lowRoot, 16, 0.065, 8, false), woodMat);
    rootMesh.castShadow = true;
    this.scene.add(rootMesh);

    // Secondary driftwood spire on right flank for balanced framing
    const rightBranch = new THREE.CatmullRomCurve3([
      new THREE.Vector3(2.85, this.tankBounds.minY + 0.05, -0.95),
      new THREE.Vector3(2.35, this.tankBounds.minY + 0.85, -0.75),
      new THREE.Vector3(1.85, this.tankBounds.minY + 1.45, -0.95),
    ]);
    const rightWood = new THREE.Mesh(new THREE.TubeGeometry(rightBranch, 20, 0.11, 8, false), woodMat);
    rightWood.castShadow = true;
    this.scene.add(rightWood);

    // Lush Java Moss cushions nestled on driftwood forks
    const mossNodes = [
      { x: -1.55, y: 0.95, z: -0.82, r: 0.22 },
      { x: -1.18, y: 1.56, z: -0.66, r: 0.18 },
      { x: -0.85, y: 1.95, z: -0.8, r: 0.16 },
      { x: 2.35, y: 0.88, z: -0.75, r: 0.2 },
    ];
    mossNodes.forEach((m) => {
      const tuft = new THREE.Mesh(new THREE.DodecahedronGeometry(m.r, 2), mossCapMat);
      tuft.scale.set(1.25, 0.72, 1.1);
      tuft.position.set(m.x, this.tankBounds.minY + m.y, m.z);
      tuft.castShadow = true;
      this.scene.add(tuft);
    });
  }

  private buildRiverStones() {
    const stoneMats = [
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.72, metalness: 0.12 }),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.82, metalness: 0.08 }),
      new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.62, metalness: 0.18 }),
      new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.78, metalness: 0.1 }),
    ];

    const stoneConfigs = [
      // Left aquascape boulder cluster
      { x: -2.85, z: -0.35, s: 0.52, sy: 0.85, rot: 0.4, mat: 3 },
      { x: -2.25, z: 0.05, s: 0.36, sy: 0.68, rot: 1.1, mat: 0 },
      { x: -1.75, z: -0.25, s: 0.28, sy: 0.62, rot: 0.8, mat: 2 },
      { x: -1.45, z: 0.35, s: 0.18, sy: 0.58, rot: 1.9, mat: 1 },
      // Center-back flagstones
      { x: -0.7, z: -1.35, s: 0.42, sy: 0.55, rot: 0.3, mat: 2 },
      { x: 0.1, z: -1.55, s: 0.48, sy: 0.52, rot: 1.4, mat: 1 },
      // Right aquascape boulder cluster
      { x: 2.9, z: -0.3, s: 0.55, sy: 0.9, rot: 0.9, mat: 3 },
      { x: 2.25, z: -0.15, s: 0.38, sy: 0.72, rot: 2.1, mat: 0 },
      { x: 1.65, z: -0.45, s: 0.26, sy: 0.65, rot: 0.5, mat: 2 },
      { x: 1.95, z: 0.42, s: 0.2, sy: 0.55, rot: 1.7, mat: 1 },
      // Small foreground pebbles
      { x: -0.55, z: 0.85, s: 0.12, sy: 0.5, rot: 0.6, mat: 2 },
      { x: 0.65, z: 0.9, s: 0.14, sy: 0.48, rot: 1.2, mat: 0 },
      { x: 0.85, z: 0.78, s: 0.09, sy: 0.5, rot: 2.4, mat: 2 },
    ];

    stoneConfigs.forEach((sc) => {
      const stoneGeom = new THREE.DodecahedronGeometry(sc.s, 2);
      stoneGeom.scale(1.22, sc.sy, 1.0);
      const stone = new THREE.Mesh(stoneGeom, stoneMats[sc.mat]);
      stone.position.set(sc.x, this.tankBounds.minY + sc.s * sc.sy * 0.68, sc.z);
      stone.rotation.y = sc.rot;
      stone.castShadow = true;
      stone.receiveShadow = true;
      this.scene.add(stone);
    });
  }

  private buildAirstoneDiffuser() {
    // Volcanic ceramic airstone diffuser anchored beneath the bubble column
    const baseMat = new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.88, metalness: 0.12 });
    const glowCoreMat = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      emissive: 0x0284c7,
      emissiveIntensity: 0.8,
      roughness: 0.3,
    });

    const diffuser = new THREE.Group();
    const cone = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.34, 0.28, 9), baseMat);
    cone.position.y = 0.14;
    cone.castShadow = true;
    const ring = new THREE.Mesh(new THREE.TorusGeometry(0.14, 0.03, 8, 16), glowCoreMat);
    ring.rotation.x = Math.PI / 2;
    ring.position.y = 0.28;

    diffuser.add(cone, ring);
    diffuser.position.set(-2.3, this.tankBounds.minY + 0.06, -1.0);
    this.scene.add(diffuser);
  }

  private buildSunkenCartridge() {
    const cartGroup = new THREE.Group();
    const cartMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.36, metalness: 0.12 });
    const darkTrimMat = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.45 });
    const labelMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.42 });
    const stripeMat = new THREE.MeshStandardMaterial({ color: 0x2563eb, roughness: 0.4 });
    const pinMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, metalness: 0.9, roughness: 0.2 });

    const cartBody = new THREE.Mesh(new THREE.BoxGeometry(0.76, 0.14, 0.56), cartMat);
    cartBody.castShadow = true;
    cartGroup.add(cartBody);

    // Classic horizontal Famicom grip ribs
    for (let r = 0; r < 3; r++) {
      const rib = new THREE.Mesh(new THREE.BoxGeometry(0.78, 0.02, 0.03), darkTrimMat);
      rib.position.set(0, 0.065, -0.22 + r * 0.05);
      cartGroup.add(rib);
    }

    const label = new THREE.Mesh(new THREE.BoxGeometry(0.54, 0.02, 0.32), labelMat);
    label.position.set(0, 0.072, 0.06);
    cartGroup.add(label);

    const accent = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.024, 0.08), stripeMat);
    accent.position.set(0, 0.074, 0.12);
    cartGroup.add(accent);

    const pins = new THREE.Mesh(new THREE.BoxGeometry(0.66, 0.04, 0.08), pinMat);
    pins.position.set(0, -0.055, -0.25);
    cartGroup.add(pins);

    cartGroup.position.set(-1.3, this.tankBounds.minY + 0.13, 0.62);
    cartGroup.rotation.set(0.18, 0.48, -0.16);
    this.scene.add(cartGroup);
  }

  private buildAquaticFlora() {
    const ribbonMats = [
      new THREE.MeshStandardMaterial({ color: 0x15803d, roughness: 0.36, metalness: 0.08, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ color: 0x0f766e, roughness: 0.38, metalness: 0.1, side: THREE.DoubleSide }),
      new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.34, metalness: 0.06, side: THREE.DoubleSide }),
    ];

    const plantClusters = [
      { x: -3.2, z: -1.1, height: 3.1, leaves: 9, matIdx: 0 },
      { x: -2.7, z: -0.8, height: 2.7, leaves: 8, matIdx: 1 },
      { x: -2.2, z: -0.45, height: 2.0, leaves: 6, matIdx: 2 },
      { x: -1.8, z: -1.45, height: 2.5, leaves: 6, matIdx: 1 },
      { x: 1.85, z: -1.45, height: 2.8, leaves: 7, matIdx: 1 },
      { x: 2.5, z: -0.95, height: 2.6, leaves: 8, matIdx: 0 },
      { x: 2.1, z: -0.35, height: 1.85, leaves: 6, matIdx: 2 },
      { x: 3.15, z: -1.05, height: 3.2, leaves: 9, matIdx: 0 },
    ];

    plantClusters.forEach((cluster) => {
      for (let l = 0; l < cluster.leaves; l++) {
        const leafH = cluster.height * (0.72 + Math.random() * 0.38);
        const leafGeom = new THREE.PlaneGeometry(0.125, leafH, 3, 14);
        const lPos = leafGeom.attributes.position;

        for (let i = 0; i < lPos.count; i++) {
          const y = lPos.getY(i);
          const ratio = (y + leafH / 2) / leafH;
          // Taper leaf tip smoothly into natural Vallisneria ribbon
          const taper = 1 - Math.pow(ratio, 2.2) * 0.72;
          lPos.setX(i, lPos.getX(i) * taper + Math.sin(ratio * Math.PI * 1.6) * 0.055);
          lPos.setZ(i, Math.sin(ratio * Math.PI) * 0.18);
        }
        leafGeom.computeVertexNormals();

        const leafMesh = new THREE.Mesh(leafGeom, ribbonMats[cluster.matIdx]);
        leafMesh.position.set(
          cluster.x + (Math.random() - 0.5) * 0.42,
          this.tankBounds.minY + leafH * 0.48,
          cluster.z + (Math.random() - 0.5) * 0.42
        );
        leafMesh.rotation.y = Math.random() * Math.PI * 2;
        leafMesh.castShadow = true;
        this.scene.add(leafMesh);

        this.plantMeshes.push(leafMesh);
        this.plantOriginalVertices.push(new Float32Array(leafGeom.attributes.position.array));
      }
    });

    const anubiasMat = new THREE.MeshStandardMaterial({
      color: 0x166534,
      roughness: 0.32,
      metalness: 0.1,
      side: THREE.DoubleSide,
    });
    for (let i = 0; i < 8; i++) {
      const aShape = new THREE.Shape();
      aShape.moveTo(0, 0);
      aShape.bezierCurveTo(0.14, 0.16, 0.2, 0.38, 0.0, 0.5);
      aShape.bezierCurveTo(-0.2, 0.38, -0.14, 0.16, 0, 0);

      const aGeom = new THREE.ShapeGeometry(aShape, 8);
      const aLeaf = new THREE.Mesh(aGeom, anubiasMat);
      const isRight = i >= 5;
      aLeaf.position.set(
        isRight ? 2.15 + (i % 3) * 0.18 : -1.25 + (i % 3) * 0.18,
        this.tankBounds.minY + 0.55 + (i % 4) * 0.09,
        -0.5
      );
      aLeaf.rotation.set(-0.6, i * 0.8, 0.3);
      aLeaf.castShadow = true;
      this.scene.add(aLeaf);
    }

    // Marimo Moss Balls Trio
    const mossCanvas = document.createElement('canvas');
    mossCanvas.width = 128;
    mossCanvas.height = 128;
    const mCtx = mossCanvas.getContext('2d')!;
    mCtx.fillStyle = '#14532d';
    mCtx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 700; i++) {
      mCtx.fillStyle = Math.random() > 0.5 ? '#166534' : '#15803d';
      mCtx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
    }
    const mossTexture = new THREE.CanvasTexture(mossCanvas);
    mossTexture.colorSpace = THREE.SRGBColorSpace;

    const mossMat = new THREE.MeshStandardMaterial({
      map: mossTexture,
      roughness: 0.96,
      metalness: 0.02,
    });
    const marimos = [
      { x: -0.25, z: 0.35, r: 0.32 },
      { x: 0.18, z: 0.48, r: 0.2 },
      { x: 1.5, z: 0.28, r: 0.24 },
    ];
    marimos.forEach((m) => {
      const mossBall = new THREE.Mesh(new THREE.DodecahedronGeometry(m.r, 3), mossMat);
      mossBall.position.set(m.x, this.tankBounds.minY + m.r * 0.9, m.z);
      mossBall.castShadow = true;
      this.scene.add(mossBall);
    });
  }

  private initGodRays() {
    const rayGeom = new THREE.ConeGeometry(1.15, 4.4, 18, 1, true);
    rayGeom.translate(0, -2.2, 0);

    this.godRayMaterial = new THREE.MeshBasicMaterial({
      color: this.themeTopColor,
      transparent: true,
      opacity: 0.065,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const rays = [
      { x: 0.7, z: -0.4, rx: 0.15, rz: -0.22 },
      { x: -1.35, z: -0.65, rx: -0.1, rz: 0.28 },
      { x: 2.1, z: -0.9, rx: 0.08, rz: -0.32 },
    ];
    rays.forEach((r) => {
      const ray = new THREE.Mesh(rayGeom, this.godRayMaterial);
      ray.position.set(r.x, this.tankBounds.maxY, r.z);
      ray.rotation.set(r.rx, 0, r.rz);
      this.godRaysGroup.add(ray);
    });
  }

  private initFighterArena() {
    this.arenaGroup.position.set(this.arenaCenterX, 0, 0);
    this.scene.add(this.arenaGroup);
    const baseY = this.tankBounds.minY;
    const tankH = 4.1;
    const halfW = 3.35;
    const halfD = 1.85;

    const basaltMat = new THREE.MeshStandardMaterial({ color: 0x16090e, roughness: 0.65, metalness: 0.35 });
    const slateMat = new THREE.MeshStandardMaterial({ color: 0x291119, roughness: 0.48, metalness: 0.42 });
    const tankFrameMat = new THREE.MeshStandardMaterial({ color: 0x13070b, roughness: 0.32, metalness: 0.82 });
    const goldTrimMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, emissive: 0x92400e, emissiveIntensity: 0.35, roughness: 0.25, metalness: 0.85 });
    const scarletNeonMat = new THREE.MeshStandardMaterial({ color: 0xfb7185, emissive: 0xe11d48, emissiveIntensity: 1.55, roughness: 0.2 });
    const deepCrimsonGlowMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0xdc2626, emissiveIntensity: 1.4, roughness: 0.22 });
    const cyanGlowMat = new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x0891b2, emissiveIntensity: 1.2, roughness: 0.2 });

    // Transition Seafloor Passageway Stones (between Aquarium X=4.5 and Battle Tank X=8.2)
    const archX = -5.4;
    const archMat = new THREE.MeshStandardMaterial({ color: 0x261218, roughness: 0.85 });
    [-1.2, 1.2].forEach((az) => {
      const col = new THREE.Mesh(new THREE.CylinderGeometry(0.26, 0.36, 3.2, 8), archMat);
      col.position.set(archX, baseY + 1.5, az);
      this.arenaGroup.add(col);
    });
    const lintel = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.34, 3.0), archMat);
    lintel.position.set(archX, baseY + 3.05, 0);
    this.arenaGroup.add(lintel);

    // === ENCLOSED BATTLE ARENA AQUARIUM STRUCTURE ===
    // 4 Corner Steel & Crimson LED Tank Columns
    const cornerCoords = [
      { x: -halfW, z: -halfD },
      { x: halfW, z: -halfD },
      { x: -halfW, z: halfD },
      { x: halfW, z: halfD },
    ];
    cornerCoords.forEach((cc) => {
      const col = new THREE.Mesh(new THREE.BoxGeometry(0.2, tankH, 0.2), tankFrameMat);
      col.position.set(cc.x, baseY + tankH * 0.5, cc.z);
      this.arenaGroup.add(col);

      const ledStrip = new THREE.Mesh(new THREE.BoxGeometry(0.06, tankH - 0.16, 0.06), scarletNeonMat);
      ledStrip.position.set(
        cc.x + (cc.x < 0 ? 0.09 : -0.09),
        baseY + tankH * 0.5,
        cc.z + (cc.z < 0 ? 0.09 : -0.09)
      );
      this.arenaGroup.add(ledStrip);
    });

    // Bottom Tank Plinth Frame & Glowing Crimson Perimeter Rails
    const fbBeamGeom = new THREE.BoxGeometry(halfW * 2 + 0.24, 0.22, 0.22);
    const lrBeamGeom = new THREE.BoxGeometry(0.22, 0.22, halfD * 2 + 0.24);
    [-halfD, halfD].forEach((z) => {
      const bBeam = new THREE.Mesh(fbBeamGeom, tankFrameMat);
      bBeam.position.set(0, baseY + 0.11, z);
      const tBeam = new THREE.Mesh(fbBeamGeom, tankFrameMat);
      tBeam.position.set(0, baseY + tankH - 0.09, z);
      const bGlow = new THREE.Mesh(new THREE.BoxGeometry(halfW * 2 - 0.12, 0.05, 0.05), scarletNeonMat);
      bGlow.position.set(0, baseY + 0.23, z + (z > 0 ? -0.08 : 0.08));
      const tGlow = new THREE.Mesh(new THREE.BoxGeometry(halfW * 2 - 0.12, 0.05, 0.05), scarletNeonMat);
      tGlow.position.set(0, baseY + tankH - 0.21, z + (z > 0 ? -0.08 : 0.08));
      this.arenaGroup.add(bBeam, tBeam, bGlow, tGlow);
    });
    [-halfW, halfW].forEach((x) => {
      const bBeam = new THREE.Mesh(lrBeamGeom, tankFrameMat);
      bBeam.position.set(x, baseY + 0.11, 0);
      const tBeam = new THREE.Mesh(lrBeamGeom, tankFrameMat);
      tBeam.position.set(x, baseY + tankH - 0.09, 0);
      const bGlow = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, halfD * 2 - 0.12), scarletNeonMat);
      bGlow.position.set(x + (x > 0 ? -0.08 : 0.08), baseY + 0.23, 0);
      const tGlow = new THREE.Mesh(new THREE.BoxGeometry(0.05, 0.05, halfD * 2 - 0.12), scarletNeonMat);
      tGlow.position.set(x + (x > 0 ? -0.08 : 0.08), baseY + tankH - 0.21, 0);
      this.arenaGroup.add(bBeam, tBeam, bGlow, tGlow);
    });

    // Translucent Tinted Aquarium Glass Walls (Left, Right & Back)
    const sideGlassMat = new THREE.MeshStandardMaterial({
      color: 0xf43f5e,
      emissive: 0x4c0519,
      emissiveIntensity: 0.35,
      transparent: true,
      opacity: 0.11,
      roughness: 0.08,
      metalness: 0.25,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const sideWallGeom = new THREE.PlaneGeometry(halfD * 2 - 0.12, tankH - 0.28);
    [-halfW + 0.04, halfW - 0.04].forEach((x) => {
      const wall = new THREE.Mesh(sideWallGeom, sideGlassMat);
      wall.rotation.y = Math.PI / 2;
      wall.position.set(x, baseY + tankH * 0.5, 0);
      this.arenaGroup.add(wall);
    });

    const backGlassMat = new THREE.MeshStandardMaterial({
      color: 0x3b0714,
      emissive: 0x26040d,
      emissiveIntensity: 0.65,
      transparent: true,
      opacity: 0.72,
      roughness: 0.2,
      metalness: 0.2,
      depthWrite: false,
      side: THREE.DoubleSide,
    });
    const backWall = new THREE.Mesh(new THREE.PlaneGeometry(halfW * 2 - 0.16, tankH - 0.28), backGlassMat);
    backWall.position.set(0, baseY + tankH * 0.5, -halfD + 0.06);
    this.arenaGroup.add(backWall);

    // Subtle Arena Back Wall Emblem Rings & Illuminated "FIGHTER ARENA" Signboard
    const backEmblemOuter = new THREE.Mesh(new THREE.TorusGeometry(1.38, 0.032, 10, 48), deepCrimsonGlowMat);
    backEmblemOuter.position.set(0, baseY + 1.95, -halfD + 0.14);
    const backEmblemInner = new THREE.Mesh(new THREE.TorusGeometry(0.92, 0.024, 10, 6), goldTrimMat);
    backEmblemInner.position.set(0, baseY + 1.95, -halfD + 0.15);
    this.arenaGroup.add(backEmblemOuter, backEmblemInner);
    this.arenaAnimatedNodes.push({ obj: backEmblemInner, baseY: baseY + 1.95, phase: 0.4 });

    const arenaSignTex = this.makeRetroSignTexture('FIGHTER ARENA', 'PVP BATTLE TANK', '#fb7185', '#1d050c');
    const arenaSignMat = new THREE.MeshBasicMaterial({ map: arenaSignTex });
    const arenaSignBoard = new THREE.Mesh(new THREE.BoxGeometry(2.35, 0.68, 0.1), [
      tankFrameMat, tankFrameMat, tankFrameMat, tankFrameMat, arenaSignMat, tankFrameMat,
    ]);
    arenaSignBoard.position.set(0, baseY + tankH - 0.62, -halfD + 0.22);
    const arenaSignGlowFrame = new THREE.Mesh(new THREE.BoxGeometry(2.44, 0.76, 0.06), scarletNeonMat);
    arenaSignGlowFrame.position.set(0, baseY + tankH - 0.62, -halfD + 0.17);
    this.arenaGroup.add(arenaSignBoard, arenaSignGlowFrame);

    // Stepped Octagonal Battle Arena Floor Stage inside the Tank
    const outerRing = new THREE.Mesh(new THREE.CylinderGeometry(2.95, 3.2, 0.22, 8), basaltMat);
    outerRing.position.set(0, baseY + 0.12, 0);
    outerRing.receiveShadow = true;
    this.arenaGroup.add(outerRing);

    const innerStage = new THREE.Mesh(new THREE.CylinderGeometry(2.45, 2.65, 0.16, 8), slateMat);
    innerStage.position.set(0, baseY + 0.26, 0);
    innerStage.receiveShadow = true;
    this.arenaGroup.add(innerStage);

    // Glowing Battle Zone Floor Rings (Crimson Arena Ring + Corner Accents + Gold Center Crest)
    const arenaPerimeterRing = new THREE.Mesh(new THREE.TorusGeometry(2.38, 0.04, 10, 48), deepCrimsonGlowMat);
    arenaPerimeterRing.rotation.x = Math.PI / 2;
    arenaPerimeterRing.position.set(0, baseY + 0.35, 0);
    this.arenaGroup.add(arenaPerimeterRing);

    const leftArc = new THREE.Mesh(new THREE.TorusGeometry(1.85, 0.036, 10, 28, Math.PI), cyanGlowMat);
    leftArc.rotation.x = Math.PI / 2;
    leftArc.rotation.z = Math.PI / 2;
    leftArc.position.set(0, baseY + 0.355, 0);
    this.arenaGroup.add(leftArc);

    const rightArc = new THREE.Mesh(new THREE.TorusGeometry(1.85, 0.036, 10, 28, Math.PI), scarletNeonMat);
    rightArc.rotation.x = Math.PI / 2;
    rightArc.rotation.z = -Math.PI / 2;
    rightArc.position.set(0, baseY + 0.355, 0);
    this.arenaGroup.add(rightArc);

    const centerRing = new THREE.Mesh(new THREE.TorusGeometry(0.85, 0.032, 10, 32), goldTrimMat);
    centerRing.rotation.x = Math.PI / 2;
    centerRing.position.set(0, baseY + 0.36, 0);
    this.arenaGroup.add(centerRing);

    // 4 Inner Colosseum Corner Pylons with Floating Energy Crystals
    const pillarCoords = [
      { x: -2.2, z: -1.15, isPlayer: true },
      { x: -2.2, z: 1.15, isPlayer: true },
      { x: 2.2, z: -1.15, isPlayer: false },
      { x: 2.2, z: 1.15, isPlayer: false },
    ];
    pillarCoords.forEach((pc, idx) => {
      const pGroup = new THREE.Group();
      const base = new THREE.Mesh(new THREE.CylinderGeometry(0.2, 0.26, 0.26, 8), basaltMat);
      base.position.y = 0.13;
      const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.13, 0.17, 1.55, 8), slateMat);
      shaft.position.y = 0.96;
      const cap = new THREE.Mesh(new THREE.CylinderGeometry(0.22, 0.15, 0.18, 8), goldTrimMat);
      cap.position.y = 1.8;

      const orb = new THREE.Mesh(
        new THREE.OctahedronGeometry(0.14, 0),
        pc.isPlayer ? cyanGlowMat : scarletNeonMat
      );
      orb.position.y = 2.15;
      pGroup.add(base, shaft, cap, orb);
      pGroup.position.set(pc.x, baseY + 0.12, pc.z);
      this.arenaGroup.add(pGroup);
      this.arenaAnimatedNodes.push({ obj: orb, baseY: 2.15, phase: idx * 1.4 });
    });

    // Dedicated Battle Tank Lights (Crimson Core + Rival/Player Side Accents)
    this.arenaCyanLight = new THREE.PointLight(0xfb7185, 1.8, 8);
    this.arenaCyanLight.position.set(-2.1, 1.35, 1.0);
    this.arenaCrimsonLight = new THREE.PointLight(0xef4444, 2.8, 9.5);
    this.arenaCrimsonLight.position.set(2.1, 1.35, 1.0);
    this.arenaBackRedLight = new THREE.PointLight(0xe11d48, 3.2, 10);
    this.arenaBackRedLight.position.set(0, 0.9, -1.25);
    this.arenaGroup.add(this.arenaCyanLight, this.arenaCrimsonLight, this.arenaBackRedLight);
  }

  private initPlankton() {
    const pGeom = new THREE.SphereGeometry(0.015, 6, 6);
    const pMat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.45,
    });

    this.planktonParticles = new THREE.InstancedMesh(pGeom, pMat, this.planktonCount);
    this.planktonParticles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.planktonParticles.frustumCulled = false;

    for (let i = 0; i < this.planktonCount; i++) {
      const p = {
        x: THREE.MathUtils.randFloat(-4.5, this.arenaCenterX + 4.5),
        y: THREE.MathUtils.randFloat(this.tankBounds.minY, this.tankBounds.maxY),
        z: THREE.MathUtils.randFloat(this.tankBounds.minZ, this.tankBounds.maxZ),
        vx: THREE.MathUtils.randFloat(-0.04, 0.04),
        vy: THREE.MathUtils.randFloat(-0.02, 0.03),
        vz: THREE.MathUtils.randFloat(-0.04, 0.04),
      };
      this.planktonData.push(p);

      _dummy.position.set(p.x, p.y, p.z);
      _dummy.scale.setScalar(1);
      _dummy.updateMatrix();
      this.planktonParticles.setMatrixAt(i, _dummy.matrix);
    }
    this.planktonParticles.instanceMatrix.needsUpdate = true;
    this.scene.add(this.planktonParticles);
  }

  private updatePlankton(delta: number) {
    const minWorldX = -4.5;
    const maxWorldX = this.arenaCenterX + 4.5;
    for (let i = 0; i < this.planktonCount; i++) {
      const p = this.planktonData[i];
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.z += p.vz * delta;

      if (p.x < minWorldX) p.x = maxWorldX;
      if (p.x > maxWorldX) p.x = minWorldX;
      if (p.y < this.tankBounds.minY) p.y = this.tankBounds.maxY;
      if (p.y > this.tankBounds.maxY) p.y = this.tankBounds.minY;

      _dummy.position.set(p.x, p.y, p.z);
      _dummy.scale.setScalar(1);
      _dummy.updateMatrix();
      this.planktonParticles.setMatrixAt(i, _dummy.matrix);
    }
    this.planktonParticles.instanceMatrix.needsUpdate = true;
  }

  private disposeGroupResources(group: THREE.Group) {
    group.traverse((child) => {
      if (child instanceof THREE.Mesh) {
        child.geometry.dispose();
        const mats = Array.isArray(child.material) ? child.material : [child.material];
        mats.forEach((m) => {
          if (m) {
            const std = m as THREE.MeshStandardMaterial;
            std.map?.dispose();
            std.emissiveMap?.dispose();
            m.dispose();
          }
        });
      }
    });
    while (group.children.length > 0) {
      group.remove(group.children[0]);
    }
  }

  private makeRetroSignTexture(topText: string, bottomText: string, accentColor: string, bgColor: string): THREE.CanvasTexture {
    const canvas = document.createElement('canvas');
    canvas.width = 512;
    canvas.height = 192;
    const ctx = canvas.getContext('2d')!;

    ctx.fillStyle = bgColor;
    ctx.fillRect(0, 0, 512, 192);
    ctx.strokeStyle = accentColor;
    ctx.lineWidth = 10;
    ctx.strokeRect(8, 8, 496, 176);

    ctx.textAlign = 'center';
    ctx.textBaseline = 'middle';
    ctx.shadowColor = accentColor;
    ctx.shadowBlur = 18;
    ctx.fillStyle = '#ffffff';
    ctx.font = 'bold 54px monospace';
    ctx.fillText(topText, 256, 72);

    ctx.fillStyle = accentColor;
    ctx.font = 'bold 34px monospace';
    ctx.fillText(bottomText, 256, 134);

    const tex = new THREE.CanvasTexture(canvas);
    tex.colorSpace = THREE.SRGBColorSpace;
    return tex;
  }

  public buildThemeDecorations(themeId: AquariumThemeId) {
    this.disposeGroupResources(this.decorGroup);
    this.themeAnimatedNodes = [];
    const baseY = this.tankBounds.minY;

    if (themeId === 'tokyo_neon_96') {
      // GRAND SHINJUKU 1996 CYBER-AQUASCAPE DIORAMA
      const darkSteelMat = new THREE.MeshStandardMaterial({ color: 0x0f172a, roughness: 0.42, metalness: 0.72 });
      const cyanNeon = new THREE.MeshStandardMaterial({ color: 0x22d3ee, emissive: 0x06b6d4, emissiveIntensity: 1.5, roughness: 0.2 });
      const pinkNeon = new THREE.MeshStandardMaterial({ color: 0xf472b6, emissive: 0xd946ef, emissiveIntensity: 1.5, roughness: 0.2 });
      const amberNeon = new THREE.MeshStandardMaterial({ color: 0xfde047, emissive: 0xf59e0b, emissiveIntensity: 1.2, roughness: 0.25 });

      // Twin Multi-Tiered Cyberpunk Neon Towers + Skybridge Arch
      [-2.05, 2.05].forEach((tx, idx) => {
        const tower = new THREE.Group();
        const isLeft = idx === 0;
        const primaryNeon = isLeft ? cyanNeon : pinkNeon;
        const secondaryNeon = isLeft ? pinkNeon : cyanNeon;

        const basePlinth = new THREE.Mesh(new THREE.BoxGeometry(0.86, 0.35, 0.72), darkSteelMat);
        basePlinth.position.y = 0.175;
        const body = new THREE.Mesh(new THREE.BoxGeometry(0.64, 2.35, 0.56), darkSteelMat);
        body.position.y = 1.45;
        const crown = new THREE.Mesh(new THREE.BoxGeometry(0.46, 0.5, 0.42), darkSteelMat);
        crown.position.y = 2.85;
        const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.04, 0.7, 8), primaryNeon);
        spire.position.y = 3.4;

        // Vertical Neon Side Rails
        const railL = new THREE.Mesh(new THREE.BoxGeometry(0.055, 2.25, 0.06), primaryNeon);
        railL.position.set(-0.31, 1.45, 0.28);
        const railR = new THREE.Mesh(new THREE.BoxGeometry(0.055, 2.25, 0.06), secondaryNeon);
        railR.position.set(0.31, 1.45, 0.28);

        // Glowing Horizon Window Bars
        for (let w = 0; w < 5; w++) {
          const win = new THREE.Mesh(new THREE.BoxGeometry(0.42, 0.06, 0.03), w % 2 === 0 ? primaryNeon : amberNeon);
          win.position.set(0, 0.65 + w * 0.4, 0.285);
          tower.add(win);
        }

        tower.add(basePlinth, body, crown, spire, railL, railR);
        tower.position.set(tx, baseY + 0.08, -1.45);
        tower.rotation.y = isLeft ? 0.22 : -0.22;
        this.decorGroup.add(tower);
      });

      // Central Overhead Cyber-Torii Skybridge with Glowing Tokyo '96 Kanji Signboard
      const bridgeGroup = new THREE.Group();
      const beamTop = new THREE.Mesh(new THREE.BoxGeometry(3.8, 0.14, 0.24), darkSteelMat);
      beamTop.position.set(0, 2.68, 0);
      const beamGlow = new THREE.Mesh(new THREE.BoxGeometry(3.7, 0.05, 0.26), cyanNeon);
      beamGlow.position.set(0, 2.6, 0);

      const signTex = this.makeRetroSignTexture('東京ネオン', 'FISH FIGHTER 96', '#22d3ee', '#090d26');
      const signMat = new THREE.MeshBasicMaterial({ map: signTex });
      const signBoard = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.66, 0.12), [
        darkSteelMat, darkSteelMat, darkSteelMat, darkSteelMat, signMat, darkSteelMat,
      ]);
      signBoard.position.set(0, 2.15, 0.06);

      const signFrame = new THREE.Mesh(new THREE.BoxGeometry(1.83, 0.74, 0.08), pinkNeon);
      signFrame.position.set(0, 2.15, 0.02);

      // Holographic Rotating Aqua Rings behind center
      const holoRing1 = new THREE.Mesh(new THREE.TorusGeometry(0.95, 0.025, 10, 40), cyanNeon);
      holoRing1.position.set(0, 1.25, -0.05);
      const holoRing2 = new THREE.Mesh(new THREE.TorusGeometry(0.68, 0.02, 10, 32), pinkNeon);
      holoRing2.position.set(0, 1.25, -0.05);

      bridgeGroup.add(beamTop, beamGlow, signFrame, signBoard, holoRing1, holoRing2);
      bridgeGroup.position.set(0, baseY + 0.1, -1.55);
      this.decorGroup.add(bridgeGroup);

      this.themeAnimatedNodes.push(
        { obj: holoRing1, kind: 'spin', baseY: 1.25, baseX: 0, baseZ: -0.05, phase: 0, speed: 0.45 },
        { obj: holoRing2, kind: 'spin', baseY: 1.25, baseX: 0, baseZ: -0.05, phase: 1.6, speed: -0.65 }
      );

      // Glowing Cyber-Crystal Clusters along Midground
      const crystalSpots = [
        { x: -0.95, z: -1.1, mat: cyanNeon, h: 0.55 },
        { x: 0.85, z: -1.15, mat: pinkNeon, h: 0.62 },
        { x: 1.35, z: -0.75, mat: cyanNeon, h: 0.42 },
      ];
      crystalSpots.forEach((c) => {
        const cGroup = new THREE.Group();
        for (let k = 0; k < 3; k++) {
          const spire = new THREE.Mesh(new THREE.ConeGeometry(0.09, c.h * (0.7 + k * 0.18), 5), c.mat);
          spire.position.set((k - 1) * 0.1, c.h * 0.4, (k % 2) * 0.08);
          spire.rotation.set((k - 1) * 0.18, k, (1 - k) * 0.22);
          cGroup.add(spire);
        }
        cGroup.position.set(c.x, baseY + 0.12, c.z);
        this.decorGroup.add(cGroup);
      });
    } else if (themeId === 'zen_garden') {
      // MONUMENTAL KYOTO ZEN TORII SHRINE + BAMBOO GROVE + TWIN STONE LANTERNS
      const toriiMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.28, metalness: 0.15 });
      const darkWoodMat = new THREE.MeshStandardMaterial({ color: 0x1e293b, roughness: 0.65 });
      const stoneMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.8, metalness: 0.08 });
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.2, metalness: 0.88 });
      const bambooMat = new THREE.MeshStandardMaterial({ color: 0x22c55e, roughness: 0.42, metalness: 0.06 });
      const lanternGlowMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 1.4 });

      // Grand Stone Courtyard Dais
      const dais = new THREE.Mesh(new THREE.CylinderGeometry(1.65, 1.85, 0.22, 8), stoneMat);
      dais.position.set(0.15, baseY + 0.11, -1.25);
      this.decorGroup.add(dais);

      // Monumental Vermilion Torii Gate
      const toriiGroup = new THREE.Group();
      [-0.95, 0.95].forEach((px) => {
        const kamebara = new THREE.Mesh(new THREE.CylinderGeometry(0.18, 0.23, 0.26, 12), darkWoodMat);
        kamebara.position.set(px, 0.13, 0);
        const pillar = new THREE.Mesh(new THREE.CylinderGeometry(0.11, 0.13, 2.3, 16), toriiMat);
        pillar.position.set(px, 1.35, 0);
        pillar.rotation.z = px < 0 ? -0.045 : 0.045;
        toriiGroup.add(kamebara, pillar);
      });

      const kasagi = new THREE.Mesh(new THREE.BoxGeometry(2.85, 0.17, 0.26), darkWoodMat);
      kasagi.position.set(0, 2.52, 0);
      const kasagiGold = new THREE.Mesh(new THREE.BoxGeometry(2.96, 0.07, 0.28), goldMat);
      kasagiGold.position.set(0, 2.61, 0);
      const shimaki = new THREE.Mesh(new THREE.BoxGeometry(2.65, 0.12, 0.21), toriiMat);
      shimaki.position.set(0, 2.38, 0);
      const nuki = new THREE.Mesh(new THREE.BoxGeometry(2.3, 0.13, 0.15), toriiMat);
      nuki.position.set(0, 1.96, 0);
      const gakuzuka = new THREE.Mesh(new THREE.BoxGeometry(0.28, 0.36, 0.1), goldMat);
      gakuzuka.position.set(0, 2.18, 0.04);

      toriiGroup.add(kasagi, kasagiGold, shimaki, nuki, gakuzuka);
      toriiGroup.position.set(0.15, baseY + 0.2, -1.28);
      toriiGroup.rotation.y = -0.1;
      this.decorGroup.add(toriiGroup);

      // Twin Glowing Stone Lanterns Flanking the Shrine
      [-1.75, 2.0].forEach((lx, idx) => {
        const lGroup = new THREE.Group();
        const kiso = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.28, 0.14, 6), stoneMat);
        kiso.position.y = 0.07;
        const sao = new THREE.Mesh(new THREE.CylinderGeometry(0.09, 0.11, 0.58, 10), stoneMat);
        sao.position.y = 0.43;
        const hibukuro = new THREE.Mesh(new THREE.CylinderGeometry(0.19, 0.19, 0.26, 6), lanternGlowMat);
        hibukuro.position.y = 0.85;
        const kasa = new THREE.Mesh(new THREE.ConeGeometry(0.36, 0.24, 6), stoneMat);
        kasa.position.y = 1.09;
        lGroup.add(kiso, sao, hibukuro, kasa);
        lGroup.position.set(lx, baseY + 0.12, idx === 0 ? -0.95 : -1.1);
        this.decorGroup.add(lGroup);
      });

      // Segmented Lush Bamboo Forest on Flanks
      [-2.75, -2.48, -2.25, 2.55, 2.8, 3.05].forEach((bx, i) => {
        const h = 2.6 + (i % 3) * 0.55;
        const stalk = new THREE.Mesh(new THREE.CylinderGeometry(0.055, 0.068, h, 8), bambooMat);
        stalk.position.set(bx, baseY + h * 0.5, -1.4 + (i % 2) * 0.3);
        stalk.rotation.z = (i % 2 === 0 ? 1 : -1) * 0.04;
        this.decorGroup.add(stalk);
      });

      // Balanced Zen Cairn Stone Stack
      const cairnGroup = new THREE.Group();
      [0.24, 0.18, 0.13, 0.09].reduce((accY, r) => {
        const rock = new THREE.Mesh(new THREE.SphereGeometry(r, 12, 10), stoneMat);
        rock.scale.set(1.3, 0.52, 1.15);
        rock.position.y = accY + r * 0.45;
        cairnGroup.add(rock);
        return accY + r * 0.92;
      }, 0);
      cairnGroup.position.set(1.25, baseY + 0.12, -0.75);
      this.decorGroup.add(cairnGroup);
    } else if (themeId === 'sakura_shrine') {
      // ANCIENT BLOSSOMING SAKURA TREE + ARCHED DRUM BRIDGE + STONE TORO LANTERN + DRIFTING PETALS
      const barkMat = new THREE.MeshStandardMaterial({ color: 0x3f231c, roughness: 0.86 });
      const blossomMat1 = new THREE.MeshStandardMaterial({ color: 0xfbcfe8, emissive: 0xf472b6, emissiveIntensity: 0.25, roughness: 0.45 });
      const blossomMat2 = new THREE.MeshStandardMaterial({ color: 0xf9a8d4, emissive: 0xdb2777, emissiveIntensity: 0.2, roughness: 0.45 });
      const stoneMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85, metalness: 0.1 });
      const bridgeRedMat = new THREE.MeshStandardMaterial({ color: 0xe11d48, roughness: 0.35 });
      const lanternGlowMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, emissive: 0xf59e0b, emissiveIntensity: 1.4 });

      // Grand Gnarled Sakura Tree Sweeping Over the Aquarium
      const trunkCurve = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-2.35, baseY + 0.05, -1.2),
        new THREE.Vector3(-1.95, baseY + 1.25, -1.15),
        new THREE.Vector3(-1.15, baseY + 2.25, -1.05),
        new THREE.Vector3(-0.15, baseY + 2.65, -0.95),
      ]);
      const sakuraTrunk = new THREE.Mesh(new THREE.TubeGeometry(trunkCurve, 26, 0.18, 9, false), barkMat);
      this.decorGroup.add(sakuraTrunk);

      const canopyBough = new THREE.CatmullRomCurve3([
        new THREE.Vector3(-1.65, baseY + 1.75, -1.12),
        new THREE.Vector3(-1.0, baseY + 2.55, -0.85),
        new THREE.Vector3(-0.35, baseY + 2.95, -0.9),
      ]);
      this.decorGroup.add(new THREE.Mesh(new THREE.TubeGeometry(canopyBough, 18, 0.1, 8, false), barkMat));

      // Layered Blooming Sakura Canopy Clouds
      const canopyClouds = [
        { x: -1.65, y: 2.35, z: -1.05, r: 0.56 },
        { x: -1.1, y: 2.75, z: -0.95, r: 0.68 },
        { x: -0.45, y: 2.9, z: -0.92, r: 0.64 },
        { x: 0.22, y: 2.65, z: -0.98, r: 0.52 },
        { x: 2.25, y: 2.1, z: -1.25, r: 0.48 },
      ];
      canopyClouds.forEach((c, idx) => {
        const cloud = new THREE.Mesh(
          new THREE.DodecahedronGeometry(c.r, 2),
          idx % 2 === 0 ? blossomMat1 : blossomMat2
        );
        cloud.scale.set(1.35, 0.72, 1.05);
        cloud.position.set(c.x, baseY + c.y, c.z);
        this.decorGroup.add(cloud);
      });

      // Vermilion Arched Drum Bridge (Taiko-Bashi) across the Shrine Courtyard
      const bridgeArch = new THREE.Mesh(
        new THREE.TorusGeometry(0.95, 0.09, 10, 24, Math.PI * 0.72),
        bridgeRedMat
      );
      bridgeArch.rotation.z = Math.PI * 0.14;
      bridgeArch.position.set(0.35, baseY - 0.18, -1.15);
      this.decorGroup.add(bridgeArch);

      // Tall Ceremonial Toro Lantern on the Right
      const toroGroup = new THREE.Group();
      const kiso = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.5, 0.2, 6), stoneMat);
      kiso.position.y = 0.1;
      const sao = new THREE.Mesh(new THREE.CylinderGeometry(0.15, 0.18, 0.95, 12), stoneMat);
      sao.position.y = 0.68;
      const chudai = new THREE.Mesh(new THREE.CylinderGeometry(0.46, 0.3, 0.18, 6), stoneMat);
      chudai.position.y = 1.24;
      const hibukuro = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 0.4, 6), lanternGlowMat);
      hibukuro.position.y = 1.53;
      const kasa = new THREE.Mesh(new THREE.ConeGeometry(0.64, 0.38, 6), stoneMat);
      kasa.position.y = 1.91;
      const hoju = new THREE.Mesh(new THREE.SphereGeometry(0.13, 12, 12), stoneMat);
      hoju.position.y = 2.18;
      toroGroup.add(kiso, sao, chudai, hibukuro, kasa, hoju);
      toroGroup.position.set(1.65, baseY + 0.12, -1.05);
      toroGroup.rotation.y = -0.35;
      this.decorGroup.add(toroGroup);

      // Gently Spiraling & Drifting Sakura Petals throughout the water
      const petalMat = new THREE.MeshStandardMaterial({ color: 0xfbcfe8, roughness: 0.35, side: THREE.DoubleSide });
      const petalGeom = new THREE.CircleGeometry(0.065, 5);
      for (let i = 0; i < 28; i++) {
        const petal = new THREE.Mesh(petalGeom, petalMat);
        const px = THREE.MathUtils.randFloat(-2.6, 2.6);
        const py = THREE.MathUtils.randFloat(baseY + 0.2, this.tankBounds.maxY - 0.15);
        const pz = THREE.MathUtils.randFloat(-1.2, 0.9);
        petal.position.set(px, py, pz);
        petal.rotation.set(Math.random() * Math.PI, Math.random() * Math.PI, 0);
        this.decorGroup.add(petal);
        this.themeAnimatedNodes.push({
          obj: petal,
          kind: 'petal',
          baseX: px,
          baseY: py,
          baseZ: pz,
          phase: Math.random() * Math.PI * 2,
          speed: 0.22 + Math.random() * 0.25,
        });
      }
    } else if (themeId === 'golden_palace') {
      // IMPERIAL SHOGUN GOLDEN PAGODA + TREASURE VAULT + GIANT PEARL SHELL + SPINNING GOLD COINS
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.16, metalness: 0.95 });
      const crimsonLacquer = new THREE.MeshStandardMaterial({ color: 0x991b1b, roughness: 0.25, metalness: 0.2 });
      const woodMat = new THREE.MeshStandardMaterial({ color: 0x451a03, roughness: 0.72 });
      const pearlMat = new THREE.MeshPhysicalMaterial({ color: 0xfff1f2, emissive: 0xfef08a, emissiveIntensity: 0.35, roughness: 0.08, iridescence: 1.0 });

      // Grand 3-Tiered Shogun Pagoda Centerpiece
      const pagoda = new THREE.Group();
      const podium = new THREE.Mesh(new THREE.BoxGeometry(2.1, 0.28, 1.35), crimsonLacquer);
      podium.position.y = 0.14;
      pagoda.add(podium);

      for (let tier = 0; tier < 3; tier++) {
        const scale = 1 - tier * 0.24;
        const yOff = 0.28 + tier * 0.72;
        const hall = new THREE.Mesh(new THREE.BoxGeometry(1.35 * scale, 0.5, 0.9 * scale), crimsonLacquer);
        hall.position.y = yOff + 0.25;
        const eave = new THREE.Mesh(new THREE.ConeGeometry(1.22 * scale, 0.34 * scale, 4), goldMat);
        eave.rotation.y = Math.PI / 4;
        eave.position.y = yOff + 0.62;
        pagoda.add(hall, eave);
      }
      const spire = new THREE.Mesh(new THREE.CylinderGeometry(0.03, 0.07, 0.55, 8), goldMat);
      spire.position.y = 2.65;
      pagoda.add(spire);

      // Rotating Imperial Solar Halo Behind Pagoda
      const halo = new THREE.Mesh(new THREE.TorusGeometry(1.15, 0.035, 10, 48), goldMat);
      halo.position.set(0, 1.55, -0.35);
      pagoda.add(halo);
      this.themeAnimatedNodes.push({ obj: halo, kind: 'spin', baseX: 0, baseY: 1.55, baseZ: -0.35, phase: 0, speed: 0.35 });

      pagoda.position.set(0.1, baseY + 0.08, -1.35);
      this.decorGroup.add(pagoda);

      // Sunken Open Treasure Chest + Overflowing Gold Coins (Left-Midground)
      const chestGroup = new THREE.Group();
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.05, 0.52, 0.65), woodMat);
      base.position.y = 0.26;
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.05, 14, 1, false, 0, Math.PI), woodMat);
      lid.rotation.z = Math.PI / 2;
      lid.rotation.x = -0.55;
      lid.position.set(0, 0.56, -0.12);
      const goldMound = new THREE.Mesh(new THREE.DodecahedronGeometry(0.34, 2), goldMat);
      goldMound.scale.set(1.2, 0.6, 0.8);
      goldMound.position.set(0, 0.45, 0.02);
      const lock = new THREE.Mesh(new THREE.BoxGeometry(0.14, 0.18, 0.06), goldMat);
      lock.position.set(0, 0.38, 0.34);
      chestGroup.add(base, lid, goldMound, lock);
      chestGroup.position.set(-1.55, baseY + 0.08, -0.82);
      chestGroup.rotation.y = 0.42;
      this.decorGroup.add(chestGroup);

      // Giant Luminous Pearl Clamshell (Right-Midground)
      const clamGroup = new THREE.Group();
      const shellBot = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.4, 0.14, 14), goldMat);
      const shellTop = new THREE.Mesh(new THREE.CylinderGeometry(0.55, 0.42, 0.12, 14), goldMat);
      shellTop.position.set(0, 0.38, -0.32);
      shellTop.rotation.x = -0.95;
      const pearl = new THREE.Mesh(new THREE.SphereGeometry(0.22, 18, 18), pearlMat);
      pearl.position.set(0, 0.24, 0);
      clamGroup.add(shellBot, shellTop, pearl);
      clamGroup.position.set(1.72, baseY + 0.12, -0.85);
      clamGroup.rotation.y = -0.45;
      this.decorGroup.add(clamGroup);
      this.themeAnimatedNodes.push({ obj: pearl, kind: 'bob', baseX: 0, baseY: 0.24, baseZ: 0, phase: 0.5, speed: 2.0 });
    } else if (themeId === 'dendy_castle') {
      // GRAND 8-BIT FAMICOM FORTRESS PANORAMA + WARP PIPES + FLOATING ? BLOCKS + COINS
      const brickMat = new THREE.MeshStandardMaterial({ color: 0xb45309, roughness: 0.85 });
      const darkBrick = new THREE.MeshStandardMaterial({ color: 0x78350f, roughness: 0.9 });
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x1d4ed8, roughness: 0.45 });
      const pipeMat = new THREE.MeshStandardMaterial({ color: 0x16a34a, roughness: 0.25, metalness: 0.15 });
      const goldBlockMat = new THREE.MeshStandardMaterial({ color: 0xfacc15, emissive: 0xca8a04, emissiveIntensity: 0.45, roughness: 0.25 });
      const flagMat = new THREE.MeshStandardMaterial({ color: 0xef4444, emissive: 0x991b1b, emissiveIntensity: 0.3 });

      const castle = new THREE.Group();

      // Main Curtain Wall + Battlements
      const wall = new THREE.Mesh(new THREE.BoxGeometry(2.6, 1.05, 0.72), brickMat);
      wall.position.set(0, 0.525, 0);
      castle.add(wall);

      const gate = new THREE.Mesh(new THREE.BoxGeometry(0.6, 0.65, 0.76), darkBrick);
      gate.position.set(0, 0.325, 0.02);
      castle.add(gate);

      // Central Grand Keep + Pointed Cobalt Spire + Red Pennant
      const keep = new THREE.Mesh(new THREE.BoxGeometry(1.05, 2.0, 0.95), brickMat);
      keep.position.set(0, 1.0, 0);
      const keepRoof = new THREE.Mesh(new THREE.ConeGeometry(0.84, 0.95, 4), roofMat);
      keepRoof.rotation.y = Math.PI / 4;
      keepRoof.position.set(0, 2.48, 0);
      const flagPole = new THREE.Mesh(new THREE.CylinderGeometry(0.02, 0.02, 0.55, 6), goldBlockMat);
      flagPole.position.set(0, 3.15, 0);
      const flag = new THREE.Mesh(new THREE.BoxGeometry(0.36, 0.22, 0.04), flagMat);
      flag.position.set(0.18, 3.3, 0);
      castle.add(keep, keepRoof, flagPole, flag);

      // Twin Flanking Watchtowers
      [-1.25, 1.25].forEach((wx) => {
        const wTower = new THREE.Mesh(new THREE.BoxGeometry(0.68, 1.55, 0.78), brickMat);
        wTower.position.set(wx, 0.775, 0.08);
        const wRoof = new THREE.Mesh(new THREE.ConeGeometry(0.56, 0.65, 4), roofMat);
        wRoof.rotation.y = Math.PI / 4;
        wRoof.position.set(wx, 1.88, 0.08);
        castle.add(wTower, wRoof);
      });

      castle.position.set(0.05, baseY + 0.08, -1.45);
      this.decorGroup.add(castle);

      // Iconic Emerald 8-Bit Warp Pipes on Flanks
      [-2.15, 2.25].forEach((px, idx) => {
        const pipeH = idx === 0 ? 0.95 : 1.25;
        const pipeGroup = new THREE.Group();
        const shaft = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.24, pipeH, 16), pipeMat);
        shaft.position.y = pipeH / 2;
        const lip = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.2, 16), pipeMat);
        lip.position.y = pipeH;
        pipeGroup.add(shaft, lip);
        pipeGroup.position.set(px, baseY + 0.05, -0.85);
        this.decorGroup.add(pipeGroup);
      });

      // Bobbing Floating '?' Blocks & Spinning Gold Pixel Coins
      const blockTex = this.makeRetroSignTexture('?', '8-BIT', '#facc15', '#b45309');
      const blockMat = new THREE.MeshStandardMaterial({ map: blockTex, roughness: 0.3 });
      [-1.35, 1.45].forEach((bx, idx) => {
        const qBlock = new THREE.Mesh(new THREE.BoxGeometry(0.4, 0.4, 0.4), blockMat);
        const by = baseY + 2.45 + idx * 0.25;
        qBlock.position.set(bx, by, -0.85);
        this.decorGroup.add(qBlock);
        this.themeAnimatedNodes.push({ obj: qBlock, kind: 'bob', baseX: bx, baseY: by, baseZ: -0.85, phase: idx * 1.5, speed: 2.2 });
      });

      [-0.75, 0.85].forEach((cx, idx) => {
        const coin = new THREE.Mesh(new THREE.CylinderGeometry(0.16, 0.16, 0.05, 12), goldBlockMat);
        coin.rotation.x = Math.PI / 2;
        const cy = baseY + 2.75;
        coin.position.set(cx, cy, -0.95);
        this.decorGroup.add(coin);
        this.themeAnimatedNodes.push({ obj: coin, kind: 'spinY', baseX: cx, baseY: cy, baseZ: -0.95, phase: idx, speed: 2.4 });
      });
    }
  }

  private initBubbles() {
    const bubbleGeom = new THREE.SphereGeometry(0.045, 8, 8);
    const bubbleMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: this.isSoftwareGl ? 0 : 0.9,
      roughness: 0.05,
      transparent: true,
      opacity: this.isSoftwareGl ? 0.5 : 0.78,
      depthWrite: false,
    });

    this.bubbleParticles = new THREE.InstancedMesh(bubbleGeom, bubbleMat, this.bubbleCount);
    this.bubbleParticles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);
    this.bubbleParticles.frustumCulled = false;

    for (let i = 0; i < this.bubbleCount; i++) {
      const data = {
        x: -2.3 + (Math.random() - 0.5) * 0.8,
        y: this.tankBounds.minY + Math.random() * (this.tankBounds.maxY - this.tankBounds.minY),
        z: -1.0 + (Math.random() - 0.5) * 0.8,
        speed: 0.75 + Math.random() * 0.75,
        wobbleSpeed: 2.0 + Math.random() * 3.0,
        size: 0.4 + Math.random() * 0.8,
      };
      this.bubbleData.push(data);

      _dummy.position.set(data.x, data.y, data.z);
      _dummy.scale.setScalar(data.size);
      _dummy.updateMatrix();
      this.bubbleParticles.setMatrixAt(i, _dummy.matrix);
    }
    this.bubbleParticles.instanceMatrix.needsUpdate = true;
    this.scene.add(this.bubbleParticles);
  }

  public triggerCleanBurst() {
    // Reposition some bubbles across the screen to celebrate sparkling clean water!
    for (let i = 0; i < Math.min(28, this.bubbleCount); i++) {
      const b = this.bubbleData[i];
      b.x = THREE.MathUtils.randFloat(-2.6, 2.6);
      b.y = this.tankBounds.minY + Math.random() * 1.4;
      b.z = THREE.MathUtils.randFloat(-0.8, 0.8);
      b.speed = 1.6 + Math.random() * 1.1;
    }
    this.createTapRipple(new THREE.Vector3(0, 0, 0.5), 1.4);
  }

  public setCleanliness(cleanliness: number) {
    this.cleanlinessLevel = THREE.MathUtils.clamp(cleanliness, 0, 100);
    this.applyAtmosphere();
  }

  private applyAtmosphere() {
    const theme = AQUARIUM_THEMES[this.currentThemeId] || AQUARIUM_THEMES.tokyo_neon_96;
    this.themeWaterColor.set(theme.waterColor);
    this.themeFogColor.set(theme.fogColor);

    // Subtle algae murkiness if cleanliness drops below 60%
    const murk = Math.max(0, (60 - this.cleanlinessLevel) / 60) * 0.45;
    if (murk > 0) {
      this._blendColor.set('#2d4a22');
      this.themeWaterColor.lerp(this._blendColor, murk);
      this.themeFogColor.lerp(this._blendColor, murk);
    }
    this.themeFogDensity = 0.08 + murk * 0.14;

    // Theme-reactive lighting mood so each theme transforms the whole tank!
    const topColors: Record<AquariumThemeId, number> = {
      tokyo_neon_96: 0x38bdf8,
      zen_garden: 0xfef08a,
      dendy_castle: 0x93c5fd,
      sakura_shrine: 0xfbcfe8,
      golden_palace: 0xfde047,
    };
    const rimColors: Record<AquariumThemeId, number> = {
      tokyo_neon_96: 0xe879f9,
      zen_garden: 0x34d399,
      dendy_castle: 0xf59e0b,
      sakura_shrine: 0xf472b6,
      golden_palace: 0xf59e0b,
    };

    this.themeTopColor.setHex(topColors[this.currentThemeId] || 0x7dd3fc);
    this.themeRimColor.setHex(rimColors[this.currentThemeId] || 0xa5f3fc);
    this.themeTopIntensity = 2.2 * (theme.ambientIntensity || 1.0);

    this.updateAtmosphereBlend();
  }

  private updateAtmosphereBlend() {
    const t = this.fighterBlend;

    if (this.scene.background instanceof THREE.Color) {
      this.scene.background.copy(this.themeWaterColor).lerp(this.arenaWaterColor, t);
    } else {
      this.scene.background = this.themeWaterColor.clone().lerp(this.arenaWaterColor, t);
    }

    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(this.themeFogColor).lerp(this.arenaFogColor, t);
      this.scene.fog.density = THREE.MathUtils.lerp(this.themeFogDensity, 0.095, t);
    }

    if (this.waterTopLight) {
      this.waterTopLight.color.copy(this.themeTopColor).lerp(this.arenaTopColor, t);
      this.waterTopLight.intensity = THREE.MathUtils.lerp(this.themeTopIntensity, 2.85, t);
      const lx = THREE.MathUtils.lerp(0, this.arenaCenterX, t);
      this.waterTopLight.position.x = lx;
      this.waterTopLight.target.position.x = lx;
      this.waterTopLight.target.updateMatrixWorld();
    }

    if (this.rimLight) {
      this.rimLight.color.copy(this.themeRimColor).lerp(this.arenaRimColor, t);
      this.rimLight.intensity = THREE.MathUtils.lerp(1.8, 2.6, t);
      this.rimLight.position.x = THREE.MathUtils.lerp(-1.5, this.arenaCenterX - 1.5, t);
    }

    if (this.keyLight) {
      this.keyLight.position.x = THREE.MathUtils.lerp(2.4, this.arenaCenterX + 2.4, t);
    }

    if (this.hemiLight) {
      this.hemiLight.color.copy(this.themeHemiSkyColor).lerp(this.arenaHemiSkyColor, t);
    }

    if (this.godRayMaterial) {
      this.godRayMaterial.color.copy(this.themeTopColor).lerp(this.arenaTopColor, t);
      this.godRaysGroup.position.x = THREE.MathUtils.lerp(0, this.arenaCenterX, t);
    }

    if (this.waterSurfaceMesh) {
      const surfMat = this.waterSurfaceMesh.material as THREE.MeshPhysicalMaterial;
      surfMat.color.copy(this.themeWaterSurfColor).lerp(this.arenaWaterSurfColor, t);
    }
  }

  private updateBubbles(delta: number, time: number) {
    for (let i = 0; i < this.bubbleCount; i++) {
      const b = this.bubbleData[i];
      b.y += b.speed * delta;

      const currentX = b.x + Math.sin(time * b.wobbleSpeed + i) * 0.06;
      const currentZ = b.z + Math.cos(time * b.wobbleSpeed + i) * 0.06;

      if (b.y > this.tankBounds.maxY) {
        b.y = this.tankBounds.minY + 0.1;
        b.x = -2.3 + (Math.random() - 0.5) * 0.8;
        b.z = -1.0 + (Math.random() - 0.5) * 0.8;
        b.speed = 0.75 + Math.random() * 0.75;
      }

      _dummy.position.set(currentX, b.y, currentZ);
      _dummy.scale.setScalar(b.size);
      _dummy.updateMatrix();
      this.bubbleParticles.setMatrixAt(i, _dummy.matrix);
    }
    this.bubbleParticles.instanceMatrix.needsUpdate = true;
  }

  public dropFood(type: string, nutrition: number, count = 3) {
    retroAudio.playChomp();

    for (let i = 0; i < count; i++) {
      const pelletGeom = new THREE.SphereGeometry(type === 'golden_flake' ? 0.055 : 0.042, 8, 8);
      const color = type === 'golden_flake' ? 0xfacc15 : type === 'bloodworm' ? 0xef4444 : 0xf97316;
      const pelletMat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.3,
        emissive: type === 'golden_flake' ? 0xca8a04 : 0x000000,
      });

      const mesh = new THREE.Mesh(pelletGeom, pelletMat);
      mesh.position.set(
        (Math.random() - 0.5) * 2.0,
        this.tankBounds.maxY - 0.12,
        (Math.random() - 0.5) * 1.1
      );
      this.scene.add(mesh);

      this.foodPellets.push({
        mesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.16,
          -(0.26 + Math.random() * 0.24),
          (Math.random() - 0.5) * 0.16
        ),
        type,
        nutrition,
      });
    }

    if (this.foodPellets.length > 0) {
      this.fish.swimTo(this.foodPellets[0].mesh.position, true);
    }
  }

  private updateFood(delta: number) {
    // Compute exact world mouth position along fish heading & pitch (scaled to fishRoot=0.56)
    const heading = this.fish.group.rotation.y;
    const pitch = this.fish.group.rotation.z;
    _mouthPos.set(
      Math.cos(heading) * Math.cos(pitch) * 0.35,
      Math.sin(pitch) * 0.35 + 0.05,
      -Math.sin(heading) * Math.cos(pitch) * 0.35
    ).add(this.fish.currentPosition);

    const now = performance.now();

    for (let i = this.foodPellets.length - 1; i >= 0; i--) {
      const p = this.foodPellets[i];
      p.mesh.position.addScaledVector(p.velocity, delta);

      const distToFish = p.mesh.position.distanceTo(_mouthPos);
      if (distToFish < 0.42) {
        retroAudio.playChomp();
        this.fish.triggerGulp();
        this.createTapRipple(p.mesh.position, 0.3);
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.foodPellets.splice(i, 1);

        // Swim to next food pellet if any remain
        if (this.foodPellets.length > 0) {
          this.fish.swimTo(this.foodPellets[0].mesh.position, true);
        }

        if (this.onFishFed) {
          this.onFishFed(p.nutrition);
        }
        continue;
      }

      if (p.mesh.position.y <= this.tankBounds.minY + 0.08) {
        p.velocity.set(0, 0, 0);
        if (!p.settledAt) p.settledAt = now;
        if (now - p.settledAt > 4500) {
          this.scene.remove(p.mesh);
          p.mesh.geometry.dispose();
          (p.mesh.material as THREE.Material).dispose();
          this.foodPellets.splice(i, 1);
        }
      }
    }
  }

  public createTapRipple(pos: THREE.Vector3, scale = 0.5) {
    const ringGeom = new THREE.RingGeometry(0.05, 0.11, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.78,
      side: THREE.DoubleSide,
      depthWrite: false,
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.position.copy(pos);
    ring.lookAt(this.camera.position);
    this.tapRipplesGroup.add(ring);

    this.activeRipples.push({
      mesh: ring,
      material: ringMat,
      progress: 0,
      maxScale: scale,
    });
  }

  private updateRipples(delta: number) {
    for (let i = this.activeRipples.length - 1; i >= 0; i--) {
      const r = this.activeRipples[i];
      r.progress += delta * 2.2;
      if (r.progress >= 1.0) {
        this.tapRipplesGroup.remove(r.mesh);
        r.mesh.geometry.dispose();
        r.material.dispose();
        this.activeRipples.splice(i, 1);
      } else {
        r.mesh.scale.setScalar(1.0 + r.progress * 3.8 * r.maxScale);
        r.material.opacity = Math.max(0, 0.78 * (1 - r.progress));
      }
    }
  }

  private setupEvents() {
    this.onPointerDownBound = (e: PointerEvent) => {
      if (this.fighterMode) return;
      const rect = this.container.getBoundingClientRect();
      this.mouse.x = ((e.clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((e.clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      if (this.raycaster.ray.intersectPlane(_planeZ, _hitPoint)) {
        // Clamp hit point nicely inside tank bounds
        _hitPoint.x = THREE.MathUtils.clamp(_hitPoint.x, this.tankBounds.minX + 0.6, this.tankBounds.maxX - 0.6);
        _hitPoint.y = THREE.MathUtils.clamp(_hitPoint.y, this.tankBounds.minY + 0.5, this.tankBounds.maxY - 0.4);
        _hitPoint.z = THREE.MathUtils.clamp(_hitPoint.z, -0.5, 0.5);

        retroAudio.playKnock();
        this.createTapRipple(_hitPoint);
        this.fish.swimTo(_hitPoint, false);
        if (this.onFishTapped) {
          this.onFishTapped();
        }
      }
    };

    this.container.addEventListener('pointerdown', this.onPointerDownBound);

    this.onResizeBound = () => {
      if (!this.container || this.isDisposed) return;
      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;
      if (w === 0 || h === 0) return;
      const aspect = w / h;
      this.camera.aspect = aspect;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
      this.adjustCameraForAspect(aspect);
    };

    window.addEventListener('resize', this.onResizeBound);
    if (typeof ResizeObserver !== 'undefined') {
      this.resizeObserver = new ResizeObserver(this.onResizeBound);
      this.resizeObserver.observe(this.container);
    }
  }

  public setTheme(themeId: AquariumThemeId) {
    this.currentThemeId = themeId;
    const theme = AQUARIUM_THEMES[themeId] || AQUARIUM_THEMES.tokyo_neon_96;
    this.applyAtmosphere();
    this.paintSandTexture(theme.sandColor);
    this.buildThemeDecorations(themeId);
  }

  public enterFighterMode(opponentSkin: FishColorPalette, opponentVip = false) {
    this.fighterMode = true;
    this.opponentFish.updateSkin(opponentSkin);
    this.opponentFish.setVip(opponentVip);
    this.opponentFish.group.visible = true;

    const playerStance = new THREE.Vector3(this.arenaCenterX - 1.35, 0.25, 0.18);
    const rivalStance = new THREE.Vector3(this.arenaCenterX + 1.35, 0.25, 0.18);
    this.opponentFish.currentPosition.copy(rivalStance);
    this.opponentFish.group.position.copy(rivalStance);

    this.fish.enterCombat(playerStance, 0);
    this.opponentFish.enterCombat(rivalStance, Math.PI);
    this.createTapRipple(new THREE.Vector3(this.arenaCenterX, 0.25, 0.2), 1.6);
  }

  public exitFighterMode() {
    this.fighterMode = false;
    this.opponentFish.group.visible = false;
    this.fish.exitCombat(new THREE.Vector3(0, 0.18, 0.2));
  }

  public setOpponentSkin(opponentSkin: FishColorPalette, opponentVip = false) {
    this.opponentFish.updateSkin(opponentSkin);
    this.opponentFish.setVip(opponentVip);
  }

  public playFighterMove(
    actor: 'player' | 'opponent',
    kind: 'light' | 'heavy' | 'ultimate' | 'guard_on' | 'guard_off' | 'hit'
  ) {
    const fishObj = actor === 'player' ? this.fish : this.opponentFish;
    const dirX = actor === 'player' ? 1 : -1;

    if (kind === 'guard_on') {
      fishObj.setCombatGuard(true);
      this.createTapRipple(fishObj.currentPosition, 0.7);
      return;
    }
    if (kind === 'guard_off') {
      fishObj.setCombatGuard(false);
      return;
    }
    if (kind === 'hit') {
      fishObj.triggerCombatHit(-dirX);
      this.createTapRipple(fishObj.currentPosition, 1.0);
      return;
    }

    fishObj.triggerCombatStrike(dirX, kind);
    const impactScale = kind === 'ultimate' ? 2.0 : kind === 'heavy' ? 1.35 : 0.85;
    this.createTapRipple(new THREE.Vector3(this.arenaCenterX, 0.25, 0.25), impactScale);
  }

  private startLoop() {
    const tick = () => {
      if (this.isDisposed) return;

      const rawDt = this.clock.getDelta();
      const delta = Math.min(rawDt, 0.05);
      const time = this.clock.getElapsedTime();

      this.fish.update(delta, this.tankBounds);
      if (this.fighterMode) {
        this.opponentFish.update(delta, this.tankBounds);
      }

      this.updateCaustics(time);
      this.updateBubbles(delta, time);
      this.updatePlankton(delta);
      this.updateFood(delta);
      this.updateRipples(delta);
      this.updateThemeProps(delta, time);

      // Animate Arena corner energy crystals
      for (let i = 0; i < this.arenaAnimatedNodes.length; i++) {
        const node = this.arenaAnimatedNodes[i];
        node.obj.rotation.y += delta * 1.4;
        node.obj.position.y = node.baseY + Math.sin(time * 2.2 + node.phase) * 0.09;
      }

      // Gentle aquatic flora sway
      for (let p = 0; p < this.plantMeshes.length; p++) {
        const mesh = this.plantMeshes[p];
        const pos = mesh.geometry.attributes.position;
        const orig = this.plantOriginalVertices[p];
        for (let i = 0; i < pos.count; i++) {
          const idx = i * 3;
          const oy = orig[idx + 1];
          const heightRatio = Math.max(0, oy / 2.2);
          const sway = Math.sin(time * 2.1 + p * 0.7) * 0.13 * heightRatio;
          pos.setX(i, orig[idx] + sway);
        }
        pos.needsUpdate = true;
      }

      // Smoothly transition crimson Fighter Arena atmosphere & camera slide
      const targetBlend = this.fighterMode ? 1 : 0;
      const nextBlend = THREE.MathUtils.damp(this.fighterBlend, targetBlend, 4.0, delta);
      if (Math.abs(nextBlend - this.fighterBlend) > 0.0002) {
        this.fighterBlend = Math.abs(nextBlend - targetBlend) < 0.001 ? targetBlend : nextBlend;
        this.updateAtmosphereBlend();
      }

      if (this.arenaBackRedLight) {
        this.arenaBackRedLight.intensity = 2.6 + Math.sin(time * 2.8) * 0.55;
      }

      // Smooth horizontal slide between Aquarium (X=0) and PvP Fighter Arena (X=12)
      const targetCamX = this.fighterMode
        ? this.arenaCenterX
        : THREE.MathUtils.clamp(this.fish.currentPosition.x * 0.16, -0.5, 0.5);
      const targetCamY = this.fighterMode
        ? 0.42
        : THREE.MathUtils.clamp(0.24 + this.fish.currentPosition.y * 0.12, -0.2, 0.6);
      const targetCamZ = this.fighterMode ? this.arenaAspectZ : this.currentCameraPos.z;
      const targetLookX = this.fighterMode ? this.arenaCenterX : 0;
      const targetLookY = this.fighterMode ? 0.18 : 0.12;

      const camLambda = this.fighterMode ? 4.4 : 3.4;
      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, targetCamX, camLambda, delta);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, targetCamY, camLambda, delta);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, targetCamZ, camLambda, delta);

      this.cameraTarget.x = THREE.MathUtils.damp(this.cameraTarget.x, targetLookX, camLambda, delta);
      this.cameraTarget.y = THREE.MathUtils.damp(this.cameraTarget.y, targetLookY, camLambda, delta);
      this.camera.lookAt(this.cameraTarget);

      this.renderer.render(this.scene, this.camera);

      if (this.isSoftwareGl) {
        this.afterDraw(tick);
      } else {
        this.animFrameId = requestAnimationFrame(tick);
      }
    };

    if (this.isSoftwareGl) {
      this.afterDraw(tick);
    } else {
      this.animFrameId = requestAnimationFrame(tick);
    }
  }

  private updateThemeProps(delta: number, time: number) {
    for (let i = 0; i < this.themeAnimatedNodes.length; i++) {
      const n = this.themeAnimatedNodes[i];
      if (n.kind === 'spin') {
        n.obj.rotation.z += delta * n.speed;
      } else if (n.kind === 'spinY') {
        n.obj.rotation.y += delta * n.speed;
      } else if (n.kind === 'bob') {
        n.obj.position.y = n.baseY + Math.sin(time * n.speed + n.phase) * 0.08;
        n.obj.rotation.y += delta * 0.7;
      } else if (n.kind === 'petal') {
        n.obj.position.y -= n.speed * delta;
        n.obj.position.x = n.baseX + Math.sin(time * 1.4 + n.phase) * 0.25;
        n.obj.rotation.z += delta * 0.8;
        n.obj.rotation.x += delta * 0.5;
        if (n.obj.position.y < this.tankBounds.minY + 0.08) {
          n.obj.position.y = this.tankBounds.maxY - 0.15;
        }
      }
    }
  }

  private afterDraw(cb: () => void) {
    const gl = this.renderer.getContext() as WebGL2RenderingContext;
    const sync = gl.fenceSync(gl.SYNC_GPU_COMMANDS_COMPLETE, 0);
    gl.flush();
    const poll = () => {
      if (this.isDisposed) return;
      const state = sync && gl.getSyncParameter(sync, gl.SYNC_STATUS);
      if (state === gl.UNSIGNALED) {
        this.animFrameId = window.setTimeout(poll, 5);
      } else {
        gl.deleteSync(sync);
        this.animFrameId = window.setTimeout(cb, 75);
      }
    };
    this.animFrameId = window.setTimeout(poll, 5);
  }

  public dispose() {
    this.isDisposed = true;
    if (this.animFrameId) {
      cancelAnimationFrame(this.animFrameId);
      clearTimeout(this.animFrameId);
    }
    this.container.removeEventListener('pointerdown', this.onPointerDownBound);
    window.removeEventListener('resize', this.onResizeBound);
    if (this.resizeObserver) {
      this.resizeObserver.disconnect();
      this.resizeObserver = null;
    }
    this.disposeGroupResources(this.decorGroup);
    this.disposeGroupResources(this.arenaGroup);
    this.fish.dispose();
    this.opponentFish.dispose();
    this.causticTexture.dispose();
    this.sandTexture.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
