/**
 * @license
 * SPDX-License-Identifier: Apache-2.0
 */

import * as THREE from 'three';
import { FISH_SKINS } from '../services/storage';
import { FishColorPalette } from '../types';

export class BettaFish {
  public group: THREE.Group;
  
  // Model parts
  private fishRoot: THREE.Group;
  private bodyMesh!: THREE.Mesh;
  private headCapMesh!: THREE.Mesh;
  private leftEye!: THREE.Group;
  private rightEye!: THREE.Group;
  private leftEyeball!: THREE.Mesh;
  private rightEyeball!: THREE.Mesh;
  private leftOperculum!: THREE.Mesh;
  private rightOperculum!: THREE.Mesh;
  private branchioMembrane!: THREE.Mesh; // Red gill flare membrane
  
  // High-fidelity Fins with physical ray ridges
  private caudalFinMesh!: THREE.Mesh;
  private caudalFinGeom!: THREE.BufferGeometry;
  private dorsalFinMesh!: THREE.Mesh;
  private dorsalFinGeom!: THREE.BufferGeometry;
  private analFinMesh!: THREE.Mesh;
  private analFinGeom!: THREE.BufferGeometry;
  
  // Pelvic whiskers (8-segment physics chain)
  private leftPelvicSegments: THREE.Mesh[] = [];
  private rightPelvicSegments: THREE.Mesh[] = [];
  private pelvicGroup: THREE.Group = new THREE.Group();

  // Pectoral fins with ray ridges
  private leftPectoralFin!: THREE.Mesh;
  private rightPectoralFin!: THREE.Mesh;

  // VIP Crown
  private vipCrownGroup: THREE.Group;

  // Materials & Textures
  private bodyMaterial!: THREE.MeshPhysicalMaterial;
  private finMaterial!: THREE.MeshPhysicalMaterial;
  private eyeMaterial!: THREE.MeshStandardMaterial;
  private corneaMaterial!: THREE.MeshPhysicalMaterial;
  private pupilMaterial!: THREE.MeshStandardMaterial;
  private gillMembraneMaterial!: THREE.MeshStandardMaterial;
  private goldMaterial!: THREE.MeshStandardMaterial;
  
  private scaleTexture!: THREE.CanvasTexture;
  private scaleNormalTexture!: THREE.CanvasTexture;
  private finTexture!: THREE.CanvasTexture;

  // Original fin vertex arrays for fluid wave deformation
  private caudalOriginalPositions!: Float32Array;
  private dorsalOriginalPositions!: Float32Array;
  private analOriginalPositions!: Float32Array;

  // Kinematics & Behaviors
  public targetPosition: THREE.Vector3 = new THREE.Vector3(0, 0.2, 0);
  public currentPosition: THREE.Vector3 = new THREE.Vector3(0, 0.2, 0);
  public velocity: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private swimSpeed: number = 0.85;
  private wanderTimer: number = 0;
  private animTime: number = 0;
  private headingAngle: number = 0;
  private pitchAngle: number = 0;
  private rollAngle: number = 0;

  // Emotional states
  public isFlaring: boolean = false;
  public flareIntensity: number = 0;
  public isExcited: boolean = false;
  public isSleeping: boolean = false;
  public currentSkinId: FishColorPalette = 'royal_blue';

  constructor(skinId: FishColorPalette = 'royal_blue') {
    this.group = new THREE.Group();
    this.fishRoot = new THREE.Group();
    this.vipCrownGroup = new THREE.Group();
    this.currentSkinId = skinId;

    this.initTextures();
    this.initMaterials();
    this.buildSculptedBody();
    this.buildHighPolyFins();
    this.buildEyes();
    this.buildGills();
    this.buildVipCrown();
    this.updateSkin(skinId);

    this.fishRoot.add(this.pelvicGroup);
    this.group.add(this.fishRoot);
    this.group.add(this.vipCrownGroup);
    this.vipCrownGroup.visible = false;
  }

