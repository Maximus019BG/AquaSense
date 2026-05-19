"use client";

import { useRef } from "react";
import { useFrame } from "@react-three/fiber";
import { Html } from "@react-three/drei";
import type { Group } from "three";
import { AlertTriangle } from "lucide-react";

interface Anomaly {
  id: string;
  type: "critical" | "warning" | "info";
  parameter: string;
  value: number;
  position: [number, number, number];
}

function Marker({ anomaly }: { anomaly: Anomaly }) {
  const groupRef = useRef<Group>(null);

  useFrame((state) => {
    if (groupRef.current) {
      // Floating animation
      groupRef.current.position.y =
        anomaly.position[1] + Math.sin(state.clock.elapsedTime * 2) * 0.1;

      // Pulse scale animation
      const scale = 1 + Math.sin(state.clock.elapsedTime * 3) * 0.1;
      groupRef.current.scale.set(scale, scale, scale);
    }
  });

  const color =
    anomaly.type === "critical"
      ? "#F44336"
      : anomaly.type === "warning"
        ? "#FFC107"
        : "#2196F3";

  return (
    <group ref={groupRef} position={anomaly.position}>
      {/* Glow ring */}
      <mesh rotation={[-Math.PI / 2, 0, 0]}>
        <ringGeometry args={[0.3, 0.35, 32]} />
        <meshBasicMaterial color={color} transparent opacity={0.5} />
      </mesh>

      {/* Vertical line to water */}
      <mesh position={[0, -0.5, 0]}>
        <cylinderGeometry args={[0.02, 0.02, 1, 8]} />
        <meshBasicMaterial color={color} transparent opacity={0.3} />
      </mesh>

      {/* Label */}
      <Html distanceFactor={10}>
        <div
          className="px-2 py-1 rounded text-xs font-bold whitespace-nowrap flex items-center gap-1"
          style={{
            backgroundColor: color,
            color: anomaly.type === "warning" ? "#000" : "#fff",
          }}
        >
          <AlertTriangle className="w-3 h-3" />
          <span>
            {anomaly.parameter}: {anomaly.value}
          </span>
        </div>
      </Html>
    </group>
  );
}

export function AnomalyMarkers({ markers }: { markers?: Anomaly[] }) {
  const list = markers && Array.isArray(markers) ? markers : [];
  return (
    <>
      {list.map((anomaly) => (
        <Marker key={anomaly.id} anomaly={anomaly} />
      ))}
    </>
  );
}
