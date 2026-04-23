"use client";

import { useRef, useMemo } from "react";
import { useFrame } from "@react-three/fiber";
import * as THREE from "three";

// Simple water shader
const waterVertexShader = `
  uniform float uTime;
  uniform float uBigWavesElevation;
  uniform vec2 uBigWavesFrequency;
  uniform float uBigWavesSpeed;
  
  varying float vElevation;
  varying vec2 vUv;
  
  void main() {
    vUv = uv;
    
    vec4 modelPosition = modelMatrix * vec4(position, 1.0);
    
    // Big waves
    float elevation = sin(modelPosition.x * uBigWavesFrequency.x + uTime * uBigWavesSpeed) * 
                      sin(modelPosition.z * uBigWavesFrequency.y + uTime * uBigWavesSpeed) * 
                      uBigWavesElevation;
    
    // Add smaller waves for detail
    elevation += sin(modelPosition.x * 3.0 + uTime * 1.5) * 0.1;
    elevation += sin(modelPosition.z * 2.5 + uTime * 1.2) * 0.1;
    
    modelPosition.y += elevation;
    vElevation = elevation;
    
    vec4 viewPosition = viewMatrix * modelPosition;
    vec4 projectedPosition = projectionMatrix * viewPosition;
    
    gl_Position = projectedPosition;
  }
`;

const waterFragmentShader = `
  uniform vec3 uDepthColor;
  uniform vec3 uSurfaceColor;
  uniform float uColorOffset;
  uniform float uColorMultiplier;
  
  varying float vElevation;
  varying vec2 vUv;
  
  void main() {
    float mixStrength = (vElevation + uColorOffset) * uColorMultiplier;
    vec3 color = mix(uDepthColor, uSurfaceColor, mixStrength);
    
    // Add some transparency based on depth
    float alpha = 0.9 + vElevation * 0.1;
    
    gl_FragColor = vec4(color, alpha);
  }
`;

export function Ocean() {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);

  const uniforms = useMemo(
    () => ({
      uTime: { value: 0 },
      uBigWavesElevation: { value: 0.2 },
      uBigWavesFrequency: { value: new THREE.Vector2(0.4, 0.2) },
      uBigWavesSpeed: { value: 0.75 },
      uDepthColor: { value: new THREE.Color("#0A1929") },
      uSurfaceColor: { value: new THREE.Color("#00BCD4") },
      uColorOffset: { value: 0.08 },
      uColorMultiplier: { value: 3.0 },
    }),
    []
  );

  useFrame((state) => {
    if (materialRef.current?.uniforms.uTime) {
      materialRef.current.uniforms.uTime.value = state.clock.elapsedTime;
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
      <planeGeometry args={[20, 20, 128, 128]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={waterVertexShader}
        fragmentShader={waterFragmentShader}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}
