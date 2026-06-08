import React, { useRef, useMemo, useState } from 'react';
import { Canvas, useFrame } from '@react-three/fiber';
import { Points, PointMaterial, Center, Float, MeshDistortMaterial, MeshWobbleMaterial } from '@react-three/drei';
import * as THREE from 'three';

function ParticleSystem({ count = 2000 }) {
  const points = useRef();
  const [merged, setMerged] = useState(false);

  // Initial random positions
  const initialPositions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      pos[i * 3] = (Math.random() - 0.5) * 50;
      pos[i * 3 + 1] = (Math.random() - 0.5) * 50;
      pos[i * 3 + 2] = (Math.random() - 0.5) * 50;
    }
    return pos;
  }, [count]);

  // Target cube positions
  const targetPositions = useMemo(() => {
    const pos = new Float32Array(count * 3);
    const size = 3;
    for (let i = 0; i < count; i++) {
        // Randomly pick a face of the cube
        const face = Math.floor(Math.random() * 6);
        const u = (Math.random() - 0.5) * size;
        const v = (Math.random() - 0.5) * size;
        
        if (face === 0) { pos[i*3]=size/2; pos[i*3+1]=u; pos[i*3+2]=v; }
        else if (face === 1) { pos[i*3]=-size/2; pos[i*3+1]=u; pos[i*3+2]=v; }
        else if (face === 2) { pos[i*3]=u; pos[i*3+1]=size/2; pos[i*3+2]=v; }
        else if (face === 3) { pos[i*3]=u; pos[i*3+1]=-size/2; pos[i*3+2]=v; }
        else if (face === 4) { pos[i*3]=u; pos[i*3+1]=v; pos[i*3+2]=size/2; }
        else { pos[i*3]=u; pos[i*3+1]=v; pos[i*3+2]=-size/2; }
    }
    return pos;
  }, [count]);

  const currentPositions = useMemo(() => new Float32Array(initialPositions), [initialPositions]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    // Slow converge
    const lerpFactor = merged ? 0.05 : 0.02;
    if (time > 1) setMerged(true);

    for (let i = 0; i < count; i++) {
      const idx = i * 3;
      currentPositions[idx] += (targetPositions[idx] - currentPositions[idx]) * lerpFactor;
      currentPositions[idx + 1] += (targetPositions[idx + 1] - currentPositions[idx + 1]) * lerpFactor;
      currentPositions[idx + 2] += (targetPositions[idx + 2] - currentPositions[idx + 2]) * lerpFactor;
    }
    
    points.current.geometry.attributes.position.needsUpdate = true;
    points.current.rotation.y += 0.002;
    points.current.rotation.z += 0.001;
  });

  return (
    <points ref={points}>
      <bufferGeometry>
        <bufferAttribute
          attach="attributes-position"
          count={count}
          array={currentPositions}
          itemSize={3}
        />
      </bufferGeometry>
      <PointMaterial
        transparent
        color="#00d2ff"
        size={0.08}
        sizeAttenuation={true}
        depthWrite={false}
        blending={THREE.AdditiveBlending}
      />
    </points>
  );
}

function TechCubeMesh() {
    const meshRef = useRef();
    
    useFrame((state) => {
        const time = state.clock.getElapsedTime();
        if (meshRef.current) {
            meshRef.current.rotation.x = time * 0.2;
            meshRef.current.rotation.y = time * 0.3;
        }
    });

    return (
        <mesh ref={meshRef}>
            <boxGeometry args={[3.2, 3.2, 3.2]} />
            <meshStandardMaterial 
                color="#00d2ff" 
                wireframe 
                transparent 
                opacity={0.3} 
                emissive="#00d2ff" 
                emissiveIntensity={2} 
            />
        </mesh>
    );
}

export default function TechCube() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none opacity-60">
      <Canvas camera={{ position: [0, 0, 15], fov: 45 }}>
        <ambientLight intensity={0.5} />
        <pointLight position={[10, 10, 10]} intensity={1.5} color="#00d2ff" />
        <spotLight position={[-10, -10, -10]} angle={0.15} penumbra={1} intensity={1} color="#a855f7" />
        
        <Center>
          <Float speed={2} rotationIntensity={1} floatIntensity={1}>
            <ParticleSystem />
            <TechCubeMesh />
          </Float>
        </Center>
      </Canvas>
      
      {/* Post-processing effect simulation with CSS */}
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.4)_100%)]"></div>
    </div>
  );
}
