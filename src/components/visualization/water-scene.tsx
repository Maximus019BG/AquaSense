"use client";

import { Suspense, useEffect, useState, useMemo, useRef } from "react";
import { Canvas, useFrame, useLoader } from "@react-three/fiber";
import {
  OrbitControls,
  PerspectiveCamera,
} from "@react-three/drei";
import * as THREE from "three";
import { OBJLoader } from "three/examples/jsm/loaders/OBJLoader.js";
import { Ocean } from "./ocean";
import { AnomalyMarkers } from "./anomaly-markers";

const BLACK_SEA_DEPTH = 8;
const SEA_FLOOR_Y = -BLACK_SEA_DEPTH;


// Add minimal type definitions used in this file
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


function SeaFloor() {
  const meshRef = useRef<THREE.Mesh>(null);

  const floorMaterial = useMemo(() => {
    return new THREE.MeshStandardMaterial({
      color: "#2a3a2a",
      roughness: 0.85,
      metalness: 0.1,
    });
  }, []);

  useEffect(() => {
    if (!meshRef.current) return;
    const geo = meshRef.current.geometry as THREE.PlaneGeometry;
    const positions = geo.attributes.position! as THREE.BufferAttribute;
    for (let i = 0; i < positions.count; i++) {
      const x = positions.getX(i);
      const y = positions.getY(i);
      const z =
        -0.5 +
        Math.sin(x * 0.3) * Math.cos(y * 0.25) * 0.8 +
        Math.sin(x * 0.8 + 0.5) * 0.15 +
        Math.sin(y * 1.2 + 0.3) * 0.1;
      positions.setZ(i, z);
    }
    geo.computeVertexNormals();
  }, []);

  return (
    <mesh
      ref={meshRef}
      rotation={[-Math.PI / 2, 0, 0]}
      position={[0, SEA_FLOOR_Y, 0]}
      receiveShadow
    >
      <planeGeometry args={[60, 60, 128, 128]} />
      <primitive object={floorMaterial} attach="material" />
    </mesh>
  );
}

function Rocks() {
  const rocks = useMemo(() => {
    const rockData = [];
    for (let i = 0; i < 25; i++) {
      const x = (Math.random() - 0.5) * 50;
      const z = (Math.random() - 0.5) * 50;
      const scale = 0.3 + Math.random() * 1.2;
      const rotation = Math.random() * Math.PI * 2;
      rockData.push({ x, z, scale, rotation });
    }
    return rockData;
  }, []);

  return (
    <group>
      {rocks.map((rock, i) => (
        <group key={i} position={[rock.x, SEA_FLOOR_Y + rock.scale * 0.3, rock.z]} rotation={[0, rock.rotation, 0]}>
          <mesh castShadow>
            <dodecahedronGeometry args={[rock.scale, 0]} />
            <meshStandardMaterial color="#2d3d3d" roughness={0.95} />
          </mesh>
        </group>
      ))}
    </group>
  );
}

