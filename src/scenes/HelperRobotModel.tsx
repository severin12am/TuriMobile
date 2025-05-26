import React, { useEffect, useRef, useState } from 'react';
import { useGLTF } from '@react-three/drei';
import { useFrame } from '@react-three/fiber';
import * as THREE from 'three';
import { useStore } from '../store';
import { logger } from '../services/logger';
import { ThreeEvent } from '@react-three/fiber';

interface HelperRobotModelProps {
  path: string;
  onClick?: () => void;
}

const HelperRobotModel: React.FC<HelperRobotModelProps> = ({ path, onClick }) => {
  const { scene } = useGLTF(path);
  const robotRef = useRef<THREE.Group>(null);
  const { isHelperRobotOpen } = useStore();
  const [hovered, setHovered] = useState(false);
  
  useEffect(() => {
    if (robotRef.current) {
      // Rotate the robot 180 degrees to face the user
      robotRef.current.rotation.y = Math.PI * 1.55;
      
      // Make the model interactive by setting userData
      robotRef.current.traverse(child => {
        if (child instanceof THREE.Mesh) {
          child.userData.clickable = true;
        }
      });
      
      // Log for debugging
      console.log("🤖 Robot model ref initialized:", robotRef.current);
    }
    
    // Log click handler for debugging
    console.log("🤖 onClick handler provided:", !!onClick);
    
    logger.info('Helper robot model loaded', { path });
    
    // Add click event to document for debugging
    const debugClickHandler = (e: MouseEvent) => {
      const x = e.clientX;
      const y = e.clientY;
      console.log(`🖱️ Document clicked at: ${x}, ${y}`);
    };
    
    document.addEventListener('click', debugClickHandler);
    
    return () => {
      document.removeEventListener('click', debugClickHandler);
    };
  }, [path, onClick]);
  
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
      
      // Add a slight glow effect when hovered
      if (hovered) {
        robotRef.current.scale.setScalar(2.1); // Scale up slightly when hovered
      } else {
        robotRef.current.scale.setScalar(2.0); // Reset to normal size
      }
    }
  });
  
  // Consolidated click handler that ensures the click event is properly triggered
  const handleInteraction = (e: ThreeEvent<MouseEvent>) => {
    e.stopPropagation();
    console.log("🤖 Robot model interaction!");
    
    // Make sure the event doesn't bubble up
    if (e.object) {
      e.object.userData.interacted = true;
    }
    
    // Always execute the onClick handler if provided
    if (onClick) {
      console.log("🤖 Calling onClick handler from model - DIRECT INTERACTION");
      logger.info('Helper robot 3D model clicked directly');
      onClick();
    }
  };
  
  const handlePointerOver = () => {
    console.log("🤖 Robot model pointer OVER");
    setHovered(true);
    document.body.style.cursor = 'pointer';
  };
  
  const handlePointerOut = () => {
    console.log("🤖 Robot model pointer OUT");
    setHovered(false);
    document.body.style.cursor = 'auto';
  };
  
  return (
    <group ref={robotRef} dispose={null} scale={[2, 2, 2]} position={[0, 0, 0]} rotation={[0, 0, 0]}>
      {scene && (
        <primitive 
          object={scene} 
          onClick={handleInteraction}
          onPointerDown={handleInteraction}
          onPointerOver={handlePointerOver}
          onPointerOut={handlePointerOut}
          userData={{ interactable: true }}
        />
      )}
    </group>
  );
};

export default HelperRobotModel;