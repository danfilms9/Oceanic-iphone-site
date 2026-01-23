import * as THREE from 'three';
import type { StemData } from '../audio/MultiStemAudioController';
import particleVertexShader from '../shaders/particleVertex.glsl?raw';
import particleFragmentShader from '../shaders/particleFragment.glsl?raw';

// Performance settings
const MAX_PARTICLE_COUNT = 7000; // Buffer size; 7000 during 3:39:30–3:40 transition, 5000 max from Serum 3 otherwise
const SERUM3_MAX_PARTICLES = 5000; // Maximum particles when Serum 3 is at 100%
const MAX_TRAIL_LENGTH = 30;

interface Particle {
  position: THREE.Vector3;
  velocity: THREE.Vector3;
  life: number;
  lifetime: number;
  size: number;
  baseSize: number;
  color: THREE.Color;
  baseColor: THREE.Color;
  trail: THREE.Vector3[];
  hasTrail: boolean;
}

export class ParticleSystem {
  private particles: Particle[] = [];
  private particleCount: number;
  
  // Points system for particles
  private points: THREE.Points;
  private geometry: THREE.BufferGeometry;
  private material: THREE.ShaderMaterial;
  
  // Data arrays
  private positions: Float32Array;
  private colors: Float32Array;
  private sizes: Float32Array;
  private lives: Float32Array;
  private isOrbit: Float32Array;
  
  // Trail system
  private trailGeometry: THREE.BufferGeometry;
  private trailMaterial: THREE.LineBasicMaterial;
  private trailLines: THREE.LineSegments;
  
  // Audio-reactive state
  private smoothedDrums: number = 0;
  private smoothedBass: number = 0;
  private smoothedBassKick: number = 0;
  private smoothedSynth: number = 0;
  private smoothedFx: number = 0;
  // Serum stems use raw values (no smoothing), except Serum 3 for orbit/speed/size smoothness
  private smoothedSerum3: number = 0;
  
  // Time tracking
  private time: number = 0;
  
  // Spawn point (follows OBJ position)
  private spawnPoint: THREE.Vector3 = new THREE.Vector3(0, 0, 0);
  
  // Color: base (both off), Bass → blue, Serum 2 → green
  private baseParticleColor = new THREE.Color(0.92, 0.95, 1.0);   // White, slightly blue
  private bassBlueColor = new THREE.Color(0.35, 0.6, 1.0);        // Very blue / light blue
  private serum2GreenColor = new THREE.Color(0.65, 1.0, 0.7);     // Light green
  
  constructor() {
    // Start with 3000 particles
    this.particleCount = 3000;
    
    // Create geometry
    this.geometry = new THREE.BufferGeometry();
    
    // Initialize arrays for maximum capacity (will be filled as particles spawn)
    this.positions = new Float32Array(MAX_PARTICLE_COUNT * 3);
    this.colors = new Float32Array(MAX_PARTICLE_COUNT * 3);
    this.sizes = new Float32Array(MAX_PARTICLE_COUNT);
    this.lives = new Float32Array(MAX_PARTICLE_COUNT);
    this.isOrbit = new Float32Array(MAX_PARTICLE_COUNT);
    
    // Set attributes with max capacity
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.setAttribute('life', new THREE.BufferAttribute(this.lives, 1));
    this.geometry.setAttribute('isOrbit', new THREE.BufferAttribute(this.isOrbit, 1));
    
    // Create shader material for particles with bloom
    this.material = new THREE.ShaderMaterial({
      uniforms: {
        time: { value: 0 },
        fogColor: { value: new THREE.Color(0x000000) },
        fogNear: { value: 0.02 },
        fogFar: { value: 100 },
        uBrightnessGlowMult: { value: 1.0 },
        uGlow213230: { value: 1.0 },  // 2:13–2:30: glow reduction, 3s fades each side
        uMainGlowOpacity311240: { value: 1.0 },  // 3:11–3:39:30: fade down 75%; 3:39:30–3:40: back up
      },
      vertexShader: particleVertexShader,
      fragmentShader: particleFragmentShader,
      transparent: true,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
      vertexColors: true,
    });
    
    // Create points
    this.points = new THREE.Points(this.geometry, this.material);
    
    // Initialize particles
    this.initializeParticles();
    
    // Create trail system
    this.trailMaterial = new THREE.LineBasicMaterial({
      vertexColors: true,
      transparent: true,
      opacity: 0.6, // 75% of 0.8
      blending: THREE.AdditiveBlending,
      linewidth: 2, // base doubled (1 -> 2)
    });
    
    this.trailGeometry = new THREE.BufferGeometry();
    this.trailLines = new THREE.LineSegments(this.trailGeometry, this.trailMaterial);
  }
  