function RockFormations() {
  const formations = useMemo(() => {
    const data = [];
    for (let i = 0; i < 8; i++) {
      const x = (Math.random() - 0.5) * 45;
      const z = (Math.random() - 0.5) * 45;
      const height = 1 + Math.random() * 3;
      data.push({ x, z, height });
    }
    return data;
  }, []);

  return (
    <group>
      {formations.map((form, i) => (
        <group key={i} position={[form.x, SEA_FLOOR_Y, form.z]}>
          {[0, 1, 2].map((j) => (
            <mesh key={j} position={[j * 0.3 - 0.3, form.height * j * 0.4, j * 0.2]} castShadow>
              <coneGeometry args={[0.5 + j * 0.3, form.height * (0.3 + j * 0.1), 6]} />
              <meshStandardMaterial color="#1f3a1f" roughness={0.9} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

interface SeaweedProps {
  position: [number, number, number];
  height?: number;
}

function Seaweed({ position, height = 2 + Math.random() * 3 }: SeaweedProps) {
  const meshRef = useRef<THREE.Group>(null);
  const segments = Math.floor(3 + Math.random() * 4);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.elapsedTime;
    meshRef.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      if (mesh.rotation) {
        const offset = i * 0.3;
        mesh.rotation.z = Math.sin(time * 0.5 + offset) * (0.1 + i * 0.05);
        mesh.rotation.x = Math.cos(time * 0.3 + offset) * 0.05;
      }
    });
  });

  return (
    <group ref={meshRef} position={position}>
      {Array.from({ length: segments }).map((_, i) => (
        <mesh key={i} position={[0, i * 0.5, 0]} castShadow>
          <cylinderGeometry args={[0.02, 0.04, 0.5, 6]} />
          <meshStandardMaterial color="#1a5a1a" roughness={0.7} />
        </mesh>
      ))}
    </group>
  );
}

function Kelp({ position, height = 4 + Math.random() * 4 }: SeaweedProps) {
  const meshRef = useRef<THREE.Group>(null);
  const segments = Math.floor(5 + Math.random() * 5);

  useFrame((state) => {
    if (!meshRef.current) return;
    const time = state.clock.elapsedTime;
    meshRef.current.children.forEach((child, i) => {
      const mesh = child as THREE.Mesh;
      if (mesh.rotation) {
        const wave = Math.sin(time * 0.3 + i * 0.2) * (0.15 + i * 0.03);
        mesh.rotation.z = wave;
        mesh.rotation.x = Math.cos(time * 0.2 + i * 0.15) * 0.08;
      }
    });
  });

  return (
    <group ref={meshRef} position={position}>
      {Array.from({ length: segments }).map((_, i) => (
        <mesh key={i} position={[0, i * 0.6 + 0.3, 0]} castShadow>
          <boxGeometry args={[0.15, 0.6, 0.02]} />
          <meshStandardMaterial color="#0d4a0d" roughness={0.6} />
        </mesh>
      ))}
    </group>
  );
}

function SeafloorVegetation() {
  const vegetation = useMemo(() => {
    const plants = [];
    for (let i = 0; i < 60; i++) {
      const type = Math.random() > 0.6 ? "kelp" : "seaweed";
      const x = (Math.random() - 0.5) * 50;
      const z = (Math.random() - 0.5) * 50;
      const height = type === "kelp" ? 4 + Math.random() * 4 : 2 + Math.random() * 3;
      plants.push({ type, position: [x, SEA_FLOOR_Y + height * 0.3, z], height });
    }
    return plants;
  }, []);

  return (
    <group>
      {vegetation.map((plant, i) =>
        plant.type === "kelp" ? (
          <Kelp key={`kelp-${i}`} position={plant.position as [number, number, number]} height={plant.height} />
        ) : (
          <Seaweed key={`seaweed-${i}`} position={plant.position as [number, number, number]} height={plant.height} />
        )
      )}
    </group>
  );
}

interface CoralProps {
  position: [number, number, number];
  color?: string;
  type: "brain" | "branch" | "fan";
}

function Coral({ position, color, type }: CoralProps) {
  const fillColor = color ?? '#ff6b6b';
  return (
    <group position={position}>
      {type === "brain" && (
        <mesh castShadow>
          <sphereGeometry args={[0.4, 16, 16]} />
          <meshStandardMaterial color={fillColor} roughness={0.8} />
        </mesh>
      )}
      {type === "branch" && (
        <group>
          {[0, 60, 120, 180, 240, 300].map((angle, i) => (
            <mesh key={i} position={[0, i * 0.15, 0]} rotation={[0, 0, (angle * Math.PI) / 180]} castShadow>
              <cylinderGeometry args={[0.02, 0.08, 0.3, 6]} />
              <meshStandardMaterial color={fillColor} roughness={0.7} />
            </mesh>
          ))}
        </group>
      )}
      {type === "fan" && (
        <mesh castShadow rotation={[0.3, 0, 0]}>
          <circleGeometry args={[0.5, 16]} />
          <meshStandardMaterial color={fillColor} roughness={0.5} side={THREE.DoubleSide} />
        </mesh>
      )}
    </group>
  );
}

function CoralReef() {
  const corals = useMemo(() => {
    const coralData: CoralProps[] = [];
    const colors = ["#ff6b6b", "#ffa07a", "#ff8c69", "#e066ff", "#ff69b4", "#ffa500"];
    for (let i = 0; i < 20; i++) {
      const type = ["brain", "branch", "fan"][Math.floor(Math.random() * 3)] as "brain" | "branch" | "fan";
      const color = colors[Math.floor(Math.random() * colors.length)];
      const x = (Math.random() - 0.5) * 40;
      const z = (Math.random() - 0.5) * 40;
      coralData.push({ type, color, position: [x, SEA_FLOOR_Y + 0.2, z] as [number, number, number] });
    }
    return coralData;
  }, []);

  return (
    <group>
      {corals.map((coral, i) => (
        <Coral key={i} type={coral.type} color={coral.color ?? '#ff6b6b'} position={coral.position} />
      ))}
    </group>
  );
}

function PlanktonParticles() {
  const particlesRef = useRef<THREE.Points>(null);
  const count = 500;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 50;
      pos[i * 3 + 1] = SEA_FLOOR_Y + 1 + Math.random() * 6;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 50;
    }
    return pos;
  }, []);

  useFrame((state) => {
    if (!particlesRef.current) return;
    const time = state.clock.elapsedTime;
    const posAttr = particlesRef.current.geometry.attributes.position as THREE.BufferAttribute | undefined;
    if (!posAttr) return;
    const arr = posAttr.array as unknown;
    if (!(arr instanceof Float32Array)) return;
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      arr[idx + 1] = (arr[idx + 1] ?? 0) + Math.sin(time * 0.2 + i * 0.01) * 0.002;
      arr[idx] = (arr[idx] ?? 0) + Math.sin(time * 0.1 + i * 0.02) * 0.001;
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.05} color="#4a9fff" transparent opacity={0.6} sizeAttenuation />
    </points>
  );
}

function BioluminescentParticles() {
  const particlesRef = useRef<THREE.Points>(null);
  const count = 200;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 40;
      pos[i * 3 + 1] = SEA_FLOOR_Y + 0.5 + Math.random() * 5;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 40;
    }
    return pos;
  }, []);

  useFrame((state) => {
    if (!particlesRef.current) return;
    const time = state.clock.elapsedTime;
    const posAttr = particlesRef.current.geometry.attributes.position as THREE.BufferAttribute | undefined;
    if (!posAttr) return;
    const arr = posAttr.array as unknown;
    if (!(arr instanceof Float32Array)) return;
    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      const newVal = (arr[idx + 1] ?? 0) + Math.sin(time * 0.5 + i * 0.05) * 0.003;
      arr[idx + 1] = newVal;
      if (newVal > -1) arr[idx + 1] = SEA_FLOOR_Y + 0.5;
    }
    posAttr.needsUpdate = true;
  });

  return (
    <points ref={particlesRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.08} color="#00ffcc" transparent opacity={0.8} sizeAttenuation />
    </points>
  );
}

