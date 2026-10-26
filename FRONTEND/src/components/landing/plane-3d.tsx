"use client";

/**
 * The hero's 3D paper plane: a real folded dart (wings, keel and folded-up
 * winglets), ruled like a notebook page. It drifts, banks toward the pointer,
 * rolls as the visitor scrolls, leaves a soft dashed trail and, every so often,
 * loops the loop.
 *
 * Kept light: one tiny mesh, a capped pixel ratio, and the render loop runs
 * only while the canvas is on screen and the tab is visible.
 */
import { Canvas, useFrame, useThree } from "@react-three/fiber";
import { useEffect, useMemo, useRef, useState } from "react";
import * as THREE from "three";

function ruledTexture() {
  const c = document.createElement("canvas");
  c.width = c.height = 512;
  const g = c.getContext("2d")!;
  const grad = g.createLinearGradient(0, 0, 0, 512);
  grad.addColorStop(0, "#fffef9");
  grad.addColorStop(1, "#f7f3e8");
  g.fillStyle = grad;
  g.fillRect(0, 0, 512, 512);
  g.strokeStyle = "#c9d8ee";
  g.lineWidth = 3;
  for (let y = 40; y < 512; y += 38) { g.beginPath(); g.moveTo(0, y); g.lineTo(512, y); g.stroke(); }
  g.strokeStyle = "#e5917f";
  g.beginPath(); g.moveTo(90, 0); g.lineTo(90, 512); g.stroke();
  // the ॥ pause mark on the wing
  g.strokeStyle = "#3b66ae";
  g.lineWidth = 14;
  g.lineCap = "round";
  for (const x of [270, 320]) { g.beginPath(); g.moveTo(x + 12, 190); g.lineTo(x - 6, 300); g.stroke(); }
  const tex = new THREE.CanvasTexture(c);
  tex.colorSpace = THREE.SRGBColorSpace;
  tex.anisotropy = 4;
  return tex;
}

function usePlaneGeometry() {
  return useMemo(() => {
    // nose, wing tips, winglet tops, tail centre, keel bottom
    const N = [0, 0.05, 1.9];
    const L = [-1.2, 0.1, -1.0], R = [1.2, 0.1, -1.0];
    const Lw = [-1.32, 0.42, -1.12], Rw = [1.32, 0.42, -1.12];
    const Lb = [-1.05, 0.1, -0.55], Rb = [1.05, 0.1, -0.55];
    const T = [0, 0, -1.05], K = [0, -0.42, -1.05];
    const tris = [N, T, L, N, R, T, N, K, T, N, T, K, Lb, L, Lw, R, Rb, Rw];
    const uvs = [0.5, 1, 0.5, 0, 0, 0, 0.5, 1, 1, 0, 0.5, 0, 0.5, 1, 0.3, 0, 0.5, 0, 0.5, 1, 0.5, 0, 0.7, 0,
      0.1, 0.3, 0, 0, 0, 0.2, 1, 0, 0.9, 0.3, 1, 0.2];
    const geo = new THREE.BufferGeometry();
    geo.setAttribute("position", new THREE.Float32BufferAttribute(tris.flat(), 3));
    geo.setAttribute("uv", new THREE.Float32BufferAttribute(uvs, 2));
    geo.computeVertexNormals();
    return geo;
  }, []);
}

const TRAIL = 48;
const LOOP_EVERY = 9; // seconds
const LOOP_TIME = 1.6;

