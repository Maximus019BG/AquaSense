"use client";

import { useRef, useMemo } from "react";
import { useFrame, useThree } from "@react-three/fiber";
import * as THREE from "three";

const LIB = `
#define PI    3.14159265358979
#define TWO_PI 6.28318530717959
#define GRAV  9.81

float hash12(vec2 p){
  vec3 p3=fract(vec3(p.xyx)*0.1031);
  p3+=dot(p3,p3.yzx+33.33);
  return fract((p3.x+p3.y)*p3.z);
}
float vnoise(vec2 p){
  vec2 i=floor(p), f=fract(p);
  vec2 u=f*f*(3.0-2.0*f);
  return mix(mix(hash12(i),hash12(i+vec2(1,0)),u.x),
             mix(hash12(i+vec2(0,1)),hash12(i+vec2(1,1)),u.x),u.y);
}
float fbm4(vec2 p){
  float v=0.0, a=0.5;
  mat2 R=mat2(cos(0.5),sin(0.5),-sin(0.5),cos(0.5));
  for(int i=0;i<4;i++){v+=a*vnoise(p);p=R*p*2.1+vec2(100.3,83.7);a*=0.5;}
  return v;
}

vec3 ph_to_tint(float ph){
  if(ph<6.5) return mix(vec3(0.8,0.1,0.1),vec3(0.5,0.0,0.0),clamp(6.5-ph,0.0,1.0));
  if(ph>8.5) return mix(vec3(0.2,0.7,0.3),vec3(0.1,0.9,0.5),clamp(ph-8.5,0.0,1.0));
  return vec3(0.05,0.4,0.6);
}

void state_weights(float turb, float ph, float o2, float temp,
                   out float wArctic, out float wNominal, out float wAlgal,
                   out float wSediment, out float wHypoxic){
  wArctic  = smoothstep(6.0, 5.0,  turb)  * smoothstep(7.4,7.5,ph) * smoothstep(8.0,8.1,o2);
  wHypoxic = smoothstep(4.5, 3.5,  o2)    * smoothstep(6.6,6.4,ph);
  wSediment= smoothstep(40.0,55.0, turb);
  wAlgal   = smoothstep(8.4,8.6,   ph)    * smoothstep(27.0,29.0,temp);
  wNominal = max(0.0, 1.0 - wArctic - wHypoxic - wSediment - wAlgal);
  float s  = wArctic+wNominal+wAlgal+wSediment+wHypoxic;
  if(s>0.001){ wArctic/=s; wNominal/=s; wAlgal/=s; wSediment/=s; wHypoxic/=s; }
  else { wNominal=1.0; }
}
`;

