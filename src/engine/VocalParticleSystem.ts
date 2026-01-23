import * as THREE from 'three';
import { OBJLoader } from 'three/examples/jsm/loaders/OBJLoader.js';
import * as BufferGeometryUtils from 'three/examples/jsm/utils/BufferGeometryUtils.js';
import type { StemData } from '../audio/MultiStemAudioController';
import particleVertexShader from '../shaders/particleVertex.glsl?raw';
import smokeFragmentShader from '../shaders/smokeFragment.glsl?raw';
import vocalSphereVertexShader from '../shaders/vocalSphereVertex.glsl?raw';
import vocalSphereFragmentShader from '../shaders/vocalSphereFragment.glsl?raw';

const DEFAULT_CENTER_OBJ = '/models/center.obj';

const SMOKE_PARTICLE_COUNT = 200;

interface SmokeParticle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  size: number;
  baseSize: number;
}

export class VocalParticleSystem {
  // Central glowing mesh (sphere by default, replaced by OBJ when loaded) - custom shader with Fresnel, layers, glass
  private particle: THREE.Mesh;
  private sphereMaterial: THREE.ShaderMaterial;
  /** Scale factor so OBJ's bounding sphere matches unit sphere; 1 when using built-in sphere. */
  private objScale: number = 1;

  // Smoke particles
  private smokeParticles: THREE.Points;
  private smokeGeometry: THREE.BufferGeometry;
  private smokeMaterial: THREE.ShaderMaterial;
  private smokeData: SmokeParticle[] = [];
  private smokePositions: Float32Array;
  private smokeSizes: Float32Array;
  private smokeLives: Float32Array;
  private smokeColors: Float32Array;

  private time: number = 0;
  private smoothedVocals: number = 0;
  private serum1Intensity: number = 0;
  private clickScaleMultiplier: number = 1.0;
  private targetScaleMultiplier: number = 1.0;
  private startScaleMultiplier: number = 1.0;
  private scaleTransitionStart: number = 0;
  private scaleTransitionDuration: number = 0.3; // 300ms
  private isDragging: boolean = false;
  private dragOffset: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private targetPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private returnToCenterStartPosition: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  private returnToCenterStartTime: number = 0;
  private returnToCenterDuration: number = 5.0; // 5 seconds
  private isReturningToCenter: boolean = false;
  // Drag constraints
  private readonly maxDragDistance: number = 8.0; // Maximum distance from center
  private readonly minDragDistance: number = 0.0; // Minimum distance from center (can't go below center)

