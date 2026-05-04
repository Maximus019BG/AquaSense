"use client";

import { Suspense, useEffect, useState, useMemo } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  PerspectiveCamera,
} from "@react-three/drei";
import { Ocean } from "./ocean";
import { AnomalyMarkers } from "./anomaly-markers";

interface WaterSceneProps {
  turbidity?: number;
  ph?: number;
  dissolvedOxygen?: number;
  temperature?: number;
  waterLevel?: number;
  alertLevel?: "none" | "warning" | "critical";
  quality?: "PERF" | "HIGH" | "ULTRA";
}

interface SensorData {
  temperature: number;
  ph: number;
  turbidity: number;
  dissolvedOxygen: number;
  waterLevel: number;
  alertLevel: "none" | "warning" | "critical";
}

function Scene({ sensorData, quality }: { sensorData: SensorData; quality: "PERF" | "HIGH" | "ULTRA" }) {
  return (
    <>
      <hemisphereLight args={["#0D2137", "#010810", 0.32]} />
      <directionalLight position={[0.45, 0.72, 0.53]} intensity={1.5} color="#C0D8F0" />
      <pointLight position={[0, -3, 0]} color="#0EA5E9" intensity={0.5} distance={22} />
      <pointLight
        position={[0, 2.5, 0]}
        color="#EF4444"
        intensity={sensorData.alertLevel === "critical" ? 0.9 : sensorData.alertLevel === "warning" ? 0.5 : 0}
        distance={22}
      />

      <PerspectiveCamera makeDefault position={[0, 6.5, 13]} fov={52} />

      <Ocean
        turbidity={sensorData.turbidity}
        ph={sensorData.ph}
        dissolvedOxygen={sensorData.dissolvedOxygen}
        temperature={sensorData.temperature}
        waterLevel={sensorData.waterLevel}
        alertLevel={sensorData.alertLevel}
        quality={quality}
      />

      <mesh rotation={[-Math.PI / 2, 0, 0]} position={[0, -4.5, 0]}>
        <planeGeometry args={[28, 28, 96, 96]} />
        <meshLambertMaterial color="#1A3A22" emissive="#020A04" emissiveIntensity={0.1} />
      </mesh>

      <AnomalyMarkers />

      <OrbitControls
        enablePan={false}
        enableZoom={true}
        enableRotate={true}
        autoRotate={true}
        autoRotateSpeed={0.18}
        enableDamping={true}
        dampingFactor={0.04}
        minDistance={5}
        maxDistance={28}
        maxPolarAngle={Math.PI / 2 - 0.04}
      />
    </>
  );
}

function LoadingFallback() {
  return (
    <div className="flex items-center justify-center h-full bg-[#0A1929]">
      <div className="text-center">
        <div className="w-12 h-12 border-4 border-[#00BCD4] border-t-transparent rounded-full animate-spin mx-auto mb-4" />
        <p className="text-gray-400">Loading water simulation...</p>
      </div>
    </div>
  );
}

function WaterSceneCanvas({ sensorData, quality }: { sensorData: SensorData; quality: "PERF" | "HIGH" | "ULTRA" }) {
  return (
    <div className="w-full h-full bg-[#0A1929]">
      <Suspense fallback={<LoadingFallback />}>
        <Canvas
          gl={{
            antialias: true,
            alpha: false,
            powerPreference: "high-performance",
          }}
          dpr={[1, 2]}
          camera={{ position: [0, 6.5, 13], fov: 52 }}
          style={{ background: "#010D18" }}
          frameloop="always"
        >
          <fog attach="fog" args={["#010D18", 1, 100]} />
          <Scene sensorData={sensorData} quality={quality} />
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

  return <WaterSceneCanvas sensorData={sensorData} quality={quality} />;
}