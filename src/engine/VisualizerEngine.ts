import * as THREE from 'three';
import { ParticleSystem } from './ParticleSystem';
import { VocalParticleSystem } from './VocalParticleSystem';
import type { MultiStemAudioController } from '../audio/MultiStemAudioController';
import { getOptimalPixelRatio } from '../utils/deviceUtils';

export class VisualizerEngine {
  private scene: THREE.Scene;
  private camera: THREE.PerspectiveCamera;
  private renderer: THREE.WebGLRenderer;
  
  private particleSystem: ParticleSystem;
  private vocalParticleSystem: VocalParticleSystem;
  private audioController: MultiStemAudioController | null = null;
  
  private animationId: number | null = null;
  private width: number = 600;
  private height: number = 600;
  private lastTime: number = 0;
  private frameCount: number = 0;
  private fpsTime: number = 0;
  
  // Camera state - orbital rotation around center
  private cameraAngle: number = 0; // Rotation angle around center
  private cameraRadius: number = 10; // Distance from center
  private cameraHeight: number = 0; // Height offset
  private cameraRotation = new THREE.Euler(0, 0, 0);
  
  // Camera movement smoothing
  private cameraShake = new THREE.Vector3(0, 0, 0);
  
  // Base rotation speed
  private baseRotationSpeed: number = 0.1; // radians per second
  
  // Serum 1 progressive speed tracking
  private serum1SpeedMultiplier: number = 1.0; // Current speed multiplier from Serum 1
  
  // Radius random state for sporadic movement
  private radiusRandomTime: number = 0;
  private currentRandomRadius: number = 12;
  
  // Serum 2 ethereal mode: drift and look-at wandering
  private etherealTime: number = 0;
  
  // Audio-reactive camera state
  private smoothedDrums: number = 0;
  private smoothedFx: number = 0;
  private smoothedBass: number = 0;
  private smoothedSerum2: number = 0; // timeline-based: fade in 3:39:30–3:40, on until end
  private serum2Intensity: number = 0; // intensity multiplier: drops at 4:09 for some effects
  private smoothedLookAtScale: number = 0; // smooth fade for Serum 2 look-at wander
  private smoothedVocals: number = 0; // for blue overlay 2:55:45–3:25
  
  // Performance monitoring
  private frameTimeHistory: number[] = [];
  private lastFpsCheck: number = 0;
  private maxDeltaTimeInPeriod: number = 0;
  private clampedCountInPeriod: number = 0;
  
  // Fog for depth
  private fog: THREE.FogExp2;

  // Scene render target for vocal sphere refraction (scene without sphere/smoke)
  private sceneRenderTarget: THREE.WebGLRenderTarget;

  // Serum 2 blue overlay: additive blend (black→blue, white→white)
  private overlayScene: THREE.Scene;
  private overlayCamera: THREE.OrthographicCamera;
  private overlayMesh: THREE.Mesh;

  // Mouse-based camera offset (null = no mouse over canvas, offsets are 0)
  private mouseNormX: number | null = null;
  private mouseNormY: number | null = null;
  private smoothedMouseYaw: number = 0;
  private smoothedMouseTilt: number = 0;
  private mouseEnterTime: number = 0; // for fading smoothing from .006 to .06 over 2s on enter
  private readonly _worldUp = new THREE.Vector3(0, 1, 0);
  
  // Raycaster for click detection
  private raycaster: THREE.Raycaster;