  private initializeParticles(): void {
    // Start with 3000 particles
    this.particles = [];
    
    // Initialize arrays for maximum capacity
    this.positions = new Float32Array(MAX_PARTICLE_COUNT * 3);
    this.colors = new Float32Array(MAX_PARTICLE_COUNT * 3);
    this.sizes = new Float32Array(MAX_PARTICLE_COUNT);
    this.lives = new Float32Array(MAX_PARTICLE_COUNT);
    
    // Set attributes with max capacity
    this.geometry.setAttribute('position', new THREE.BufferAttribute(this.positions, 3));
    this.geometry.setAttribute('color', new THREE.BufferAttribute(this.colors, 3));
    this.geometry.setAttribute('size', new THREE.BufferAttribute(this.sizes, 1));
    this.geometry.setAttribute('life', new THREE.BufferAttribute(this.lives, 1));
    
    for (let i = 0; i < 3000; i++) {
      this.particles.push(this.createParticle());
    }
    
    // Initialize point positions
    this.updatePoints(1.0, false, 0);
  }
  
  private createParticle(): Particle {
    // Create particles at spawn point (OBJ position) with random offset
    const spread = 20;
    return {
      position: new THREE.Vector3(
        this.spawnPoint.x + (Math.random() - 0.5) * spread,
        this.spawnPoint.y + (Math.random() - 0.5) * spread,
        this.spawnPoint.z + (Math.random() - 0.5) * spread
      ),
      velocity: new THREE.Vector3(
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2,
        (Math.random() - 0.5) * 2
      ),
      life: 1.0,
      lifetime: 0.75 + Math.random() * 4.25, // Per-particle longevity (0.75–5); used with FX decay
      size: 0.1 + Math.random() * 0.9,
      baseSize: 0.1 + Math.random() * 0.9,
      color: new THREE.Color().copy(this.baseParticleColor),
      baseColor: new THREE.Color().copy(this.baseParticleColor),
      trail: [],
      hasTrail: Math.random() > 0.3, // 70% have trails
    };
  }
  
  /** Serum 2 timeline intensity: fade in 3:39:30–3:40, on until end; drops at 4:09 for particle effects. */
  private getSerum2Intensity(playbackTime: number): number {
    if (playbackTime < 219.5) return 0;
    if (playbackTime < 249) return playbackTime <= 220 ? (playbackTime - 219.5) / 0.5 : 1;
    if (playbackTime <= 254) return 1 + (0.5 - 1) * (playbackTime - 249) / 5;
    return 0.5;
  }

  /**
   * Death decay for 0:49:30–1:13 timeline:
   * - Before 0:49:30: no death (0)
   * - 0:49:30–1:12: start ~80 births/sec, exponential ramp (most deaths near 1:12)
   * - 1:12–1:13: deaths off (0)
   * - From 1:13: FX-controlled (returns fxDecayRate for caller to use)
   */
  private getDeathDecay(playbackTime: number, fxDecayRate: number): number {
    const DEATH_START = 49.5;  // 0:49:30
    const DEATH_END = 72;
    const DEATH_OFF_END = 73;
    // Initial decay ~80/sec (double previous) so deaths visible when particles start with full life
    const DECAY_20_PER_SEC = 0.0768;
    // Decay at end of ramp for strong “most deaths in last moments” (~100/sec)
    const DECAY_RAMP_END = 0.192;

    if (playbackTime < DEATH_START) return 0;
    if (playbackTime >= DEATH_OFF_END) return fxDecayRate;
    if (playbackTime >= DEATH_END) return 0; // 1:12–1:13 off

    // 0:49:30–1:12: t in [0,1], exponential curve (t²) so most increase near 1:12
    const t = (playbackTime - DEATH_START) / (DEATH_END - DEATH_START);
    return DECAY_20_PER_SEC * Math.pow(DECAY_RAMP_END / DECAY_20_PER_SEC, t * t);
  }