function Fish({ position, speed }: { position: [number, number, number]; speed: number }) {
  const groupRef = useRef<THREE.Group>(null);
  const startPos = useRef(new THREE.Vector3(...position));
  const direction = useRef(new THREE.Vector3(Math.random() - 0.5, 0, Math.random() - 0.5).normalize());

  useFrame((state) => {
    if (!groupRef.current) return;
    const time = state.clock.elapsedTime;
    groupRef.current.position.x = startPos.current.x + Math.sin(time * speed) * 5 * direction.current.x;
    groupRef.current.position.z = startPos.current.z + Math.cos(time * speed * 0.7) * 5 * direction.current.z;
    groupRef.current.rotation.y = Math.atan2(direction.current.x, direction.current.z);
  });

  return (
    <group ref={groupRef} position={position}>
      <mesh rotation={[0, 0, Math.PI / 2]}>
        <coneGeometry args={[0.1, 0.3, 8]} />
        <meshStandardMaterial color="#c0c0c0" metalness={0.3} roughness={0.4} />
      </mesh>
    </group>
  );
}

function FishSchool() {
  const fishes = useMemo(() => {
    const fishData = [];
    for (let i = 0; i < 15; i++) {
      const x = (Math.random() - 0.5) * 30;
      const y = -2 - Math.random() * 4;
      const z = (Math.random() - 0.5) * 30;
      const speed = 0.2 + Math.random() * 0.4;
      fishData.push({ position: [x, y, z] as [number, number, number], speed });
    }
    return fishData;
  }, []);

  return (
    <group>
      {fishes.map((fish, i) => (
        <Fish key={i} {...fish} />
      ))}
    </group>
  );
}

