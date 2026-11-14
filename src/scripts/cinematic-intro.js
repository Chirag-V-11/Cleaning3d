/**
 * ============================================================================
 * CINEMATIC INTRO / SPLASH CONTROLLER
 * Full-screen 3D particle atmosphere, volumetric fog, dynamic rim lighting,
 * and progressive screen-space wipe reveal.
 * ============================================================================
 */

import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

/**
 * CONFIGURATION OBJECT
 * Easily customize branding, colors, particle count, model path, and timings.
 */
export const CINEMATIC_CONFIG = {
  // Brand name lines to reveal in large bold typography
  brandName1: "BRAZILIAN",
  brandName2: "CLEANING",

  // Tagline appearing beneath the headline
  tagline: "KEEPING YOUR SPACE PERFECT CLEAN",

  // Target anchor for entering the site
  enterUrl: "#hero",
  enterButtonText: "ENTER SITE",

  // 3D Model Path (GLB/GLTF)
  // Loads model.glb. If missing or fails, seamlessly falls back to glossy illuminated Torus Knot
  modelPath: "model.glb",

  // Animation Duration: 6-7 seconds
  animationDuration: 6.5,

  // Dust Particle System (THREE.Points)
  particleCount: 4200,         // 3,000 - 5,000 floating particles
  disturbRadius: 2.8,          // Radius around 3D model that pushes particles
  disturbStrength: 2.2,        // Swirl vortex and repulsion intensity

  // Scene Lighting & Aesthetics (#171717 / #06110C / #A31C1B)
  bgColor: 0x171717,           // Charcoal base [#171717]
  warmRimColor: 0xa31c1b,      // Crimson rim light [#a31c1b]
  coolRimColor: 0xf5f5f5,      // Specular edge rim light
  keyLightColor: 0xffffff,     // Soft key light
  particleColor: 0xf5f5f5,     // Crisp floating dust tint

  // Spatial Camera Projection
  cameraFov: 42,
  cameraZ: 7.2
};

export class CinematicIntro {
  constructor(options = {}) {
    this.config = { ...CINEMATIC_CONFIG, ...options };

    this.overlay = document.getElementById('cinematic-splash-overlay');
    this.canvas = document.getElementById('splash-canvas');
    this.brandTitle = document.getElementById('splashBrandTitle');
    this.brandTagline = document.getElementById('splashBrandTagline');
    this.enterBtnWrapper = document.getElementById('splashEnterBtnWrapper');
    this.enterBtn = document.getElementById('splashEnterBtn');
    this.skipBtn = document.getElementById('splashSkipBtn');
    this.loaderPill = document.getElementById('splash-loader-pill');

    if (!this.overlay || !this.canvas) return;

    // Apply config content
    const b1 = this.config.brandName1 || "BRAZILIAN";
    const b2 = this.config.brandName2 || "CLEANING";

    if (this.brandTitle) {
      this.brandTitle.innerHTML = `<span class="splash-brand-line">${b1}</span><span class="splash-brand-line">${b2}</span>`;
    }
    if (this.brandTagline) this.brandTagline.textContent = this.config.tagline;
    if (this.enterBtn) {
      this.enterBtn.setAttribute('href', this.config.enterUrl);
      const textSpan = this.enterBtn.querySelector('span:first-child');
      if (textSpan) textSpan.textContent = this.config.enterButtonText;
    }

    // State & Preferences
    this.prefersReducedMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    this.isDisposed = false;
    this.isPaused = false;
    this.sequenceCompleted = false;
    this.clock = new THREE.Clock();
    this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    this.travelBounds = { startX: -11.5, endX: 11.5 };

    // Prevent body scrolling while intro is active
    document.body.classList.add('splash-locked');

    // 1. Initialize Scene, Lighting & Particles
    this.initThree();
    this.initLights();
    this.initDustParticles();

    // 2. Start rendering loop immediately (particles & atmosphere live from frame 1)
    this.animate();

    // 3. Load 3D model or instant glossy fallback
    this.loadOrFallbackModel();

    // 4. Attach Event Listeners
    this.initEventListeners();

    if (this.prefersReducedMotion) {
      this.skipToComplete();
    }
  }