  constructor(
    canvas: HTMLCanvasElement,
    audioController?: MultiStemAudioController,
    options?: { centerModelUrl?: string }
  ) {
    try {
      this.audioController = audioController || null;
      this.width = canvas.width;
      this.height = canvas.height;
    
      // Create scene with dark background
      this.scene = new THREE.Scene();
      this.scene.background = new THREE.Color(0x000000);
      
      // Add fog for depth
      this.fog = new THREE.FogExp2(0x000000, 0.02);
      this.scene.fog = this.fog;
      
      // Create camera - will orbit around center
      const aspect = this.width / this.height;
      this.camera = new THREE.PerspectiveCamera(75, aspect, 0.1, 1000);
      this.camera.position.set(this.cameraRadius, 0, 0); // Start at initial radius
      this.camera.lookAt(0, 0, 0); // Look at center
      
      // Create renderer
      this.renderer = new THREE.WebGLRenderer({
        canvas,
        alpha: true,
        antialias: true,
        powerPreference: 'high-performance',
      });
      this.renderer.setSize(this.width, this.height);
      this.renderer.setPixelRatio(getOptimalPixelRatio());
      this.renderer.setClearColor(0x000000, 1);
      
      // Enable tone mapping for bloom effect
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.2;
      
      // Create particle system
      this.particleSystem = new ParticleSystem();
      this.scene.add(this.particleSystem.getPoints());
      this.scene.add(this.particleSystem.getTrailLines());
      
      // Create vocal particle system (glowing center mesh: sphere then OBJ when loaded)
      this.vocalParticleSystem = new VocalParticleSystem(options?.centerModelUrl);
      this.scene.add(this.vocalParticleSystem.getParticle());
      this.scene.add(this.vocalParticleSystem.getSmokeParticles());
      
      // Add ambient light for subtle illumination
      const ambientLight = new THREE.AmbientLight(0xffffff, 0.1);
      this.scene.add(ambientLight);

      // Render target for scene (used by vocal sphere refraction)
      this.sceneRenderTarget = new THREE.WebGLRenderTarget(this.width, this.height, {
        minFilter: THREE.LinearFilter,
        magFilter: THREE.LinearFilter,
      });
      
      // Serum 2 overlay: full-screen blue with additive blend (black→blue, white→white)
      this.overlayScene = new THREE.Scene();
      this.overlayCamera = new THREE.OrthographicCamera(-1, 1, 1, -1, -1, 1);
      const overlayGeom = new THREE.PlaneGeometry(2, 2);
      const overlayMat = new THREE.MeshBasicMaterial({
        color: 0x194fcd,
        transparent: true,
        opacity: 1,
        depthTest: false,
        depthWrite: false,
        blending: THREE.AdditiveBlending,
      });
      this.overlayMesh = new THREE.Mesh(overlayGeom, overlayMat);
      this.overlayScene.add(this.overlayMesh);
      this.renderer.autoClear = false;
      
      // Initialize raycaster for click detection
      this.raycaster = new THREE.Raycaster();
      
      this.lastTime = performance.now();
      this.lastFpsCheck = performance.now();
    } catch (error) {
      throw error;
    }
  }
  
  public start(): void {
    if (this.animationId !== null) {
      return;
    }
    this.animate(performance.now());
  }
  
  public stop(): void {
    if (this.animationId !== null) {
      cancelAnimationFrame(this.animationId);
      this.animationId = null;
    }
  }
  
  public resize(width: number, height: number): void {
    this.width = width;
    this.height = height;
    const aspect = width / height;
    this.camera.aspect = aspect;
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(width, height);
    this.renderer.setPixelRatio(getOptimalPixelRatio());
    this.sceneRenderTarget.setSize(width, height);
  }

  /**
   * Set mouse position over the visualizer canvas (normalized 0–1).
   * Pass null when the mouse leaves the canvas so pan/tilt offsets are zero.
   */
  public setMousePosition(normX: number | null, normY: number | null): void {
    const wasOver = this.mouseNormX != null;
    this.mouseNormX = normX;
    this.mouseNormY = normY;
    if (!wasOver && normX != null) this.mouseEnterTime = performance.now();
  }

