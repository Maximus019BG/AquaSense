"use client";

import { Suspense, useEffect, useState, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import { OrbitControls, PerspectiveCamera } from "@react-three/drei";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { Ocean } from "./ocean";
import { AnomalyMarkers } from "./anomaly-markers";

// Scene-wide constants
const SEA_FLOOR_Y = -8;
const SKY_RADIUS = 800;
const SUN_ORBIT_R = 600;

interface SensorData {
  temperature: number;
  ph: number;
  turbidity: number;
  dissolvedOxygen: number;
  waterLevel: number;
  alertLevel: "none" | "warning" | "critical";
}

interface WaterSceneProps {
  turbidity?: number;
  ph?: number;
  dissolvedOxygen?: number;
  temperature?: number;
  waterLevel?: number;
  alertLevel?: "none" | "warning" | "critical";
  quality?: "PERF" | "HIGH" | "ULTRA";
  timeOfDay?: number;
}

// ─── Sea floor ────────────────────────────────────────────────────────────────

function SeaFloor() {
  const meshRef = useRef<THREE.Mesh>(null);
  const material = useMemo(
    () => new THREE.MeshStandardMaterial({ color: "#1e2e1e", roughness: 0.9, metalness: 0.05 }),
    []
  );

  useEffect(() => {
    if (!meshRef.current) return;
    const geo = meshRef.current.geometry as THREE.PlaneGeometry;
    const pos = geo.attributes.position as THREE.BufferAttribute;
    for (let i = 0; i < pos.count; i++) {
      const x = pos.getX(i);
      const z = pos.getY(i); // plane lies in XY before the -90° X rotation
      pos.setZ(i,
        Math.sin(x * 0.3) * Math.cos(z * 0.25) * 0.8 +
        Math.sin(x * 0.8 + 0.5) * 0.15 +
        Math.sin(z * 1.2 + 0.3) * 0.1 - 0.3
      );
    }
    geo.computeVertexNormals();
  }, []);

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, SEA_FLOOR_Y, 0]} receiveShadow>
      <planeGeometry args={[600, 600, 128, 128]} />
      <primitive object={material} attach="material" />
    </mesh>
  );
}

// ─── Sea floor detail (rocks) ─────────────────────────────────────────────────

function Rocks() {
  // Deterministic layout — no Math.random() to avoid hydration mismatches
  const rocks = useMemo(() =>
    Array.from({ length: 30 }, (_, i) => {
      const angle = (i / 30) * Math.PI * 2 + i * 0.71;
      const dist = 10 + (i % 7) * 8;
      return { x: Math.cos(angle) * dist, z: Math.sin(angle) * dist, s: 0.4 + (i % 5) * 0.25, r: i * 1.3 };
    }), []
  );

  return (
    <group>
      {rocks.map((r, i) => (
        <mesh key={i} position={[r.x, SEA_FLOOR_Y + r.s * 0.3, r.z]} rotation={[0, r.r, 0]} castShadow>
          <dodecahedronGeometry args={[r.s, 0]} />
          <meshStandardMaterial color="#2d3d3d" roughness={0.95} />
        </mesh>
      ))}
    </group>
  );
}