const OCEAN_VERT = `
precision highp float;
${LIB}
uniform float u_time;
uniform float u_turbidity;
uniform float u_water_level;
uniform float u_quality_tier;
varying vec2  vUv;
varying vec3  vWorldPos;
varying vec3  vNormal;
varying float vFoam;
varying float vElevation;

void gerstner(vec2 d, float amp, float wl, float steep, float t,
               vec3 posIn, inout vec3 posOut, inout vec3 normAccum){
  float k = TWO_PI/wl;
  float c = sqrt(GRAV/k);
  float f = k*dot(d, posIn.xy) - c*t;
  float Q = steep/(amp*k*8.0);
  posOut    += vec3(Q*amp*d.x*cos(f), Q*amp*d.y*cos(f), amp*sin(f));
  normAccum += vec3(-d.x*k*amp*cos(f), -d.y*k*amp*cos(f), -Q*k*amp*sin(f));
}

void main(){
  vUv = uv;
  float lvl    = 0.3 + (u_water_level/500.0)*0.8;
  float chopD  = 1.0 - smoothstep(20.0,60.0,u_turbidity);
  float scale  = lvl * chopD;

  float amp[12];
  amp[0]=0.28; amp[1]=0.18; amp[2]=0.12; amp[3]=0.08;
  amp[4]=0.055;amp[5]=0.038;amp[6]=0.024;amp[7]=0.016;
  amp[8]=0.012;amp[9]=0.009;amp[10]=0.007;amp[11]=0.005;
  float wl[12];
  wl[0]=9.0; wl[1]=6.2; wl[2]=4.1; wl[3]=2.9;
  wl[4]=1.9; wl[5]=1.3; wl[6]=0.85;wl[7]=0.58;
  wl[8]=0.40;wl[9]=0.30;wl[10]=0.22;wl[11]=0.17;
  float st[12];
  st[0]=0.6; st[1]=0.55;st[2]=0.5; st[3]=0.45;
  st[4]=0.4; st[5]=0.35;st[6]=0.3; st[7]=0.25;
  st[8]=0.2; st[9]=0.18;st[10]=0.15;st[11]=0.12;
  vec2 dir[12];
  dir[0]=normalize(vec2(1.0,0.0));    dir[1]=normalize(vec2(0.71,0.71));
  dir[2]=normalize(vec2(-0.5,0.87));  dir[3]=normalize(vec2(0.87,-0.5));
  dir[4]=normalize(vec2(0.2,0.98));   dir[5]=normalize(vec2(-0.94,0.34));
  dir[6]=normalize(vec2(0.64,-0.77)); dir[7]=normalize(vec2(-0.3,-0.95));
  dir[8]=normalize(vec2(0.45,0.89));  dir[9]=normalize(vec2(-0.77,0.64));
  dir[10]=normalize(vec2(0.95,-0.31));dir[11]=normalize(vec2(-0.18,0.98));

  int nWaves = u_quality_tier < 0.5 ? 4 : (u_quality_tier < 1.5 ? 8 : 12);

  vec3 disp   = vec3(0.0);
  vec3 normAcc= vec3(0.0);
  vec3 p0     = position;
  for(int i=0;i<12;i++){
    if(i >= nWaves) break;
    gerstner(dir[i], amp[i]*scale, wl[i], st[i], u_time, p0, disp, normAcc);
  }

  vec3 wPos  = p0 + disp;
  vec4 worldPos4 = modelMatrix * vec4(wPos, 1.0);
  vWorldPos  = worldPos4.xyz;
  vNormal    = normalize(mat3(modelMatrix) * (vec3(0.0,0.0,1.0) + normAcc));
  vElevation = worldPos4.y;
  vFoam      = fbm4(wPos.xz*0.2+u_time*0.03)*0.12;
  gl_Position = projectionMatrix * viewMatrix * worldPos4;
}
`;