function Plane({ scrollRef, still }: { scrollRef: React.RefObject<number>; still: boolean }) {
  const group = useRef<THREE.Group>(null);
  const tail = useRef<THREE.Object3D>(null);
  const geo = usePlaneGeometry();
  const tex = useMemo(() => ruledTexture(), []);
  const edges = useMemo(() => new THREE.EdgesGeometry(geo, 1), [geo]);
  // The trail is created once, added to the scene in an effect, and only touched in the frame loop.
  const trailRef = useRef<THREE.Line | null>(null);
  const scene = useThree((s) => s.scene);
  useEffect(() => {
    const g = new THREE.BufferGeometry();
    g.setAttribute("position", new THREE.Float32BufferAttribute(new Float32Array(TRAIL * 3), 3));
    const mat = new THREE.LineDashedMaterial({ color: "#9cbce8", dashSize: 0.09, gapSize: 0.07, transparent: true, opacity: still ? 0 : 0.85 });
    const line = new THREE.Line(g, mat);
    line.frustumCulled = false;
    scene.add(line);
    trailRef.current = line;
    return () => { scene.remove(line); g.dispose(); mat.dispose(); trailRef.current = null; };
  }, [scene, still]);
  const tmp = useMemo(() => new THREE.Vector3(), []);
  const ready = useRef(false);

  useEffect(() => () => { geo.dispose(); edges.dispose(); tex.dispose(); }, [geo, edges, tex]);

  useFrame((state, dt) => {
    const g = group.current;
    if (!g) return;
    const t = state.clock.elapsedTime;
    const { x, y } = state.pointer;
    const s = scrollRef.current ?? 0;
    // Gentle bob and sway instead of a heavy helper.
    const bob = still ? 0 : Math.sin(t * 1.3) * 0.12;
    const sway = still ? 0 : Math.sin(t * 0.7) * 0.08;
    // Loop-the-loop: an eased full turn on the pitch axis, plus a little climb.
    const phase = (t % LOOP_EVERY) - (LOOP_EVERY - LOOP_TIME);
    const p = !still && phase > 0 ? phase / LOOP_TIME : 0;
    const eased = p * p * (3 - 2 * p);
    const loop = eased * Math.PI * 2;
    const climb = Math.sin(eased * Math.PI) * 0.55;

    g.rotation.y = THREE.MathUtils.damp(g.rotation.y, -0.6 + x * 0.5 + s * 2.2, 3, dt);
    g.rotation.x = THREE.MathUtils.damp(g.rotation.x, 0.35 - y * 0.3, 3, dt);
    g.rotation.z = THREE.MathUtils.damp(g.rotation.z, -x * 0.45 + sway, 3, dt);
    g.position.x = THREE.MathUtils.damp(g.position.x, x * 0.35 + s * 2.5, 2.5, dt);
    g.position.y = THREE.MathUtils.damp(g.position.y, y * 0.2 + s * 1.4 + bob + climb, 2.5, dt);
    g.children[0].rotation.x = -loop; // the loop turns the airframe inside the banking group

    // Trail: push the tail's world position, keep the last TRAIL points.
    const trail = trailRef.current;
    if (tail.current && trail) {
      tail.current.getWorldPosition(tmp);
      const pos = trail.geometry.getAttribute("position") as THREE.BufferAttribute;
      const arr = pos.array as Float32Array;
      if (!ready.current) { for (let i = 0; i < TRAIL; i++) arr.set([tmp.x, tmp.y, tmp.z], i * 3); ready.current = true; }
      arr.copyWithin(3, 0, (TRAIL - 1) * 3);
      // drift the trail back and down slightly so it reads as motion through air
      for (let i = 1; i < TRAIL; i++) { arr[i * 3] -= 0.012; arr[i * 3 + 1] -= 0.002; }
      arr.set([tmp.x, tmp.y, tmp.z], 0);
      pos.needsUpdate = true;
      trail.computeLineDistances();
    }
  });

  return (
    <>
      <group ref={group} scale={0.82}>
        <group>
          <mesh geometry={geo}>
            <meshStandardMaterial map={tex} side={THREE.DoubleSide} roughness={0.9} metalness={0} flatShading />
          </mesh>
          <lineSegments geometry={edges}>
            <lineBasicMaterial color="#1e2942" transparent opacity={0.55} />
          </lineSegments>
          <object3D ref={tail} position={[0, 0, -1.05]} />
        </group>
      </group>
    </>
  );
}

export default function Plane3D({ scrollRef }: { scrollRef: React.RefObject<number> }) {
  const wrap = useRef<HTMLDivElement>(null);
  const [onScreen, setOnScreen] = useState(true);
  const [visibleTab, setVisibleTab] = useState(true);
  const [still] = useState(() => typeof window !== "undefined" && window.matchMedia("(prefers-reduced-motion: reduce)").matches);

  useEffect(() => {
    const el = wrap.current;
    if (!el) return;
    const io = new IntersectionObserver(([e]) => setOnScreen(e.isIntersecting), { threshold: 0.01 });
    io.observe(el);
    const vis = () => setVisibleTab(document.visibilityState === "visible");
    document.addEventListener("visibilitychange", vis);
    return () => { io.disconnect(); document.removeEventListener("visibilitychange", vis); };
  }, []);

  return (
    <div ref={wrap} className="h-full w-full">
      <Canvas
        frameloop={onScreen && visibleTab ? "always" : "never"}
        dpr={[1, 1.5]}
        camera={{ position: [0, 0.6, 5.2], fov: 38 }}
        gl={{ antialias: true, alpha: true, powerPreference: "low-power" }}
        style={{ pointerEvents: "none" }}
        eventSource={typeof document !== "undefined" ? document.body : undefined}
        eventPrefix="client"
      >
        <ambientLight intensity={1.15} />
        <directionalLight position={[3, 5, 4]} intensity={1.4} color="#fff6e5" />
        <directionalLight position={[-4, -2, -3]} intensity={0.45} color="#c3d7f2" />
        <Plane scrollRef={scrollRef} still={still} />
      </Canvas>
    </div>
  );
}