function RockFormations() {
  const formations = useMemo(() =>
    Array.from({ length: 10 }, (_, i) => {
      const angle = (i / 10) * Math.PI * 2 + 0.4;
      const dist = 8 + (i % 4) * 6;
      return { x: Math.cos(angle) * dist, z: Math.sin(angle) * dist, h: 1.5 + (i % 3) };
    }), []
  );

  return (
    <group>
      {formations.map((f, i) => (
        <group key={i} position={[f.x, SEA_FLOOR_Y, f.z]}>
          {[0, 1, 2].map((j) => (
            <mesh key={j} position={[j * 0.3 - 0.3, f.h * j * 0.4, j * 0.2]} castShadow>
              <coneGeometry args={[0.5 + j * 0.3, f.h * (0.3 + j * 0.1), 6]} />
              <meshStandardMaterial color="#1f3a1f" roughness={0.9} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

// ─── Mountain backdrop ────────────────────────────────────────────────────────

// Mountains sit behind the sea. They must be above Y=0 (sea level) to be
// visible over the water surface. The clipping plane hides geometry below the
// waterline so only the ridges above Y=0 show — giving a clean backdrop feel.
const SEA_LEVEL_CLIP = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);
const MTN_PEAK_HEIGHT = 80; // units above sea level
const MTN_Z = -90;          // placed behind the sea, but in front of heavy fog

function MountainBackdrop() {
  const obj = useLoader(OBJLoader, "/models/mountains/obj_1.obj");

  const scene = useMemo(() => {
    const clone = obj.clone(true);
    clone.scale.set(28, 18, 14);
    clone.updateMatrixWorld(true);

    const box = new THREE.Box3().setFromObject(clone);
    // Translate Y so the highest point is exactly MTN_PEAK_HEIGHT above Y=0
    clone.position.set(0, MTN_PEAK_HEIGHT - box.max.y, MTN_Z);

    clone.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.material = new THREE.MeshStandardMaterial({
          color: "#4a5e42",
          roughness: 0.93,
          metalness: 0,
          clippingPlanes: [SEA_LEVEL_CLIP],
        });
        mesh.receiveShadow = true;
      }
    });
    return clone;
  }, [obj]);

  return <primitive object={scene} />;
}

// ─── Sky / atmosphere ─────────────────────────────────────────────────────────

// Deterministic cloud puffs using a numeric seed instead of Math.random()
function CloudLayer({ position, scale, seed }: {
  position: [number, number, number];
  scale: number;
  seed: number;
}) {
  const groupRef = useRef<THREE.Group>(null);

  const puffs = useMemo(() =>
    Array.from({ length: 6 }, (_, i) => {
      const a = (i / 6) * Math.PI * 2 + seed;
      return {
        x: Math.cos(a) * scale * 1.5,
        y: Math.sin(i * 0.9 + seed) * scale * 0.2,
        z: Math.sin(a) * scale * 0.8,
        s: scale * (0.6 + ((i * seed * 7) % 1) * 0.6),
      };
    }), [scale, seed]
  );

  useFrame(() => {
    if (!groupRef.current) return;
    groupRef.current.position.x += 0.04;
    if (groupRef.current.position.x > SKY_RADIUS * 0.4) {
      groupRef.current.position.x = -SKY_RADIUS * 0.4;
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {puffs.map((p, i) => (
        <mesh key={i} position={[p.x, p.y, p.z]}>
          <sphereGeometry args={[p.s, 7, 5]} />
          <meshStandardMaterial color="#f0f4ff" transparent opacity={0.82} roughness={1} fog={false} />
        </mesh>
      ))}
    </group>
  );
}

function Sky({ timeOfDay }: { timeOfDay: number }) {
  const isNight = timeOfDay < 5 || timeOfDay > 19;
  const isSunrise = (timeOfDay >= 5 && timeOfDay <= 7) || (timeOfDay >= 17 && timeOfDay <= 19);
  const t = isSunrise ? (timeOfDay < 12 ? (timeOfDay - 5) / 2 : (19 - timeOfDay) / 2) : 0;

  const skyColor = useMemo(() => {
    if (isNight) return new THREE.Color("#06061a");
    if (isSunrise) return new THREE.Color().lerpColors(
      new THREE.Color("#06061a"),
      new THREE.Color(timeOfDay < 12 ? "#e87040" : "#e85030"),
      t
    );
    return new THREE.Color("#3a7fd5");
  }, [isNight, isSunrise, t, timeOfDay]);

  return (
    <>
      {/* Dome — fog disabled so it never gets hazed */}
      <mesh>
        <sphereGeometry args={[SKY_RADIUS, 64, 32]} />
        <meshBasicMaterial color={skyColor} side={THREE.BackSide} fog={false} />
      </mesh>
      {/* Clouds at true scale for a 600-unit sea */}
      <CloudLayer position={[120, 80, -60]}  scale={20} seed={1.1} />
      <CloudLayer position={[-150, 90, 50]}  scale={25} seed={2.3} />
      <CloudLayer position={[50, 70, 120]}   scale={18} seed={3.7} />
      <CloudLayer position={[-80, 100, -130]} scale={22} seed={4.2} />
      <CloudLayer position={[200, 75, 80]}   scale={30} seed={5.6} />
    </>
  );
}

// Fibonacci-spiral distribution — even coverage, zero randomness
function Stars({ visible }: { visible: boolean }) {
  const positions = useMemo(() => {
    const N = 1200;
    const pos = new Float32Array(N * 3);
    for (let i = 0; i < N; i++) {
      const theta = ((i * 137.508) % 360) * (Math.PI / 180);
      const phi = Math.acos(1 - (i / N)) * 0.5; // upper hemisphere only
      const r = SKY_RADIUS * 0.95;
      pos[i * 3]     = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi) + 30;
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    return pos;
  }, []);

  return (
    <points>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={2.5} color="#ffffff" transparent opacity={visible ? 0.9 : 0} sizeAttenuation fog={false} />
    </points>
  );
}

function Sun({ timeOfDay }: { timeOfDay: number }) {
  const pos = useMemo((): [number, number, number] => {
    const a = (timeOfDay / 24) * Math.PI * 2 - Math.PI / 2;
    return [Math.cos(a) * SUN_ORBIT_R, Math.sin(a) * SUN_ORBIT_R * 0.6 + 50, 80];
  }, [timeOfDay]);

  if (timeOfDay <= 5 || timeOfDay >= 20) return null;

  return (
    <mesh position={pos}>
      <sphereGeometry args={[18, 24, 16]} />
      <meshBasicMaterial color="#fffde0" fog={false} />
    </mesh>
  );
}

function Moon({ timeOfDay }: { timeOfDay: number }) {
  const pos = useMemo((): [number, number, number] => {
    const a = (timeOfDay / 24) * Math.PI * 2 + Math.PI / 2;
    return [Math.cos(a) * SUN_ORBIT_R * 0.8, Math.sin(a) * SUN_ORBIT_R * 0.5 + 30, -60];
  }, [timeOfDay]);

  if (timeOfDay > 6 && timeOfDay < 18) return null;

  return (
    <mesh position={pos}>
      <sphereGeometry args={[10, 24, 16]} />
      <meshStandardMaterial
        color="#d8d8c0"
        emissive="#d8d8c0"
        emissiveIntensity={0.3}
        roughness={0.9}
        fog={false}
      />
    </mesh>
  );
}

// ─── Lighting ─────────────────────────────────────────────────────────────────

function AtmosphericConditions({ timeOfDay }: { timeOfDay: number }) {
  const isNight   = timeOfDay < 5 || timeOfDay > 19;
  const isSunrise = (timeOfDay >= 5 && timeOfDay <= 7) || (timeOfDay >= 17 && timeOfDay <= 19);

  const lightColor  = isNight ? "#4444aa" : isSunrise ? "#ffaa70" : "#fff5e0";
  const ambientColor = isNight ? "#111133" : isSunrise ? "#ff8866" : "#87CEEB";
  const hemiSky    = isNight ? "#0a0a2a" : isSunrise ? "#ff6040" : "#87CEEB";
  const hemiGround = isNight ? "#050510" : isSunrise ? "#402010" : "#3d5c2a";

  return (
    <>
      <directionalLight
        position={[80, 120, 50]}
        intensity={isNight ? 0.08 : isSunrise ? 0.6 : 1.4}
        color={lightColor}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-80}
        shadow-camera-right={80}
        shadow-camera-top={80}
        shadow-camera-bottom={-80}
        shadow-camera-near={1}
        shadow-camera-far={400}
      />
      <hemisphereLight args={[hemiSky, hemiGround, isNight ? 0.15 : 0.7]} />
      <ambientLight intensity={isNight ? 0.08 : 0.25} color={ambientColor} />
    </>
  );
}

// ─── Scene ────────────────────────────────────────────────────────────────────

function Scene({ sensorData, quality, timeOfDay = 12 }: {
  sensorData: SensorData;
  quality: "PERF" | "HIGH" | "ULTRA";
  timeOfDay: number;
}) {
  const isNight = timeOfDay < 5 || timeOfDay > 19;
  const isSunrise = (timeOfDay >= 5 && timeOfDay <= 7) || (timeOfDay >= 17 && timeOfDay <= 19);
  const fogColor = isNight ? "#06061a" : isSunrise ? "#c07050" : "#87ceeb";

  return (
    <>
      <fog attach="fog" args={[fogColor, 250, 900]} />

      <AtmosphericConditions timeOfDay={timeOfDay} />
      <Sky timeOfDay={timeOfDay} />
      <Stars visible={isNight} />
      <Sun timeOfDay={timeOfDay} />
      <Moon timeOfDay={timeOfDay} />

      <Suspense fallback={null}>
        <MountainBackdrop />
      </Suspense>

      {/* Alert-state glow on the water surface */}
      <pointLight
        position={[0, 2, 0]}
        color={
          sensorData.alertLevel === "critical" ? "#ff4444"
          : sensorData.alertLevel === "warning" ? "#ffaa00"
          : "#00aaff"
        }
        intensity={sensorData.alertLevel === "none" ? 0 : 1.2}
        distance={60}
        decay={2}
      />

      <PerspectiveCamera makeDefault position={[0, 10, 45]} fov={75} />

      <Ocean
        turbidity={sensorData.turbidity}
        ph={sensorData.ph}
        dissolvedOxygen={sensorData.dissolvedOxygen}
        temperature={sensorData.temperature}
        waterLevel={sensorData.waterLevel}
        alertLevel={sensorData.alertLevel}
        quality={quality}
        timeOfDay={timeOfDay}
      />

      <SeaFloor />
      <Rocks />
      <RockFormations />
      <AnomalyMarkers />

      <OrbitControls
        enablePan={false}
        enableZoom={true}
        enableRotate={true}
        autoRotate={true}
        autoRotateSpeed={0.12}
        enableDamping={true}
        dampingFactor={0.06}
        minDistance={8}
        maxDistance={200}
        maxPolarAngle={Math.PI / 2 - 0.02}
        target={[0, 0, 0]}
      />
    </>
  );
}

// ─── Canvas wrapper ───────────────────────────────────────────────────────────

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full bg-[#06061a]">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#00aacc] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Loading Black Sea simulation...</p>
      </div>
    </div>
  );
}

function WaterSceneCanvas({ sensorData, quality, timeOfDay }: {
  sensorData: SensorData;
  quality: "PERF" | "HIGH" | "ULTRA";
  timeOfDay: number;
}) {
  return (
    <div className="w-full h-full">
      <Suspense fallback={<LoadingFallback />}>
        <Canvas
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: "high-performance",
            localClippingEnabled: true,
          }}
          dpr={[1, 2]}
          frameloop="always"
          shadows
        >
          <Scene sensorData={sensorData} quality={quality} timeOfDay={timeOfDay} />
        </Canvas>
      </Suspense>
    </div>
  );
}

// ─── Public export ────────────────────────────────────────────────────────────

export function WaterScene({
  turbidity = 15,
  ph = 7.2,
  dissolvedOxygen = 8.5,
  temperature = 24.5,
  waterLevel = 250,
  alertLevel = "none",
  quality = "ULTRA",
  timeOfDay = 12,
}: WaterSceneProps) {
  const [mounted, setMounted] = useState(false);

  const sensorData = useMemo<SensorData>(
    () => ({ temperature, ph, turbidity, dissolvedOxygen, waterLevel, alertLevel }),
    [temperature, ph, turbidity, dissolvedOxygen, waterLevel, alertLevel]
  );

  useEffect(() => {
    const t = setTimeout(() => setMounted(true), 100);
    return () => clearTimeout(t);
  }, []);

  if (!mounted) return <LoadingFallback />;

  return <WaterSceneCanvas sensorData={sensorData} quality={quality} timeOfDay={timeOfDay} />;
}