  public update(
    deltaTime: number,
    drumsStem?: StemData,
    bassStem?: StemData,
    synthStem?: StemData,
    _vocalsStem?: StemData,
    fxStem?: StemData,
    serum1Stem?: StemData,
    serum3Stem?: StemData,
    playbackTime: number = 0
  ): void {
    // Update time
    this.time += deltaTime;
    this.material.uniforms.time.value = this.time;
    
    // SERUM 3: All derived values (computed once per frame)
    const serum3Intensity = serum3Stem?.frequencyBands.overall || 0;
    // Hysteresis: also true when smoothed > 0.01 so brief analyser dropouts don't kill orbit
    const serum3IsOn = serum3Intensity > 0.01 || this.smoothedSerum3 > 0.01;
    // Smooth Serum 3 for orbit, size, and speed to reduce sporadicity when bass+S3 are loud
    const serum3Smoothing = 0.1;
    this.smoothedSerum3 = this.smoothedSerum3 * (1 - serum3Smoothing) + serum3Intensity * serum3Smoothing;
    // Particle count: 3000 base, up to 5000 when Serum 3 is on; 7000 during 3:39:30–3:40 transition
    const baseParticleCount = 3000;
    let targetParticleCount: number;
    if (playbackTime >= 219.5 && playbackTime <= 220) {
      targetParticleCount = 7000;
    } else {
      targetParticleCount = serum3IsOn
        ? Math.max(baseParticleCount, Math.floor(serum3Intensity * SERUM3_MAX_PARTICLES))
        : baseParticleCount;
    }
    // Size: 3x at 0%, 1x at 100% (smoothed)
    const serum3SizeFactor = 3.0 - this.smoothedSerum3 * 2.0;
    // Speed: 0.6x at 0%, 1.1x at 100% (smoothed)
    const serum3SpeedMultiplier = 0.6 + this.smoothedSerum3 * 0.5;

    while (this.particles.length < targetParticleCount && this.particles.length < MAX_PARTICLE_COUNT) {
      this.particles.push(this.createParticle());
    }
    while (this.particles.length > targetParticleCount) {
      this.particles.pop();
    }
    this.particleCount = this.particles.length;
    
    // Smooth audio data more aggressively to prevent jitter
    const smoothingFactor = 0.15; // Reduced for smoother visuals
    if (drumsStem) {
      this.smoothedDrums = this.smoothedDrums * (1 - smoothingFactor) + drumsStem.frequencyBands.overall * smoothingFactor;
    }
    if (bassStem) {
      // Use overall intensity of the bass stem; bass slightly less smooth (affects size, trail, orbit, color)
      const bassSmoothingFactor = 0.09;
      this.smoothedBass = this.smoothedBass * (1 - bassSmoothingFactor) + bassStem.frequencyBands.overall * bassSmoothingFactor;
      const bassKickRange = bassStem.frequencyBands.bassRaw?.slice(2, 8) || [];
      const rawBassKick = bassKickRange.length > 0
        ? bassKickRange.reduce((a, b) => a + b, 0) / (bassKickRange.length * 255)
        : 0;
      this.smoothedBassKick = this.smoothedBassKick * (1 - bassSmoothingFactor) + rawBassKick * bassSmoothingFactor;
    }
    if (synthStem) {
      this.smoothedSynth = this.smoothedSynth * (1 - smoothingFactor) + synthStem.frequencyBands.mid * smoothingFactor;
    }
    if (fxStem) {
      this.smoothedFx = this.smoothedFx * (1 - smoothingFactor) + fxStem.frequencyBands.overall * smoothingFactor;
    }
    // Serum stems use raw values - no smoothing applied. Serum 1: manually off 3:25–3:39:30.
    const serum1Intensity = (playbackTime >= 205 && playbackTime < 219.5) ? 0 : (serum1Stem?.frequencyBands.overall || 0);
    
    // BASS: Control particle size (trail thickness is Serum 1)
    const bassIntensity = this.smoothedBass;
    const bassKickEnergy = this.smoothedBassKick;
    const baseSize = 0.5 + bassIntensity * 1.0 + bassKickEnergy * 0.5;
    const sizeMultiplier = baseSize * serum3SizeFactor;
    // SERUM 1: Trail thickness (glow) 1.6 at 0%, 3.8 at 100% (base doubled); 10x during 3:39:30–3:40
    const inTransition = playbackTime >= 219.5 && playbackTime <= 220;
    let trailThickness = 1.6 + serum1Intensity * 2.2;
    if (inTransition) trailThickness *= 10;
    this.trailMaterial.linewidth = inTransition ? 10 : 2;
    // 1:06–1:13: fade to 0.5x brightness/glow (mirrors camera 0.4x radius fade); 1:13 + 200ms fade back to 1x
    let brightnessGlowMult = 1.0;
    if (playbackTime >= 66 && playbackTime <= 73) brightnessGlowMult = 1 - 0.5 * (playbackTime - 66) / 7;
    else if (playbackTime > 73 && playbackTime < 73.2) brightnessGlowMult = 0.5 + 0.5 * (playbackTime - 73) / 0.2;
    this.material.uniforms.uBrightnessGlowMult.value = brightnessGlowMult;
    trailThickness *= brightnessGlowMult;

    // 2:13–2:30: lower glow with 3s fade in (2:13→2:16) and 3s fade out (2:27→2:30)
    let glow213230 = 1.0;
    if (playbackTime >= 133 && playbackTime < 136) glow213230 = 1.0 - 0.4 * (playbackTime - 133) / 3;
    else if (playbackTime >= 136 && playbackTime <= 147) glow213230 = 0.6;
    else if (playbackTime > 147 && playbackTime <= 150) glow213230 = 0.6 + 0.4 * (playbackTime - 147) / 3;
    this.material.uniforms.uGlow213230.value = glow213230;

    // 3:11–3:39:30: fade main particle glow and opacity down by 75% (to 25%); 3:39:30–3:40: back to 100%
    let mainGlowOpacity311240 = 1.0;
    if (playbackTime >= 191 && playbackTime < 219.5) mainGlowOpacity311240 = 1.0 - 0.75 * (playbackTime - 191) / 28.5;
    else if (playbackTime >= 219.5 && playbackTime <= 220) mainGlowOpacity311240 = 0.25 + 0.75 * (playbackTime - 219.5) / 0.5;
    this.material.uniforms.uMainGlowOpacity311240.value = mainGlowOpacity311240;

    let opacityMultiplier = 0.2;
    // 2:13–2:22: half opacity for all particles
    if (playbackTime >= 133 && playbackTime < 142) opacityMultiplier *= 0.5;
    
    // FX: Control secondary effects, camera rotation speed, burst/explosion effects; death from 1:13 (else 0:49:30–1:13 timeline)
    const fxIntensity = this.smoothedFx;
    const fxDecayRate = fxIntensity;
    const deathDecay = this.getDeathDecay(playbackTime, fxDecayRate);
    const fxTransient = fxStem?.frequencyBands.transient || 0;
    const burstIntensity = fxTransient * 0.8 + fxIntensity * 0.2;

    // Pull to center 3:10–3:25 (ramp), hold until 3:39:30; bust out 3:39:30–3:40
    const pullStrength = playbackTime < 190 ? 0 : playbackTime < 205 ? (playbackTime - 190) / 15 : playbackTime < 219.5 ? 1 : 0;
    const inBurst = playbackTime >= 219.5 && playbackTime <= 220;
    
    // Update particles (only up to particleCount - controlled by Serum 3)
    for (let i = 0; i < this.particleCount; i++) {
      const particle = this.particles[i];
      
      // Update life: 0:49:30–1:13 timeline (exponential ramp, off 1:12–1:13); from 1:13 FX volume
      particle.life -= (deltaTime * deathDecay) / particle.lifetime;

      if (particle.life <= 0) {
        this.spawnParticle(i, synthStem);
        continue;
      }
      
      // Apply forces
      const distFromCenter = particle.position.length() || 0.001;
      const outwardDir = particle.position.clone().divideScalar(distFromCenter);
      if (pullStrength > 0) {
        // Pull into center (3:10–3:25 ramp, hold until 3:39:30); skip default outward
        if (distFromCenter > 0.1) {
          particle.velocity.addScaledVector(outwardDir, -pullStrength * 10 * deltaTime);
        }
      } else {
        // Continuous outward force from origin (pushes particles away from center)
        particle.velocity.add(outwardDir.multiplyScalar(1.8 * deltaTime));
      }

      // BASS: Some particles orbit in curves (spread/dispersion pattern)
      // Only when Serum 3 is on; disabled during pull-in (3:10–3:39:30).
      // Orbit radius oscillates: S3 0% → 5–10, S3 100% → 50–100.
      if (serum3IsOn && pullStrength === 0 && i % 2 === 0) {
        const minRadius = 1 + this.smoothedSerum3 * 249;   // smoothed: 1 at 0%, 250 at 100%
        const maxRadius = 2 + this.smoothedSerum3 * 498;   // smoothed: 2 at 0%, 500 at 100%
        const t = (Math.sin(this.time) + 1) / 2;      // 0–1
        const orbitRadius = minRadius + t * (maxRadius - minRadius);
        // Use this.time instead of Date.now() for frame-consistent rotation
        const angle = i * 0.1 + this.time * (1 + bassIntensity * 0.2);
        const orbitX = Math.cos(angle) * orbitRadius;
        const orbitZ = Math.sin(angle) * orbitRadius;
        particle.velocity.x += (orbitX - particle.position.x) * 0.18;
        particle.velocity.z += (orbitZ - particle.position.z) * 0.18;
      }
      
      // SERUM 1: Y randomness — when on, add random vertical velocity; when off, none
      if (serum1Intensity > 0.01) {
        particle.velocity.y += (Math.random() - 0.5) * serum1Intensity * 15.0;
      }
      
      // FX: Burst/explosion effects on transients (stronger outward)
      if (burstIntensity > 0.3) {
        const burstDirection = particle.position.clone().normalize();
        const burstStrength = burstIntensity * 3.5;  // was 2.0
        particle.velocity.add(burstDirection.multiplyScalar(burstStrength * deltaTime));
      }

      // Timeline burst: 3:39:30–3:40 — explode outward from center after pull-in
      if (inBurst) {
        const burstSpeed = 40 * deltaTime;
        if (distFromCenter < 0.5) {
          const th = Math.random() * Math.PI * 2;
          const ph = Math.acos(2 * Math.random() - 1);
          particle.velocity.x += Math.sin(ph) * Math.cos(th) * burstSpeed;
          particle.velocity.y += Math.cos(ph) * burstSpeed;
          particle.velocity.z += Math.sin(ph) * Math.sin(th) * burstSpeed;
        } else {
          particle.velocity.x += (particle.position.x / distFromCenter) * burstSpeed;
          particle.velocity.y += (particle.position.y / distFromCenter) * burstSpeed;
          particle.velocity.z += (particle.position.z / distFromCenter) * burstSpeed;
        }
      }
      
      // SERUM 2: Timeline-based velocity boost (fade in 3:39:30–3:40, intensity drops at 4:09)
      particle.velocity.multiplyScalar(0.98);
      const serum2Intensity = this.getSerum2Intensity(playbackTime);
      particle.velocity.multiplyScalar(1.0 + serum2Intensity * 0.2);
      
      particle.velocity.multiplyScalar(serum3SpeedMultiplier);
      
      // Update position
      particle.position.add(particle.velocity.clone().multiplyScalar(deltaTime));
      
      // Wrap around if too far
      const maxDist = 50;
      if (Math.abs(particle.position.x) > maxDist) particle.position.x *= -0.9;
      if (Math.abs(particle.position.y) > maxDist) particle.position.y *= -0.9;
      if (Math.abs(particle.position.z) > maxDist) particle.position.z *= -0.9;
      
      // Update size (BASS controlled)
      particle.size = particle.baseSize * sizeMultiplier;
      
      // Update color: BASS → blue, Serum 2 → light green (timeline-based; intensity drops at 4:09)
      particle.color.copy(this.baseParticleColor);
      particle.color.lerp(this.bassBlueColor, bassIntensity);
      particle.color.lerp(this.serum2GreenColor, serum2Intensity * 0.6);
      
      // Update trail
      if (particle.hasTrail) {
        particle.trail.push(particle.position.clone());
        if (particle.trail.length > MAX_TRAIL_LENGTH) {
          particle.trail.shift();
        }
      }
    }
    
    // Update points
    this.updatePoints(opacityMultiplier, serum3IsOn, pullStrength);
    
    // Update trails
    this.updateTrails(trailThickness);
  }
  
