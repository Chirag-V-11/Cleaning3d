import * as THREE from 'three';
import { GLTFLoader } from 'three/examples/jsm/loaders/GLTFLoader.js';

class CleaningScene {
  constructor(canvasId) {
    this.canvas = document.getElementById(canvasId);
    if (!this.canvas) return;

    this.scene = new THREE.Scene();
    this.camera = new THREE.PerspectiveCamera(45, window.innerWidth / window.innerHeight, 0.1, 100);
    this.renderer = new THREE.WebGLRenderer({
      canvas: this.canvas,
      antialias: true,
      alpha: true,
      powerPreference: 'high-performance',
    });

    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));
    this.renderer.toneMapping = THREE.ACESFilmicToneMapping;
    this.renderer.toneMappingExposure = 1.35;
    this.renderer.outputColorSpace = THREE.SRGBColorSpace;

    this.camera.position.set(0, 0, 7.5);

    // Strictly 3 Colors: Charcoal (#171717), Onyx Emerald (#06110C), Crimson (#A31C1B)
    this.COLORS = {
      white: 0xf5f5f5,
      slate: 0x06110c,
      mint: 0xa31c1b,
      charcoal: 0x171717,
    };

    // State
    this.scrollProgress = 0;
    this.targetScrollProgress = 0;
    this.mouse = { x: 0, y: 0, targetX: 0, targetY: 0 };
    this.clock = new THREE.Clock();
    this.lastTime = 0;

    // Master container for the 3D Vacuum Cleaner object
    this.vacuumContainer = new THREE.Group();
    this.scene.add(this.vacuumContainer);

    this.footerEl = document.querySelector('.footer');
    this.viewport = this.getViewportMetrics();

    this.initLights();
    this.loadVacuumModel();
    this.initSparkleParticles();
    this.initEvents();
    this.animate();
  }

  /**
   * Computes camera frustum bounds and continuous scale factor for the current viewport.
   */
  getViewportMetrics(depthZ = 0) {
    const w = window.innerWidth;
    const h = Math.max(1, window.innerHeight);
    const aspect = w / h;
    const distance = this.camera.position.z - depthZ;
    const vFov = THREE.MathUtils.degToRad(this.camera.fov);
    const visibleHeight = 2 * Math.tan(vFov / 2) * distance;
    const visibleWidth = visibleHeight * aspect;

    const widthRatio = THREE.MathUtils.clamp((w - 360) / (1600 - 360), 0, 1);
    const heightRatio = THREE.MathUtils.clamp((h - 560) / (1080 - 560), 0, 1);
    const viewportScale = THREE.MathUtils.lerp(0.54, 1.14, widthRatio * 0.75 + heightRatio * 0.25);
    const aspectScale = THREE.MathUtils.clamp(aspect / 1.35, 0.52, 1.14);
    const baseScale = Math.min(viewportScale, aspectScale * 1.12);

    const footerHeight = this.footerEl ? this.footerEl.offsetHeight : 360;
    const navHeight = w <= 768 ? 68 : 78;
    const visibleFooterH = Math.min(footerHeight, h * 0.52);
    const bandBottomPx = Math.max(navHeight + 160, h - visibleFooterH);
    const bandMidPx = (navHeight + bandBottomPx) * 0.5;
    const bandHeightPx = Math.max(160, bandBottomPx - navHeight);

    const endZ = aspect < 1.08 ? -0.35 : 0.25;
    const endVisibleHeight = 2 * Math.tan(vFov / 2) * (this.camera.position.z - endZ);
    const footerStageY = aspect < 1.08
      ? visibleHeight * 0.14
      : ((h * 0.5 - bandMidPx) / h) * endVisibleHeight;
    const availWorldH = (bandHeightPx / h) * endVisibleHeight;
    const footerStageScale = aspect < 1.08
      ? baseScale * 0.96
      : Math.max(baseScale * 0.58, Math.min(baseScale * 0.96, (availWorldH * 0.82) / 2.9));

    return {
      w,
      h,
      aspect,
      visibleWidth,
      visibleHeight,
      baseScale,
      footerStageY,
      footerStageZ: endZ,
      footerStageScale,
    };
  }

  initLights() {
    // Balanced Dark-Luxury Ambient Light
    const ambientLight = new THREE.AmbientLight(this.COLORS.white, 1.5);
    this.scene.add(ambientLight);

    // Main Specular Directional Key Light
    this.keyLight = new THREE.DirectionalLight(this.COLORS.white, 3.4);
    this.keyLight.position.set(7, 10, 8);
    this.scene.add(this.keyLight);

    // Crimson Rim Specular Light (#A31C1B)
    this.rimLight = new THREE.DirectionalLight(this.COLORS.mint, 3.6);
    this.rimLight.position.set(-6, -2, -4);
    this.scene.add(this.rimLight);

    // Soft Contour Fill Light
    this.fillLight = new THREE.DirectionalLight(this.COLORS.white, 1.15);
    this.fillLight.position.set(-5, 5, 4);
    this.scene.add(this.fillLight);
  }

  loadVacuumModel() {
    const loader = new GLTFLoader();
    const modelPath = '/vacuumed_cleaner/scene.gltf';

    loader.load(
      modelPath,
      (gltf) => {
        const model = gltf.scene;

        // Traverse model meshes and refine materials
        model.traverse((child) => {
          if (child.isMesh) {
            child.castShadow = true;
            child.receiveShadow = true;
            if (child.material) {
              child.material.depthWrite = true;
              child.material.roughness = Math.max(child.material.roughness, 0.25);
              child.material.metalness = Math.min(child.material.metalness, 0.7);
            }
          }
        });

        // Compute Bounding Box to normalize scale and center pivot
        const bbox = new THREE.Box3().setFromObject(model);
        const size = bbox.getSize(new THREE.Vector3());
        const center = bbox.getCenter(new THREE.Vector3());

        const maxDim = Math.max(size.x, size.y, size.z) || 100;
        const targetHeight = 2.9; // reduced sleek viewport height units
        const scaleFactor = targetHeight / maxDim;

        model.scale.setScalar(scaleFactor);

        // Center pivot offset inside vacuumContainer
        model.position.x = -center.x * scaleFactor;
        model.position.y = -center.y * scaleFactor;
        model.position.z = -center.z * scaleFactor;

        // Add subtle crimson glow halo around vacuum base
        const ringGeo = new THREE.RingGeometry(0.24, 0.30, 32);
        const ringMat = new THREE.MeshBasicMaterial({
          color: this.COLORS.mint,
          side: THREE.DoubleSide,
          transparent: true,
          opacity: 0.65,
        });
        const ringMesh = new THREE.Mesh(ringGeo, ringMat);
        ringMesh.rotation.x = -Math.PI / 2;
        ringMesh.position.y = -targetHeight * 0.45;
        this.vacuumContainer.add(ringMesh);

        this.vacuumContainer.add(model);
        this.modelLoaded = true;
      },
      undefined,
      (err) => {
        console.warn('GLTF loading error, falling back to procedural model:', err);
        this.createProceduralFallback();
      }
    );
  }

  createProceduralFallback() {
    const group = new THREE.Group();
    const material = new THREE.MeshStandardMaterial({
      color: this.COLORS.charcoal,
      roughness: 0.24,
      metalness: 0.72,
    });
    const mintMaterial = new THREE.MeshStandardMaterial({
      color: this.COLORS.mint,
      emissive: this.COLORS.mint,
      emissiveIntensity: 0.35,
    });

    const cylinder = new THREE.Mesh(new THREE.CylinderGeometry(0.24, 0.32, 2.6, 32), material);
    const head = new THREE.Mesh(new THREE.BoxGeometry(1.0, 0.22, 0.6), mintMaterial);
    head.position.y = -1.3;
    group.add(cylinder);
    group.add(head);

    this.vacuumContainer.add(group);
  }

  /**
   * Soft circular radial glow sprite for crisp edge-to-edge sparkles.
   */
  createSparkleTexture() {
    const size = 64;
    const canvas = document.createElement('canvas');
    canvas.width = size;
    canvas.height = size;
    const ctx = canvas.getContext('2d');

    const grad = ctx.createRadialGradient(size / 2, size / 2, 0, size / 2, size / 2, size / 2);
    grad.addColorStop(0.0, 'rgba(255, 255, 255, 1.0)');
    grad.addColorStop(0.32, 'rgba(255, 255, 255, 0.65)');
    grad.addColorStop(0.7, 'rgba(255, 255, 255, 0.18)');
    grad.addColorStop(1.0, 'rgba(255, 255, 255, 0)');

    ctx.fillStyle = grad;
    ctx.fillRect(0, 0, size, size);

    const texture = new THREE.CanvasTexture(canvas);
    texture.needsUpdate = true;
    return texture;
  }

  initSparkleParticles() {
    // Full-screen background sparkles mapped across entire viewport frustum edge-to-edge
    const particleCount = 560;
    const geometry = new THREE.BufferGeometry();
    const positions = new Float32Array(particleCount * 3);
    const colors = new Float32Array(particleCount * 3);

    this.sparkleData = {
      count: particleCount,
      u: new Float32Array(particleCount),
      v: new Float32Array(particleCount),
      z: new Float32Array(particleCount),
      speed: new Float32Array(particleCount),
      phase: new Float32Array(particleCount),
    };

    const crimson = new THREE.Color(this.COLORS.mint);
    const softWhite = new THREE.Color(this.COLORS.white);

    for (let i = 0; i < particleCount; i++) {
      // Overscan [-0.62, 0.62] guarantees edge-to-edge coverage even with mouse parallax
      this.sparkleData.u[i] = (Math.random() - 0.5) * 1.24;
      this.sparkleData.v[i] = (Math.random() - 0.5) * 1.24;
      this.sparkleData.z[i] = THREE.MathUtils.lerp(-4.5, 2.2, Math.random());
      this.sparkleData.speed[i] = 0.02 + Math.random() * 0.045;
      this.sparkleData.phase[i] = Math.random() * Math.PI * 2;

      const c = Math.random() < 0.72 ? crimson : softWhite;
      const i3 = i * 3;
      colors[i3] = c.r;
      colors[i3 + 1] = c.g;
      colors[i3 + 2] = c.b;
    }

    geometry.setAttribute('position', new THREE.BufferAttribute(positions, 3));
    geometry.setAttribute('color', new THREE.BufferAttribute(colors, 3));

    const pointsMaterial = new THREE.PointsMaterial({
      size: this.getResponsiveSparkleSize(),
      map: this.createSparkleTexture(),
      vertexColors: true,
      transparent: true,
      opacity: 0.85,
      depthWrite: false,
      blending: THREE.AdditiveBlending,
    });

    this.particles = new THREE.Points(geometry, pointsMaterial);
    this.scene.add(this.particles);

    this.updateSparklePositions(0, 0);
  }

  getResponsiveSparkleSize() {
    const scale = this.viewport ? this.viewport.baseScale : 1;
    return THREE.MathUtils.clamp(0.11 * (0.75 + scale * 0.28), 0.09, 0.14);
  }

  /**
   * Projects normalized full-viewport (u, v, z) coordinates into camera frustum world coordinates.
   */
  updateSparklePositions(time, dt) {
    if (!this.particles || !this.sparkleData) return;

    const posAttr = this.particles.geometry.attributes.position;
    const positions = posAttr.array;
    const { count, u, v, z, speed, phase } = this.sparkleData;
    const aspect = window.innerWidth / Math.max(1, window.innerHeight);
    const vTanHalf = Math.tan(THREE.MathUtils.degToRad(this.camera.fov) / 2);
    const camZ = this.camera.position.z;

    for (let i = 0; i < count; i++) {
      v[i] += speed[i] * dt;
      if (v[i] > 0.62) {
        v[i] = -0.62;
      }

      const depth = z[i];
      const planeHeight = 2 * vTanHalf * (camZ - depth);
      const planeWidth = planeHeight * aspect;
      const swayU = u[i] + Math.sin(time * 0.35 + phase[i]) * 0.015;

      const i3 = i * 3;
      positions[i3] = swayU * planeWidth;
      positions[i3 + 1] = v[i] * planeHeight;
      positions[i3 + 2] = depth;
    }

    posAttr.needsUpdate = true;
  }

  initEvents() {
    window.addEventListener('resize', () => this.onResize());

    // Mouse movement parallax
    window.addEventListener('mousemove', (e) => {
      this.mouse.targetX = (e.clientX / window.innerWidth - 0.5) * 2;
      this.mouse.targetY = -(e.clientY / window.innerHeight - 0.5) * 2;
    });

    // Scroll tracking
    window.addEventListener('scroll', () => {
      const maxScroll = document.documentElement.scrollHeight - window.innerHeight;
      if (maxScroll > 0) {
        this.targetScrollProgress = Math.min(1, Math.max(0, window.scrollY / maxScroll));
      }
    }, { passive: true });
  }

  onResize() {
    this.camera.aspect = window.innerWidth / Math.max(1, window.innerHeight);
    this.camera.updateProjectionMatrix();
    this.renderer.setSize(window.innerWidth, window.innerHeight);
    this.renderer.setPixelRatio(Math.min(window.devicePixelRatio, 2));

    this.viewport = this.getViewportMetrics();
    if (this.particles) {
      this.particles.material.size = this.getResponsiveSparkleSize();
      this.updateSparklePositions(this.clock.getElapsedTime(), 0);
    }
  }

  /**
   * Choreographed Keyframe Path for the Vacuum Cleaner 3D Model
   * Dynamically scales size and horizontal/vertical offsets to the active viewport.
   */
  getInterpolatedTransform(progress) {
    const vp = this.viewport || this.getViewportMetrics();
    const isNarrow = vp.aspect < 1.08;
    const s = vp.baseScale;
    const sideX = Math.min(vp.visibleWidth * (isNarrow ? 0.21 : 0.22), isNarrow ? 1.05 : 2.75);
    const heroY = isNarrow ? vp.visibleHeight * 0.07 : -0.05;

    // Keyframe stops corresponding to page sections:
    // 0.00: Hero (Right showcase, scaled proportionally to screen)
    // 0.25: About & Trust Badges (Left side craftsmanship view)
    // 0.55: Signature Services (Right side active tilt)
    // 0.80: Google 4.8-Star Reviews (Centered depth backdrop)
    // 1.00: Final CTA (Centerpiece showcase)
    const keyframes = [
      {
        stop: 0.0,
        pos: [sideX, heroY, isNarrow ? -0.6 : 0.0],
        rot: [0.15, -0.65, -0.12],
        scale: s * 0.95,
      },
      {
        stop: 0.25,
        pos: [-sideX * 0.96, isNarrow ? 0.16 : 0.05, isNarrow ? -0.8 : 0.2],
        rot: [0.22, 0.95, 0.1],
        scale: s,
      },
      {
        stop: 0.55,
        pos: [sideX, isNarrow ? 0.0 : -0.1, isNarrow ? -0.75 : 0.1],
        rot: [0.35, -1.3, 0.18],
        scale: s * 0.95,
      },
      {
        stop: 0.80,
        pos: [0.0, -0.05, isNarrow ? -1.1 : -0.6],
        rot: [0.25, 2.6, -0.1],
        scale: s * 0.9,
      },
      {
        stop: 1.0,
        pos: [0.0, vp.footerStageY, vp.footerStageZ],
        rot: [0.08, 0.0, 0.0],
        scale: vp.footerStageScale,
      },
    ];

    let k1 = keyframes[0];
    let k2 = keyframes[keyframes.length - 1];

    for (let i = 0; i < keyframes.length - 1; i++) {
      if (progress >= keyframes[i].stop && progress <= keyframes[i + 1].stop) {
        k1 = keyframes[i];
        k2 = keyframes[i + 1];
        break;
      }
    }

    const span = k2.stop - k1.stop || 1;
    const localT = (progress - k1.stop) / span;
    const ease = localT * localT * (3 - 2 * localT);

    return {
      pos: [
        k1.pos[0] + (k2.pos[0] - k1.pos[0]) * ease,
        k1.pos[1] + (k2.pos[1] - k1.pos[1]) * ease,
        k1.pos[2] + (k2.pos[2] - k1.pos[2]) * ease,
      ],
      rot: [
        k1.rot[0] + (k2.rot[0] - k1.rot[0]) * ease,
        k1.rot[1] + (k2.rot[1] - k1.rot[1]) * ease,
        k1.rot[2] + (k2.rot[2] - k1.rot[2]) * ease,
      ],
      scale: k1.scale + (k2.scale - k1.scale) * ease,
    };
  }

  animate() {
    requestAnimationFrame(() => this.animate());

    const time = this.clock.getElapsedTime();
    const dt = Math.min(0.05, Math.max(0, time - this.lastTime));
    this.lastTime = time;

    this.scrollProgress += (this.targetScrollProgress - this.scrollProgress) * 0.07;
    this.mouse.x += (this.mouse.targetX - this.mouse.x) * 0.05;
    this.mouse.y += (this.mouse.targetY - this.mouse.y) * 0.05;

    const target = this.getInterpolatedTransform(this.scrollProgress);

    // Subtle breathing floating motion
    const floatY = Math.sin(time * 1.5) * 0.05;
    const floatRot = Math.cos(time * 1.1) * 0.02;

    this.vacuumContainer.position.set(
      target.pos[0] + this.mouse.x * 0.22,
      target.pos[1] + floatY + this.mouse.y * 0.18,
      target.pos[2]
    );

    this.vacuumContainer.rotation.set(
      target.rot[0] - this.mouse.y * 0.15 + floatRot,
      target.rot[1] + this.mouse.x * 0.2,
      target.rot[2] + floatRot * 0.5
    );

    this.vacuumContainer.scale.set(target.scale, target.scale, target.scale);

    // Keep background sparkles floating evenly across 100% of screen width/height
    if (this.particles) {
      this.updateSparklePositions(time, dt);
      this.particles.position.set(this.mouse.x * 0.16, this.mouse.y * 0.12, 0);
    }

    if (this.rimLight) {
      this.rimLight.position.x = -6 + this.mouse.x * 2;
      this.rimLight.position.y = -2 + this.mouse.y * 2;
    }

    this.renderer.render(this.scene, this.camera);
  }
}

export function initCleaningScene() {
  return new CleaningScene('webgl-canvas');
}
