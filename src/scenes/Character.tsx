import React, { useEffect, useRef, useState } from 'react';
import { useGLTF, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { logger } from '../services/logger';

// Preload the model
useGLTF.preload('/models/character1.glb');

/**
 * Props for the Character component
 * @interface CharacterProps
 * @property {[number, number, number]} position - 3D coordinates for character placement
 * @property {[number, number, number]} scale - Scale factors for the character model
 * @property {(characterId: number) => void} [onInteract] - Optional callback when character is interacted with
 * @property {boolean} [isSpeaking] - Optional flag to indicate if the character is speaking
 * @property {boolean} [isDialogueActive] - Optional flag to indicate if the character is in dialogue
 */
interface CharacterProps {
  position: [number, number, number];
  scale: [number, number, number];
  onInteract?: (characterId: number) => void;
  isSpeaking?: boolean;
  isDialogueActive?: boolean;
}

/**
 * Character component - Renders a 3D character model in the scene
 * 
 * Features:
 * - Loads and displays a GLTF model
 * - Applies position and scale from props
 * - Adds subtle floating animation
 * - Rotates character to face the correct direction
 * - Shows debug UI for testing
 * 
 * @param {CharacterProps} props - Position and scale for the character
 */
const Character: React.FC<CharacterProps> = ({ position, scale, onInteract, isSpeaking, isDialogueActive }) => {
  const characterRef = useRef<THREE.Group>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const [showDebug, setShowDebug] = useState(false);
  const [availableAnimations, setAvailableAnimations] = useState<string[]>([]);
  
  // Load the 3D model using useGLTF
  const { scene, animations } = useGLTF('/models/character1.glb');
  
  // Set up animation mixer and log available animations
  useEffect(() => {
    if (animations && animations.length > 0) {
      const animationNames = animations.map(anim => anim.name);
      setAvailableAnimations(animationNames);
      logger.info('Found animations in model', { animations: animationNames });
      
      // Create animation mixer
      if (characterRef.current) {
        try {
          const mixer = new THREE.AnimationMixer(characterRef.current);
          mixerRef.current = mixer;
          logger.info('Animation mixer created successfully');
        } catch (error) {
          logger.error('Error creating animation mixer', { error });
        }
      }
    } else {
      logger.info('No animations found in model');
    }
  }, [animations]);

  // Set up character when component mounts
  useEffect(() => {
    if (characterRef.current) {
      try {
        // Rotate the character 180 degrees around the Y-axis
        characterRef.current.rotation.y = Math.PI;
        logger.info('Character model loaded successfully', { position, scale });
      } catch (error) {
        logger.error('Error setting up character', { error });
      }
    }
  }, []);

  // Handle animations in the animation loop
  useFrame((state, delta) => {
    try {
      // Update animation mixer
      if (mixerRef.current) {
        mixerRef.current.update(delta);
      }
      
      // Apply subtle floating animation
      if (characterRef.current) {
        let y = position[1] + Math.sin(state.clock.elapsedTime) * 0.01;
        characterRef.current.position.y = y;
      }
    } catch (error) {
      logger.error('Error in animation frame', { error });
    }
  });

  // Handle dialogue state changes
  useEffect(() => {
    if (mixerRef.current && animations.length > 0) {
      try {
        // Stop all current animations
        mixerRef.current.stopAllAction();
        
        if (isDialogueActive) {
          // Get the Mixamo animation
          const mixamoAnim = animations[0]; // Since we know it's the only animation
          if (mixamoAnim) {
            const action = mixerRef.current.clipAction(mixamoAnim);
            action.setLoop(THREE.LoopRepeat, Infinity);
            action.play();
            logger.info('Playing Mixamo animation during dialogue');
          }
        }
      } catch (error) {
        logger.error('Error handling dialogue animation', { error });
      }
    }
  }, [isDialogueActive, animations]);

  const handleInteract = () => {
    logger.info('Character interaction triggered manually');
    if (onInteract) {
      onInteract(1);
    }
  };

  const toggleDebug = () => {
    setShowDebug(!showDebug);
  };

  return (
    <>
      <primitive 
        ref={characterRef}
        object={scene} 
        position={position}
        scale={scale}
        onClick={handleInteract}
      />
      
      {/* Debug UI for development */}
      <Html position={[position[0], position[1] + 2, position[2]]}>
        <div style={{ 
          display: 'flex', 
          flexDirection: 'column', 
          alignItems: 'center', 
          padding: '10px',
          backgroundColor: 'rgba(0,0,0,0.7)',
          borderRadius: '4px',
          color: 'white',
          fontSize: '12px'
        }}>
          <button 
            onClick={toggleDebug}
            style={{ 
              background: '#555', 
              border: 'none', 
              padding: '4px 8px', 
              color: 'white',
              cursor: 'pointer',
              borderRadius: '4px'
            }}
          >
            {showDebug ? 'Hide Debug' : 'Show Debug'}
          </button>
          
          {showDebug && (
            <div style={{ marginTop: '8px' }}>
              <button 
                onClick={handleInteract}
                style={{ 
                  background: '#4CAF50', 
                  border: 'none', 
                  padding: '4px 8px', 
                  color: 'white',
                  cursor: 'pointer',
                  borderRadius: '4px',
                  marginTop: '4px'
                }}
              >
                Force Trigger Dialogue
              </button>
              <div style={{ marginTop: '4px' }}>
                Position: [{position[0].toFixed(1)}, {position[1].toFixed(1)}, {position[2].toFixed(1)}]
              </div>
              {availableAnimations.length > 0 && (
                <div style={{ marginTop: '4px' }}>
                  Available Animations:
                  {availableAnimations.map((anim, index) => (
                    <div key={index}>{anim}</div>
                  ))}
                </div>
              )}
            </div>
          )}
        </div>
      </Html>
    </>
  );
};

export default Character;