function Islands() {
  const islands = useMemo(() => {
    const data: { x: number; z: number; scale: number }[] = [];
    const positions = [
      { x: 22, z: 15 },
      { x: -18, z: 20 },
      { x: 20, z: -18 },
      { x: -22, z: -15 },
      { x: 0, z: 25 },
      { x: 0, z: -25 },
      { x: 25, z: 0 },
      { x: -25, z: 0 },
    ];
    for (let i = 0; i < positions.length; i++) {
      const p = positions[i]!;
      data.push({
        x: p.x + (Math.random() - 0.5) * 3,
        z: p.z + (Math.random() - 0.5) * 3,
        scale: 1 + Math.random() * 2,
      });
    }
    return data;
  }, []);

  return (
    <group>
      {islands.map((island, i) => (
        <group key={i} position={[island.x, SEA_FLOOR_Y + island.scale * 0.2, island.z]}>
          <mesh castShadow receiveShadow>
            <sphereGeometry args={[island.scale, 8, 6]} />
            <meshStandardMaterial color="#3d5c3d" roughness={0.95} />
          </mesh>
          {[0, 1, 2].map((j) => (
            <mesh key={j} position={[j * 0.3 - 0.3, island.scale * 0.8, j * 0.2]} castShadow>
              <coneGeometry args={[0.4, 1.2 + j * 0.3, 6]} />
              <meshStandardMaterial color="#1a4a1a" roughness={0.9} />
            </mesh>
          ))}
        </group>
      ))}
    </group>
  );
}

// Mountain backdrop using obj_1.obj.
// The model is sunk to Y=-10 so only ridges above world Y=0 (sea level) are visible.
// A clipping plane at Y=0 cuts everything below sea — only the peaks poke above the horizon.
// XZ scale 2.5 pushes those peaks to ±67 units, keeping them clearly in the background.
const SEA_LEVEL_CLIP = new THREE.Plane(new THREE.Vector3(0, 1, 0), 0);

function MountainBackdrop() {
  const obj = useLoader(OBJLoader, "/models/mountains/obj_1.obj");

  useEffect(() => {
    obj.traverse((child) => {
      if ((child as THREE.Mesh).isMesh) {
        const mesh = child as THREE.Mesh;
        mesh.material = new THREE.MeshStandardMaterial({
          color: "#5a6b50",
          roughness: 0.92,
          metalness: 0.0,
          clippingPlanes: [SEA_LEVEL_CLIP],
        });
        mesh.receiveShadow = true;
      }
    });
  }, [obj]);

  return (
    <primitive
      object={obj}
      position={[0, -10, 0]}
      scale={[2.5, 1.5, 2.5]}
    />
  );
}

function Stars({ visible }: { visible: boolean }) {
  const starsRef = useRef<THREE.Points>(null);
  const count = 800;

  const positions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const theta = Math.random() * Math.PI * 2;
      const phi = Math.random() * Math.PI * 0.5;
      const r = 80 + Math.random() * 20;
      pos[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      pos[i * 3 + 1] = r * Math.cos(phi) + 20;
      pos[i * 3 + 2] = r * Math.sin(phi) * Math.sin(theta);
    }
    return pos;
  }, []);

  return (
    <points ref={starsRef}>
      <bufferGeometry>
        <bufferAttribute attach="attributes-position" args={[positions, 3]} />
      </bufferGeometry>
      <pointsMaterial size={0.4} color="#ffffff" transparent opacity={visible ? 1.0 : 0} sizeAttenuation />
    </points>
  );
}

function Moon({ visible, timeOfDay }: { visible: boolean; timeOfDay: number }) {
  const moonAngle = useMemo(() => -Math.PI / 2 + (timeOfDay / 24) * Math.PI * 2, [timeOfDay]);
  const moonPos = useMemo(() => {
    const angle = moonAngle;
    return [Math.cos(angle) * 70, Math.sin(angle) * 50 + 15, -30] as [number, number, number];
  }, [moonAngle]);

  if (!visible) return null;

  return (
    <group position={moonPos}>
      <mesh>
        <sphereGeometry args={[3, 32, 32]} />
        <meshStandardMaterial color="#e8e8d0" emissive="#e8e8d0" emissiveIntensity={0.3} roughness={0.9} />
      </mesh>
      <pointLight color="#e8e8d0" intensity={0.3} distance={50} />
    </group>
  );
}

function Sun({ visible, timeOfDay }: { visible: boolean; timeOfDay: number }) {
  const sunPos = useMemo(() => {
    const angle = (timeOfDay / 24) * Math.PI * 2 - Math.PI / 2;
    return [Math.cos(angle) * 80, Math.sin(angle) * 60 + 10, 30] as [number, number, number];
  }, [timeOfDay]);

  if (!visible) return null;

  return (
    <group position={sunPos}>
      <mesh>
        <sphereGeometry args={[6, 32, 32]} />
        <meshBasicMaterial color="#FFFF00" />
      </mesh>
      <pointLight color="#FFFF00" intensity={2} distance={150} />
    </group>
  );
}