  private spawnParticle(index: number, _synthStem?: StemData): void {
    const particle = this.particles[index];

    // Spawn at OBJ position (spawn point) with small random offset
    const spread = 2.0;
    particle.position.set(
      this.spawnPoint.x + (Math.random() - 0.5) * spread,
      this.spawnPoint.y + (Math.random() - 0.5) * spread,
      this.spawnPoint.z + (Math.random() - 0.5) * spread
    );

    const angle = Math.random() * Math.PI * 2;
    const elevation = Math.random() * Math.PI * 0.8 + Math.PI * 0.1;
    const speed = 1.8 + Math.random() * 2.4;  // was 1–3, now 1.8–4.2 for stronger outward on spawn
    particle.velocity.set(
      Math.sin(elevation) * Math.cos(angle) * speed,
      Math.cos(elevation) * speed,
      Math.sin(elevation) * Math.sin(angle) * speed
    );

    particle.lifetime = 0.75 + Math.random() * 4.25; // Per-particle longevity (0.75–5)
    particle.life = 1.0;
    
    // Random size (0.1x to 1x)
    particle.size = 0.1 + Math.random() * 0.9;
    particle.baseSize = particle.size;
    
    // Base color (Bass + Serum 2 modulate in update)
    particle.color.copy(this.baseParticleColor);
    particle.baseColor.copy(this.baseParticleColor);
    
    // Clear trail
    particle.trail = [];
  }
  
