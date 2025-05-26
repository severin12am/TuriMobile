import React, { useEffect, useRef, useState } from 'react';
import { useGLTF, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useFrame } from '@react-three/fiber';
import { logger } from '../services/logger';

// Preload the models
useGLTF.preload('/models/character1.glb');
useGLTF.preload('/models/character2.glb');

/**
 * Props for the Character component
 * @interface CharacterProps
 * @property {[number, number, number]} position - 3D coordinates for character placement
 * @property {[number, number, number]} scale - Scale factors for the character model
 * @property {[number, number, number]} rotation - Rotation angles for the character model
 * @property {(characterId: number) => void} [onInteract] - Optional callback when character is interacted with
 * @property {boolean} [isSpeaking] - Optional flag to indicate if the character is speaking
 * @property {boolean} [isDialogueActive] - Optional flag to indicate if the character is in dialogue
 * @property {number} [characterId] - Optional ID of the character to determine which model to load
 */
interface CharacterProps {
  position: [number, number, number];
  scale: [number, number, number];
  rotation?: [number, number, number];
  onInteract?: (characterId: number) => void;
  isSpeaking?: boolean;
  isDialogueActive?: boolean;
  characterId?: number;
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
const Character: React.FC<CharacterProps> = ({ 
  position, 
  scale, 
  rotation = [0, 0, 0],
  onInteract, 
  isSpeaking, 
  isDialogueActive,
  characterId = 1 // Default to character1 if not specified
}) => {
  const characterRef = useRef<THREE.Group>(null);
  const mixerRef = useRef<THREE.AnimationMixer | null>(null);
  const [availableAnimations, setAvailableAnimations] = useState<string[]>([]);
  
  // Determine which model to load based on characterId
  const modelPath = `/models/character${characterId}.glb`;
  
  // Load the 3D model using useGLTF
  const { scene, animations } = useGLTF(modelPath);
  
  // Set up animation mixer and log available animations
  useEffect(() => {
    if (animations && animations.length > 0) {
      const animationNames = animations.map(anim => anim.name);
      setAvailableAnimations(animationNames);
      logger.info('Found animations in model', { animations: animationNames, characterId });
      
      // Create animation mixer
      if (characterRef.current) {
        try {
          const mixer = new THREE.AnimationMixer(characterRef.current);
          mixerRef.current = mixer;
          logger.info('Animation mixer created successfully', { characterId });
        } catch (error) {
          logger.error('Error creating animation mixer', { error, characterId });
        }
      }
    } else {
      logger.info('No animations found in model', { characterId });
    }
  }, [animations, characterId]);

  // Set up character when component mounts
  useEffect(() => {
    if (characterRef.current) {
      try {
        // Apply the rotation from props
        characterRef.current.rotation.set(...rotation);
        logger.info('Character model loaded successfully', { position, scale, rotation, characterId });
      } catch (error) {
        logger.error('Error setting up character', { error, characterId });
      }
    }
  }, [rotation]);

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
      logger.error('Error in animation frame', { error, characterId });
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
            logger.info('Playing Mixamo animation during dialogue', { characterId });
          }
        }
      } catch (error) {
        logger.error('Error handling dialogue animation', { error, characterId });
      }
    }
  }, [isDialogueActive, animations, characterId]);

  const handleInteract = () => {
    logger.info('Character interaction triggered manually', { characterId });
    if (onInteract) {
      onInteract(characterId);
    }
  };

  return (
    <primitive 
      ref={characterRef}
      object={scene} 
      position={position}
      scale={scale}
      rotation={rotation}
      onClick={handleInteract}
    />
  );
};

export default Character;