function CloudLayer({ position, scale }: { position: [number, number, number]; scale: number }) {
  const groupRef = useRef<THREE.Group>(null);
  
  useFrame((state) => {
    if (groupRef.current) {
      groupRef.current.position.x += 0.008;
      if (groupRef.current.position.x > 80) {
        groupRef.current.position.x = -80;
      }
    }
  });

  return (
    <group ref={groupRef} position={position}>
      {Array.from({ length: 8 }).map((_, i) => {
        const cloudScale = scale * (0.5 + Math.random() * 0.8);
        return (
          <mesh key={i} position={[
            (Math.random() - 0.5) * scale * 4,
            (Math.random() - 0.5) * scale * 0.5,
            (Math.random() - 0.5) * scale * 2
          ]}>
            <sphereGeometry args={[cloudScale, 8, 8]} />
            <meshStandardMaterial 
              color="#ffffff" 
              transparent 
              opacity={0.85} 
              roughness={1}
            />
          </mesh>
        );
      })}
    </group>
  );
}

function Sky({ timeOfDay }: { timeOfDay: number }) {
  const isNight = timeOfDay < 5 || timeOfDay > 19;
  const isSunrise = (timeOfDay >= 5 && timeOfDay <= 7) || (timeOfDay >= 17 && timeOfDay <= 19);
  const isDay = timeOfDay > 6 && timeOfDay < 18;
  const sunriseFactor = isSunrise ? (timeOfDay < 7 ? (timeOfDay - 5) / 2 : (19 - timeOfDay) / 2) : 0;

  const nightColor = new THREE.Color("#0a0a1a");
  const dawnColor = new THREE.Color("#ff7040");
  const dayColor = new THREE.Color("#4a90d9");
  const duskColor = new THREE.Color("#ff6040");

  const skyColor = useMemo(() => {
    if (isNight) return nightColor;
    if (isSunrise) {
      const c = new THREE.Color();
      if (timeOfDay < 12) {
        c.lerpColors(nightColor, dawnColor, sunriseFactor);
      } else {
        c.lerpColors(nightColor, duskColor, sunriseFactor);
      }
      return c;
    }
    return dayColor;
  }, [timeOfDay, isNight, isSunrise, sunriseFactor]);

  const horizonColor = useMemo(() => {
    if (isNight) return new THREE.Color("#1a1a2a");
    if (isSunrise) {
      return new THREE.Color("#ff9060");
    }
    return new THREE.Color("#87ceee");
  }, [timeOfDay, isNight, isSunrise]);

  return (
    <group>
      <mesh position={[0, 0, 0]}>
        <sphereGeometry args={[100, 64, 64]} />
        <meshBasicMaterial color={skyColor} side={THREE.BackSide} />
      </mesh>
      <mesh position={[0, 0, 0]} rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 1.3, 64]} />
        <meshBasicMaterial color={horizonColor} side={THREE.DoubleSide} transparent opacity={0.4} />
      </mesh>
      <CloudLayer position={[25, 20, -15]} scale={3} />
      <CloudLayer position={[-30, 22, 10]} scale={4} />
      <CloudLayer position={[10, 18, 20]} scale={2.5} />
      <CloudLayer position={[-15, 25, -25]} scale={3.5} />
    </group>
  );
}

function AtmosphericConditions({ timeOfDay }: { timeOfDay: number }) {
  const isNight = timeOfDay < 5 || timeOfDay > 19;
  const isSunrise = (timeOfDay >= 5 && timeOfDay <= 7) || (timeOfDay >= 17 && timeOfDay <= 19);
  const isDay = timeOfDay > 6 && timeOfDay < 18;

  const lightColor = useMemo(() => {
    if (isNight) return "#4444aa";
    if (isSunrise) return "#ffaa70";
    return "#fff5e0";
  }, [timeOfDay, isNight, isSunrise]);

  const ambientColor = useMemo(() => {
    if (isNight) return "#111133";
    if (isSunrise) return "#ff8866";
    return "#87CEEB";
  }, [timeOfDay, isNight, isSunrise]);

  const hemisphereColor = useMemo(() => {
    if (isNight) return ["#0a0a2a", "#050510"];
    if (isSunrise) return ["#ff6040", "#402010"];
    return ["#87CEEB", "#444444"];
  }, [timeOfDay, isNight, isSunrise]);

  return (
    <>
      <directionalLight
        position={[50, 80, 30]}
        intensity={isNight ? 0.1 : isSunrise ? 0.8 : 1.5}
        color={lightColor}
        castShadow
        shadow-mapSize={[2048, 2048]}
        shadow-camera-left={-30}
        shadow-camera-right={30}
        shadow-camera-top={30}
        shadow-camera-bottom={-30}
      />
      <hemisphereLight args={[hemisphereColor[0], hemisphereColor[1], isNight ? 0.2 : 0.8]} />
      <ambientLight intensity={isNight ? 0.1 : 0.3} color={ambientColor} />
    </>
  );
}

