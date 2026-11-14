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
}

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

  // Environment bounds
  private tankBounds = {
    minX: -3.3,
    maxX: 3.3,
    minY: -2.1,
    maxY: 2.3,
    minZ: -2.0,
    maxZ: 2.0,
  };

  // Scene Elements
  private sandMesh!: THREE.Mesh;
  private sandMaterial!: THREE.MeshStandardMaterial;
  private causticPlane!: THREE.Mesh;
  private causticCanvas!: HTMLCanvasElement;
  private causticCtx!: CanvasRenderingContext2D;
  private causticTexture!: THREE.CanvasTexture;
  private waterSurfaceMesh!: THREE.Mesh;

  private plantMeshes: THREE.Mesh[] = [];
  private plantOriginalVertices: Float32Array[] = [];
  
  // Air Bubbles & Floating Plankton
  private bubbleParticles!: THREE.InstancedMesh;
  private bubbleData: { x: number; y: number; z: number; speed: number; wobbleSpeed: number; size: number }[] = [];
  private bubbleCount = 45;

  private planktonParticles!: THREE.InstancedMesh;
  private planktonData: { x: number; y: number; z: number; vx: number; vy: number; vz: number; baseOpacity: number }[] = [];
  private planktonCount = 65;

  // Volumetric God Rays
  private godRaysGroup: THREE.Group = new THREE.Group();

  // Falling Food & Decorations
  private foodPellets: FoodPellet[] = [];
  private decorGroup: THREE.Group = new THREE.Group();
  private tapRipplesGroup: THREE.Group = new THREE.Group();

  // Lighting
  private keyLight!: THREE.DirectionalLight;
  private hemiLight!: THREE.HemisphereLight;
  private waterTopLight!: THREE.SpotLight;
  private rimLight!: THREE.PointLight;

  // Interactivity
  private raycaster = new THREE.Raycaster();
  private mouse = new THREE.Vector2();
  private cameraTarget = new THREE.Vector3(0, 0.1, 0);
  private cameraBasePos = new THREE.Vector3(0, 0.35, 5.2);
  private currentCameraPos = new THREE.Vector3(0, 0.35, 5.2);

  // Callbacks
  public onFishFed?: (nutrition: number) => void;
  public onFishTapped?: () => void;

  constructor(container: HTMLElement, initialSkin: FishColorPalette, initialTheme: AquariumThemeId) {
    this.container = container;
    this.initRenderer();
    this.initScene(initialTheme);
    this.initFish(initialSkin);
    this.initDynamicCaustics();
    this.initAquariumWorld(initialTheme);
    this.initBubbles();
    this.initPlankton();
    this.initGodRays();
    this.setupEvents();
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
    this.renderer.toneMappingExposure = 1.2;
    this.renderer.setPixelRatio(this.isSoftwareGl ? 1 : Math.min(window.devicePixelRatio, 2));
    this.renderer.shadowMap.enabled = !this.isSoftwareGl;
    this.renderer.shadowMap.type = THREE.PCFSoftShadowMap;

    this.container.appendChild(this.renderer.domElement);
  }

  private initScene(initialTheme: AquariumThemeId) {
    this.scene = new THREE.Scene();
    const theme = AQUARIUM_THEMES[initialTheme] || AQUARIUM_THEMES.tokyo_neon_96;
    
    this.scene.background = new THREE.Color(theme.waterColor);
    this.scene.fog = new THREE.FogExp2(theme.fogColor, 0.11);

    const aspect = (this.container.clientWidth || window.innerWidth) / (this.container.clientHeight || window.innerHeight);
    this.camera = new THREE.PerspectiveCamera(46, aspect, 0.1, 50);
    this.camera.position.copy(this.cameraBasePos);

    const pmremGenerator = new THREE.PMREMGenerator(this.renderer);
    this.scene.environment = pmremGenerator.fromScene(new RoomEnvironment(), 0.04).texture;
    pmremGenerator.dispose();

    this.hemiLight = new THREE.HemisphereLight(0xbbe7fe, 0x0f172a, 1.3);
    this.scene.add(this.hemiLight);

    this.keyLight = new THREE.DirectionalLight(0xfffaed, 2.5);
    this.keyLight.position.set(2.4, 4.8, 3.2);
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

    this.waterTopLight = new THREE.SpotLight(0x7dd3fc, 2.2, 10, Math.PI / 3, 0.5, 1.5);
    this.waterTopLight.position.set(0, 3.5, 0.5);
    this.scene.add(this.waterTopLight);

    this.rimLight = new THREE.PointLight(0x38bdf8, 1.5, 8);
    this.rimLight.position.set(-1.8, 1.0, -1.8);
    this.scene.add(this.rimLight);

    this.scene.add(this.decorGroup);
    this.scene.add(this.tapRipplesGroup);
    this.scene.add(this.godRaysGroup);
  }

  private initFish(skinId: FishColorPalette) {
    this.fish = new BettaFish(skinId);
    this.fish.group.position.set(0, 0.2, 0);
    this.fish.currentPosition.set(0, 0.2, 0);
    this.fish.targetPosition.set(0, 0.2, 0);
    this.scene.add(this.fish.group);
  }

  // Dynamic Animated Caustics
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
      opacity: 0.38,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
    });

    this.causticPlane = new THREE.Mesh(causticGeom, causticMat);
    this.causticPlane.position.y = this.tankBounds.minY + 0.08;
    this.scene.add(this.causticPlane);
  }

  private updateCaustics(time: number) {
    const ctx = this.causticCtx;
    ctx.fillStyle = '#000000';
    ctx.fillRect(0, 0, 256, 256);

    ctx.strokeStyle = 'rgba(190, 240, 255, 0.5)';
    ctx.lineWidth = 3.5;

    const t = time * 1.8;
    for (let i = 0; i < 12; i++) {
      ctx.beginPath();
      for (let x = 0; x <= 256; x += 16) {
        const y = (i * 22) + Math.sin(x * 0.04 + t + i) * 14 + Math.cos(x * 0.02 - t * 0.7) * 8;
        if (x === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    for (let j = 0; j < 12; j++) {
      ctx.beginPath();
      for (let y = 0; y <= 256; y += 16) {
        const x = (j * 22) + Math.cos(y * 0.04 - t * 1.2 + j) * 14 + Math.sin(y * 0.02 + t * 0.5) * 8;
        if (y === 0) ctx.moveTo(x, y);
        else ctx.lineTo(x, y);
      }
      ctx.stroke();
    }

    this.causticTexture.needsUpdate = true;
  }

  // Realistic Aquarium World: Sand Bed, Sculpted Driftwood, River Boulders, Sunken Famicom Cartridge, Flora
  private initAquariumWorld(themeId: AquariumThemeId) {
    const theme = AQUARIUM_THEMES[themeId] || AQUARIUM_THEMES.tokyo_neon_96;

    // 1. Organic Sand Dunes
    const sandCanvas = document.createElement('canvas');
    sandCanvas.width = 512;
    sandCanvas.height = 512;
    const sCtx = sandCanvas.getContext('2d')!;
    sCtx.fillStyle = theme.sandColor;
    sCtx.fillRect(0, 0, 512, 512);

    for (let i = 0; i < 5000; i++) {
      const x = Math.random() * 512;
      const y = Math.random() * 512;
      const lum = Math.random() > 0.5 ? 255 : 0;
      sCtx.fillStyle = `rgba(${lum}, ${lum}, ${lum}, 0.12)`;
      sCtx.fillRect(x, y, 2, 2);
    }
    const sandTexture = new THREE.CanvasTexture(sandCanvas);
    sandTexture.colorSpace = THREE.SRGBColorSpace;
    sandTexture.wrapS = THREE.RepeatWrapping;
    sandTexture.wrapT = THREE.RepeatWrapping;
    sandTexture.repeat.set(4, 4);

    const sandGeom = new THREE.PlaneGeometry(8.5, 6.2, 32, 32);
    sandGeom.rotateX(-Math.PI / 2);
    const pos = sandGeom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i);
      const pz = pos.getZ(i);
      const wave = Math.sin(px * 1.8 + 0.4) * Math.cos(pz * 1.4) * 0.14 + Math.sin(px * 3.5) * 0.04;
      pos.setY(i, wave);
    }
    sandGeom.computeVertexNormals();

    this.sandMaterial = new THREE.MeshStandardMaterial({
      map: sandTexture,
      roughness: 0.88,
      metalness: 0.05,
    });
    this.sandMesh = new THREE.Mesh(sandGeom, this.sandMaterial);
    this.sandMesh.position.y = this.tankBounds.minY;
    this.sandMesh.receiveShadow = true;
    this.scene.add(this.sandMesh);

    // 2. Sculpted Natural Driftwood (Gnarled root system)
    this.buildAquaticDriftwood();

    // 3. Smooth Tumbled River Boulders
    this.buildRiverStones();

    // 4. Sunken Vintage 1990s 60-Pin Famicom/Dendy Cartridge on seabed
    this.buildSunkenCartridge();

    // 5. Swaying Aquatic Flora (Vallisneria, Anubias, Marimo)
    this.buildAquaticFlora();

    // 6. Water Surface
    const surfGeom = new THREE.PlaneGeometry(8.5, 6, 24, 24);
    surfGeom.rotateX(Math.PI / 2);
    const surfMat = new THREE.MeshPhysicalMaterial({
      color: 0x38bdf8,
      transmission: 0.85,
      roughness: 0.1,
      metalness: 0.1,
      transparent: true,
      opacity: 0.4,
      ior: 1.33,
    });
    this.waterSurfaceMesh = new THREE.Mesh(surfGeom, surfMat);
    this.waterSurfaceMesh.position.y = this.tankBounds.maxY;
    this.scene.add(this.waterSurfaceMesh);

    // 7. Theme-specific 3D Sculptures
    this.buildThemeDecorations(themeId);
  }

  // Sculpted Natural Driftwood Root
  private buildAquaticDriftwood() {
    const woodMat = new THREE.MeshStandardMaterial({
      color: 0x3b2416,
      roughness: 0.85,
      metalness: 0.08,
    });

    const rootCurve1 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.8, this.tankBounds.minY + 0.1, -0.6),
      new THREE.Vector3(-1.2, this.tankBounds.minY + 0.65, -0.4),
      new THREE.Vector3(-0.5, this.tankBounds.minY + 0.4, -0.7),
      new THREE.Vector3(0.1, this.tankBounds.minY + 0.15, -0.8),
    ]);
    const woodMesh1 = new THREE.Mesh(new THREE.TubeGeometry(rootCurve1, 24, 0.14, 8, false), woodMat);
    woodMesh1.castShadow = true;
    woodMesh1.receiveShadow = true;
    this.scene.add(woodMesh1);

    const rootCurve2 = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-1.2, this.tankBounds.minY + 0.65, -0.4),
      new THREE.Vector3(-1.0, this.tankBounds.minY + 1.1, -0.2),
      new THREE.Vector3(-0.7, this.tankBounds.minY + 1.45, -0.3),
    ]);
    const woodMesh2 = new THREE.Mesh(new THREE.TubeGeometry(rootCurve2, 16, 0.08, 8, false), woodMat);
    woodMesh2.castShadow = true;
    this.scene.add(woodMesh2);
  }

  // Tumbled River Boulders
  private buildRiverStones() {
    const stoneMats = [
      new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.7, metalness: 0.15 }),
      new THREE.MeshStandardMaterial({ color: 0x334155, roughness: 0.8, metalness: 0.1 }),
      new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.6, metalness: 0.2 }),
    ];

    const stoneConfigs = [
      { x: -1.7, z: -0.2, s: 0.35, rot: 0.4, mat: 0 },
      { x: -1.4, z: 0.25, s: 0.25, rot: 1.1, mat: 1 },
      { x: -0.8, z: -0.9, s: 0.42, rot: 0.7, mat: 2 },
      { x: 0.8, z: -0.5, s: 0.3, rot: 2.1, mat: 0 },
      { x: 1.2, z: -0.8, s: 0.45, rot: 0.5, mat: 1 },
      { x: 1.6, z: -0.3, s: 0.22, rot: 1.5, mat: 2 },
    ];

    stoneConfigs.forEach((sc) => {
      const stoneGeom = new THREE.DodecahedronGeometry(sc.s, 2);
      stoneGeom.scale(1.2, 0.75, 1.0);
      const stone = new THREE.Mesh(stoneGeom, stoneMats[sc.mat]);
      stone.position.set(sc.x, this.tankBounds.minY + sc.s * 0.65, sc.z);
      stone.rotation.y = sc.rot;
      stone.castShadow = true;
      stone.receiveShadow = true;
      this.scene.add(stone);
    });
  }

  // Sunken Vintage 60-Pin Famicom/Dendy Cartridge (Iconic 90s easter egg on seabed)
  private buildSunkenCartridge() {
    const cartGroup = new THREE.Group();
    const cartMat = new THREE.MeshStandardMaterial({
      color: 0xdc2626, // Classic Red Famicom cartridge plastic
      roughness: 0.35,
      metalness: 0.1,
    });
    const labelMat = new THREE.MeshStandardMaterial({
      color: 0xfef08a,
      roughness: 0.5,
    });
    const pinMat = new THREE.MeshStandardMaterial({
      color: 0xd97706,
      metalness: 0.9,
      roughness: 0.2,
    });

    // Cartridge body
    const bodyGeom = new THREE.BoxGeometry(0.75, 0.14, 0.55);
    const cartBody = new THREE.Mesh(bodyGeom, cartMat);
    cartBody.castShadow = true;
    cartGroup.add(cartBody);

    // Front label recess
    const label = new THREE.Mesh(new THREE.BoxGeometry(0.55, 0.02, 0.38), labelMat);
    label.position.set(0, 0.075, 0.02);
    cartGroup.add(label);

    // Bottom connector pins
    const pins = new THREE.Mesh(new THREE.BoxGeometry(0.68, 0.04, 0.08), pinMat);
    pins.position.set(0, -0.06, -0.24);
    cartGroup.add(pins);

    // Position partially buried in sand bed
    cartGroup.position.set(-1.0, this.tankBounds.minY + 0.12, 0.6);
    cartGroup.rotation.set(0.18, 0.45, -0.15);
    this.scene.add(cartGroup);
  }

  // Multi-layered Aquatic Flora
  private buildAquaticFlora() {
    // 1. Vallisneria spiralis
    const ribbonMat = new THREE.MeshStandardMaterial({
      color: 0x15803d,
      roughness: 0.35,
      metalness: 0.08,
      side: THREE.DoubleSide,
    });

    const plantClusters = [
      { x: -2.6, z: -1.1, height: 2.7, leaves: 8 },
      { x: -2.2, z: -0.5, height: 2.0, leaves: 6 },
      { x: 2.4, z: -1.0, height: 2.5, leaves: 7 },
      { x: 2.0, z: -0.4, height: 1.8, leaves: 5 },
      { x: 1.7, z: -1.4, height: 2.8, leaves: 8 },
    ];

    plantClusters.forEach((cluster) => {
      for (let l = 0; l < cluster.leaves; l++) {
        const leafH = cluster.height * (0.75 + Math.random() * 0.35);
        const leafGeom = new THREE.PlaneGeometry(0.12, leafH, 4, 18);
        const lPos = leafGeom.attributes.position;

        for (let i = 0; i < lPos.count; i++) {
          const y = lPos.getY(i);
          const ratio = (y + leafH / 2) / leafH;
          lPos.setZ(i, Math.sin(ratio * Math.PI) * 0.18);
          lPos.setX(i, lPos.getX(i) + Math.sin(ratio * Math.PI * 1.5) * 0.05);
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

    // 2. Anubias Leaves sprouting on driftwood
    const anubiasMat = new THREE.MeshStandardMaterial({
      color: 0x166534,
      roughness: 0.3,
      metalness: 0.12,
      side: THREE.DoubleSide,
    });
    for (let i = 0; i < 6; i++) {
      const aShape = new THREE.Shape();
      aShape.moveTo(0, 0);
      aShape.bezierCurveTo(0.12, 0.15, 0.18, 0.35, 0.0, 0.48);
      aShape.bezierCurveTo(-0.18, 0.35, -0.12, 0.15, 0, 0);

      const aGeom = new THREE.ShapeGeometry(aShape, 8);
      const aLeaf = new THREE.Mesh(aGeom, anubiasMat);
      aLeaf.position.set(-1.1 + (i % 3) * 0.18, this.tankBounds.minY + 0.65 + i * 0.08, -0.35);
      aLeaf.rotation.set(-0.6, i * 0.8, 0.3);
      aLeaf.castShadow = true;
      this.scene.add(aLeaf);
    }

    // 3. Velvety Marimo Moss Ball
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

    const mossGeom = new THREE.DodecahedronGeometry(0.38, 3);
    const mossMat = new THREE.MeshStandardMaterial({
      map: mossTexture,
      roughness: 0.96,
      metalness: 0.02,
    });
    const mossBall = new THREE.Mesh(mossGeom, mossMat);
    mossBall.position.set(-0.25, this.tankBounds.minY + 0.35, 0.3);
    mossBall.castShadow = true;
    this.scene.add(mossBall);
  }

  // Volumetric God Rays
  private initGodRays() {
    const rayGeom = new THREE.ConeGeometry(0.85, 4.2, 16, 1, true);
    rayGeom.translate(0, -2.1, 0);

    const rayMat = new THREE.MeshBasicMaterial({
      color: 0x93c5fd,
      transparent: true,
      opacity: 0.065,
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

  // Floating Plankton
  private initPlankton() {
    const pGeom = new THREE.SphereGeometry(0.016, 6, 6);
    const pMat = new THREE.MeshBasicMaterial({
      color: 0xe0f2fe,
      transparent: true,
      opacity: 0.45,
    });

    this.planktonParticles = new THREE.InstancedMesh(pGeom, pMat, this.planktonCount);
    this.planktonParticles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const dummy = new THREE.Object3D();
    for (let i = 0; i < this.planktonCount; i++) {
      const p = {
        x: THREE.MathUtils.randFloat(this.tankBounds.minX, this.tankBounds.maxX),
        y: THREE.MathUtils.randFloat(this.tankBounds.minY, this.tankBounds.maxY),
        z: THREE.MathUtils.randFloat(this.tankBounds.minZ, this.tankBounds.maxZ),
        vx: THREE.MathUtils.randFloat(-0.04, 0.04),
        vy: THREE.MathUtils.randFloat(-0.02, 0.03),
        vz: THREE.MathUtils.randFloat(-0.04, 0.04),
        baseOpacity: 0.3 + Math.random() * 0.4,
      };
      this.planktonData.push(p);

      dummy.position.set(p.x, p.y, p.z);
      dummy.updateMatrix();
      this.planktonParticles.setMatrixAt(i, dummy.matrix);
    }
    this.planktonParticles.instanceMatrix.needsUpdate = true;
    this.scene.add(this.planktonParticles);
  }

  private updatePlankton(delta: number) {
    const dummy = new THREE.Object3D();
    for (let i = 0; i < this.planktonCount; i++) {
      const p = this.planktonData[i];
      p.x += p.vx * delta;
      p.y += p.vy * delta;
      p.z += p.vz * delta;

      if (p.x < this.tankBounds.minX) p.x = this.tankBounds.maxX;
      if (p.x > this.tankBounds.maxX) p.x = this.tankBounds.minX;
      if (p.y < this.tankBounds.minY) p.y = this.tankBounds.maxY;
      if (p.y > this.tankBounds.maxY) p.y = this.tankBounds.minY;

      dummy.position.set(p.x, p.y, p.z);
      dummy.updateMatrix();
      this.planktonParticles.setMatrixAt(i, dummy.matrix);
    }
    this.planktonParticles.instanceMatrix.needsUpdate = true;
  }

  // Theme-specific 3D Sculptures: Authentic Japanese Kasuga Tōrō, Shinto Torii, Sunken Treasure Chest
  public buildThemeDecorations(themeId: AquariumThemeId) {
    while (this.decorGroup.children.length > 0) {
      this.decorGroup.remove(this.decorGroup.children[0]);
    }

    if (themeId === 'zen_garden') {
      // 1. Shinto Torii Gate with stone pedestals and Gakuzuka plaque
      const toriiMat = new THREE.MeshStandardMaterial({ color: 0xd92626, roughness: 0.3, metalness: 0.15 });
      const stoneMat = new THREE.MeshStandardMaterial({ color: 0x475569, roughness: 0.75, metalness: 0.1 });
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xf59e0b, roughness: 0.2, metalness: 0.85 });

      const toriiGroup = new THREE.Group();

      // Stone pedestal bases (Kamebara)
      const baseGeom = new THREE.CylinderGeometry(0.14, 0.17, 0.16, 12);
      const leftBase = new THREE.Mesh(baseGeom, stoneMat);
      leftBase.position.set(-0.6, 0.08, 0);
      const rightBase = new THREE.Mesh(baseGeom, stoneMat);
      rightBase.position.set(0.6, 0.08, 0);

      // Cylindrical pillars (Hashira) with slight inward tilt
      const pillarGeom = new THREE.CylinderGeometry(0.08, 0.095, 1.65, 16);
      const leftPillar = new THREE.Mesh(pillarGeom, toriiMat);
      leftPillar.position.set(-0.6, 0.9, 0);
      leftPillar.rotation.z = -0.04;

      const rightPillar = new THREE.Mesh(pillarGeom, toriiMat);
      rightPillar.position.set(0.6, 0.9, 0);
      rightPillar.rotation.z = 0.04;

      // Curved Kasagi top lintel with beveled ends
      const topBeam = new THREE.Mesh(new THREE.BoxGeometry(1.75, 0.12, 0.16), toriiMat);
      topBeam.position.set(0, 1.72, 0);

      const goldTips = new THREE.Mesh(new THREE.BoxGeometry(1.85, 0.06, 0.18), goldMat);
      goldTips.position.set(0, 1.79, 0);

      // Nuki tie-beam
      const subBeam = new THREE.Mesh(new THREE.BoxGeometry(1.4, 0.09, 0.12), toriiMat);
      subBeam.position.set(0, 1.38, 0);

      // Gakuzuka plaque
      const plaque = new THREE.Mesh(new THREE.BoxGeometry(0.18, 0.24, 0.06), goldMat);
      plaque.position.set(0, 1.55, 0);

      toriiGroup.add(leftBase, rightBase, leftPillar, rightPillar, topBeam, goldTips, subBeam, plaque);
      toriiGroup.position.set(0.35, this.tankBounds.minY, -1.0);
      toriiGroup.rotation.y = -0.22;
      this.decorGroup.add(toriiGroup);

    } else if (themeId === 'sakura_shrine') {
      // 2. Authentic Japanese Stone Lantern (Kasuga Tōrō - 春日灯籠)
      const toroGroup = new THREE.Group();
      const stoneMat = new THREE.MeshStandardMaterial({ color: 0x64748b, roughness: 0.85, metalness: 0.1 });
      const lanternGlowMat = new THREE.MeshStandardMaterial({
        color: 0xfef08a,
        emissive: 0xf59e0b,
        emissiveIntensity: 1.2,
      });

      // Stepped hexagonal base (Kiso)
      const kiso = new THREE.Mesh(new THREE.CylinderGeometry(0.38, 0.44, 0.18, 6), stoneMat);
      kiso.position.set(0, 0.09, 0);

      // Column shaft (Sao)
      const sao = new THREE.Mesh(new THREE.CylinderGeometry(0.14, 0.16, 0.75, 12), stoneMat);
      sao.position.set(0, 0.55, 0);

      // Middle lotus capital (Chūdai)
      const chudai = new THREE.Mesh(new THREE.CylinderGeometry(0.42, 0.28, 0.16, 6), stoneMat);
      chudai.position.set(0, 1.0, 0);

      // Hexagonal light box (Hibukuro) with inner firefly light
      const hibukuro = new THREE.Mesh(new THREE.CylinderGeometry(0.3, 0.3, 0.35, 6), lanternGlowMat);
      hibukuro.position.set(0, 1.25, 0);

      // Sweeping hexagonal pagoda roof (Kasa)
      const kasa = new THREE.Mesh(new THREE.ConeGeometry(0.58, 0.32, 6), stoneMat);
      kasa.position.set(0, 1.58, 0);

      // Sacred lotus finial jewel (Hōju)
      const hoju = new THREE.Mesh(new THREE.SphereGeometry(0.11, 12, 12), stoneMat);
      hoju.position.set(0, 1.82, 0);

      toroGroup.add(kiso, sao, chudai, hibukuro, kasa, hoju);
      toroGroup.position.set(0.4, this.tankBounds.minY, -0.9);
      toroGroup.rotation.y = 0.35;
      this.decorGroup.add(toroGroup);

    } else if (themeId === 'golden_palace') {
      // 3. Sunken Treasure Chest with Iron Straps, Rivets & Piled Jewels
      const chestGroup = new THREE.Group();
      const woodMat = new THREE.MeshStandardMaterial({ color: 0x3d2314, roughness: 0.8 });
      const goldMat = new THREE.MeshStandardMaterial({ color: 0xffd700, roughness: 0.16, metalness: 0.95 });
      const ironMat = new THREE.MeshStandardMaterial({ color: 0x1f2937, roughness: 0.5, metalness: 0.85 });

      // Wooden chest body
      const base = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.55, 0.65), woodMat);
      base.position.set(0, 0.28, 0);

      // Barrel lid
      const lid = new THREE.Mesh(new THREE.CylinderGeometry(0.32, 0.32, 1.0, 14, 1, false, 0, Math.PI), woodMat);
      lid.rotation.z = Math.PI / 2;
      lid.position.set(0, 0.55, 0);

      // Iron reinforcing bands
      const band1 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.56, 0.67), ironMat);
      band1.position.set(-0.35, 0.28, 0);
      const band2 = new THREE.Mesh(new THREE.BoxGeometry(0.08, 0.56, 0.67), ironMat);
      band2.position.set(0.35, 0.28, 0);

      // Brass keyhole escutcheon
      const lock = new THREE.Mesh(new THREE.BoxGeometry(0.12, 0.16, 0.05), goldMat);
      lock.position.set(0, 0.38, 0.34);

      // Piled treasure
      const treasure = new THREE.Mesh(new THREE.DodecahedronGeometry(0.28, 2), goldMat);
      treasure.position.set(0.35, 0.2, 0.35);

      chestGroup.add(base, lid, band1, band2, lock, treasure);
      chestGroup.position.set(0.4, this.tankBounds.minY, -0.85);
      chestGroup.rotation.y = 0.35;
      this.decorGroup.add(chestGroup);

    } else if (themeId === 'dendy_castle') {
      // 4. 8-Bit Famicom Castle with crenellations
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
        bat.position.set((i % 2 === 0 ? -0.38 : 0.38), 1.55, (i < 2 ? -0.38 : 0.38));
        tower.add(bat);
      }

      const castle = new THREE.Group();
      castle.add(tower, roof);
      castle.position.set(0.5, this.tankBounds.minY, -0.9);
      this.decorGroup.add(castle);

    } else if (themeId === 'tokyo_neon_96') {
      // 5. Tokyo 90s Cyberpunk Neon Pillars
      const neonMatCyan = new THREE.MeshStandardMaterial({ color: 0x06b6d4, emissive: 0x0891b2, roughness: 0.2 });
      const neonMatMagenta = new THREE.MeshStandardMaterial({ color: 0xd946ef, emissive: 0xc026d3, roughness: 0.2 });

      const col1 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.8, 8), neonMatCyan);
      col1.position.set(-0.8, this.tankBounds.minY + 0.9, -1.2);
      const col2 = new THREE.Mesh(new THREE.CylinderGeometry(0.1, 0.1, 1.8, 8), neonMatMagenta);
      col2.position.set(0.8, this.tankBounds.minY + 0.9, -1.2);

      this.decorGroup.add(col1, col2);
    }
  }

  // Air bubbles
  private initBubbles() {
    const bubbleGeom = new THREE.SphereGeometry(0.045, 8, 8);
    const bubbleMat = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.9,
      roughness: 0.05,
      transparent: true,
      opacity: 0.75,
      depthWrite: false,
    });

    this.bubbleParticles = new THREE.InstancedMesh(bubbleGeom, bubbleMat, this.bubbleCount);
    this.bubbleParticles.instanceMatrix.setUsage(THREE.DynamicDrawUsage);

    const dummy = new THREE.Object3D();
    for (let i = 0; i < this.bubbleCount; i++) {
      const data = {
        x: -2.3 + (Math.random() - 0.5) * 0.8,
        y: this.tankBounds.minY + Math.random() * (this.tankBounds.maxY - this.tankBounds.minY),
        z: -1.0 + (Math.random() - 0.5) * 0.8,
        speed: 0.8 + Math.random() * 0.8,
        wobbleSpeed: 2.0 + Math.random() * 3.0,
        size: 0.4 + Math.random() * 0.8,
      };
      this.bubbleData.push(data);

      dummy.position.set(data.x, data.y, data.z);
      dummy.scale.setScalar(data.size);
      dummy.updateMatrix();
      this.bubbleParticles.setMatrixAt(i, dummy.matrix);
    }
    this.bubbleParticles.instanceMatrix.needsUpdate = true;
    this.scene.add(this.bubbleParticles);
  }

  private updateBubbles(delta: number, time: number) {
    const dummy = new THREE.Object3D();
    for (let i = 0; i < this.bubbleCount; i++) {
      const b = this.bubbleData[i];
      b.y += b.speed * delta;
      
      const currentX = b.x + Math.sin(time * b.wobbleSpeed + i) * 0.06;
      const currentZ = b.z + Math.cos(time * b.wobbleSpeed + i) * 0.06;

      if (b.y > this.tankBounds.maxY) {
        b.y = this.tankBounds.minY + 0.1;
        b.x = -2.3 + (Math.random() - 0.5) * 0.8;
      }

      dummy.position.set(currentX, b.y, currentZ);
      dummy.scale.setScalar(b.size);
      dummy.updateMatrix();
      this.bubbleParticles.setMatrixAt(i, dummy.matrix);
    }
    this.bubbleParticles.instanceMatrix.needsUpdate = true;
  }

  public dropFood(type: string, nutrition: number, count = 3) {
    retroAudio.playChomp();

    for (let i = 0; i < count; i++) {
      const pelletGeom = new THREE.SphereGeometry(type === 'golden_flake' ? 0.055 : 0.04, 6, 6);
      const color = type === 'golden_flake' ? 0xfacc15 : (type === 'bloodworm' ? 0xef4444 : 0xf97316);
      const pelletMat = new THREE.MeshStandardMaterial({
        color,
        roughness: 0.3,
        emissive: type === 'golden_flake' ? 0xca8a04 : 0x000000,
      });

      const mesh = new THREE.Mesh(pelletGeom, pelletMat);
      mesh.position.set(
        (Math.random() - 0.5) * 2.2,
        this.tankBounds.maxY - 0.1,
        (Math.random() - 0.5) * 1.5
      );
      this.scene.add(mesh);

      this.foodPellets.push({
        mesh,
        velocity: new THREE.Vector3(
          (Math.random() - 0.5) * 0.2,
          -(0.25 + Math.random() * 0.3),
          (Math.random() - 0.5) * 0.2
        ),
        type,
        nutrition,
      });
    }

    if (this.foodPellets.length > 0) {
      const nearest = this.foodPellets[0];
      this.fish.swimTo(nearest.mesh.position, true);
    }
  }

  private updateFood(delta: number) {
    const fishMouthPos = new THREE.Vector3().copy(this.fish.currentPosition);
    fishMouthPos.x += Math.cos(this.fish.group.rotation.y) * 0.6;
    fishMouthPos.z -= Math.sin(this.fish.group.rotation.y) * 0.6;

    for (let i = this.foodPellets.length - 1; i >= 0; i--) {
      const p = this.foodPellets[i];
      p.mesh.position.addScaledVector(p.velocity, delta);

      const distToFish = p.mesh.position.distanceTo(fishMouthPos);
      if (distToFish < 0.48) {
        retroAudio.playChomp();
        this.createTapRipple(p.mesh.position, 0.28);
        this.scene.remove(p.mesh);
        p.mesh.geometry.dispose();
        (p.mesh.material as THREE.Material).dispose();
        this.foodPellets.splice(i, 1);

        if (this.onFishFed) {
          this.onFishFed(p.nutrition);
        }
        continue;
      }

      if (p.mesh.position.y <= this.tankBounds.minY + 0.05) {
        p.velocity.set(0, 0, 0);
        setTimeout(() => {
          const idx = this.foodPellets.indexOf(p);
          if (idx !== -1) {
            this.scene.remove(p.mesh);
            p.mesh.geometry.dispose();
            (p.mesh.material as THREE.Material).dispose();
            this.foodPellets.splice(idx, 1);
          }
        }, 4000);
      }
    }
  }

  public createTapRipple(pos: THREE.Vector3, scale = 0.5) {
    const ringGeom = new THREE.RingGeometry(0.05, 0.12, 24);
    const ringMat = new THREE.MeshBasicMaterial({
      color: 0xbae6fd,
      transparent: true,
      opacity: 0.8,
      side: THREE.DoubleSide,
    });
    const ring = new THREE.Mesh(ringGeom, ringMat);
    ring.position.copy(pos);
    ring.lookAt(this.camera.position);
    this.tapRipplesGroup.add(ring);

    let progress = 0;
    const expand = () => {
      progress += 0.05;
      ring.scale.setScalar(1.0 + progress * 3.5 * scale);
      ringMat.opacity = Math.max(0, 0.8 - progress);
      if (progress < 1.0) {
        requestAnimationFrame(expand);
      } else {
        this.tapRipplesGroup.remove(ring);
        ringGeom.dispose();
        ringMat.dispose();
      }
    };
    requestAnimationFrame(expand);
  }

  private setupEvents() {
    const handlePointerDown = (e: MouseEvent | TouchEvent) => {
      let clientX = 0;
      let clientY = 0;
      if (e instanceof MouseEvent) {
        clientX = e.clientX;
        clientY = e.clientY;
      } else if (e.touches && e.touches.length > 0) {
        clientX = e.touches[0].clientX;
        clientY = e.touches[0].clientY;
      }

      const rect = this.container.getBoundingClientRect();
      this.mouse.x = ((clientX - rect.left) / rect.width) * 2 - 1;
      this.mouse.y = -((clientY - rect.top) / rect.height) * 2 + 1;

      this.raycaster.setFromCamera(this.mouse, this.camera);
      
      const planeZ = new THREE.Plane(new THREE.Vector3(0, 0, 1), 0);
      const hitPoint = new THREE.Vector3();
      this.raycaster.ray.intersectPlane(planeZ, hitPoint);

      if (hitPoint) {
        retroAudio.playKnock();
        this.createTapRipple(hitPoint);
        this.fish.swimTo(hitPoint, false);
        if (this.onFishTapped) {
          this.onFishTapped();
        }
      }
    };

    this.container.addEventListener('mousedown', handlePointerDown);
    this.container.addEventListener('touchstart', handlePointerDown, { passive: true });

    const handleResize = () => {
      if (!this.container || this.isDisposed) return;
      const w = this.container.clientWidth || window.innerWidth;
      const h = this.container.clientHeight || window.innerHeight;
      this.camera.aspect = w / h;
      this.camera.updateProjectionMatrix();
      this.renderer.setSize(w, h);
    };
    window.addEventListener('resize', handleResize);
  }

  public setTheme(themeId: AquariumThemeId) {
    const theme = AQUARIUM_THEMES[themeId] || AQUARIUM_THEMES.tokyo_neon_96;
    this.scene.background = new THREE.Color(theme.waterColor);
    if (this.scene.fog instanceof THREE.FogExp2) {
      this.scene.fog.color = new THREE.Color(theme.fogColor);
    }
    this.buildThemeDecorations(themeId);
  }

  private startLoop() {
    const tick = () => {
      if (this.isDisposed) return;

      const rawDt = this.clock.getDelta();
      const delta = Math.min(rawDt, 0.05);
      const time = this.clock.getElapsedTime();

      // 1. Update Fish
      this.fish.update(delta, this.tankBounds);

      // 2. Update Dynamic Caustic Lights
      this.updateCaustics(time);

      // 3. Update Plankton & Air Bubbles
      this.updateBubbles(delta, time);
      this.updatePlankton(delta);

      // 4. Update Food
      this.updateFood(delta);

      // 5. Sway Aquatic Flora in Water Currents
      for (let p = 0; p < this.plantMeshes.length; p++) {
        const mesh = this.plantMeshes[p];
        const pos = mesh.geometry.attributes.position;
        const orig = this.plantOriginalVertices[p];
        for (let i = 0; i < pos.count; i++) {
          const idx = i * 3;
          const oy = orig[idx + 1];
          const heightRatio = Math.max(0, oy / 2.2);
          const sway = Math.sin(time * 2.2 + p * 0.7) * 0.14 * heightRatio;
          pos.setX(i, orig[idx] + sway);
        }
        pos.needsUpdate = true;
      }

      // 6. Camera Damping
      this.camera.position.x = THREE.MathUtils.damp(this.camera.position.x, this.currentCameraPos.x, 2.0, delta);
      this.camera.position.y = THREE.MathUtils.damp(this.camera.position.y, this.currentCameraPos.y, 2.0, delta);
      this.camera.position.z = THREE.MathUtils.damp(this.camera.position.z, this.currentCameraPos.z, 2.0, delta);
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
    this.fish.dispose();
    this.causticTexture.dispose();
    this.renderer.dispose();
    if (this.renderer.domElement.parentElement) {
      this.renderer.domElement.parentElement.removeChild(this.renderer.domElement);
    }
  }
}
