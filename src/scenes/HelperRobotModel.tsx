import React, { useEffect, useRef } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../store';
import { logger } from '../services/logger';

interface HelperRobotModelProps {
  path: string;
}

const HelperRobotModel: React.FC<HelperRobotModelProps> = ({ path }) => {
  const { scene } = useGLTF(path);
  const robotRef = useRef<THREE.Group>(null);
  const { isHelperRobotOpen } = useStore();
  
  useEffect(() => {
    if (robotRef.current) {
      // Rotate the robot 180 degrees to face the user
      robotRef.current.rotation.y = Math.PI * 1.55;
    }
    logger.info('Helper robot model loaded', { path });
  }, [path]);
  
  useFrame((state, delta) => {
    if (robotRef.current) {
      // Vertical floating motion
      robotRef.current.position.y = Math.sin(state.clock.elapsedTime * 2) * 0.05 + 0.1;
      
      // Horizontal swaying motion when dialog is open
      if (isHelperRobotOpen) {
        // Create a smooth side-to-side motion
        robotRef.current.position.z = Math.sin(state.clock.elapsedTime * 1.5) * 0.1;
        
        // Add a slight tilt in the opposite direction of movement for natural feel
        robotRef.current.rotation.x = Math.sin(state.clock.elapsedTime * 1.5) * 0.05;
      } else {
        // Reset position and rotation when closed
        robotRef.current.position.z = THREE.MathUtils.lerp(robotRef.current.position.z, 0, delta * 2);
        robotRef.current.rotation.x = THREE.MathUtils.lerp(robotRef.current.rotation.x, 0, delta * 2);
      }
    }
  });
  
  return (
    <group ref={robotRef} position={[0, 0.1, 0]} scale={[2, 2, 2]}>
      <primitive object={scene} />
    </group>
  );
};

export default HelperRobotModel;