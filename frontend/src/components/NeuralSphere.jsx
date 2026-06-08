import React, { useRef, useMemo } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { Points, PointMaterial, Float, Sphere, MeshDistortMaterial } from '@react-three/drei';
import * as THREE from 'three';

function NeuralNetwork({ count = 2000 }) {
  const pointsRef = useRef();
  const linesRef = useRef();
  const { mouse, viewport } = useThree();

  // Create random particles in a sphere
  const [particles, connections] = useMemo(() => {
    const p = new Float32Array(count * 3);
    for (let i = 0; i < count; i++) {
      const r = 5 * Math.pow(Math.random(), 1/3);
      const theta = Math.random() * 2 * Math.PI;
      const phi = Math.acos(2 * Math.random() - 1);
      
      p[i * 3] = r * Math.sin(phi) * Math.cos(theta);
      p[i * 3 + 1] = r * Math.sin(phi) * Math.sin(theta);
      p[i * 3 + 2] = r * Math.cos(phi);
    }

    // Create lines for nearby particles (constellation)
    const lineIndices = [];
    for (let i = 0; i < count; i += 20) {
        for (let j = 0; j < count; j += 20) {
            if (i === j) continue;
            const dx = p[i*3] - p[j*3];
            const dy = p[i*3+1] - p[j*3+1];
            const dz = p[i*3+2] - p[j*3+2];
            const dist = Math.sqrt(dx*dx + dy*dy + dz*dz);
            if (dist < 1.2) {
                lineIndices.push(p[i*3], p[i*3+1], p[i*3+2]);
                lineIndices.push(p[j*3], p[j*3+1], p[j*3+2]);
            }
        }
    }

    return [p, new Float32Array(lineIndices)];
  }, [count]);

  useFrame((state) => {
    const time = state.clock.getElapsedTime();
    
    // Rotate the whole system
    pointsRef.current.rotation.y = time * 0.1;
    linesRef.current.rotation.y = time * 0.1;
    
    // Pulse effect
    const scale = 1 + Math.sin(time * 0.5) * 0.05;
    pointsRef.current.scale.set(scale, scale, scale);
    linesRef.current.scale.set(scale, scale, scale);

    // Mouse interaction (subtle sway)
    const targetX = (mouse.x * viewport.width) / 4;
    const targetY = (mouse.y * viewport.height) / 4;
    pointsRef.current.position.x += (targetX - pointsRef.current.position.x) * 0.05;
    pointsRef.current.position.y += (targetY - pointsRef.current.position.y) * 0.05;
    linesRef.current.position.x += (targetX - linesRef.current.position.x) * 0.05;
    linesRef.current.position.y += (targetY - linesRef.current.position.y) * 0.05;
  });

  return (
    <>
      <points ref={pointsRef}>
        <bufferGeometry>
          <bufferAttribute
            attach="attributes-position"
            count={count}
            array={particles}
            itemSize={3}
          />
        </bufferGeometry>
        <PointMaterial
          transparent
          color="#00d2ff"
          size={0.06}
          sizeAttenuation={true}
          depthWrite={false}
          blending={THREE.AdditiveBlending}
        />
      </points>
      
      <lineSegments ref={linesRef}>
        <bufferGeometry>
            <bufferAttribute
                attach="attributes-position"
                count={connections.length / 3}
                array={connections}
                itemSize={3}
            />
        </bufferGeometry>
        <lineBasicMaterial 
            color="#00d2ff" 
            transparent 
            opacity={0.15} 
            blending={THREE.AdditiveBlending}
        />
      </lineSegments>
    </>
  );
}


export default function NeuralSphere() {
  return (
    <div className="absolute inset-0 z-0 pointer-events-none overflow-hidden">
      {/* Deep Vibrant Gradient Background */}
      <div className="absolute inset-0 bg-[#050505]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_50%_50%,rgba(0,210,255,0.1)_0%,transparent_50%)]"></div>
      <div className="absolute inset-0 bg-[radial-gradient(circle_at_80%_20%,rgba(168,85,247,0.05)_0%,transparent_40%)]"></div>

      <Canvas camera={{ position: [0, 0, 12], fov: 40 }} dpr={[1, 2]}>
        <ambientLight intensity={0.4} />
        <pointLight position={[10, 10, 10]} intensity={1} color="#00d2ff" />
        <spotLight position={[-10, -10, -10]} intensity={0.5} color="#a855f7" />
        
        <Float speed={1.5} rotationIntensity={0.5} floatIntensity={0.5}>
            <NeuralNetwork count={3500} />
        </Float>
      </Canvas>
      
      {/* CSS Overlay for Vibrancy */}
      <div className="absolute inset-0 pointer-events-none bg-[radial-gradient(circle_at_center,transparent_0%,rgba(0,0,0,0.6)_100%)]"></div>
    </div>
  );
}