  constructor(objUrl?: string) {
    // Central glowing particle (sphere by default, then OBJ when loaded) - 3D layered Fresnel + glass shader
    const sphereGeometry = new THREE.SphereGeometry(1, 48, 24);
    this.sphereMaterial = new THREE.ShaderMaterial({
      uniforms: {
        uColor: { value: new THREE.Vector3(1, 0.95, 1) },
        uOpacity: { value: 0.2 },
        uGlow: { value: 0.8 },
        uTime: { value: 0 },
        fogColor: { value: new THREE.Color(0x000000) },
        fogNear: { value: 0.02 },
        fogFar: { value: 100 },
        uSceneTexture: { value: null as THREE.Texture | null },
        uProjectionMatrix: { value: new THREE.Matrix4() },
        uCameraFar: { value: 1000 },
      },
      vertexShader: vocalSphereVertexShader,
      fragmentShader: vocalSphereFragmentShader,
      transparent: true,
      depthWrite: true,
      depthTest: true,
      blending: THREE.NormalBlending,
      side: THREE.FrontSide,
    });
    this.particle = new THREE.Mesh(sphereGeometry, this.sphereMaterial);
    this.particle.renderOrder = -1; // draw first so sphere occludes particles/trails behind it; only refraction shows

    // Smoke particles
    this.smokeGeometry = new THREE.BufferGeometry();
    this.smokePositions = new Float32Array(SMOKE_PARTICLE_COUNT * 3);
    this.smokeSizes = new Float32Array(SMOKE_PARTICLE_COUNT);
    this.smokeLives = new Float32Array(SMOKE_PARTICLE_COUNT);
    this.smokeColors = new Float32Array(SMOKE_PARTICLE_COUNT * 3);

    this.smokeGeometry.setAttribute('position', new THREE.BufferAttribute(this.smokePositions, 3));
    this.smokeGeometry.setAttribute('size', new THREE.BufferAttribute(this.smokeSizes, 1));
    this.smokeGeometry.setAttribute('life', new THREE.BufferAttribute(this.smokeLives, 1));
    this.smokeGeometry.setAttribute('color', new THREE.BufferAttribute(this.smokeColors, 3));

    this.smokeMaterial = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        fogColor: { value: new THREE.Color(0x000000) },
        fogNear: { value: 0.02 },
        fogFar: { value: 100 },
        smokeOpacity: { value: 0.06 },
        uOpacityMultiplier: { value: 1.0 },
      },
      vertexShader: particleVertexShader,
      fragmentShader: smokeFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });

    this.smokeParticles = new THREE.Points(this.smokeGeometry, this.smokeMaterial);
    this.smokeParticles.renderOrder = 1; // draw after sphere so smoke layers on top of the glass

    this.initializeSmoke();

    const url = objUrl ?? DEFAULT_CENTER_OBJ;
    // Wrap in additional error handling to prevent crashes from unhandled promise rejections
    this.loadObjAsync(url).catch((e) => {
      console.warn('Center OBJ load failed, using default sphere:', e);
      // Ensure error doesn't propagate and crash the app
    });
  }

  /**
   * Loads an OBJ and replaces the center sphere geometry. Keeps the same material (Fresnel/glass),
   * so texturing, animations, and vocal stem interactions are unchanged.
   */
  private async loadObjAsync(url: string): Promise<void> {
    try {
      // Add timeout to prevent hanging on slow/failed loads (5 seconds)
      const timeoutPromise = new Promise<never>((_, reject) => {
        setTimeout(() => reject(new Error(`OBJ load timeout after 5s: ${url}`)), 5000);
      });

      const loader = new OBJLoader();
      // Race between load and timeout
      const group = await Promise.race([
        loader.loadAsync(url),
        timeoutPromise
      ]);

      const geoms: THREE.BufferGeometry[] = [];
      group.traverse((c) => {
        if (c instanceof THREE.Mesh && c.geometry) {
          try {
            const g = c.geometry.clone();
            if (!g.attributes.normal) g.computeVertexNormals();
            for (const key of Object.keys(g.attributes))
              if (key !== 'position' && key !== 'normal') g.deleteAttribute(key);
            g.clearGroups();
            geoms.push(g);
          } catch (e) {
            console.warn('Error processing mesh geometry:', e);
          }
        }
      });
      
      if (geoms.length === 0) {
        console.warn('No valid meshes found in OBJ file, using default sphere');
        return;
      }
      
      let merged: THREE.BufferGeometry | null = null;
      try {
        merged = geoms.length === 1 ? geoms[0] : BufferGeometryUtils.mergeGeometries(geoms);
        if (geoms.length > 1) {
          for (const g of geoms) g.dispose();
        }
        if (!merged) {
          console.warn('Failed to merge geometries, using default sphere');
          return;
        }
      } catch (e) {
        console.warn('Error merging geometries:', e);
        // Clean up on error
        for (const g of geoms) {
          try {
            g.dispose();
          } catch (disposeError) {
            // Ignore dispose errors
          }
        }
        return;
      }

      try {
        merged.computeBoundingSphere();
        const r = merged.boundingSphere?.radius ?? 1;
        this.objScale = r > 1e-6 ? 1 / r : 1;
        const cen = merged.boundingSphere?.center;
        if (cen) merged.translate(-cen.x, -cen.y, -cen.z);
        merged.computeBoundingSphere();
        
        const old = this.particle.geometry;
        this.particle.geometry = merged;
        old.dispose();
      } catch (e) {
        console.warn('Error applying OBJ geometry:', e);
        // Clean up merged geometry on error
        try {
          merged.dispose();
        } catch (disposeError) {
          // Ignore dispose errors
        }
        return;
      }
    } catch (error) {
      // Catch all errors (network, timeout, parsing, etc.) and log without crashing
      console.warn('OBJ load error (will use default sphere):', error);
      // Don't re-throw - error is fully handled, default sphere will be used
      // This prevents unhandled promise rejections that can crash the page
      return;
    }
  }

  private randomOutwardVelocity(speed: number): THREE.Vector3 {
    const phi = Math.acos(2 * Math.random() - 1);
    const theta = Math.random() * Math.PI * 2;
    return new THREE.Vector3(
      Math.sin(phi) * Math.cos(theta) * speed,
      Math.cos(phi) * speed,
      Math.sin(phi) * Math.sin(theta) * speed
    );
  }

  private initializeSmoke(): void {
    // Initialize smoke particles relative to OBJ center (which starts at 0,0,0)
    for (let i = 0; i < SMOKE_PARTICLE_COUNT; i++) {
      const speed = 0.4 + Math.random() * 0.8;
      this.smokeData.push({
        position: new THREE.Vector3(
          (Math.random() - 0.5) * 0.6,
          (Math.random() - 0.5) * 0.6,
          (Math.random() - 0.5) * 0.6
        ),
        velocity: this.randomOutwardVelocity(speed),
        life: Math.random(),
        size: 2.5 + Math.random() * 4.5,
        baseSize: 2.5 + Math.random() * 4.5,
      });
    }
    this.updateSmokeBuffers();
  }

  private updateSmokeBuffers(): void {
    // Smoke positions are in world space - existing particles stay where they are,
    // only new particles spawn at the OBJ's current position
    for (let i = 0; i < this.smokeData.length; i++) {
      const p = this.smokeData[i];
      const i3 = i * 3;
      this.smokePositions[i3] = p.position.x;
      this.smokePositions[i3 + 1] = p.position.y;
      this.smokePositions[i3 + 2] = p.position.z;
      this.smokeSizes[i] = p.size;
      this.smokeLives[i] = p.life;
      // SERUM 1: when on, smoke is red; otherwise soft white/cyan
      const c = 0.6 + p.life * 0.4;
      if (this.serum1Intensity > 0.01) {
        this.smokeColors[i3] = c;
        this.smokeColors[i3 + 1] = c * 0.15;
        this.smokeColors[i3 + 2] = c * 0.15;
      } else {
        this.smokeColors[i3] = c * 0.9;
        this.smokeColors[i3 + 1] = c * 1.0;
        this.smokeColors[i3 + 2] = c;
      }
    }
    this.smokeGeometry.attributes.position.needsUpdate = true;
    this.smokeGeometry.attributes.size.needsUpdate = true;
    this.smokeGeometry.attributes.life.needsUpdate = true;
    this.smokeGeometry.attributes.color.needsUpdate = true;
  }

  public getParticle(): THREE.Mesh {
    return this.particle;
  }

  public getSmokeParticles(): THREE.Points {
    // Smoke particles are in world space, not relative to OBJ
    // Only new particles spawn at OBJ position
    return this.smokeParticles;
  }

  public setSmokeOpacityMultiplier(m: number): void {
    this.smokeMaterial.uniforms.uOpacityMultiplier.value = m;
  }

  public setRefractionSource(
    texture: THREE.Texture,
    projectionMatrix: THREE.Matrix4,
    cameraFar: number
  ): void {
    this.sphereMaterial.uniforms.uSceneTexture.value = texture;
    this.sphereMaterial.uniforms.uProjectionMatrix.value = projectionMatrix;
    this.sphereMaterial.uniforms.uCameraFar.value = cameraFar;
  }

  public update(deltaTime: number, vocalsStem?: StemData, serum1Stem?: StemData, playbackTime: number = 0): void {
    this.time += deltaTime;
    this.smokeMaterial.uniforms.time.value = this.time;

    const vocalsIntensity = vocalsStem?.frequencyBands.overall ?? 0;
    const smoothing = 0.12;
    this.smoothedVocals = this.smoothedVocals * (1 - smoothing) + vocalsIntensity * smoothing;

    // Serum 1: snap to 0 when no volume so red smoke turns off immediately (avoids analyzer smoothing delay).
    // Manually off 3:25–3:39:30.
    let serum1Raw = serum1Stem?.frequencyBands.overall ?? 0;
    if (serum1Raw < 0.02) serum1Raw = 0;
    if (playbackTime >= 205 && playbackTime < 219.5) serum1Raw = 0;
    this.serum1Intensity = serum1Raw;

    // 2:13–2:22: half opacity for vocal particles and smoke
    const halfOpacity = playbackTime >= 133 && playbackTime < 142 ? 0.5 : 1;

    // 2:41–2:56 fade on 5x vocal effect on sphere size; 3:10–3:17 fade off (size only, not glow/opacity)
    const pt = playbackTime;
    let sizeVocalMult = 1;
    if (pt >= 161 && pt <= 176) sizeVocalMult = 1 + 4 * (pt - 161) / 15;
    else if (pt > 176 && pt < 190) sizeVocalMult = 5;
    else if (pt >= 190 && pt <= 197) sizeVocalMult = 5 - 4 * (pt - 190) / 7;

    // Smooth scale transition
    if (this.clickScaleMultiplier !== this.targetScaleMultiplier) {
      const elapsed = this.time - this.scaleTransitionStart;
      if (elapsed >= this.scaleTransitionDuration) {
        this.clickScaleMultiplier = this.targetScaleMultiplier;
      } else {
        const t = elapsed / this.scaleTransitionDuration;
        // Ease out cubic for smooth transition
        const eased = 1 - Math.pow(1 - t, 3);
        this.clickScaleMultiplier = this.startScaleMultiplier + (this.targetScaleMultiplier - this.startScaleMultiplier) * eased;
      }
    }

    // Smooth position return to center
    if (this.isReturningToCenter && !this.isDragging) {
      const elapsed = this.time - this.returnToCenterStartTime;
      if (elapsed >= this.returnToCenterDuration) {
        this.dragOffset.set(0, 0, 0);
        this.targetPosition.set(0, 0, 0);
        this.isReturningToCenter = false;
      } else {
        const t = elapsed / this.returnToCenterDuration;
        // Ease out cubic for smooth return
        const eased = 1 - Math.pow(1 - t, 3);
        this.targetPosition.lerpVectors(this.returnToCenterStartPosition, new THREE.Vector3(0, 0, 0), eased);
        this.dragOffset.copy(this.targetPosition);
      }
    }

    // Apply position offset
    this.particle.position.copy(this.targetPosition);

    // Central mesh (sphere or OBJ): pulse scale with vocals (size only; opacity/glow unchanged)
    const baseSize = 0.66 + this.smoothedVocals * 0.9 * sizeVocalMult; // 0.6 * 1.1 for center.obj base +10%
    const s = baseSize * (0.9 + 0.05 * Math.sin(this.time * 0.8));
    this.particle.scale.setScalar(s * this.objScale * this.clickScaleMultiplier);
    // Shader uniforms for layered Fresnel + glass sphere
    this.sphereMaterial.uniforms.uTime.value = this.time;
    this.sphereMaterial.uniforms.uOpacity.value = (0.1 + this.smoothedVocals * 0.4) * halfOpacity; // 0.1 at 0% vocals, 0.5 at 100%
    const glow = 0.6 + this.smoothedVocals * 0.9; // 0.6 at 0% vocals, 1.5 at 100% (brighter with vocals)
    this.sphereMaterial.uniforms.uGlow.value = glow;

    // Smoke opacity: 0.01 at 0% vocals, 0.3 at 100% vocals
    this.smokeMaterial.uniforms.smokeOpacity.value = (0.01 + this.smoothedVocals * 0.29) * halfOpacity;

    // Smoke: move outward from spawn point in all directions (no upward pull)
    // Existing particles stay in world space, only new particles spawn at OBJ position
    const objSpawnPoint = this.targetPosition;
    
    for (const p of this.smokeData) {
      p.velocity.multiplyScalar(0.99);

      // SERUM 1: when on (red smoke), add outward force at 1/4 strength (push away from spawn point)
      if (this.serum1Intensity > 0.01) {
        // Calculate position relative to spawn point
        const relativePos = p.position.clone().sub(objSpawnPoint);
        const lenSq = relativePos.lengthSq();
        if (lenSq > 0.0001) {
          const outward = relativePos.normalize();
          p.velocity.add(outward.multiplyScalar(this.serum1Intensity * 35 * deltaTime * 0.125));
        }
      }

      // Update position in world space
      p.position.add(p.velocity.clone().multiplyScalar(deltaTime * 2));
      p.life -= deltaTime * (0.2 + this.smoothedVocals * 0.5);
      p.size = p.baseSize * (0.8 + this.smoothedVocals * 0.6);

      if (p.life <= 0) {
        // Respawn at OBJ's current position (world space)
        p.position.set(
          objSpawnPoint.x + (Math.random() - 0.5) * 0.5,
          objSpawnPoint.y + (Math.random() - 0.5) * 0.5,
          objSpawnPoint.z + (Math.random() - 0.5) * 0.5
        );
        // SERUM 1: when on, respawn with outward speed 0.75-1.75
        const speed = this.serum1Intensity > 0.01
          ? 0.75 + Math.random() * 1
          : 0.5 + this.smoothedVocals * 0.5 + Math.random() * 0.5;
        p.velocity.copy(this.randomOutwardVelocity(speed));
        p.life = 0.3 + Math.random() * 0.7;
        p.baseSize = 2.0 + Math.random() * 4.0;
      }
    }
    this.updateSmokeBuffers();
  }

  public growOnMouseDown(): void {
    this.startScaleMultiplier = this.clickScaleMultiplier;
    this.targetScaleMultiplier = this.startScaleMultiplier + 0.5;
    this.scaleTransitionStart = this.time;
  }

  public resetScaleOnMouseUp(): void {
    this.startScaleMultiplier = this.clickScaleMultiplier;
    this.targetScaleMultiplier = 1.0;
    this.scaleTransitionStart = this.time;
  }

  public startDrag(): void {
    this.isDragging = true;
    this.isReturningToCenter = false;
  }

  public updateDrag(worldPosition: THREE.Vector3): void {
    if (this.isDragging) {
      // Clamp position to min/max distance constraints
      const distance = worldPosition.length();
      let clampedPosition: THREE.Vector3;
      
      if (distance > this.maxDragDistance) {
        // Clamp to max distance
        clampedPosition = worldPosition.clone().normalize().multiplyScalar(this.maxDragDistance);
      } else if (distance < this.minDragDistance) {
        // Clamp to min distance (center)
        clampedPosition = new THREE.Vector3(0, 0, 0);
      } else {
        // Within constraints, use the position as-is
        clampedPosition = worldPosition.clone();
      }
      
      this.targetPosition.copy(clampedPosition);
      this.dragOffset.copy(clampedPosition);
    }
  }

  public endDrag(): void {
    this.isDragging = false;
    this.isReturningToCenter = true;
    this.returnToCenterStartPosition.copy(this.targetPosition);
    this.returnToCenterStartTime = this.time;
  }

  public dispose(): void {
    this.particle.geometry.dispose();
    this.sphereMaterial.dispose();
    this.smokeGeometry.dispose();
    this.smokeMaterial.dispose();
  }
}