  // Generate procedural organic micro-scales and fine fin-ray striations
  private initTextures() {
    // 1. Procedural Fish Scales Texture (Diamond/Cycloid with specular rim)
    const sCanvas = document.createElement('canvas');
    sCanvas.width = 512;
    sCanvas.height = 512;
    const sCtx = sCanvas.getContext('2d')!;
    sCtx.fillStyle = '#ffffff';
    sCtx.fillRect(0, 0, 512, 512);

    const rows = 36;
    const cols = 36;
    const cellW = 512 / cols;
    const cellH = 512 / rows;

    for (let r = 0; r < rows; r++) {
      for (let c = 0; c < cols; c++) {
        const x = (c + (r % 2 === 0 ? 0 : 0.5)) * cellW;
        const y = r * cellH;

        sCtx.save();
        sCtx.beginPath();
        sCtx.arc(x, y, cellW * 0.8, Math.PI * 0.1, Math.PI * 0.9, false);
        sCtx.strokeStyle = 'rgba(0, 0, 0, 0.22)';
        sCtx.lineWidth = 1.8;
        sCtx.stroke();

        sCtx.beginPath();
        sCtx.arc(x, y - 1, cellW * 0.7, Math.PI * 0.2, Math.PI * 0.8, false);
        sCtx.strokeStyle = 'rgba(255, 255, 255, 0.55)';
        sCtx.lineWidth = 1.4;
        sCtx.stroke();
        sCtx.restore();
      }
    }

    this.scaleTexture = new THREE.CanvasTexture(sCanvas);
    this.scaleTexture.colorSpace = THREE.SRGBColorSpace;
    this.scaleTexture.wrapS = THREE.RepeatWrapping;
    this.scaleTexture.wrapT = THREE.RepeatWrapping;
    this.scaleTexture.repeat.set(3, 2);

    // 2. Normal Map for Scales
    const snCanvas = document.createElement('canvas');
    snCanvas.width = 256;
    snCanvas.height = 256;
    const snCtx = snCanvas.getContext('2d')!;
    snCtx.fillStyle = '#8080ff';
    snCtx.fillRect(0, 0, 256, 256);
    for (let i = 0; i < 256; i += 8) {
      for (let j = 0; j < 256; j += 8) {
        snCtx.fillStyle = 'rgba(130, 110, 255, 0.5)';
        snCtx.fillRect(i, j, 6, 6);
      }
    }
    this.scaleNormalTexture = new THREE.CanvasTexture(snCanvas);
    this.scaleNormalTexture.wrapS = THREE.RepeatWrapping;
    this.scaleNormalTexture.wrapT = THREE.RepeatWrapping;
    this.scaleNormalTexture.repeat.set(4, 3);

    // 3. Realistic Fin Rays & Webbing Texture
    const fCanvas = document.createElement('canvas');
    fCanvas.width = 1024;
    fCanvas.height = 1024;
    const fCtx = fCanvas.getContext('2d')!;

    const fGrad = fCtx.createRadialGradient(150, 512, 40, 512, 512, 520);
    fGrad.addColorStop(0, 'rgba(255, 255, 255, 0.98)');
    fGrad.addColorStop(0.35, 'rgba(245, 248, 255, 0.88)');
    fGrad.addColorStop(0.72, 'rgba(225, 240, 255, 0.65)');
    fGrad.addColorStop(0.92, 'rgba(200, 230, 255, 0.38)');
    fGrad.addColorStop(1, 'rgba(180, 220, 255, 0.05)');
    fCtx.fillStyle = fGrad;
    fCtx.fillRect(0, 0, 1024, 1024);

    const numPrimaryRays = 40;
    for (let i = 0; i < numPrimaryRays; i++) {
      const angle = -Math.PI * 0.46 + (i / numPrimaryRays) * (Math.PI * 0.92);
      const rootX = 150;
      const rootY = 512;
      
      const midDist = 290 + (i % 3) * 35;
      const midX = rootX + Math.cos(angle) * midDist;
      const midY = rootY + Math.sin(angle) * midDist;

      fCtx.strokeStyle = 'rgba(255, 255, 255, 0.7)';
      fCtx.lineWidth = 2.8;
      fCtx.beginPath();
      fCtx.moveTo(rootX, rootY);
      fCtx.lineTo(midX, midY);
      fCtx.stroke();

      const childAngle1 = angle - 0.038;
      const childAngle2 = angle + 0.038;
      const endDist = 800;

      fCtx.lineWidth = 1.5;
      fCtx.beginPath();
      fCtx.moveTo(midX, midY);
      fCtx.lineTo(rootX + Math.cos(childAngle1) * endDist, rootY + Math.sin(childAngle1) * endDist);
      fCtx.stroke();

      fCtx.beginPath();
      fCtx.moveTo(midX, midY);
      fCtx.lineTo(rootX + Math.cos(childAngle2) * endDist, rootY + Math.sin(childAngle2) * endDist);
      fCtx.stroke();
    }

    this.finTexture = new THREE.CanvasTexture(fCanvas);
    this.finTexture.colorSpace = THREE.SRGBColorSpace;
    this.finTexture.wrapS = THREE.ClampToEdgeWrapping;
    this.finTexture.wrapT = THREE.ClampToEdgeWrapping;
  }