const OCEAN_FRAG = `
precision highp float;
${LIB}
uniform float u_time;
uniform float u_turbidity;
uniform float u_ph;
uniform float u_dissolved_o2;
uniform float u_temperature;
uniform float u_water_level;
uniform float u_alert_pulse;
uniform float u_quality_tier;
uniform vec3 uCameraPos;
uniform vec3 uSunDir;
uniform vec3 uSunColor;

varying vec2  vUv;
varying vec3  vWorldPos;
varying vec3  vNormal;
varying float vFoam;
varying float vElevation;

float D_GGX(float NdotH, float roughness){
  float a = roughness*roughness;
  float a2= a*a;
  float d = NdotH*NdotH*(a2-1.0)+1.0;
  return a2 / (PI*d*d + 1e-5);
}
float G_Smith(float NdotV, float NdotL, float roughness){
  float r = roughness+1.0;
  float k = (r*r)/8.0;
  float g1 = NdotV/(NdotV*(1.0-k)+k);
  float g2 = NdotL/(NdotL*(1.0-k)+k);
  return g1*g2;
}
vec3 F_Schlick(float cosTheta, vec3 F0){
  return F0+(1.0-F0)*pow(clamp(1.0-cosTheta,0.0,1.0),5.0);
}

vec3 mie_sky(vec3 dir){
  vec3 up=vec3(0,1,0);
  float t=clamp(dot(normalize(dir),up)*0.5+0.5,0.0,1.0);
  vec3 sky=mix(vec3(0.025, 0.075, 0.14),vec3(0.003,0.014,0.05),smoothstep(0.0,0.65,t));
  float sg=pow(max(0.0,dot(normalize(dir),uSunDir)),220.0);
  sky+=uSunColor*sg*2.2;
  sky+=vec3(0.04,0.07,0.12)*pow(1.0-abs(dot(normalize(dir),up)),6.0)*0.5;
  return sky;
}

void main(){
  vec3 N = normalize(vNormal);
  vec3 V  = normalize(uCameraPos - vWorldPos);
  vec3 L  = uSunDir;
  vec3 H  = normalize(L+V);
  float NdotV = max(dot(N,V), 0.001);
  float NdotL = max(dot(N,L), 0.001);
  float NdotH = max(dot(N,H), 0.001);
  float HdotV = max(dot(H,V), 0.001);

  float roughness = mix(0.02, 0.35, clamp(u_turbidity/100.0,0.0,1.0));

  vec3  F0  = vec3(0.02);
  vec3  F   = F_Schlick(HdotV, F0);
  float D   = D_GGX(NdotH, roughness);
  float G   = G_Smith(NdotV, NdotL, roughness);
  vec3 spec = (D*G*F) / max(4.0*NdotV*NdotL, 0.001);
  vec3 specCol = spec * uSunColor * NdotL;

  float Fr = F_Schlick(NdotV, F0).r;
  vec3  refl= mie_sky(reflect(-V,N));

  float wA,wN,wAlg,wS,wH;
  state_weights(u_turbidity, u_ph, u_dissolved_o2, u_temperature, wA,wN,wAlg,wS,wH);

  vec3 cArctic  = vec3(0.04, 0.28, 0.52);
  vec3 cNominal = vec3(0.02, 0.18, 0.38);
  vec3 cAlgal   = vec3(0.05, 0.32, 0.12);
  vec3 cSediment= vec3(0.28, 0.20, 0.06);
  vec3 cHypoxic = vec3(0.22, 0.02, 0.02);
  vec3 baseCol  = wA*cArctic + wN*cNominal + wAlg*cAlgal + wS*cSediment + wH*cHypoxic;

  vec3 phTint = ph_to_tint(u_ph);
  baseCol = mix(baseCol, phTint*0.6+baseCol*0.4, 0.45);

  float depth = clamp(vElevation*0.5+0.5, 0.0, 1.0);
  vec3 waterCol= mix(baseCol*0.25, baseCol, depth);

  float clarity = 1.0-clamp(u_turbidity/80.0,0.0,1.0);
  float caustic = vnoise(vWorldPos.xz*0.5 + u_time*0.3) * vnoise(vWorldPos.xz*0.7 - u_time*0.2);
  waterCol += vec3(0.1,0.2,0.25) * caustic * clarity * depth * 0.3;

  float sssT   = pow(max(0.0,dot(uSunDir,V)),3.0);
  float sssWrap= smoothstep(0.1,0.5,depth);
  vec3 sssCol  = mix(vec3(0.55,0.05,0.03), vec3(0.0,0.65,0.85), clamp(u_dissolved_o2/10.0,0.0,1.0));
  waterCol += sssCol * sssT * sssWrap * clamp(u_dissolved_o2/12.0,0.0,1.0) * 0.38;

  if(wAlg > 0.05){
    float bio  = vnoise(vWorldPos.xz*2.0 + u_time*0.4)*wAlg;
    waterCol  += vec3(0.0,0.5,0.2)*bio*0.4;
  }

  if(wH > 0.05){
    float iridT= fract(dot(N,V)*6.0);
    vec3 irid  = 0.5+0.5*cos(TWO_PI*(iridT+vec3(0.0,0.33,0.67)));
    waterCol  = mix(waterCol, irid*vec3(0.6,0.1,0.05), wH*0.35);
  }

  vec3 col = mix(waterCol, refl, Fr*0.72);
  col += specCol * (1.0-roughness*2.0);

  float foamThresh  = 0.18 + roughness*0.08;
  float foamHeight  = smoothstep(foamThresh, foamThresh+0.22, vElevation);
  float foamNoise   = vnoise(vUv*16.0+u_time*1.1)*vnoise(vUv*9.0-u_time*0.7);
  float totalFoam   = max(vFoam, foamHeight*foamNoise*clarity*1.2);
  vec3  foamColor   = mix(vec3(0.75,0.70,0.50), vec3(1.0), clamp((u_ph-6.5)/2.0,0.0,1.0));
  col = mix(col, foamColor, totalFoam*0.65);
  col = mix(col, vec3(1.0), totalFoam*wA*0.4);

  if(u_alert_pulse > 0.0){
    float p = sin(u_time*5.5)*0.5+0.5;
    col = mix(col, vec3(0.92,0.04,0.04), u_alert_pulse*p*0.30);
  }

  float heat = clamp((u_temperature-28.0)/12.0, 0.0, 1.0);
  col += vec3(0.20,0.03,0.0)*heat*(1.0-depth)*0.25;

  float alpha = 0.95;
  gl_FragColor = vec4(col, alpha);
}
`;

