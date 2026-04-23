"use client";

import { Suspense, useEffect, useState } from "react";
import { Canvas } from "@react-three/fiber";
import {
  OrbitControls,
  PerspectiveCamera,
} from "@react-three/drei";
import { Ocean } from "./ocean";
import { AnomalyMarkers } from "./anomaly-markers";

function Scene() {
  return (
    <>
      {/* Lighting - simplified to avoid external dependencies */}
      <ambientLight intensity={0.6} />
      <directionalLight position={[10, 10, 5]} intensity={1} castShadow />
      <pointLight position={[-10, -10, -10]} color="#00BCD4" intensity={0.5} />
      <pointLight position={[10, 10, -10]} color="#4DD0E1" intensity={0.3} />

      {/* Camera */}
      <PerspectiveCamera makeDefault position={[0, 5, 10]} fov={60} />

      {/* Ocean */}
      <Ocean />

      {/* Anomaly Markers */}
      <AnomalyMarkers />

      {/* Controls */}
      <OrbitControls
        enablePan={true}
        enableZoom={true}
        enableRotate={true}
        minDistance={5}
        maxDistance={20}
        maxPolarAngle={Math.PI / 2 - 0.1}
        autoRotate={false}
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

function WaterSceneCanvas() {
  return (
    <div className="w-full h-full bg-[#0A1929]">
      <Suspense fallback={<LoadingFallback />}>
        <Canvas
          gl={{ 
            antialias: true, 
            alpha: false,
            powerPreference: "high-performance"
          }}
          dpr={[1, 1.5]}
          camera={{ position: [0, 5, 10], fov: 60 }}
          style={{ background: "#0A1929" }}
          frameloop="always"
        >
          <Scene />
        </Canvas>
      </Suspense>
    </div>
  );
}

// Client-only wrapper to prevent SSR issues with Three.js
export function WaterScene() {
  const [mounted, setMounted] = useState(false);

  useEffect(() => {
    // Small delay to ensure proper mounting
    const timer = setTimeout(() => {
      setMounted(true);
    }, 100);
    return () => clearTimeout(timer);
  }, []);

  if (!mounted) {
    return <LoadingFallback />;
  }

  return <WaterSceneCanvas />;
}