  private updatePoints(opacityMultiplier: number, serum3IsOn: boolean, pullStrength: number): void {
    for (let i = 0; i < this.particles.length; i++) {
      const particle = this.particles[i];
      const i3 = i * 3;
      
      // Update position
      this.positions[i3] = particle.position.x;
      this.positions[i3 + 1] = particle.position.y;
      this.positions[i3 + 2] = particle.position.z;
      
      // Update color with opacity
      const color = particle.color;
      const opacity = particle.life * opacityMultiplier;
      this.colors[i3] = color.r * opacity;
      this.colors[i3 + 1] = color.g * opacity;
      this.colors[i3 + 2] = color.b * opacity;
      
      // Update size
      this.sizes[i] = particle.size;
      
      // Update life
      this.lives[i] = particle.life;
      
      // isOrbit: 1 when in orbit (S3 on, no pull, even index), 0 otherwise; used to reduce glow/opacity for non-orbit
      this.isOrbit[i] = (serum3IsOn && pullStrength === 0 && i % 2 === 0) ? 1.0 : 0.0;
    }
    
    // Mark attributes as needing update
    this.geometry.attributes.position.needsUpdate = true;
    this.geometry.attributes.color.needsUpdate = true;
    this.geometry.attributes.size.needsUpdate = true;
    this.geometry.attributes.life.needsUpdate = true;
    this.geometry.attributes.isOrbit.needsUpdate = true;
  }
  