  private initMaterials() {
    this.bodyMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x1d4ed8,
      roughness: 0.2,
      metalness: 0.58,
      clearcoat: 1.0,
      clearcoatRoughness: 0.1,
      sheen: 1.0,
      sheenColor: new THREE.Color(0xec4899),
      map: this.scaleTexture,
      normalMap: this.scaleNormalTexture,
      normalScale: new THREE.Vector2(0.28, 0.28),
    });

    this.finMaterial = new THREE.MeshPhysicalMaterial({
      color: 0x3b82f6,
      map: this.finTexture,
      alphaMap: this.finTexture,
      transparent: true,
      opacity: 0.93,
      roughness: 0.22,
      metalness: 0.28,
      side: THREE.DoubleSide,
      depthWrite: false,
      transmission: 0.45,
      ior: 1.34,
      clearcoat: 0.75,
    });

    this.eyeMaterial = new THREE.MeshStandardMaterial({
      color: 0x38bdf8,
      roughness: 0.15,
      metalness: 0.35,
    });

    this.corneaMaterial = new THREE.MeshPhysicalMaterial({
      color: 0xffffff,
      transmission: 0.98,
      roughness: 0.04,
      clearcoat: 1.0,
      transparent: true,
      opacity: 0.92,
      depthWrite: false,
    });

    this.pupilMaterial = new THREE.MeshStandardMaterial({
      color: 0x020204,
      roughness: 0.05,
      metalness: 0.1,
    });

    this.gillMembraneMaterial = new THREE.MeshStandardMaterial({
      color: 0x991b1b,
      roughness: 0.35,
      metalness: 0.1,
    });

    this.goldMaterial = new THREE.MeshStandardMaterial({
      color: 0xffd700,
      metalness: 0.96,
      roughness: 0.16,
    });
  }

  // Sculpted anatomical Betta Fish body with 36 high-resolution cross sections
  private buildSculptedBody() {
    const numRings = 36;
    const radialSegs = 24;

    const ringProfiles: { x: number; yOffset: number; radiusY: number; radiusZ: number; dorsalRidge: number }[] = [
      { x: 0.90, yOffset: 0.08, radiusY: 0.035, radiusZ: 0.032, dorsalRidge: 0.0 }, // Lips
      { x: 0.82, yOffset: 0.09, radiusY: 0.075, radiusZ: 0.055, dorsalRidge: 0.02 }, // Snout
      { x: 0.70, yOffset: 0.11, radiusY: 0.125, radiusZ: 0.085, dorsalRidge: 0.05 }, // Forehead
      { x: 0.52, yOffset: 0.125, radiusY: 0.175, radiusZ: 0.115, dorsalRidge: 0.08 }, // Cranium & Operculum
      { x: 0.32, yOffset: 0.11, radiusY: 0.22,  radiusZ: 0.13,  dorsalRidge: 0.10 }, // Chest / Pectoral root
      { x: 0.10, yOffset: 0.08, radiusY: 0.215, radiusZ: 0.125, dorsalRidge: 0.12 }, // Mid body
      { x: -0.15, yOffset: 0.05, radiusY: 0.19,  radiusZ: 0.10,  dorsalRidge: 0.11 }, // Ventral keel
      { x: -0.40, yOffset: 0.03, radiusY: 0.145, radiusZ: 0.07,  dorsalRidge: 0.08 }, // Posterior flank
      { x: -0.68, yOffset: 0.02, radiusY: 0.095, radiusZ: 0.045, dorsalRidge: 0.05 }, // Peduncle front
      { x: -0.95, yOffset: 0.01, radiusY: 0.055, radiusZ: 0.03,  dorsalRidge: 0.02 }, // Peduncle rear
      { x: -1.20, yOffset: 0.00, radiusY: 0.028, radiusZ: 0.018, dorsalRidge: 0.0 }, // Tail root
    ];

    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    const interpolatedRings: { x: number; yOffset: number; radiusY: number; radiusZ: number; dorsalRidge: number }[] = [];
    for (let r = 0; r < numRings; r++) {
      const t = r / (numRings - 1);
      const scaledIdx = t * (ringProfiles.length - 1);
      const idxA = Math.floor(scaledIdx);
      const idxB = Math.min(ringProfiles.length - 1, Math.ceil(scaledIdx));
      const frac = scaledIdx - idxA;

      const pA = ringProfiles[idxA];
      const pB = ringProfiles[idxB];

      interpolatedRings.push({
        x: THREE.MathUtils.lerp(pA.x, pB.x, frac),
        yOffset: THREE.MathUtils.lerp(pA.yOffset, pB.yOffset, frac),
        radiusY: THREE.MathUtils.lerp(pA.radiusY, pB.radiusY, frac),
        radiusZ: THREE.MathUtils.lerp(pA.radiusZ, pB.radiusZ, frac),
        dorsalRidge: THREE.MathUtils.lerp(pA.dorsalRidge, pB.dorsalRidge, frac),
      });
    }

    for (let r = 0; r < numRings; r++) {
      const ring = interpolatedRings[r];
      const u = r / (numRings - 1);

      for (let s = 0; s <= radialSegs; s++) {
        const theta = (s / radialSegs) * Math.PI * 2;
        const v = s / radialSegs;

        // Dorsal ridge elevation (sharper back profile)
        const isDorsal = Math.sin(theta) > 0;
        const dorsalFactor = isDorsal ? (1 + ring.dorsalRidge * Math.pow(Math.sin(theta), 2)) : 1;

        const y = ring.yOffset + Math.sin(theta) * ring.radiusY * dorsalFactor;
        const z = Math.cos(theta) * ring.radiusZ;
        const x = ring.x;

        positions.push(x, y, z);
        uvs.push(u * 3, v);
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

    const bodyGeom = new THREE.BufferGeometry();
    bodyGeom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    bodyGeom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    bodyGeom.setIndex(indices);
    bodyGeom.computeVertexNormals();

    this.bodyMesh = new THREE.Mesh(bodyGeom, this.bodyMaterial);
    this.bodyMesh.castShadow = true;
    this.bodyMesh.receiveShadow = true;
    this.fishRoot.add(this.bodyMesh);

    // Mouth snout tip
    const capGeom = new THREE.SphereGeometry(0.045, 14, 14);
    capGeom.scale(1.2, 0.9, 0.85);
    this.headCapMesh = new THREE.Mesh(capGeom, this.bodyMaterial);
    this.headCapMesh.position.set(0.90, 0.08, 0);
    this.fishRoot.add(this.headCapMesh);
  }

  // High-poly fins with physical 3D ray ridges
  private buildHighPolyFins() {
    // 1. Halfmoon Caudal Fin (Tail) with 3D physical ray ridges & scalloped edge
    this.caudalFinGeom = this.createPhysicalRayFan(1.9, 2.2, Math.PI * 1.06, 38, 28);
    this.caudalFinMesh = new THREE.Mesh(this.caudalFinGeom, this.finMaterial);
    this.caudalFinMesh.position.set(-1.20, 0.0, 0);
    this.caudalFinMesh.rotation.y = Math.PI;
    this.caudalFinMesh.castShadow = true;
    this.fishRoot.add(this.caudalFinMesh);
    this.caudalOriginalPositions = new Float32Array(this.caudalFinGeom.attributes.position.array);

    // 2. Crested Dorsal Fin with physical ray ridges
    this.dorsalFinGeom = this.createPhysicalSail(1.35, 0.88, 30, 18, true);
    this.dorsalFinMesh = new THREE.Mesh(this.dorsalFinGeom, this.finMaterial);
    this.dorsalFinMesh.position.set(-0.28, 0.22, 0);
    this.fishRoot.add(this.dorsalFinMesh);
    this.dorsalOriginalPositions = new Float32Array(this.dorsalFinGeom.attributes.position.array);

    // 3. Sweeping Anal Fin with physical ray ridges
    this.analFinGeom = this.createPhysicalSail(1.48, 0.98, 32, 18, false);
    this.analFinMesh = new THREE.Mesh(this.analFinGeom, this.finMaterial);
    this.analFinMesh.position.set(-0.16, -0.21, 0);
    this.fishRoot.add(this.analFinMesh);
    this.analOriginalPositions = new Float32Array(this.analFinGeom.attributes.position.array);

    // 4. Pelvic Whiskers (8-segment articulated physics chain)
    this.buildArticulatedPelvics();

    // 5. Pectoral Fins with ray ridges
    const pectoralGeom = this.createSculptedPectoral();
    this.leftPectoralFin = new THREE.Mesh(pectoralGeom, this.finMaterial);
    this.leftPectoralFin.position.set(0.36, -0.01, 0.13);
    this.leftPectoralFin.rotation.set(0.2, 0.45, -0.25);
    this.fishRoot.add(this.leftPectoralFin);

    this.rightPectoralFin = new THREE.Mesh(pectoralGeom, this.finMaterial);
    this.rightPectoralFin.position.set(0.36, -0.01, -0.13);
    this.rightPectoralFin.rotation.set(-0.2, -0.45, -0.25);
    this.rightPectoralFin.scale.set(1, 1, -1);
    this.fishRoot.add(this.rightPectoralFin);
  }

  // 8-segment articulated pelvic whiskers
  private buildArticulatedPelvics() {
    const numSegs = 8;
    const segLength = 0.17;

    for (let side = 0; side < 2; side++) {
      const isLeft = side === 0;
      const zSign = isLeft ? 1 : -1;
      const segArray = isLeft ? this.leftPelvicSegments : this.rightPelvicSegments;

      let parentObj: THREE.Object3D = this.pelvicGroup;
      for (let i = 0; i < numSegs; i++) {
        const radius = 0.024 * (1 - (i / numSegs) * 0.8);
        const geom = new THREE.CylinderGeometry(radius * 0.8, radius, segLength, 8);
        geom.translate(0, -segLength / 2, 0);

        const mesh = new THREE.Mesh(geom, this.finMaterial);
        if (i === 0) {
          mesh.position.set(0.18, -0.18, 0.055 * zSign);
          mesh.rotation.z = -0.18;
        } else {
          mesh.position.set(0, -segLength, 0);
        }

        parentObj.add(mesh);
        segArray.push(mesh);
        parentObj = mesh;
      }
    }
  }

  // Fan geometry with physical 3D ray ridges & edge scalloping
  private createPhysicalRayFan(width: number, length: number, arc: number, radialSegs: number, lengthSegs: number): THREE.BufferGeometry {
    const geom = new THREE.BufferGeometry();
    const positions: number[] = [];
    const uvs: number[] = [];
    const indices: number[] = [];

    positions.push(0, 0, 0);
    uvs.push(0.5, 0.5);

    for (let r = 1; r <= lengthSegs; r++) {
      const radiusRatio = r / lengthSegs;
      let currentRadius = Math.pow(radiusRatio, 0.95) * length;

      for (let s = 0; s <= radialSegs; s++) {
        const angle = -arc / 2 + (s / radialSegs) * arc;

        // Subtle rosetail edge fringing at tips
        if (radiusRatio > 0.82) {
          const edgeFringe = Math.sin(s * Math.PI * 4) * 0.035 * Math.pow((radiusRatio - 0.82) / 0.18, 2);
          currentRadius += edgeFringe;
        }

        const x = Math.cos(angle) * currentRadius * (width / length);
        const y = Math.sin(angle) * currentRadius;
        // Physical 3D ray ridge: crests and valleys
        const rayRidge = Math.cos(s * Math.PI * 2) * 0.016 * radiusRatio;
        const z = rayRidge;

        positions.push(x, y, z);
        uvs.push(
          0.5 + Math.cos(angle) * radiusRatio * 0.5,
          0.5 + Math.sin(angle) * radiusRatio * 0.5
        );
      }
    }

    const rowSize = radialSegs + 1;
    for (let s = 0; s < radialSegs; s++) {
      indices.push(0, 1 + s, 1 + s + 1);
      indices.push(0, 1 + s + 1, 1 + s);
    }

    for (let r = 1; r < lengthSegs; r++) {
      const rowStart = 1 + (r - 1) * rowSize;
      const nextRowStart = 1 + r * rowSize;

      for (let s = 0; s < radialSegs; s++) {
        const a = rowStart + s;
        const b = nextRowStart + s;
        const c = rowStart + s + 1;
        const d = nextRowStart + s + 1;

        indices.push(a, b, c);
        indices.push(c, b, d);
        indices.push(c, b, a);
        indices.push(d, b, c);
      }
    }

    geom.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    geom.setAttribute('uv', new THREE.Float32BufferAttribute(uvs, 2));
    geom.setIndex(indices);
    geom.computeVertexNormals();
    return geom;
  }

  // Sail geometry with physical ray ridges
  private createPhysicalSail(length: number, height: number, segX: number, segY: number, isDorsal: boolean): THREE.BufferGeometry {
    const geom = new THREE.PlaneGeometry(length, height, segX, segY);
    const pos = geom.attributes.position;
    const ySign = isDorsal ? 1 : -1;

    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const y = pos.getY(i);
      const ratioX = (x + length / 2) / length;
      const ratioY = Math.abs(y) / height;

      const arch = Math.sin(ratioX * Math.PI * 0.85) * (isDorsal ? 0.35 : 0.3);
      const trailingDrape = Math.pow(ratioX, 1.2) * (isDorsal ? 0.45 : 0.55);

      // Ray physical ridge
      const rayRidge = Math.sin(ratioX * 24 * Math.PI) * 0.014 * ratioY;

      pos.setX(i, x - ratioX * 0.55);
      pos.setY(i, (y + height / 2) * ySign * (0.35 + trailingDrape) + arch * ySign);
      pos.setZ(i, rayRidge);
    }

    geom.computeVertexNormals();
    return geom;
  }

  // Pectoral fin with sculpted micro ray ridges
  private createSculptedPectoral(): THREE.BufferGeometry {
    const shape = new THREE.Shape();
    shape.moveTo(0, 0);
    shape.bezierCurveTo(0.08, 0.16, 0.22, 0.24, 0.38, 0.18);
    shape.bezierCurveTo(0.48, 0.12, 0.46, -0.08, 0.35, -0.16);
    shape.bezierCurveTo(0.22, -0.22, 0.08, -0.12, 0, 0);

    const geom = new THREE.ShapeGeometry(shape, 14);
    // Add subtle ray ridge displacement
    const pos = geom.attributes.position;
    for (let i = 0; i < pos.count; i++) {
      const px = pos.getX(i);
      pos.setZ(i, Math.sin(px * 30) * 0.008);
    }
    geom.computeVertexNormals();
    geom.scale(0.88, 0.88, 0.88);
    return geom;
  }

  // Realistic layered eyes with micro-rotation tracking
  private buildEyes() {
    this.leftEye = this.createRealisticEye(true);
    this.rightEye = this.createRealisticEye(false);
    this.fishRoot.add(this.leftEye);
    this.fishRoot.add(this.rightEye);
  }

  private createRealisticEye(isLeft: boolean): THREE.Group {
    const eye = new THREE.Group();
    const zSign = isLeft ? 1 : -1;

    // Eyeball / Iris
    const irisGeom = new THREE.SphereGeometry(0.068, 16, 16);
    irisGeom.scale(1, 1, 0.85);
    const iris = new THREE.Mesh(irisGeom, this.eyeMaterial);
    eye.add(iris);
    if (isLeft) this.leftEyeball = iris;
    else this.rightEyeball = iris;

    // Glossy pupil
    const pupilGeom = new THREE.SphereGeometry(0.044, 14, 14);
    const pupil = new THREE.Mesh(pupilGeom, this.pupilMaterial);
    pupil.position.set(0.028, 0.005, 0.02 * zSign);
    eye.add(pupil);

    // Cornea
    const corneaGeom = new THREE.SphereGeometry(0.075, 16, 16);
    const cornea = new THREE.Mesh(corneaGeom, this.corneaMaterial);
    eye.add(cornea);

    // Specular highlight sparkle
    const sparkGeom = new THREE.SphereGeometry(0.016, 8, 8);
    const sparkMat = new THREE.MeshBasicMaterial({ color: 0xffffff });
    const spark = new THREE.Mesh(sparkGeom, sparkMat);
    spark.position.set(0.06, 0.025, 0.035 * zSign);
    eye.add(spark);

    eye.position.set(0.66, 0.12, 0.11 * zSign);
    return eye;
  }

  // Operculum & Red Gill Flare Membrane
  private buildGills() {
    const gillGeom = new THREE.CylinderGeometry(0.15, 0.18, 0.018, 16, 1, false, 0, Math.PI);
    gillGeom.rotateZ(Math.PI / 2);

    this.leftOperculum = new THREE.Mesh(gillGeom, this.bodyMaterial);
    this.leftOperculum.position.set(0.38, 0.08, 0.12);
    this.leftOperculum.rotation.y = 0.22;
    this.fishRoot.add(this.leftOperculum);

    this.rightOperculum = new THREE.Mesh(gillGeom, this.bodyMaterial);
    this.rightOperculum.position.set(0.38, 0.08, -0.12);
    this.rightOperculum.rotation.y = -0.22;
    this.fishRoot.add(this.rightOperculum);

    const throatGeom = new THREE.CylinderGeometry(0.12, 0.16, 0.015, 12, 1, false, 0, Math.PI * 0.9);
    throatGeom.rotateX(Math.PI / 2);
    this.branchioMembrane = new THREE.Mesh(throatGeom, this.gillMembraneMaterial);
    this.branchioMembrane.position.set(0.36, -0.04, 0);
    this.branchioMembrane.scale.set(0.1, 0.1, 0.1);
    this.fishRoot.add(this.branchioMembrane);
  }

  // VIP Gold Crown
  private buildVipCrown() {
    const ring = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.14, 0.06, 8), this.goldMaterial);
    this.vipCrownGroup.add(ring);

    for (let i = 0; i < 5; i++) {
      const angle = (i / 5) * Math.PI * 2;
      const peak = new THREE.Mesh(new THREE.ConeGeometry(0.04, 0.11, 4), this.goldMaterial);
      peak.position.set(Math.cos(angle) * 0.115, 0.07, Math.sin(angle) * 0.115);
      this.vipCrownGroup.add(peak);
    }

    const gem = new THREE.Mesh(
      new THREE.OctahedronGeometry(0.035),
      new THREE.MeshStandardMaterial({ color: 0xef4444, roughness: 0.1, metalness: 0.2 })
    );
    gem.position.set(0.12, 0.03, 0);
    this.vipCrownGroup.add(gem);

    this.vipCrownGroup.position.set(0.48, 0.35, 0);
    this.vipCrownGroup.rotation.z = -0.15;
    this.vipCrownGroup.scale.set(0.95, 0.95, 0.95);
  }

  public setVip(isVip: boolean) {
    this.vipCrownGroup.visible = isVip;
  }

  public updateSkin(skinId: FishColorPalette) {
    this.currentSkinId = skinId;
    const preset = FISH_SKINS[skinId] || FISH_SKINS.royal_blue;

    const primary = new THREE.Color(preset.primaryColor);
    const secondary = new THREE.Color(preset.secondaryColor);
    const fresnel = new THREE.Color(preset.fresnelColor);

    this.bodyMaterial.color = primary;
    this.bodyMaterial.sheenColor = fresnel;
    this.finMaterial.color = secondary;
    this.eyeMaterial.color = fresnel;

    if (skinId === 'golden_imperial') {
      this.bodyMaterial.metalness = 0.95;
      this.bodyMaterial.roughness = 0.15;
      this.bodyMaterial.clearcoat = 1.0;
      this.finMaterial.metalness = 0.88;
      this.finMaterial.roughness = 0.16;
    } else if (skinId === 'black_samurai') {
      this.bodyMaterial.metalness = 0.72;
      this.bodyMaterial.roughness = 0.3;
      this.bodyMaterial.clearcoat = 0.95;
      this.finMaterial.metalness = 0.45;
      this.finMaterial.roughness = 0.32;
    } else {
      this.bodyMaterial.metalness = 0.54;
      this.bodyMaterial.roughness = 0.2;
      this.bodyMaterial.clearcoat = 0.92;
      this.finMaterial.metalness = 0.26;
      this.finMaterial.roughness = 0.24;
    }
  }

  public update(delta: number, boundBox: { minX: number; maxX: number; minY: number; maxY: number; minZ: number; maxZ: number }) {
    const speedMult = this.isFlaring ? 4.8 : (this.isExcited ? 3.8 : 2.4);
    this.animTime += delta * speedMult;

    // Pathfinding & Target Selection
    this.wanderTimer -= delta;
    if (this.wanderTimer <= 0) {
      this.wanderTimer = 3.0 + Math.random() * 4.0;
      const margin = 0.5;
      this.targetPosition.set(
        THREE.MathUtils.randFloat(boundBox.minX + margin, boundBox.maxX - margin),
        THREE.MathUtils.randFloat(boundBox.minY + margin + 0.3, boundBox.maxY - margin - 0.2),
        THREE.MathUtils.randFloat(boundBox.minZ + margin, boundBox.maxZ - margin)
      );
    }

    const toTarget = new THREE.Vector3().subVectors(this.targetPosition, this.currentPosition);
    const dist = toTarget.length();
    const currentSpeed = this.isSleeping ? 0.25 : (this.isExcited ? 1.5 : (this.isFlaring ? 0.4 : this.swimSpeed));

    if (dist > 0.08) {
      toTarget.normalize();
      this.velocity.lerp(toTarget.multiplyScalar(currentSpeed), delta * 2.8);
      this.currentPosition.addScaledVector(this.velocity, delta);

      const targetHeading = Math.atan2(-this.velocity.z, this.velocity.x);
      const targetPitch = Math.asin(THREE.MathUtils.clamp(this.velocity.y / (currentSpeed + 0.01), -0.75, 0.75));
      const turnRate = targetHeading - this.headingAngle;
      const targetRoll = THREE.MathUtils.clamp(turnRate * 0.4, -0.3, 0.3);

      this.headingAngle = THREE.MathUtils.damp(this.headingAngle, targetHeading, 3.5, delta);
      this.pitchAngle = THREE.MathUtils.damp(this.pitchAngle, targetPitch, 3.2, delta);
      this.rollAngle = THREE.MathUtils.damp(this.rollAngle, targetRoll, 2.5, delta);

      this.group.position.copy(this.currentPosition);
      this.group.rotation.set(this.rollAngle, this.headingAngle, this.pitchAngle, 'ZYX');
    }

    // Flare dynamics
    const targetFlare = this.isFlaring ? 1.0 : 0.0;
    this.flareIntensity = THREE.MathUtils.damp(this.flareIntensity, targetFlare, 5.5, delta);

    const operculumAngle = 0.22 + this.flareIntensity * 0.52;
    this.leftOperculum.rotation.y = operculumAngle;
    this.rightOperculum.rotation.y = -operculumAngle;

    const membraneScale = 0.1 + this.flareIntensity * 0.9;
    this.branchioMembrane.scale.set(membraneScale, membraneScale, membraneScale);

    // Spinal Wave undulation
    const spineWave = Math.sin(this.animTime * 2.8) * (this.isFlaring ? 0.32 : 0.2);
    this.fishRoot.rotation.y = spineWave * 0.28;

    // Pectoral humming flutter
    const flutterFreq = this.animTime * 14.0;
    const flutterAmp = 0.45 + this.flareIntensity * 0.35;
    this.leftPectoralFin.rotation.y = 0.45 + Math.sin(flutterFreq) * flutterAmp;
    this.rightPectoralFin.rotation.y = -0.45 - Math.sin(flutterFreq) * flutterAmp;

    // Pelvic chains physics
    this.updatePelvicChains(delta);

    // Multi-harmonic fin undulations
    this.animateCaudalFin();
    this.animateSails();

    // Eye saccades (looking around)
    const eyeSaccade = Math.sin(this.animTime * 1.5) * 0.12;
    if (this.leftEyeball && this.rightEyeball) {
      this.leftEyeball.rotation.y = eyeSaccade;
      this.rightEyeball.rotation.y = -eyeSaccade;
    }

    this.group.position.y += Math.sin(this.animTime * 1.8) * 0.0035;
  }

  private updatePelvicChains(delta: number) {
    const sway = Math.sin(this.animTime * 2.2) * 0.15;
    const dragZ = -this.velocity.x * 0.15;

    for (let i = 0; i < this.leftPelvicSegments.length; i++) {
      const segL = this.leftPelvicSegments[i];
      const segR = this.rightPelvicSegments[i];
      const lag = i * 0.07;

      segL.rotation.z = -0.1 + sway * (1 + lag) + dragZ;
      segR.rotation.z = -0.1 - sway * (1 + lag) + dragZ;

      segL.rotation.x = this.flareIntensity * 0.25;
      segR.rotation.x = -this.flareIntensity * 0.25;
    }
  }

  private animateCaudalFin() {
    const pos = this.caudalFinGeom.attributes.position;
    const orig = this.caudalOriginalPositions;
    const count = pos.count;
    const flareScale = 1.0 + this.flareIntensity * 0.38;

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const ox = orig[idx];
      const oy = orig[idx + 1];
      const oz = orig[idx + 2];

      const dist = Math.sqrt(ox * ox + oy * oy);
      const ratio = dist / 2.0;

      const wave1 = Math.sin(this.animTime * 3.6 - dist * 4.2) * 0.24 * Math.pow(ratio, 1.4);
      const wave2 = Math.cos(this.animTime * 5.2 - dist * 6.5) * 0.08 * Math.pow(ratio, 2.0);
      const flutter = Math.sin(this.animTime * 8.0 + ox * 10) * 0.03 * Math.pow(ratio, 2.5);

      const lateralWave = wave1 + wave2 + flutter;
      const verticalCurl = Math.cos(this.animTime * 2.5 - dist * 3.0) * 0.09 * ratio;

      pos.setXYZ(
        i,
        ox * flareScale,
        (oy + verticalCurl) * flareScale,
        oz + lateralWave
      );
    }

    pos.needsUpdate = true;
    this.caudalFinGeom.computeVertexNormals();
  }

  private animateSails() {
    const dPos = this.dorsalFinGeom.attributes.position;
    const dOrig = this.dorsalOriginalPositions;
    for (let i = 0; i < dPos.count; i++) {
      const idx = i * 3;
      const ox = dOrig[idx];
      const oy = dOrig[idx + 1];
      const oz = dOrig[idx + 2];
      const heightRatio = Math.abs(oy) / 0.88;

      const wave1 = Math.sin(this.animTime * 3.2 - ox * 3.8) * 0.14 * heightRatio;
      const wave2 = Math.cos(this.animTime * 5.0 - ox * 5.5) * 0.05 * Math.pow(heightRatio, 1.8);

      dPos.setXYZ(i, ox, oy, oz + wave1 + wave2);
    }
    dPos.needsUpdate = true;
    this.dorsalFinGeom.computeVertexNormals();

    const aPos = this.analFinGeom.attributes.position;
    const aOrig = this.analOriginalPositions;
    for (let i = 0; i < aPos.count; i++) {
      const idx = i * 3;
      const ox = aOrig[idx];
      const oy = aOrig[idx + 1];
      const oz = aOrig[idx + 2];
      const heightRatio = Math.abs(oy) / 0.98;

      const wave1 = Math.sin(this.animTime * 3.2 - ox * 3.8 + 0.9) * 0.16 * heightRatio;
      const wave2 = Math.cos(this.animTime * 5.0 - ox * 5.5 + 1.2) * 0.06 * Math.pow(heightRatio, 1.8);

      aPos.setXYZ(i, ox, oy, oz + wave1 + wave2);
    }
    aPos.needsUpdate = true;
    this.analFinGeom.computeVertexNormals();
  }

  public swimTo(point: THREE.Vector3, isUrgent = false) {
    this.targetPosition.copy(point);
    this.wanderTimer = 4.5;
    this.isExcited = isUrgent;
    if (isUrgent) {
      setTimeout(() => {
        this.isExcited = false;
      }, 3500);
    }
  }

  public triggerFlare(active: boolean) {
    this.isFlaring = active;
  }

  public dispose() {
    this.bodyMaterial.dispose();
    this.finMaterial.dispose();
    this.eyeMaterial.dispose();
    this.corneaMaterial.dispose();
    this.pupilMaterial.dispose();
    this.gillMembraneMaterial.dispose();
    this.goldMaterial.dispose();
    this.scaleTexture.dispose();
    this.scaleNormalTexture.dispose();
    this.finTexture.dispose();
  }
}
