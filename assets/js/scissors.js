/* Tijeras 3D (Three.js) dibujadas sobre un lienzo fijo a pantalla completa.
   El resto de la web decide dónde están y cuánto abren; aquí solo se construyen y se pintan. */
import * as THREE from "three";
import { RoomEnvironment } from "../vendor/RoomEnvironment.js";

const MODEL_LEN = 4.75; // de la punta de las hojas al extremo de los aros, en unidades del modelo

export function createScissors(canvas) {
  // En móvil: menos píxeles, sin antialias y materiales más baratos (la pantalla ya es muy densa)
  const coarse = matchMedia("(pointer: coarse)").matches;
  let renderer;
  try {
    renderer = new THREE.WebGLRenderer({ canvas, alpha: true, antialias: !coarse, powerPreference: "high-performance" });
  } catch {
    return null; // sin WebGL: la web funciona igual, solo sin tijeras
  }
  renderer.setPixelRatio(Math.min(window.devicePixelRatio || 1, coarse ? 1.25 : 1.75));
  renderer.outputColorSpace = THREE.SRGBColorSpace;
  renderer.toneMapping = THREE.ACESFilmicToneMapping;
  renderer.toneMappingExposure = 1.05;
  renderer.setClearColor(0x000000, 0);

  const scene = new THREE.Scene();
  const pmrem = new THREE.PMREMGenerator(renderer);
  scene.environment = pmrem.fromScene(new RoomEnvironment(), 0.04).texture;
  pmrem.dispose();

  const camera = new THREE.PerspectiveCamera(30, 1, 0.1, 100);
  camera.position.set(0, 0, 12);

  const key = new THREE.DirectionalLight(0xffffff, 1.6);
  key.position.set(3, 6, 8);
  scene.add(key);
  const rim = new THREE.DirectionalLight(0xffd2b0, 0.8);
  rim.position.set(-6, -2, 3);
  scene.add(rim);

  /* ---------- Materiales ---------- */
  const M = (opts) => {
    if (!coarse) return new THREE.MeshPhysicalMaterial(opts);
    const { clearcoat, clearcoatRoughness, ...rest } = opts;
    return new THREE.MeshStandardMaterial(rest);
  };
  const steel = M({ color: 0xe4e7eb, metalness: 1, roughness: 0.16, clearcoat: 0.4, clearcoatRoughness: 0.1 });
  const edge = M({ color: 0xffffff, metalness: 1, roughness: 0.05 });
  const copper = M({ color: 0xb8683a, metalness: 0.9, roughness: 0.26, clearcoat: 0.7, clearcoatRoughness: 0.18 });
  const dark = M({ color: 0x241d1a, metalness: 0.8, roughness: 0.3, clearcoat: 1 });

  /* ---------- Geometría ---------- */
  function bladeGeometry() {
    const s = new THREE.Shape();
    s.moveTo(-0.28, -0.05);
    s.lineTo(2.78, -0.004);                    // filo recto hasta la punta
    s.quadraticCurveTo(2.4, 0.15, 1.45, 0.29); // lomo curvo
    s.quadraticCurveTo(0.55, 0.4, -0.28, 0.27);
    s.closePath();
    const g = new THREE.ExtrudeGeometry(s, {
      depth: 0.04, curveSegments: 40,
      bevelEnabled: true, bevelThickness: 0.02, bevelSize: 0.024, bevelSegments: 5,
    });
    g.translate(0, 0, -0.02);
    return g;
  }

  // Mitad de las tijeras: hoja hacia un lado y mango hacia el contrario (se cruzan en el tornillo)
  function makeHalf(sign, ringR) {
    const g = new THREE.Group();

    const blade = new THREE.Mesh(bladeGeometry(), steel);
    blade.scale.y = sign;
    g.add(blade);

    // Brillo del filo
    const edgeLine = new THREE.Mesh(new THREE.BoxGeometry(2.7, 0.012, 0.09), edge);
    edgeLine.position.set(1.3, -0.012 * sign, 0);
    edgeLine.rotation.z = 0.0015 * sign;
    g.add(edgeLine);

    const arm = new THREE.CatmullRomCurve3([
      new THREE.Vector3(-0.2, 0.1 * sign, 0),
      new THREE.Vector3(-0.55, -0.08 * sign, 0),
      new THREE.Vector3(-0.92, -0.28 * sign, 0),
      new THREE.Vector3(-1.2 + (ringR - 0.36) * -0.4, -0.42 * sign, 0),
    ]);
    g.add(new THREE.Mesh(new THREE.TubeGeometry(arm, 48, 0.078, 18, false), copper));

    const ring = new THREE.Mesh(new THREE.TorusGeometry(ringR, 0.088, 24, 80), copper);
    ring.position.set(-1.2 - ringR - 0.02 + (ringR - 0.36) * -0.4, -0.5 * sign, 0);
    ring.scale.set(1.08, 0.86, 1);
    g.add(ring);

    // Apoyadedos en el aro grande
    if (ringR > 0.4) {
      const rest = new THREE.CatmullRomCurve3([
        new THREE.Vector3(ring.position.x + 0.1, ring.position.y - ringR * 0.8 * sign, 0),
        new THREE.Vector3(ring.position.x + 0.45, ring.position.y - ringR * 1.35 * sign, 0),
        new THREE.Vector3(ring.position.x + 0.85, ring.position.y - ringR * 1.45 * sign, 0),
      ]);
      g.add(new THREE.Mesh(new THREE.TubeGeometry(rest, 24, 0.05, 12, false), copper));
    }
    return g;
  }

  const root = new THREE.Group();
  const halfA = makeHalf(1, 0.36);   // hoja superior + aro del pulgar
  const halfB = makeHalf(-1, 0.44);  // hoja inferior + aro grande
  halfA.position.z = 0.045;
  halfB.position.z = -0.045;
  root.add(halfA, halfB);

  const screw = new THREE.Group();
  const head = new THREE.Mesh(new THREE.CylinderGeometry(0.12, 0.12, 0.2, 40), dark);
  head.rotation.x = Math.PI / 2;
  const cap = new THREE.Mesh(new THREE.SphereGeometry(0.1, 32, 16, 0, Math.PI * 2, 0, Math.PI / 2), copper);
  cap.rotation.x = Math.PI / 2;
  cap.position.z = 0.1;
  screw.add(head, cap);
  root.add(screw);

  // Sombra blanda sobre la página (da sensación de que flota sobre la pantalla)
  const shadowTex = (() => {
    const c = document.createElement("canvas");
    c.width = c.height = 128;
    const x = c.getContext("2d");
    const grd = x.createRadialGradient(64, 64, 0, 64, 64, 64);
    grd.addColorStop(0, "rgba(0,0,0,0.55)");
    grd.addColorStop(1, "rgba(0,0,0,0)");
    x.fillStyle = grd;
    x.fillRect(0, 0, 128, 128);
    return new THREE.CanvasTexture(c);
  })();
  const shadow = new THREE.Mesh(
    new THREE.PlaneGeometry(1, 1),
    new THREE.MeshBasicMaterial({ map: shadowTex, transparent: true, depthWrite: false, opacity: 0.55 })
  );
  shadow.renderOrder = -1;

  const holder = new THREE.Group(); // posición en pantalla
  holder.add(root);
  scene.add(shadow, holder);

  /* ---------- Estado y pintado ---------- */
  const st = { x: -9999, y: 0, len: 300, open: 0.5, roll: 0, visible: false };
  let W = 1, H = 1, k = 1, raf = 0;

  function resize() {
    W = canvas.clientWidth || window.innerWidth;
    H = canvas.clientHeight || window.innerHeight;
    renderer.setSize(W, H, false);
    camera.aspect = W / H;
    camera.updateProjectionMatrix();
    const visH = 2 * Math.tan(THREE.MathUtils.degToRad(camera.fov / 2)) * camera.position.z;
    k = visH / H; // unidades de mundo por píxel en z = 0
    schedule();
  }

  function draw() {
    raf = 0;
    if (!st.visible) { renderer.clear(); return; }
    const s = (st.len * k) / MODEL_LEN;
    holder.position.set((st.x - W / 2) * k, -(st.y - H / 2) * k, 0);
    holder.scale.setScalar(s);
    // Inclinación: se ve en perspectiva, como si cortara una hoja de papel
    root.rotation.set(-0.62 + st.roll * 0.06, -0.18, 0.04 + st.roll * 0.05);
    const a = 0.03 + st.open * 0.36;
    halfA.rotation.z = a;
    halfB.rotation.z = -a;

    shadow.position.set(holder.position.x + 0.28 * s * MODEL_LEN * 0.12, holder.position.y - 0.5 * s, -1.2);
    shadow.scale.set(s * MODEL_LEN * 1.05, s * (1.1 + st.open * 0.9), 1);
    renderer.render(scene, camera);
  }

  function schedule() { if (!raf) raf = requestAnimationFrame(draw); }

  resize();
  window.addEventListener("resize", resize);

  return {
    set(next) { Object.assign(st, next); schedule(); },
    get state() { return st; },
    resize,
  };
}
