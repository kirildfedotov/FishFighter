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

  // Volumetric God Rays
  private godRaysGroup: THREE.Group = new THREE.Group();

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

  // Interactivity & Resize
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private cameraTarget = new THREE.Vector3(0, 0.08, 0);
  private cameraBasePos = new THREE.Vector3(0, 0.25, 5.1);
  private currentCameraPos = new THREE.Vector3(0, 0.25, 5.1);
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

    this.waterTopLight = new THREE.SpotLight(0x7dd3fc, 2.2, 11, Math.PI / 2.8, 0.5, 1.4);
    this.waterTopLight.position.set(0, 3.6, 0.8);
    this.scene.add(this.waterTopLight);

    // Backlight to illuminate translucent silk Betta fins from behind!
    this.rimLight = new THREE.PointLight(0xa5f3fc, 1.8, 9);
    this.rimLight.position.set(-1.5, 0.8, -2.0);
    this.scene.add(this.rimLight);

    this.scene.add(this.decorGroup);
    this.scene.add(this.tapRipplesGroup);
    this.scene.add(this.godRaysGroup);
  }

  private adjustCameraForAspect(aspect: number) {
    // Pull camera slightly back on narrow portrait mobile screens so the full fish fits gracefully
    const targetZ = aspect < 0.85 ? 6.4 : aspect < 1.1 ? 5.6 : 5.0;
    this.currentCameraPos.z = targetZ;
  }

  private initFish(skinId: FishColorPalette) {
    this.fish = new BettaFish(skinId, this.isSoftwareGl);
    this.fish.group.position.set(0, 0.15, 0);
    this.fish.currentPosition.set(0, 0.15, 0);
    this.fish.targetPosition.set(0.2, 0.15, 0.1);
    this.scene.add(this.fish.group);
  }

  private initDynamicCaustics() {
    this.causticCanvas = document.createElement('canvas');
    this.causticCanvas.width = 256;
    this.causticCanvas.height = 256;
    this.causticCtx = this.causticCanvas.getContext('2d')!;

    this.causticTexture = new THREE.CanvasTexture(this.causticCanvas);
    this.causticTexture.wrapS = THREE.RepeatWrapping;
    this.causticTexture.wrapT = THREE.RepeatWrapping;
    this.causticTexture.repeat.set(3, 2);

    const causticGeom = new THREE.PlaneGeometry(8.5, 6);
    causticGeom.rotateX(-Math.PI / 2);

    const causticMat = new THREE.MeshBasicMaterial({
      map: this.causticTexture,
      transparent: true,
      opacity: 0.34,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.causticPlane = new THREE.Mesh(causticGeom, causticMat);
    this.causticPlane.position.y = this.tankBounds.minY + 0.12;
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

    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const lum = Math.random() > 0.5 ? 255 : 0;
      sCtx.fillStyle = `rgba(${lum}, ${lum}, ${lum}, 0.12)`;
      sCtx.fillRect(x, y, 2, 2);
    }

    if (!this.sandTexture) {
      this.sandTexture = new THREE.CanvasTexture(canvas);
      this.sandTexture.colorSpace = THREE.SRGBColorSpace;
      this.sandTexture.wrapS = THREE.RepeatWrapping;
      this.sandTexture.wrapT = THREE.RepeatWrapping;
      this.sandTexture.repeat.set(4, 4);
    } else {
      this.sandTexture.needsUpdate = true;
    }
  }

  private initAquariumWorld(themeId: AquariumThemeId) {
    const theme = AQUARIUM_THEMES[themeId] || AQUARIUM_THEMES.tokyo_neon_96;

    this.paintSandTexture(theme.sandColor);

    const sandGeom = new THREE.PlaneGeometry(8.5, 6.2, 32, 32);
    sandGeom.rotateX(-Math.PI / 2);
    const pos = sandGeom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i);
      const pz = pos.getZ(i);
      const wave = Math.sin(px * 1.8 + 0.4) * Math.cos(pz * 1.4) * 0.12 + Math.sin(px * 3.5) * 0.035;
      pos.setY(i, wave);
    }
    sandGeom.computeVertexNormals();

    this.sandMaterial = new THREE.MeshStandardMaterial({
      map: this.sandTexture,
      roughness: 0.88,
      metalness: 0.05,
    });
    this.sandMesh = new THREE.Mesh(sandGeom, this.sandMaterial);
    this.sandMesh.position.y = this.tankBounds.minY;
    this.sandMesh.receiveShadow = true;
    this.scene.add(this.sandMesh);

    this.buildAquaticDriftwood();
    this.buildRiverStones();
    this.buildSunkenCartridge();
    this.buildAquaticFlora();

    // Water Surface
    const surfGeom = new THREE.PlaneGeometry(8.5, 6, 20, 20);
    surfGeom.rotateX(Math.PI / 2);
    const surfMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      transmission: this.isSoftwareGl ? 0 : 0.85,
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: this.isSoftwareGl ? 0.35 : 0.45,
      ior: 1.33,
      depthWrite: false,
    });
    this.waterSurfaceMesh = new THREE.Mesh(surfGeom, surfMat);
    this.waterSurfaceMesh.position.y = this.tankBounds.maxY;
    this.scene.add(this.waterSurfaceMesh);

    this.buildThemeDecorations(themeId);
  }

  private buildAquaticDriftwood() {
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x3b2416,
      roughness: 0.86,
      metalness: 0.06,
    });

    const rootCurve1 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.9, this.tankBounds.minY + 0.08, -0.7),
      new THREE.Vector3(-1.3, this.tankBounds.minY + 0.58, -0.5),
      new THREE.Vector3(-0.6, this.tankBounds.minY + 0.35, -0.75),
      new THREE.Vector3(0.05, this.tankBounds.minY + 0.12, -0.85),
    ]);
    const woodMesh1 = new THREE.Mesh(new THREE.TubeGeometry(rootCurve1, 24, 0.13, 8, false), woodMat);
    woodMesh1.castShadow = true;
    woodMesh1.receiveShadow = true;
    this.scene.add(woodMesh1);

    const rootCurve2 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.3, this.tankBounds.minY + 0.58, -0.5),
      new THREE.Vector3(-1.05, this.tankBounds.minY + 1.05, -0.3),
      new THREE.Vector3(-0.75, this.tankBounds.minY + 1.38, -0.4),
    ]);
    const woodMesh2 = new THREE.Mesh(new THREE.TubeGeometry(rootCurve2, 16, 0.075, 8, false), woodMat);
    woodMesh2.castShadow = true;
    this.scene.add(woodMesh2);
  }

  private buildRiverStones() {
    const stoneMats = [
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.72, metalness: 0.12 }),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.82, metalness: 0.08 }),
      new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.62, metalness: 0.18 }),
    ];

    const stoneConfigs = [
      { x: -1.7, z: -0.25, s: 0.32, rot: 0.4, mat: 0 },
      { x: -1.4, z: 0.25, s: 0.22, rot: 1.1, mat: 1 },
      { x: -0.8, z: -0.95, s: 0.38, rot: 0.7, mat: 2 },
      { x: 0.85, z: -0.55, s: 0.28, rot: 2.1, mat: 0 },
      { x: 1.25, z: -0.85, s: 0.42, rot: 0.5, mat: 1 },
      { x: 1.6, z: -0.35, s: 0.2, rot: 1.5, mat: 2 },
    ];

    stoneConfigs.forEach((sc) => {
      const stoneGeom = new THREE.DodecahedronGeometry(sc.s, 2);
      stoneGeom.scale(1.2, 0.72, 1.0);
      const stone = new THREE.Mesh(stoneGeom, stoneMats[sc.mat]);
      stone.position.set(sc.x, this.tankBounds.minY + sc.s * 0.58, sc.z);
      stone.rotation.y = sc.rot;
      stone.castShadow = true;
      stone.receiveShadow = true;
      this.scene.add(stone);
    });
  }

  private buildSunkenCartridge() {
    const cartGroup = new THREE.Group();
    const cartMat = new THREE.MeshStandardMaterial({ color: 0xdc2626, roughness: 0.38, metalness: 0.1 });
    const labelMat = new THREE.MeshStandardMaterial({ color: 0xfef08a, roughness: 0.5 });
    const pinMat = new THREE.MeshStandardMaterial({ color: 0xd97706, metalness: 0.9, roughness: 0.2 });

    const cartBody = new THREE.Mesh(new THREE.BoxGeometry(0.7, 0.13, 0.5), cartMat);
    cartBody.castShadow = true;
    cartGroup.add(cartBody);

    const label = new THREE.Mesh(new THREE.BoxGeometry(0.5, 0.02, 0.34), labelMat);
    label.position.set(0, 0.07, 0.02);
    cartGroup.add(label);

    const pins = new THREE.Mesh(new THREE.BoxGeometry(0.62, 0.04, 0.07), pinMat);
    pins.position.set(0, -0.055, -0.22);
    cartGroup.add(pins);

    cartGroup.position.set(-1.1, this.tankBounds.minY + 0.1, 0.65);
    cartGroup.rotation.set(0.18, 0.45, -0.15);
    this.scene.add(cartGroup);
  }

  private buildAquaticFlora() {
    const ribbonMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.38,
      metalness: 0.08,
      side: THREE.DoubleSide,
    });

    const plantClusters = [
      { x: -2.6, z: -1.1, height: 2.6, leaves: 8 },
      { x: -2.2, z: -0.5, height: 1.9, leaves: 6 },
      { x: 2.4, z: -1.0, height: 2.4, leaves: 7 },
      { x: 2.0, z: -0.4, height: 1.7, leaves: 5 },
      { x: 1.7, z: -1.4, height: 2.7, leaves: 7 },
    ];

    plantClusters.forEach((cluster) => {
      for (let l = 0; l < cluster.leaves; l++) {
        const leafH = cluster.height * (0.75 + Math.random() * 0.35);
        const leafGeom = new THREE.PlaneGeometry(0.11, leafH, 3, 14);
        const lPos = leafGeom.attributes.position;

        for (let i = 0; i < lPos.count; i++) {
          const y = lPos.getY(i);
          const ratio = (y + leafH / 2) / leafH;
          lPos.setZ(i, Math.sin(ratio * Math.PI) * 0.16);
          lPos.setX(i, lPos.getX(i) + Math.sin(ratio * Math.PI * 1.5) * 0.045);
        }
        leafGeom.computeVertexNormals();

        const leafMesh = new THREE.Mesh(leafGeom, ribbonMat);
        leafMesh.position.set(
          cluster.x + (Math.random() - 0.5) * 0.35,
          this.tankBounds.minY + leafH * 0.48,
          cluster.z + (Math.random() - 0.5) * 0.35
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
    for (let i = 0; i < 6; i++) {
      const aShape = new THREE.Shape();
      aShape.moveTo(0, 0);
      aShape.bezierCurveTo(0.12, 0.15, 0.18, 0.35, 0.0, 0.46);
      aShape.bezierCurveTo(-0.18, 0.35, -0.12, 0.15, 0, 0);

      const aGeom = new THREE.ShapeGeometry(aShape, 8);
      const aLeaf = new THREE.Mesh(aGeom, anubiasMat);
      aLeaf.position.set(-1.15 + (i % 3) * 0.18, this.tankBounds.minY + 0.58 + i * 0.07, -0.4);
      aLeaf.rotation.set(-0.6, i * 0.8, 0.3);
      aLeaf.castShadow = true;
      this.scene.add(aLeaf);
    }

    const mossCanvas = document.createElement('canvas');
    mossCanvas.width = 128;
    mossCanvas.height = 128;
    const mCtx = mossCanvas.getContext('2d')!;
    mCtx.fillStyle = '#14532d';
    mCtx.fillRect(0, 0, 128, 128);
    for (let i = 0; i < 600; i++) {
      mCtx.fillStyle = Math.random() > 0.5 ? '#166534' : '#15803d';
      mCtx.fillRect(Math.random() * 128, Math.random() * 128, 2, 2);
    }
    const mossTexture = new THREE.CanvasTexture(mossCanvas);
    mossTexture.colorSpace = THREE.SRGBColorSpace;

    const mossGeom = new THREE.DodecahedronGeometry(0.35, 3);
    const mossMat = new THREE.MeshStandardMaterial({
      map: mossTexture,
      roughness: 0.96,
      metalness: 0.02,
    });
    const mossBall = new THREE.Mesh(mossGeom, mossMat);
    mossBall.position.set(-0.25, this.tankBounds.minY + 0.32, 0.32);
    mossBall.castShadow = true;
    this.scene.add(mossBall);
  }

  private initGodRays() {
    const rayGeom = new THREE.ConeGeometry(0.85, 4.2, 16, 1, true);
    rayGeom.translate(0, -2.1, 0);

    const rayMat = new THREE.MeshBasicMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.06,
      blending: THREE.AdditiveBlending,
      side: THREE.DoubleSide,
      depthWrite: false,
    });

    const ray1 = new THREE.Mesh(rayGeom, rayMat);
    ray1.position.set(0.6, this.tankBounds.maxY, -0.3);
    ray1.rotation.set(0.15, 0, -0.22);
    this.godRaysGroup.add(ray1);

    const ray2 = new THREE.Mesh(rayGeom, rayMat);
    ray2.position.set(-1.2, this.tankBounds.maxY, -0.6);
    ray2.rotation.set(-0.1, 0, 0.28);
    this.godRaysGroup.add(ray2);
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
        x: THREE.MathUtils.randFloat(this.tankBounds.minX, this.tankBounds.maxX),
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
    for (let i = 0; i < this.planktonCount; i++) {
      const p = this.planktonData[i];
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.z += p.vz * delta;

      if (p.x < this.tankBounds.minX) p.x = this.tankBounds.maxX;
      if (p.x > this.tankBounds.maxX) p.x = this.tankBounds.minX;
      if (p.y < this.tankBounds.minY) p.y = this.tankBounds.maxY;
      if (p.y > this.tankBounds.maxY) p.y = this.tankBounds.minY;

      _dummy.position.set(p.x, p.y, p.z);
      _dummy.scale.setScalar(1);
      _dummy.updateMatrix();
      this.planktonParticles.setMatrixAt(i, _dummy.matrix);
    }
    this.planktonParticles.instanceMatrix.needsUpdate = true;
  }

  public buildThemeDecorations(themeId: AquariumThemeId) {
    while (this.decorGroup.children.length > 0) {
      this.decorGroup.remove(this.decorGroup.children[0]);
    }

    if (themeId === 'zen_garden') {
      const toriiMat = new THREE.MeshStandardMaterial({ color: 0xd92626, roughness: 0.3, metalness: 0.15 });
      const stoneMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.75, metalness: 0.1 });
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.2, metalness: 0.85 });

      const toriiGroup = new THREE.Group();
      const baseGeom = new THREE.CylinderGeometry(0.14, 0.17, 0.16, 12);
      const leftBase = new THREE.Mesh(baseGeom, stoneMat);
      leftBase.position.set(-0.6, 0.08, 0);
      const rightBase = new THREE.Mesh(baseGeom, stoneMat);
      rightBase.position.set(0.6, 0.08, 0);

      const pillarGeom = new THREE.CylinderGeometry(0.08, 0.095, 1.65, 16);
      const leftPillar = new THREE.Mesh(pillarGeom, toriiMat);
      leftPillar.position.set(-0.6, 0.9, 0);
      leftPillar.rotation.z = -0.04;

      const rightPillar = new THREE.Mesh(pillarGeom, toriiMat);
      rightPillar.position.set(0.6, 0.9, 0);
      rightPillar.rotation.z = 0.04;

      const topBeam = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.12, 0.16), toriiMat);
      topBeam.position.set(0, 1.72, 0);

      const goldTips = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.06, 0.18), goldMat);
      goldTips.position.set(0, 1.79, 0);

      const subBeam = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.09, 0.12), toriiMat);
      subBeam.position.set(0, 1.38, 0);

      const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.06), goldMat);
      plaque.position.set(0, 1.55, 0);

      toriiGroup.add(leftBase, rightBase, leftPillar, rightPillar, topBeam, goldTips, subBeam, plaque);
      toriiGroup.position.set(0.35, this.tankBounds.minY, -1.0);
      toriiGroup.rotation.y = -0.22;
      this.decorGroup.add(toriiGroup);
    } else if (themeId === 'sakura_shrine') {
      const toroGroup = new THREE.Group();
      const stoneMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85, metalness: 0.1 });
      const lanternGlowMat = new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xf59e0b,
        emissiveIntensity: 1.2,
      });

      const kiso = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.44, 0.18, 6), stoneMat);
      kiso.position.set(0, 0.09, 0);
      const sao = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.75, 12), stoneMat);
      sao.position.set(0, 0.55, 0);
      const chudai = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.28, 0.16, 6), stoneMat);
      chudai.position.set(0, 1.0, 0);
      const hibukuro = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.35, 6), lanternGlowMat);
      hibukuro.position.set(0, 1.25, 0);
      const kasa = new THREE.Mesh(new THREE.ConeGeometry(0.58, 0.32, 6), stoneMat);
      kasa.position.set(0, 1.58, 0);
      const hoju = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), stoneMat);
      hoju.position.set(0, 1.82, 0);

      toroGroup.add(kiso, sao, chudai, hibukuro, kasa, hoju);
      toroGroup.position.set(0.4, this.tankBounds.minY, -0.9);
      toroGroup.rotation.y = 0.35;
      this.decorGroup.add(toroGroup);

      // Gentle sakura blossoms floating around shrine
      const petalMat = new THREE.MeshStandardMaterial({ color: 0xfbcfe8, roughness: 0.4, side: THREE.DoubleSide });
      const petalGeom = new THREE.CircleGeometry(0.06, 5);
      for (let i = 0; i < 14; i++) {
        const petal = new THREE.Mesh(petalGeom, petalMat);
        petal.position.set(
          THREE.MathUtils.randFloat(-1.8, 1.8),
          this.tankBounds.minY + 0.08 + Math.random() * 0.2,
          THREE.MathUtils.randFloat(-1.2, 0.8)
        );
        petal.rotation.set(-Math.PI / 2 + (Math.random() - 0.5) * 0.4, Math.random() * Math.PI, 0);
        this.decorGroup.add(petal);
      }
    } else if (themeId === 'golden_palace') {
      const chestGroup = new THREE.Group();
      const woodMat = new THREE.MeshStandardMaterial({ color: 0x3d2314, roughness: 0.8 });
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.16, metalness: 0.95 });
      const ironMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.5, metalness: 0.85 });

      const base = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.55, 0.65), woodMat);
      base.position.set(0, 0.28, 0);
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.0, 14, 1, false, 0, Math.PI), woodMat);
      lid.rotation.z = Math.PI / 2;
      lid.position.set(0, 0.55, 0);

      const band1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.56, 0.67), ironMat);
      band1.position.set(-0.35, 0.28, 0);
      const band2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.56, 0.67), ironMat);
      band2.position.set(0.35, 0.28, 0);

      const lock = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.05), goldMat);
      lock.position.set(0, 0.38, 0.34);

      const treasure = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 2), goldMat);
      treasure.position.set(0.35, 0.2, 0.35);

      chestGroup.add(base, lid, band1, band2, lock, treasure);
      chestGroup.position.set(0.4, this.tankBounds.minY, -0.85);
      chestGroup.rotation.y = 0.35;
      this.decorGroup.add(chestGroup);
    } else if (themeId === 'dendy_castle') {
      const brickMat = new THREE.MeshStandardMaterial({ color: 0x9a3412, roughness: 0.9 });
      const roofMat = new THREE.MeshStandardMaterial({ color: 0x1e3a8a, roughness: 0.6 });

      const tower = new THREE.Mesh(new THREE.BoxGeometry(0.85, 1.5, 0.85), brickMat);
      tower.position.set(0, 0.75, 0);

      const roof = new THREE.Mesh(new THREE.ConeGeometry(0.7, 0.85, 4), roofMat);
      roof.rotateY(Math.PI / 4);
      roof.position.set(0, 1.9, 0);

      const batGeom = new THREE.BoxGeometry(0.18, 0.22, 0.18);
      for (let i = 0; i < 4; i++) {
        const bat = new THREE.Mesh(batGeom, brickMat);
        bat.position.set(i % 2 === 0 ? -0.38 : 0.38, 1.55, i < 2 ? -0.38 : 0.38);
        tower.add(bat);
      }

      const castle = new THREE.Group();
      castle.add(tower, roof);
      castle.position.set(0.5, this.tankBounds.minY, -0.9);
      this.decorGroup.add(castle);
    } else if (themeId === 'tokyo_neon_96') {
      const neonMatCyan = new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x0891b2, roughness: 0.2 });
      const neonMatMagenta = new THREE.MeshStandardMaterial({ color: 0xd946ef, emissive: 0xc026d3, roughness: 0.2 });

      const col1 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.8, 8), neonMatCyan);
      col1.position.set(-0.8, this.tankBounds.minY + 0.9, -1.2);
      const col2 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.8, 8), neonMatMagenta);
      col2.position.set(0.8, this.tankBounds.minY + 0.9, -1.2);

      this.decorGroup.add(col1, col2);
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
    const baseWater = new THREE.Color(theme.waterColor);
    const baseFog = new THREE.Color(theme.fogColor);

    // Subtle algae murkiness if cleanliness drops below 60%
    const murk = Math.max(0, (60 - this.cleanlinessLevel) / 60) * 0.45;
    if (murk > 0) {
      const algaeTint = new THREE.Color('#2d4a22');
      baseWater.lerp(algaeTint, murk);
      baseFog.lerp(algaeTint, murk);
    }

    this.scene.background = baseWater;
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color.copy(baseFog);
      this.scene.fog.density = 0.095 + murk * 0.14;
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

  private startLoop() {
    const tick = () => {
      if (this.isDisposed) return;

      const rawDt = this.clock.getDelta();
      const delta = Math.min(rawDt, 0.05);
      const time = this.clock.getElapsedTime();

      this.fish.update(delta, this.tankBounds);
      this.updateCaustics(time);
      this.updateBubbles(delta, time);
      this.updatePlankton(delta);
      this.updateFood(delta);
      this.updateRipples(delta);

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

      // Smooth camera damping (subtle floating focus on fish)
      const targetCamX = THREE.MathUtils.clamp(this.fish.currentPosition.x * 0.16, -0.5, 0.5);
      const targetCamY = THREE.MathUtils.clamp(0.22 + this.fish.currentPosition.y * 0.12, -0.2, 0.6);
      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, targetCamX, 1.8, delta);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, targetCamY, 1.8, delta);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, this.currentCameraPos.z, 2.5, delta);
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
    this.fish.dispose();
    this.causticTexture.dispose();
    this.sandTexture.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