  /**
   * Handle mouse down on the canvas. Uses raycasting to detect if the center OBJ was clicked.
   */
  public handleMouseDown(clientX: number, clientY: number, canvasRect: DOMRect): boolean {
    // Convert screen coordinates to normalized device coordinates (-1 to +1)
    const x = ((clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
    const y = -((clientY - canvasRect.top) / canvasRect.height) * 2 + 1;

    // Update raycaster with camera and mouse position
    this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);

    // Check if the ray intersects with the center particle mesh
    const centerParticle = this.vocalParticleSystem.getParticle();
    const intersects = this.raycaster.intersectObject(centerParticle);

    if (intersects.length > 0) {
      // Center OBJ was clicked, start drag and make it grow
      this.vocalParticleSystem.growOnMouseDown();
      this.vocalParticleSystem.startDrag();
      return true; // Indicates drag started
    }
    return false;
  }

  /**
   * Handle mouse move during drag. Updates the OBJ position.
   */
  public handleMouseMove(clientX: number, clientY: number, canvasRect: DOMRect, isDragging: boolean): void {
    if (!isDragging) return;

    // Convert screen coordinates to normalized device coordinates (-1 to +1)
    const x = ((clientX - canvasRect.left) / canvasRect.width) * 2 - 1;
    const y = -((clientY - canvasRect.top) / canvasRect.height) * 2 + 1;

    // Create a ray from the camera through the mouse position
    this.raycaster.setFromCamera(new THREE.Vector2(x, y), this.camera);

    // Find intersection with a plane at the center of the scene
    // Use a plane that's perpendicular to the camera's forward direction
    const centerParticle = this.vocalParticleSystem.getParticle();
    const currentZ = centerParticle.position.z;
    
    // Create a plane at the OBJ's current depth (perpendicular to Z axis)
    const planeNormal = new THREE.Vector3(0, 0, 1);
    const plane = new THREE.Plane(planeNormal, -currentZ);
    const intersectionPoint = new THREE.Vector3();
    const result = this.raycaster.ray.intersectPlane(plane, intersectionPoint);

    if (result) {
      this.vocalParticleSystem.updateDrag(intersectionPoint);
    }
  }

  /**
   * Handle mouse up. Resets scale and starts return to center animation.
   */
  public handleMouseUp(): void {
    this.vocalParticleSystem.endDrag();
    // Reset scale immediately on mouse up
    this.vocalParticleSystem.resetScaleOnMouseUp();
  }
  
  /** Serum 2 timeline: faded in 3:39:30–3:40, on until end (no longer from audio). */
  private getSerum2Level(playbackTime: number): number {
    if (playbackTime < 219.5) return 0; // 3:39.5
    if (playbackTime <= 220) return (playbackTime - 219.5) / 0.5; // 3:40
    return 1;
  }

  /** Serum 2 intensity: same as level until 4:09, then fades to 0.5 over 5s for some effects. */
  private getSerum2Intensity(playbackTime: number): number {
    const level = this.getSerum2Level(playbackTime);
    if (playbackTime < 249) return level; // 4:09
    if (playbackTime <= 254) return 1 + (0.5 - 1) * (playbackTime - 249) / 5;
    return 0.5;
  }

  /** Early blue background: start at 100%, fade 1:44–2:15 to 50%, hold until 2:26:30, then off. */
  private getEarlyBlueLevel(playbackTime: number): number {
    if (playbackTime < 104) return 1.0; // start at 100% until 1:44
    if (playbackTime < 135) return 1.0 + (0.5 - 1.0) * (playbackTime - 104) / (135 - 104); // 1:44–2:15: 100% → 50%
    if (playbackTime < 146.5) return 0.5; // 2:26:30
    return 0; // off at exactly 2:26:30
  }

  private updateCamera(
    deltaTime: number,
    drumsStem?: any,
    bassStem?: any,
    serum1Stem?: any,
    fxStem?: any,
    serum3Stem?: any,
    playbackTime: number = 0
  ): void {
    // Smooth audio data
    const smoothingFactor = 0.1;
    const bassSmoothingFactor = 0.14; // bass slightly less smooth for snappier camera/radius
    if (drumsStem) {
      this.smoothedDrums = this.smoothedDrums * (1 - smoothingFactor) + drumsStem.frequencyBands.overall * smoothingFactor;
    }
    if (bassStem) {
      this.smoothedBass = this.smoothedBass * (1 - bassSmoothingFactor) + bassStem.frequencyBands.bass * bassSmoothingFactor;
    }
    if (fxStem) {
      this.smoothedFx = this.smoothedFx * (1 - smoothingFactor) + fxStem.frequencyBands.overall * smoothingFactor;
    }
    // serum2 smoothing is done in animate() so overlay works when camera movement is off
    
    // BASS: Controls rotation speed multiplier and radius from center
    const bassVolume = bassStem?.frequencyBands.overall || 0;
    const bassRotationMultiplier = 1.0 + bassVolume * 2.0; // 1x to 3x speed
    
    // Check if bass is loudest for sporadic radius movement
    const bassOverall = bassStem?.frequencyBands.overall || 0;
    const drumsOverall = drumsStem?.frequencyBands.overall || 0;
    // Serum 1: manually off 3:25–3:39:30, else from audio
    const serum1Raw = serum1Stem?.frequencyBands.overall || 0;
    const serum1Overall = (playbackTime >= 205 && playbackTime < 219.5) ? 0 : serum1Raw;
    const fxOverall = fxStem?.frequencyBands.overall || 0;
    const bassIsLoudest = bassOverall > drumsOverall && 
                          bassOverall > serum1Overall && 
                          bassOverall > fxOverall &&
                          bassOverall > 0.2;
    
    // SERUM 3: Randomly/sporadically set radius to 0.5 when on and louder than 60%
    const serum3Intensity = serum3Stem?.frequencyBands.overall || 0;
    const serum3IsOn = serum3Intensity > 0.6;
    
    // SERUM 2: Ethereal mode — radius -5 to 30, loose/free-flowing camera, still beat-reactive (smoothed)
    const serum2IsOn = this.smoothedSerum2 > 0.01;
    
    // Update random radius time for sporadic changes
    this.radiusRandomTime += deltaTime;
    
    let targetRadius: number;
    
    if (serum3IsOn && Math.random() < 0.05) {
      // 5% chance per frame to snap to 0.5 when Serum 3 is on
      targetRadius = 0.5;
      this.currentRandomRadius = 0.5;
    } else if (bassIsLoudest) {
      // When bass is loudest: random/sporadic movement between 12 and 25
      // Change random radius sporadically (every ~0.3 seconds on average)
      if (this.radiusRandomTime > 0.2 + Math.random() * 0.4) {
        this.currentRandomRadius = 12 + Math.random() * (25 - 12);
        this.radiusRandomTime = 0;
      }
      targetRadius = this.currentRandomRadius;
    } else if (bassVolume === 0) {
      // When bass volume is 0%: radius is 3
      targetRadius = 3;
      this.currentRandomRadius = 3;
    } else {
      // Smooth transition between 3 and 12 when bass is not loudest
      targetRadius = 3 + bassVolume * (12 - 3);
      this.currentRandomRadius = targetRadius;
    }
    
    // SERUM 2: Remap radius to -5..30 (same beat logic, wider range including “through” center)
    if (serum2IsOn) {
      this.etherealTime += deltaTime;
      const rMin = 0.5, rMax = 25;
      const norm = (targetRadius - rMin) / (rMax - rMin);
      targetRadius = -5 + norm * (30 - (-5));
      targetRadius = Math.max(-5, Math.min(30, targetRadius));
    }
    
    // Smooth radius change (looser when Serum 2 ethereal)
    const radiusLerp = serum2IsOn ? Math.min(1, deltaTime * 0.8) : Math.min(1, deltaTime * 2);
    this.cameraRadius += (targetRadius - this.cameraRadius) * radiusLerp;
    
    // SERUM 1: Progressive speed multiplier (adds to camera speed)
    // When Serum 1 is on, progressively speeds up. When off, slows to normal. Manually off 3:25–3:39:30.
    const serum1Intensity = (playbackTime >= 205 && playbackTime < 219.5) ? 0 : serum1Raw;
    const serum1TargetMultiplier = 1.0 + serum1Intensity * 2.0; // 1x to 3x when Serum 1 is on
    
    // Progressive speed change (smooth acceleration/deceleration)
    const speedChangeRate = 2.0; // How fast speed changes
    if (serum1Intensity > 0.01) {
      // Speeding up when Serum 1 is on
      this.serum1SpeedMultiplier += (serum1TargetMultiplier - this.serum1SpeedMultiplier) * speedChangeRate * deltaTime;
    } else {
      // Slowing down when Serum 1 is off
      this.serum1SpeedMultiplier += (1.0 - this.serum1SpeedMultiplier) * speedChangeRate * deltaTime;
    }
    
    // SERUM 3: Additive factor to camera speed (reuse serum3Intensity from above)
    const serum3SpeedAdd = serum3Intensity * 0.5; // Adds up to 0.5x speed
    
    // Calculate final rotation speed (Serum 1, bass, Serum 3 all still apply)
    let finalRotationSpeed = (this.baseRotationSpeed + serum3SpeedAdd) * bassRotationMultiplier * this.serum1SpeedMultiplier;
    // SERUM 2: Faster orbit and ebb/flow when on (intensity drops at 4:09)
    if (serum2IsOn) {
      finalRotationSpeed *= (1 + this.smoothedSerum2 * 1.0 * this.serum2Intensity); // up to 2x at 100%
      finalRotationSpeed *= 1 + 0.12 * Math.sin(this.etherealTime * 0.4) * this.serum2Intensity;
    }
    
    // Update camera angle (orbital rotation)
    this.cameraAngle += finalRotationSpeed * deltaTime;
    
    // Time-based radius mult
    const pt = playbackTime;
    let radiusMult = 1;
    // 1:06–1:13: fade to 0.4x; at 1:13, 200ms fade off to 1x
    if (pt >= 66 && pt <= 73) radiusMult = 1 - 0.6 * (pt - 66) / 7;
    else if (pt > 73 && pt < 73.2) radiusMult = 0.4 + 0.6 * (pt - 73) / 0.2;
    // 1:42–1:46 ramp to 0.5x, 2:13–2:22 ramp back to 1x
    else if (pt >= 102 && pt <= 106) radiusMult = 1 - 0.5 * (pt - 102) / 4;
    else if (pt > 106 && pt < 133) radiusMult = 0.5;
    else if (pt >= 133 && pt <= 142) radiusMult = 0.5 + 0.5 * (pt - 133) / 9;
    const effectiveRadius = this.cameraRadius * radiusMult;

    // Mouse-based offsets (inverted pan, 0.5× scale, smoothed); zero when mouse not over canvas
    // Mouse X → camera Y rotation (yaw, inverted). Mouse Y → camera tilt via look-at target Y.
    const mouseEffectScale = 0.5;
    const targetYaw = this.mouseNormX != null ? (0.5 - this.mouseNormX) * 1.5 * mouseEffectScale : 0;
    const targetTilt = this.mouseNormY != null ? (0.5 - this.mouseNormY) * 8 * mouseEffectScale : 0;
    const mouseOverCanvas = this.mouseNormX != null;
    let mouseSmoothing: number;
    if (mouseOverCanvas) {
      const elapsed = (performance.now() - this.mouseEnterTime) / 1000;
      const progress = Math.min(1, elapsed / 2); // fade .006 → .06 over 2s on enter
      mouseSmoothing = 0.006 + (0.06 - 0.006) * progress;
    } else {
      mouseSmoothing = 0.006; // 10× smoother when mouse has left
    }
    this.smoothedMouseYaw += (targetYaw - this.smoothedMouseYaw) * mouseSmoothing;
    this.smoothedMouseTilt += (targetTilt - this.smoothedMouseTilt) * mouseSmoothing;

    // Calculate camera position in orbit (no mouse on position)
    const x = Math.cos(this.cameraAngle) * effectiveRadius;
    const z = Math.sin(this.cameraAngle) * effectiveRadius;
    const y = this.cameraHeight;
    
    // SERUM 1: Also affects camera position (adds movement)
    const serum1PositionAdd = serum1Intensity * 2.0; // Adds up to 2 units of movement
    this.camera.position.set(
      x + Math.sin(this.cameraAngle * 0.5) * serum1PositionAdd,
      y + Math.cos(this.cameraAngle * 0.3) * serum1PositionAdd,
      z + Math.sin(this.cameraAngle * 0.7) * serum1PositionAdd
    );
    
    // SERUM 2: Ethereal position drift — free-flowing through the space (intensity drops at 4:09)
    if (serum2IsOn) {
      const driftAmp = 6 * this.serum2Intensity;
      const t = this.etherealTime;
      this.camera.position.x += Math.sin(t * 0.2) * driftAmp;
      this.camera.position.y += Math.sin(t * 0.25 + 1) * driftAmp;
      this.camera.position.z += Math.sin(t * 0.18 + 2) * driftAmp;
    }
    
    // SERUM 1: Affects rotation on all axes (progressive speed up/slow down)
    const serum1RotationMultiplier = this.serum1SpeedMultiplier;
    const rotationSpeedX = 0.1 * serum1RotationMultiplier;
    const rotationSpeedY = 0.15 * serum1RotationMultiplier;
    const rotationSpeedZ = 0.08 * serum1RotationMultiplier;
    
    // Update camera rotation (all axes affected by Serum 1)
    this.cameraRotation.x += rotationSpeedX * deltaTime;
    this.cameraRotation.y += rotationSpeedY * deltaTime;
    this.cameraRotation.z += rotationSpeedZ * deltaTime;
    
    // Apply rotation
    this.camera.rotation.copy(this.cameraRotation);
    
    // Smoothed scale for Serum 2 look-at (±5) — fades in/out; intensity drops at 4:09
    this.smoothedLookAtScale += (this.smoothedSerum2 * this.serum2Intensity - this.smoothedLookAtScale) * 0.04;

    // Always point the view at a look-at target; scaled by smoothed Serum 2 (±5 when on)
    const t = this.etherealTime;
    let lookX = Math.sin(t * 0.12) * 5 * this.smoothedLookAtScale;
    let lookY = Math.sin(t * 0.17 + 1) * 5 * this.smoothedLookAtScale;
    let lookZ = Math.sin(t * 0.13 + 2) * 5 * this.smoothedLookAtScale;
    // 1:42–2:22: slow ±0.75 wander of look-at, faded in 1:42–1:46 and out 2:13–2:22
    let tfAmp = 0;
    if (pt >= 102 && pt <= 106) tfAmp = 0.75 * (pt - 102) / 4;
    else if (pt > 106 && pt < 133) tfAmp = 0.75;
    else if (pt >= 133 && pt <= 142) tfAmp = 0.75 * (142 - pt) / 9;
    lookX += Math.sin(pt * 0.2) * tfAmp;
    lookY += Math.sin(pt * 0.25 + 1) * tfAmp;
    lookZ += Math.sin(pt * 0.15 + 2) * tfAmp;
    this.camera.lookAt(lookX, lookY + this.smoothedMouseTilt, lookZ);

    // Mouse: pan by rotating around world Y so direction is consistent at any orbit angle
    this.camera.rotateOnWorldAxis(this._worldUp, this.smoothedMouseYaw);

    // BASS: Camera shake only when bass is loudest stem (reuse variables from above)
    
    // Only shake when bass is loudest (softer when Serum 2 ethereal)
    let shakeIntensity = 0;
    if (bassIsLoudest) {
      const bassKickFreq = bassStem?.frequencyBands.bassRaw?.slice(2, 8) || [];
      const bassKickEnergy = bassKickFreq.length > 0
        ? bassKickFreq.reduce((a: number, b: number) => a + b, 0) / (bassKickFreq.length * 255)
        : 0;
      shakeIntensity = bassKickEnergy * 0.15 + bassOverall * 0.1;
      if (serum2IsOn) shakeIntensity *= 0.35;
    }
    
    // Apply camera shake
    this.cameraShake.x = (Math.random() - 0.5) * shakeIntensity * 0.15;
    this.cameraShake.y = (Math.random() - 0.5) * shakeIntensity * 0.15;
    this.cameraShake.z = (Math.random() - 0.5) * shakeIntensity * 0.1;
    this.cameraShake.multiplyScalar(0.85);
    
    this.camera.position.add(this.cameraShake);
  }
  
  private animate = (currentTime: number): void => {
    this.animationId = requestAnimationFrame(this.animate);
    
    const deltaTime = (currentTime - this.lastTime) / 1000;
    this.lastTime = currentTime;
    this.maxDeltaTimeInPeriod = Math.max(this.maxDeltaTimeInPeriod, deltaTime);
    if (deltaTime > 0.1) this.clampedCountInPeriod++;
    const clampedDelta = Math.min(deltaTime, 0.1);
    
    // Get all stem data
    let allStemData: Map<string, any> | null = null;
    if (this.audioController) {
      allStemData = this.audioController.getAllStemData();
    }
    
    const drumsStem = allStemData?.get('DRUMS');
    const bassStem = allStemData?.get('BASS');
    const synthStem = allStemData?.get('SYNTH');
    const vocalsStem = allStemData?.get('VOCALS');
    const fxStem = allStemData?.get('AUX_FX');
    const serum1Stem = allStemData?.get('SERUM_1');
    const serum3Stem = allStemData?.get('SERUM_3');

    // Playback time in seconds (for time-based effects)
    const playbackTime = this.audioController?.getCurrentTime() ?? 0;

    // Serum 2: timeline-based (fade in 3:39:30–3:40, on until end; intensity drops at 4:09)
    this.smoothedSerum2 = this.getSerum2Level(playbackTime);
    this.serum2Intensity = this.getSerum2Intensity(playbackTime);

    // Vocals: for blue overlay 2:55:45–3:25
    const vocalSmoothing = 0.15;
    this.smoothedVocals = this.smoothedVocals * (1 - vocalSmoothing) + (vocalsStem?.frequencyBands.overall || 0) * vocalSmoothing;

    // Update camera (orbital rotation around center)
    this.updateCamera(clampedDelta, drumsStem, bassStem, serum1Stem, fxStem, serum3Stem, playbackTime);

    // Update spawn point to follow OBJ position
    const objPosition = this.vocalParticleSystem.getParticle().position;
    this.particleSystem.setSpawnPoint(objPosition);
    
    // Update particle system
    this.particleSystem.update(
      clampedDelta,
      drumsStem,
      bassStem,
      synthStem,
      vocalsStem,
      fxStem,
      serum1Stem,
      serum3Stem,
      playbackTime
    );
    
    // Update vocal particle system
    this.vocalParticleSystem.update(clampedDelta, vocalsStem, serum1Stem, playbackTime);
    
    // Update fog density based on overall energy
    const overallEnergy = drumsStem?.frequencyBands.overall || 0;
    this.fog.density = 0.015 + overallEnergy * 0.01;

    // Pre-pass: render scene without vocal sphere to RTT for refraction; include smoke so it’s visible through the orb
    const sphere = this.vocalParticleSystem.getParticle();
    sphere.visible = false;
    this.vocalParticleSystem.setSmokeOpacityMultiplier(0.05); // smoke inside sphere at 5%
    try {
      this.renderer.setRenderTarget(this.sceneRenderTarget);
      this.renderer.clear();
      this.renderer.render(this.scene, this.camera);
    } finally {
      sphere.visible = true;
      this.vocalParticleSystem.setSmokeOpacityMultiplier(1.0); // smoke outside orb at 100%
    }
    this.renderer.setRenderTarget(null);
    this.vocalParticleSystem.setRefractionSource(
      this.sceneRenderTarget.texture,
      this.camera.projectionMatrix,
      this.camera.far
    );
    
    // Render: clear once, then main scene, then blue overlay when on (early 1:44–2:26:30, vocal 2:55:45–3:25, or Serum 2 from 3:39:30)
    this.renderer.clear();
    this.renderer.render(this.scene, this.camera);
    let blueOpacity = 0;
    const earlyBlue = this.getEarlyBlueLevel(playbackTime);
    if (earlyBlue > 0) {
      blueOpacity = earlyBlue;
    } else if (playbackTime >= 175.5 && playbackTime <= 205) {
      // 2:55:30–3:25: vocal blue. Fade in 2:55:30–2:56; floor ramps 2:55:45–3:25
      const fadeIn = playbackTime < 176 ? Math.min(1, (playbackTime - 175.5) / 0.5) : 1;
      const floor = playbackTime >= 175.75 ? 0.5 * (playbackTime - 175.75) / 29.25 : 0;
      const base = floor + (1 - floor) * this.smoothedVocals;
      blueOpacity = base * fadeIn;
    } else if (this.smoothedSerum2 > 0.01) {
      blueOpacity = this.serum2Intensity;
    }
    if (blueOpacity > 0.01) {
      (this.overlayMesh.material as THREE.MeshBasicMaterial).opacity = blueOpacity;
      this.renderer.render(this.overlayScene, this.overlayCamera);
    }
    
    // FPS monitoring and quality adjustment
    this.frameCount++;
    this.fpsTime += clampedDelta;
    
    const now = performance.now();
    if (now - this.lastFpsCheck > 1000) {
      const fps = Math.round(this.frameCount / this.fpsTime);
      this.frameTimeHistory.push(fps);
      if (this.frameTimeHistory.length > 10) {
        this.frameTimeHistory.shift();
      }
      
      const avgFps = this.frameTimeHistory.reduce((a: number, b: number) => a + b, 0) / this.frameTimeHistory.length;
      this.particleSystem.adjustQuality(avgFps);
      this.frameCount = 0;
      this.fpsTime = 0;
      this.maxDeltaTimeInPeriod = 0;
      this.clampedCountInPeriod = 0;
      this.lastFpsCheck = now;
    }
  };
  
  public dispose(): void {
    this.stop();
    this.particleSystem.dispose();
    this.vocalParticleSystem.dispose();
    this.sceneRenderTarget.dispose();
    this.overlayMesh.geometry.dispose();
    (this.overlayMesh.material as THREE.Material).dispose();
    this.renderer.dispose();
  }
}