function Scene({
  sensorData,
  quality,
  timeOfDay = 12,
}: {
  sensorData: SensorData;
  quality: "PERF" | "HIGH" | "ULTRA";
  timeOfDay: number;
}) {
  const isNight = timeOfDay < 5 || timeOfDay > 19;
  // Fog fades distant mountains into the sky — near edge at 55 units, fully opaque at 130 units
  const fogColor = isNight ? "#0a0a1a" : (timeOfDay >= 5 && timeOfDay <= 7) || (timeOfDay >= 17 && timeOfDay <= 19) ? "#c07050" : "#87ceeb";

  return (
    <>
      <fog attach="fog" args={[fogColor, 55, 130]} />
      <AtmosphericConditions timeOfDay={timeOfDay} />

      <Sky timeOfDay={timeOfDay} />
      <Stars visible={false} />
      <Moon visible={false} timeOfDay={timeOfDay} />
      <Sun visible={true} timeOfDay={12} />

      <Suspense fallback={null}>
        <MountainBackdrop />
      </Suspense>
      {/* use the existing components defined below */}
      <RockFormations />
      <Islands />

      <pointLight position={[0, -2, 0]} color="#0a5a7a" intensity={0.8} distance={20} />
      <pointLight position={[0, -4, 0]} color="#0a3a5a" intensity={0.5} distance={25} />
      <pointLight
        position={[0, -1, 0]}
        color={sensorData.alertLevel === "critical" ? "#ff4444" : sensorData.alertLevel === "warning" ? "#ffaa00" : "#00aaff"}
        intensity={sensorData.alertLevel === "none" ? 0 : 0.6}
        distance={10}
      />

<PerspectiveCamera makeDefault position={[0, 3, 12]} fov={60} />

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
      <SeafloorVegetation />
      <CoralReef />

      {quality !== "PERF" && (
        <>
          <PlanktonParticles />
          <BioluminescentParticles />
        </>
      )}

      {quality === "ULTRA" && <FishSchool />}

      <AnomalyMarkers />

      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        autoRotate={true}
        autoRotateSpeed={0.15}
        enableDamping={true}
        dampingFactor={0.05}
        minDistance={3}
        maxDistance={25}
        maxPolarAngle={Math.PI / 2 - 0.05}
      />
    </>
  );
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full bg-[#010a14]">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#00aacc] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Loading Black Sea simulation...</p>
      </div>
    </div>
  );
}

function WaterSceneCanvas({
  sensorData,
  quality,
  timeOfDay,
}: {
  sensorData: SensorData;
  quality: "PERF" | "HIGH" | "ULTRA";
  timeOfDay: number;
}) {
  return (
    <div className="w-full h-full bg-transparent">
      <Suspense fallback={<LoadingFallback />}>
        <Canvas
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: "high-performance",
            localClippingEnabled: true,
          }}
          dpr={[1, 2]}
          camera={{ position: [0, 3, 12], fov: 60 }}
          style={{ background: "transparent" }}
          frameloop="always"
          shadows
        >
          <Scene sensorData={sensorData} quality={quality} timeOfDay={timeOfDay} />
        </Canvas>
      </Suspense>
    </div>
  );
}

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
    () => ({
      temperature,
      ph,
      turbidity,
      dissolvedOxygen,
      waterLevel,
      alertLevel,
    }),
    [temperature, ph, turbidity, dissolvedOxygen, waterLevel, alertLevel]
  );

  useEffect(() => {
    const timer = setTimeout(() => {
      setMounted(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) {
    return <LoadingFallback />;
  }

  return <WaterSceneCanvas sensorData={sensorData} quality={quality} timeOfDay={timeOfDay} />;
}