  private updateTrails(trailThickness: number): void {
    const positions: number[] = [];
    const colors: number[] = [];
    const indices: number[] = [];
    
    let vertexIndex = 0;
    
    for (const particle of this.particles) {
      if (!particle.hasTrail || particle.trail.length < 2) continue;
      
      for (let i = 0; i < particle.trail.length; i++) {
        const point = particle.trail[i];
        positions.push(point.x, point.y, point.z);
        
        // Fade trail from front to back (Serum 1 controls trail thickness/glow)
        // Base glow 75% of original (0.8 -> 0.6)
        const life = i / particle.trail.length;
        const alpha = (1.0 - life) * 0.6 * trailThickness;
        
        const color = particle.color;
        colors.push(
          color.r * alpha,
          color.g * alpha,
          color.b * alpha
        );
        
        if (i > 0) {
          indices.push(vertexIndex - 1, vertexIndex);
        }
        vertexIndex++;
      }
    }
    
    if (positions.length === 0) {
      this.trailLines.visible = false;
      return;
    }
    
    this.trailLines.visible = true;
    
    // Update geometry
    this.trailGeometry.setAttribute('position', new THREE.Float32BufferAttribute(positions, 3));
    this.trailGeometry.setAttribute('color', new THREE.Float32BufferAttribute(colors, 3));
    this.trailGeometry.setIndex(indices);
  }
  
  public getPoints(): THREE.Points {
    return this.points;
  }
  
  public getTrailLines(): THREE.LineSegments {
    return this.trailLines;
  }
  
  public setSpawnPoint(position: THREE.Vector3): void {
    this.spawnPoint.copy(position);
  }

  public adjustQuality(_fps: number): void {
    // Quality adjustment disabled - particle count is now solely controlled by Serum 3
    // This method is kept for API compatibility but does nothing
    // Particle count: 0-5000 based on Serum 3 volume (0% = 0 particles, 100% = 5000 particles)
  }
  
  public dispose(): void {
    this.geometry.dispose();
    this.material.dispose();
    this.trailGeometry.dispose();
    this.trailMaterial.dispose();
  }
}