  /**
   * Initialize Three.js Scene, Camera, and High-Performance WebGL Renderer
   */
  initThree() {
    this.scene = new THREE.Scene();
    this.scene.fog = new THREE.FogExp2(this.config.bgColor, 0.045);

    this.camera = new THREE.PerspectiveCamera(
      this.config.cameraFov,
      window.innerWidth / window.innerHeight,
      0.1,
      100
    );
    this.camera.position.set(0, 0, this.config.cameraZ);

    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      alpha: true,
      antialias: true,
      powerPreference: 'high-performance'
    });

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    if (THREE.ACESFilmicToneMapping) {
      this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
      this.renderer.toneMappingExposure = 1.35;
    }

    // 3D Model Group Container
    this.modelGroup = new THREE.Group();
    this.scene.add(this.modelGroup);

    this.calculateTravelBounds();
  }

  /**
   * Calculate responsive 3D model travel bounds based on viewport aspect ratio
   */
  calculateTravelBounds() {
    const aspect = window.innerWidth / window.innerHeight;
    const visibleWidth = 2 * Math.tan(THREE.MathUtils.degToRad(this.config.cameraFov / 2)) * this.config.cameraZ * aspect;
    const margin = 3.8;
    this.travelBounds.startX = -(visibleWidth / 2 + margin);
    this.travelBounds.endX = (visibleWidth / 2 + margin);
  }

  /**
   * Lighting: Soft Key Light + Warm Amber & Cool Sapphire Dual Rim Lights
   */
  initLights() {
    // Ambient Base
    const ambient = new THREE.AmbientLight(0x1f1f24, 1.4);
    this.scene.add(ambient);

    // Soft Key Light
    const keyLight = new THREE.DirectionalLight(this.config.keyLightColor, 1.9);
    keyLight.position.set(6, 6, 8);
    this.scene.add(keyLight);

    // Crimson Rim Light (Back-Left, grazes model silhouettes in #A31C1B)
    const warmRim = new THREE.DirectionalLight(this.config.warmRimColor, 5.0);
    warmRim.position.set(-8, 3.5, -4.5);
    this.scene.add(warmRim);

    // Crisp Highlight Rim Light (Back-Right silhouette definition)
    const coolRim = new THREE.DirectionalLight(this.config.coolRimColor, 2.8);
    coolRim.position.set(8, -3.0, -4.5);
    this.scene.add(coolRim);

    // Soft Center Glow
    const centerPoint = new THREE.PointLight(0xffffff, 0.8, 16);
    centerPoint.position.set(0, 0, 2);
    this.scene.add(centerPoint);
  }

  /**
   * 3,000 - 5,000 Floating Dust Particles (THREE.Points) with Depth-of-Field Feel
   */
  initDustParticles() {
    const count = this.config.particleCount;
    const geometry = new THREE.BufferGeometry();

    const positions = new Float32Array(count * 3);
    const basePositions = new Float32Array(count * 3);
    const velocities = new Float32Array(count * 3);
    const seeds = new Float32Array(count);

    const rangeX = 28;
    const rangeY = 16;
    const rangeZ = 12;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      const x = (Math.random() - 0.5) * rangeX;
      const y = (Math.random() - 0.5) * rangeY;
      const z = (Math.random() - 0.5) * rangeZ - 0.5;

      positions[i3] = x;
      positions[i3 + 1] = y;
      positions[i3 + 2] = z;

      basePositions[i3] = x;
      basePositions[i3 + 1] = y;
      basePositions[i3 + 2] = z;

      velocities[i3] = 0;
      velocities[i3 + 1] = 0;
      velocities[i3 + 2] = 0;

      seeds[i] = Math.random() * Math.PI * 2;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('basePosition', new THREE.BufferAttribute(basePositions, 3));
    geometry.setAttribute('velocity', new THREE.BufferAttribute(velocities, 3));

    this.particleSeeds = seeds;

    // Procedural soft glowing radial circular texture
    const particleTexture = this.createParticleGlowTexture();

    const material = new THREE.PointsMaterial({
      size: 0.16,
      map: particleTexture,
      transparent: true,
      blending: THREE.AdditiveBlending,
      depthWrite: false,
      color: this.config.particleColor,
      opacity: 0.82
    });

    this.particles = new THREE.Points(geometry, material);
    this.scene.add(this.particles);
  }

  /**
   * Procedural glowing particle canvas texture
   */
  createParticleGlowTexture() {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.28, 'rgba(245, 210, 210, 0.78)');
    grad.addColorStop(0.65, 'rgba(163, 28, 27, 0.38)');
    grad.addColorStop(1.0, 'rgba(0, 0, 0, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  /**
   * Load GLB model or seamlessly display glossy Torus Knot
   */
  loadOrFallbackModel() {
    let isLoaded = false;

    const executeFallback = () => {
      if (isLoaded) return;
      isLoaded = true;
      this.createFallbackModel();
      this.onModelReady();
    };

    // Safety fallback timer (1.2 seconds max)
    const fallbackTimer = setTimeout(executeFallback, 1200);

    try {
      const loader = new GLTFLoader();
      loader.load(
        this.config.modelPath,
        (gltf) => {
          if (isLoaded) return;
          isLoaded = true;
          clearTimeout(fallbackTimer);
          const model = gltf.scene;

          model.traverse((child) => {
            if (child.isMesh && child.material) {
              child.material.roughness = Math.max(child.material.roughness, 0.2);
              child.material.metalness = Math.min(child.material.metalness, 0.85);
            }
          });

          const bbox = new THREE.Box3().setFromObject(model);
          const size = bbox.getSize(new THREE.Vector3());
          const center = bbox.getCenter(new THREE.Vector3());
          const maxDim = Math.max(size.x, size.y, size.z) || 1;
          const targetSize = 2.4;
          const scale = targetSize / maxDim;

          model.scale.setScalar(scale);
          model.position.sub(center.multiplyScalar(scale));

          this.modelGroup.add(model);
          this.onModelReady();
        },
        undefined,
        () => {
          clearTimeout(fallbackTimer);
          executeFallback();
        }
      );
    } catch (err) {
      clearTimeout(fallbackTimer);
      executeFallback();
    }
  }

  /**
   * Glossy Torus Knot placeholder with crimson/obsidian rim reflections
   */
  createFallbackModel() {
    const geometry = new THREE.TorusKnotGeometry(1.15, 0.36, 160, 36);
    const material = new THREE.MeshStandardMaterial({
      color: 0x06110c,
      roughness: 0.14,
      metalness: 0.88,
    });

    const torusKnot = new THREE.Mesh(geometry, material);
    torusKnot.rotation.set(0.4, 0.2, 0.1);
    this.modelGroup.add(torusKnot);
  }

  onModelReady() {
    if (this.loaderPill) {
      setTimeout(() => {
        this.loaderPill.style.opacity = '0';
        this.loaderPill.style.transform = 'translateY(10px)';
      }, 500);
    }

    if (!this.prefersReducedMotion && !this.sequenceCompleted) {
      this.startCinematicSequence();
    }
  }

  /**
   * Cinematic Animation Sequence (GSAP Timeline ~6-7 seconds)
   * Precisely paced: Model glides and wipes -> Model exits on right ->
   * Breath -> Tagline reveals with soft blur-to-sharp & letter-spacing settle ->
   * Glowing "Enter site" button floats in.
   */
  startCinematicSequence() {
    const gsapInstance = window.gsap;
    if (!gsapInstance) {
      this.skipToComplete();
      return;
    }

    const startX = this.travelBounds.startX;
    const endX = this.travelBounds.endX;
    const glideDuration = this.config.animationDuration || 6.0;

    // Start model off-screen on the left
    this.modelGroup.position.set(startX, 0.08, 0.0);
    this.modelGroup.rotation.set(0.15, -0.6, -0.1);

    // Initial state of foreground elements
    if (this.brandTagline) {
      gsapInstance.set(this.brandTagline, {
        opacity: 0,
        y: 16,
        filter: "blur(6px)",
        letterSpacing: "0.34em"
      });
    }

    if (this.enterBtnWrapper) {
      gsapInstance.set(this.enterBtnWrapper, {
        opacity: 0,
        y: 22,
        scale: 0.94
      });
    }

    this.timeline = gsapInstance.timeline({
      defaults: { ease: "power2.inOut" },
      onComplete: () => {
        this.skipToComplete();
      }
    });

    // 1. Model glides smoothly across the screen from left to right
    this.timeline.to(this.modelGroup.position, {
      x: endX,
      duration: glideDuration,
      ease: "power2.inOut",
      onUpdate: () => {
        this.syncBrandReveal();
      }
    }, 0);

    // 2. Slow rotation as it glides
    this.timeline.to(this.modelGroup.rotation, {
      y: Math.PI * 1.8,
      x: 0.35,
      z: 0.18,
      duration: glideDuration,
      ease: "sine.inOut"
    }, 0);

    // 3. Subtle floating bob on Y axis
    this.timeline.to(this.modelGroup.position, {
      y: -0.24,
      duration: glideDuration * 0.48,
      ease: "sine.inOut",
      yoyo: true,
      repeat: 1
    }, 0);

    // 4. Letter spacing settling on brand title as model finishes pass
    if (this.brandTitle) {
      this.timeline.to(this.brandTitle, {
        letterSpacing: "0.22em",
        duration: 2.2,
        ease: "power2.out"
      }, glideDuration * 0.48);
    }

    // 5. PACE THE TAGLINE CORRECTLY:
    // Only reveals AFTER the model has exited on the right side of the screen
    // Drifts up gently with a luxurious blur-to-sharp settle
    if (this.brandTagline) {
      this.timeline.to(this.brandTagline, {
        opacity: 0.88,
        y: 0,
        filter: "blur(0px)",
        letterSpacing: "0.24em",
        duration: 1.5,
        ease: "power3.out"
      }, glideDuration + 0.18);
    }

    // 6. PACE THE "ENTER SITE" BUTTON:
    // Rises up gracefully after the tagline has settled into view
    if (this.enterBtnWrapper) {
      this.timeline.to(this.enterBtnWrapper, {
        opacity: 1,
        y: 0,
        scale: 1,
        duration: 1.1,
        ease: "back.out(1.4)"
      }, glideDuration + 0.95);
    }
  }

  /**
   * Screen-space sync: wipes brand title progressively in sync with 3D model
   */
  syncBrandReveal() {
    if (!this.brandTitle || !this.modelGroup) return;

    const modelPos = new THREE.Vector3();
    this.modelGroup.getWorldPosition(modelPos);
    const proj = modelPos.clone().project(this.camera);

    const modelScreenX = (proj.x * 0.5 + 0.5) * window.innerWidth;
    const titleRect = this.brandTitle.getBoundingClientRect();

    let wipeProgress = 0;
    if (titleRect.width > 0) {
      const rawRatio = (modelScreenX - titleRect.left) / titleRect.width;
      wipeProgress = Math.max(0, Math.min(100, (rawRatio + 0.08) * 100));
    }

    this.brandTitle.style.clipPath = `polygon(0 0, ${wipeProgress.toFixed(1)}% 0, ${wipeProgress.toFixed(1)}% 100%, 0 100%)`;

    const blurAmount = Math.max(0, (1 - wipeProgress / 100) * 8);
    this.brandTitle.style.filter = `blur(${blurAmount.toFixed(1)}px)`;
  }

  /**
   * Skip to completed state: model parked off-screen right, typography fully revealed
   */
  skipToComplete() {
    this.sequenceCompleted = true;
    if (this.timeline) {
      this.timeline.kill();
    }

    // Model exits on the right and stays off-screen
    if (this.modelGroup) {
      this.modelGroup.position.set(this.travelBounds.endX, 0.0, 0.0);
      this.modelGroup.rotation.set(0.2, 0.4, 0.0);
    }

    if (this.brandTitle) {
      this.brandTitle.style.clipPath = "polygon(0 0, 100% 0, 100% 100%, 0 100%)";
      this.brandTitle.style.filter = "none";
      this.brandTitle.style.letterSpacing = "0.22em";
    }

    if (this.brandTagline) {
      this.brandTagline.style.opacity = "0.88";
      this.brandTagline.style.transform = "none";
      this.brandTagline.style.filter = "none";
      this.brandTagline.style.letterSpacing = "0.24em";
    }

    if (this.enterBtnWrapper) {
      this.enterBtnWrapper.style.opacity = "1";
      this.enterBtnWrapper.style.transform = "none";
      this.enterBtnWrapper.style.scale = "1";
    }

    if (this.loaderPill) {
      this.loaderPill.style.display = "none";
    }
  }

  /**
   * Enter the main site: dissolves the intro overlay and reveals home page
   */
  enterSite() {
    const gsapInstance = window.gsap;
    document.body.classList.remove('splash-locked');

    try {
      sessionStorage.setItem('has_entered_site', 'true');
    } catch (e) {
      // Ignore in private browsing
    }

    if (gsapInstance && this.overlay) {
      gsapInstance.to(this.overlay, {
        opacity: 0,
        scale: 1.03,
        duration: 0.85,
        ease: "power2.inOut",
        onComplete: () => {
          this.overlay.style.display = 'none';
          this.pause();
        }
      });
    } else if (this.overlay) {
      this.overlay.style.opacity = '0';
      this.overlay.style.pointerEvents = 'none';
      setTimeout(() => {
        this.overlay.style.display = 'none';
        this.pause();
      }, 700);
    }
  }

  /**
   * Replay intro whenever user triggers it
   */
  replay() {
    if (!this.overlay) return;
    this.isPaused = false;
    this.sequenceCompleted = false;
    document.body.classList.add('splash-locked');

    this.overlay.style.display = 'block';
    this.overlay.style.opacity = '1';
    this.overlay.style.transform = 'scale(1)';
    this.overlay.style.pointerEvents = 'auto';

    if (this.brandTitle) {
      this.brandTitle.style.clipPath = 'polygon(0 0, 0% 0, 0% 100%, 0 100%)';
      this.brandTitle.style.filter = 'blur(8px)';
      this.brandTitle.style.letterSpacing = '0.32em';
    }

    if (this.brandTagline) {
      this.brandTagline.style.opacity = '0';
      this.brandTagline.style.transform = 'translateY(16px)';
      this.brandTagline.style.filter = 'blur(6px)';
      this.brandTagline.style.letterSpacing = '0.34em';
    }

    if (this.enterBtnWrapper) {
      this.enterBtnWrapper.style.opacity = '0';
      this.enterBtnWrapper.style.transform = 'translateY(22px)';
      this.enterBtnWrapper.style.scale = '0.94';
    }

    this.startCinematicSequence();
  }

  /**
   * Render Loop: Dynamic Dust Disturbance Physics & Parallax Sway
   */
  animate() {
    if (this.isDisposed) return;
    requestAnimationFrame(() => this.animate());

    if (this.isPaused) return;

    const time = this.clock.getElapsedTime();

    // Mouse parallax interpolation
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.05;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.05;

    this.camera.position.x = this.mouse.x * 0.45;
    this.camera.position.y = this.mouse.y * 0.35;
    this.camera.lookAt(0, 0, 0);

    // Floating idle rotation
    if (this.modelGroup) {
      this.modelGroup.position.y += Math.sin(time * 1.6) * 0.0015;
      this.modelGroup.rotation.y += 0.003;
    }

    // Dynamic particle physics
    this.updateDustPhysics(time);

    this.renderer.render(this.scene, this.camera);
  }

  /**
   * Dust Particle Simulation:
   * 1. Gentle Brownian floating drift
   * 2. Radial repulsion & swirl vortex when model passes within radius
   * 3. Elastic spring return leaving settling trail
   */
  updateDustPhysics(time) {
    if (!this.particles) return;

    const posAttr = this.particles.geometry.attributes.position;
    const baseAttr = this.particles.geometry.attributes.basePosition;
    const velAttr = this.particles.geometry.attributes.velocity;

    const positions = posAttr.array;
    const basePositions = baseAttr.array;
    const velocities = velAttr.array;
    const count = this.config.particleCount;

    const modelWorldPos = new THREE.Vector3();
    this.modelGroup.getWorldPosition(modelWorldPos);

    const radius = this.config.disturbRadius;
    const radiusSq = radius * radius;
    const strength = this.config.disturbStrength;

    for (let i = 0; i < count; i++) {
      const i3 = i * 3;
      let px = positions[i3];
      let py = positions[i3 + 1];
      let pz = positions[i3 + 2];

      const bx = basePositions[i3];
      const by = basePositions[i3 + 1];
      const bz = basePositions[i3 + 2];

      const seed = this.particleSeeds[i];

      // 1. Natural slow floating drift
      const targetX = bx + Math.sin(time * 0.35 + seed) * 0.35;
      const targetY = by + Math.cos(time * 0.28 + seed) * 0.35;
      const targetZ = bz + Math.sin(time * 0.22 + seed) * 0.25;

      // 2. Proximity check to 3D model
      const dx = px - modelWorldPos.x;
      const dy = py - modelWorldPos.y;
      const dz = pz - modelWorldPos.z;
      const distSq = dx * dx + dy * dy + dz * dz;

      if (distSq < radiusSq && distSq > 0.0001) {
        const dist = Math.sqrt(distSq);
        const force = (1 - dist / radius) * strength;

        // Radial outward repulsion push
        velocities[i3] += (dx / dist) * force * 0.09;
        velocities[i3 + 1] += (dy / dist) * force * 0.09;
        velocities[i3 + 2] += (dz / dist) * force * 0.09;

        // Swirl / wake vortex torque
        velocities[i3 + 1] += Math.sin(dx * 2.5) * force * 0.05;
        velocities[i3] += -Math.sin(dy * 2.5) * force * 0.03;
      }

      // 3. Elastic spring return to drift position
      velocities[i3] += (targetX - px) * 0.032;
      velocities[i3 + 1] += (targetY - py) * 0.032;
      velocities[i3 + 2] += (targetZ - pz) * 0.032;

      // Damping
      velocities[i3] *= 0.89;
      velocities[i3 + 1] *= 0.89;
      velocities[i3 + 2] *= 0.89;

      // Integration
      positions[i3] += velocities[i3];
      positions[i3 + 1] += velocities[i3 + 1];
      positions[i3 + 2] += velocities[i3 + 2];
    }

    posAttr.needsUpdate = true;
  }

  initEventListeners() {
    window.addEventListener('resize', () => this.onResize());

    // Mouse Parallax
    window.addEventListener('mousemove', (e) => {
      this.mouse.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      this.mouse.targetY = -(e.clientY / window.innerHeight - 0.5) * 2;
    });

    window.addEventListener('touchmove', (e) => {
      if (e.touches.length > 0) {
        this.mouse.targetX = (e.touches[0].clientX / window.innerWidth - 0.5) * 2;
        this.mouse.targetY = -(e.touches[0].clientY / window.innerHeight - 0.5) * 2;
      }
    }, { passive: true });

    // Enter Site Button Click
    if (this.enterBtn) {
      this.enterBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.enterSite();
      });
    }

    // Skip Intro Button Click
    if (this.skipBtn) {
      this.skipBtn.addEventListener('click', (e) => {
        e.preventDefault();
        this.enterSite();
      });
    }

    // Fast-forward on background click
    if (this.overlay) {
      this.overlay.addEventListener('click', (e) => {
        if (e.target && e.target.closest('#splashEnterBtn, #splashSkipBtn')) return;
        if (!this.sequenceCompleted) {
          this.skipToComplete();
        }
      });
    }
  }

  onResize() {
    if (!this.camera || !this.renderer) return;

    this.camera.aspect = window.innerWidth / window.innerHeight;
    this.camera.updateProjectionMatrix();

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.calculateTravelBounds();
  }

  pause() {
    this.isPaused = true;
  }

  resume() {
    this.isPaused = false;
  }

  dispose() {
    this.isDisposed = true;
    if (this.particles) {
      this.particles.geometry.dispose();
      this.particles.material.dispose();
    }
    if (this.renderer) {
      this.renderer.dispose();
    }
  }
}