interface OceanProps {
  turbidity?: number;
  ph?: number;
  dissolvedOxygen?: number;
  temperature?: number;
  waterLevel?: number;
  alertLevel?: "none" | "warning" | "critical";
  quality?: "PERF" | "HIGH" | "ULTRA";
  timeOfDay?: number;
}

export function Ocean({
  turbidity = 15,
  ph = 7.2,
  dissolvedOxygen = 8.5,
  temperature = 24.5,
  waterLevel = 250,
  alertLevel = "none",
  quality = "ULTRA",
  timeOfDay = 12,
}: OceanProps) {
  const meshRef = useRef<THREE.Mesh>(null);
  const materialRef = useRef<THREE.ShaderMaterial>(null);
  const { camera } = useThree();

  const tier = quality === "ULTRA" ? 2 : quality === "HIGH" ? 1 : 0;
  const segs = quality === "ULTRA" ? 256 : quality === "HIGH" ? 192 : 96;

  const sunDir = useMemo(() => new THREE.Vector3(0.4, 0.7, 0.5).normalize(), []);
  const sunColor = useMemo(() => new THREE.Color(1.0, 0.98, 0.9), []);

  const uniforms = useMemo(
    () => ({
      u_time: { value: 0 },
      u_turbidity: { value: turbidity },
      u_ph: { value: ph },
      u_dissolved_o2: { value: dissolvedOxygen },
      u_temperature: { value: temperature },
      u_water_level: { value: waterLevel },
      u_alert_pulse: { value: alertLevel === "critical" ? 1 : alertLevel === "warning" ? 0.5 : 0 },
      u_quality_tier: { value: tier },
      uCameraPos: { value: camera.position.clone() },
      uSunDir: { value: sunDir },
      uSunColor: { value: sunColor },
    }),
    []
  );

  useFrame((state) => {
    if (materialRef.current) {
      const u = materialRef.current.uniforms;
      u.u_time.value = state.clock.elapsedTime;
      u.u_turbidity.value = turbidity;
      u.u_ph.value = ph;
      u.u_dissolved_o2.value = dissolvedOxygen;
      u.u_temperature.value = temperature;
      u.u_water_level.value = waterLevel;
      u.u_alert_pulse.value = alertLevel === "critical" ? 1 : alertLevel === "warning" ? 0.5 : 0;
      u.uCameraPos.value.copy(camera.position);
    }
  });

  return (
    <mesh ref={meshRef} rotation={[-Math.PI / 2, 0, 0]} position={[0, -1, 0]}>
      <planeGeometry args={[100, 100, segs, segs]} />
      <shaderMaterial
        ref={materialRef}
        vertexShader={OCEAN_VERT}
        fragmentShader={OCEAN_FRAG}
        uniforms={uniforms}
        transparent
        side={THREE.DoubleSide}
      />
    </mesh>
  );
}