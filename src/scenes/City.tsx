// src/scenes/City.tsx
import React, { useState, useEffect, useRef } from 'react';
import { Canvas, useFrame, useThree } from '@react-three/fiber';
import { useGLTF, Html } from '@react-three/drei';
import * as THREE from 'three';
import { useStore } from '../store';
import { logger } from '../services/logger';
import Character from './Character';
import { supabase } from '../services/supabase';
import type { Character as CharacterType } from '../types';
import DialogueBox from '../components/DialogueBox';
import DialogueSelectionPanel from '../components/DialogueSelectionPanel';
import { AIDialogueStep } from '../services/gemini';
import MobileControls from '../components/MobileControls';

// Preload the character models
useGLTF.preload('/models/character1.glb');
useGLTF.preload('/models/character2.glb');
useGLTF.preload('/models/character3.glb');
useGLTF.preload('/models/character4.glb');
useGLTF.preload('/models/character5.glb');
useGLTF.preload('/models/character6.glb');
useGLTF.preload('/models/character7.glb');
useGLTF.preload('/models/character8.glb');
useGLTF.preload('/models/character9.glb');
useGLTF.preload('/models/character10.glb');
useGLTF.preload('/models/character11.glb');
useGLTF.preload('/models/character12.glb');
useGLTF.preload('/models/character13.glb');
useGLTF.preload('/models/character14.glb');
useGLTF.preload('/models/character15.glb');
useGLTF.preload('/models/character16.glb');
useGLTF.preload('/models/character17.glb');
useGLTF.preload('/models/character18.glb');
useGLTF.preload('/models/character19.glb');
useGLTF.preload('/models/character20.glb');
useGLTF.preload('/models/character21.glb');
useGLTF.preload('/models/character22.glb');
useGLTF.preload('/models/character23.glb');
useGLTF.preload('/models/character24.glb');
useGLTF.preload('/models/character25.glb');
useGLTF.preload('/models/character26.glb');
useGLTF.preload('/models/character27.glb');
useGLTF.preload('/models/character28.glb');
useGLTF.preload('/models/character29.glb');
useGLTF.preload('/models/character30.glb');

const CoordinateTracker: React.FC<{ position: THREE.Vector3 }> = ({ position }) => {
  return (
    <div className="fixed top-4 right-4 bg-black/70 text-white p-4 rounded-lg font-mono text-sm">
      <div>X: {position.x.toFixed(2)}</div>
      <div>Y: {position.y.toFixed(2)}</div>
      <div>Z: {position.z.toFixed(2)}</div>
    </div>
  );
};

const CityModel: React.FC = () => {
  const { scene } = useGLTF('/models/city.glb');
  
  useEffect(() => {
    logger.info('City model loading attempt', { path: '/models/city.glb' });
  }, []);
  
  return <primitive object={scene} position={[0, 0, 0]} />;
};

const Player: React.FC<{ 
  onMove: (position: THREE.Vector3) => void;
  mobileMovement?: { x: number, z: number };
  mobileLook?: { x: number, y: number };
}> = ({ onMove, mobileMovement, mobileLook }) => {
  const { camera } = useThree();
  const isMovementDisabled = useStore(state => state.isMovementDisabled);
  const moveSpeed = 0.15;
  const rotateSpeed = 0.002;
  const mobileRotateSpeed = 0.05;
  const playerRef = useRef<THREE.Object3D>(new THREE.Object3D());
  const rotationRef = useRef({ x: 0, y: Math.PI });
  const isMouseDown = useRef(false);
  
  useEffect(() => {
    playerRef.current.position.set(53, 1.7, 11); // Keep original starting position
    camera.position.copy(playerRef.current.position);
    camera.rotation.set(0, Math.PI, 0);
    
    const handleMouseDown = () => {
      isMouseDown.current = true;
    };
    
    const handleMouseUp = () => {
      isMouseDown.current = false;
    };
    
    const handleMouseMove = (event: MouseEvent) => {
      if (!isMouseDown.current) return;
      
      rotationRef.current.y -= event.movementX * rotateSpeed;
      rotationRef.current.x -= event.movementY * rotateSpeed;
      rotationRef.current.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, rotationRef.current.x));
    };
    
    document.addEventListener('mousedown', handleMouseDown);
    document.addEventListener('mouseup', handleMouseUp);
    document.addEventListener('mousemove', handleMouseMove);
    
    return () => {
      document.removeEventListener('mousedown', handleMouseDown);
      document.removeEventListener('mouseup', handleMouseUp);
      document.removeEventListener('mousemove', handleMouseMove);
    };
  }, [camera]);
  
  useFrame(() => {
    // Skip movement if disabled
    if (isMovementDisabled) return;
    
    // Handle mobile look controls
    if (mobileLook && (mobileLook.x !== 0 || mobileLook.y !== 0)) {
      rotationRef.current.y -= mobileLook.x * mobileRotateSpeed;
      rotationRef.current.x -= mobileLook.y * mobileRotateSpeed;
      rotationRef.current.x = Math.max(-Math.PI / 3, Math.min(Math.PI / 3, rotationRef.current.x));
    }
    
    const rotation = new THREE.Euler(rotationRef.current.x, rotationRef.current.y, 0, 'YXZ');
    playerRef.current.setRotationFromEuler(rotation);
    camera.setRotationFromEuler(rotation);
    
    const forward = new THREE.Vector3(0, 0, -1).applyEuler(rotation);
    forward.y = 0;
    forward.normalize();
    
    const right = new THREE.Vector3(1, 0, 0).applyEuler(rotation);
    right.y = 0;
    right.normalize();
    
    const movement = new THREE.Vector3();
    
    // Desktop keyboard controls
    if (keys['keyw'] || keys['arrowup']) movement.add(forward);
    if (keys['keys'] || keys['arrowdown']) movement.sub(forward);
    if (keys['keyd'] || keys['arrowright']) movement.add(right);
    if (keys['keya'] || keys['arrowleft']) movement.sub(right);
    
    // Mobile joystick controls
    if (mobileMovement && (mobileMovement.x !== 0 || mobileMovement.z !== 0)) {
      const mobileDirection = new THREE.Vector3();
      mobileDirection.add(forward.clone().multiplyScalar(mobileMovement.z));
      mobileDirection.add(right.clone().multiplyScalar(mobileMovement.x));
      movement.add(mobileDirection);
    }
    
    if (movement.length() > 0) {
      movement.normalize().multiplyScalar(moveSpeed);
      
      // Calculate new position
      const newPosition = playerRef.current.position.clone().add(movement);
      
      // Define boundaries
      const bounds = {
        minX: -38.45,
        maxX: 80.78,
        minZ: -103.82,
        maxZ: 25.3
      };
      
      // Check if new position would be out of bounds
      let isOutOfBounds = false;
      let slideX = movement.x;
      let slideZ = movement.z;
      
      // Check X boundaries and enable sliding
      if (newPosition.x < bounds.minX) {
        newPosition.x = bounds.minX;
        slideX = 0;
        isOutOfBounds = true;
      } else if (newPosition.x > bounds.maxX) {
        newPosition.x = bounds.maxX;
        slideX = 0;
        isOutOfBounds = true;
      }
      
      // Check Z boundaries and enable sliding
      if (newPosition.z < bounds.minZ) {
        newPosition.z = bounds.minZ;
        slideZ = 0;
        isOutOfBounds = true;
      } else if (newPosition.z > bounds.maxZ) {
        newPosition.z = bounds.maxZ;
        slideZ = 0;
        isOutOfBounds = true;
      }
      
      // If out of bounds, apply sliding movement
      if (isOutOfBounds) {
        const slideMovement = new THREE.Vector3(slideX, 0, slideZ);
        if (slideMovement.length() > 0) {
          slideMovement.normalize().multiplyScalar(moveSpeed);
          newPosition.add(slideMovement);
        }
      }
      
      // Update position
      playerRef.current.position.copy(newPosition);
      camera.position.copy(newPosition);
      onMove(newPosition.clone());
    }
  });
  
  return null;
};

const keys: { [key: string]: boolean } = {};

const handleKeyDown = (e: KeyboardEvent) => {
  if (e.code) {
    keys[e.code.toLowerCase()] = true;
  }
};

const handleKeyUp = (e: KeyboardEvent) => {
  if (e.code) {
    keys[e.code.toLowerCase()] = false;
  }
};

if (typeof window !== 'undefined') {
  window.addEventListener('keydown', handleKeyDown);
  window.addEventListener('keyup', handleKeyUp);
}

const CityScene: React.FC = () => {
  const [playerPosition, setPlayerPosition] = useState(new THREE.Vector3(53, 1.7, 11));
  const [character, setCharacter] = useState<CharacterType | null>(null);
  const [character2, setCharacter2] = useState<CharacterType | null>(null);
  const [character3, setCharacter3] = useState<CharacterType | null>(null);
  const [character4, setCharacter4] = useState<CharacterType | null>(null);
  const [character5, setCharacter5] = useState<CharacterType | null>(null);
  const [character6, setCharacter6] = useState<CharacterType | null>(null);
  const [character7, setCharacter7] = useState<CharacterType | null>(null);
  const [character8, setCharacter8] = useState<CharacterType | null>(null);
  const [character9, setCharacter9] = useState<CharacterType | null>(null);
  const [character10, setCharacter10] = useState<CharacterType | null>(null);
  const [character11, setCharacter11] = useState<CharacterType | null>(null);
  const [character12, setCharacter12] = useState<CharacterType | null>(null);
  const [character13, setCharacter13] = useState<CharacterType | null>(null);
  const [character14, setCharacter14] = useState<CharacterType | null>(null);
  const [character15, setCharacter15] = useState<CharacterType | null>(null);
  const [character16, setCharacter16] = useState<CharacterType | null>(null);
  const [character17, setCharacter17] = useState<CharacterType | null>(null);
  const [character18, setCharacter18] = useState<CharacterType | null>(null);
  const [character19, setCharacter19] = useState<CharacterType | null>(null);
  const [character20, setCharacter20] = useState<CharacterType | null>(null);
  const [character21, setCharacter21] = useState<CharacterType | null>(null);
  const [character22, setCharacter22] = useState<CharacterType | null>(null);
  const [character23, setCharacter23] = useState<CharacterType | null>(null);
  const [character24, setCharacter24] = useState<CharacterType | null>(null);
  const [character25, setCharacter25] = useState<CharacterType | null>(null);
  const [character26, setCharacter26] = useState<CharacterType | null>(null);
  const [character27, setCharacter27] = useState<CharacterType | null>(null);
  const [character28, setCharacter28] = useState<CharacterType | null>(null);
  const [character29, setCharacter29] = useState<CharacterType | null>(null);
  const [character30, setCharacter30] = useState<CharacterType | null>(null);
  const [isDialogueActive, setIsDialogueActive] = useState(false);
  const [distanceToCharacter, setDistanceToCharacter] = useState<number>(Infinity);
  const [distanceToCharacter2, setDistanceToCharacter2] = useState<number>(Infinity);
  const [distanceToCharacter3, setDistanceToCharacter3] = useState<number>(Infinity);
  const [distanceToCharacter4, setDistanceToCharacter4] = useState<number>(Infinity);
  const [distanceToCharacter5, setDistanceToCharacter5] = useState<number>(Infinity);
  const [distanceToCharacter6, setDistanceToCharacter6] = useState<number>(Infinity);
  const [distanceToCharacter7, setDistanceToCharacter7] = useState<number>(Infinity);
  const [distanceToCharacter8, setDistanceToCharacter8] = useState<number>(Infinity);
  const [distanceToCharacter9, setDistanceToCharacter9] = useState<number>(Infinity);
  const [distanceToCharacter10, setDistanceToCharacter10] = useState<number>(Infinity);
  const [distanceToCharacter11, setDistanceToCharacter11] = useState<number>(Infinity);
  const [distanceToCharacter12, setDistanceToCharacter12] = useState<number>(Infinity);
  const [distanceToCharacter13, setDistanceToCharacter13] = useState<number>(Infinity);
  const [distanceToCharacter14, setDistanceToCharacter14] = useState<number>(Infinity);
  const [distanceToCharacter15, setDistanceToCharacter15] = useState<number>(Infinity);
  const [distanceToCharacter16, setDistanceToCharacter16] = useState<number>(Infinity);
  const [distanceToCharacter17, setDistanceToCharacter17] = useState<number>(Infinity);
  const [distanceToCharacter18, setDistanceToCharacter18] = useState<number>(Infinity);
  const [distanceToCharacter19, setDistanceToCharacter19] = useState<number>(Infinity);
  const [distanceToCharacter20, setDistanceToCharacter20] = useState<number>(Infinity);
  const [distanceToCharacter21, setDistanceToCharacter21] = useState<number>(Infinity);
  const [distanceToCharacter22, setDistanceToCharacter22] = useState<number>(Infinity);
  const [distanceToCharacter23, setDistanceToCharacter23] = useState<number>(Infinity);
  const [distanceToCharacter24, setDistanceToCharacter24] = useState<number>(Infinity);
  const [distanceToCharacter25, setDistanceToCharacter25] = useState<number>(Infinity);
  const [distanceToCharacter26, setDistanceToCharacter26] = useState<number>(Infinity);
  const [distanceToCharacter27, setDistanceToCharacter27] = useState<number>(Infinity);
  const [distanceToCharacter28, setDistanceToCharacter28] = useState<number>(Infinity);
  const [distanceToCharacter29, setDistanceToCharacter29] = useState<number>(Infinity);
  const [distanceToCharacter30, setDistanceToCharacter30] = useState<number>(Infinity);
  const [loadingDialogue, setLoadingDialogue] = useState(false);
  const [dialogueError, setDialogueError] = useState<string | null>(null);
  const [isNpcSpeaking, setIsNpcSpeaking] = useState(false);
  const [activeCharacterId, setActiveCharacterId] = useState<number>(1);
  
  // Add new state for dialogue selection
  const [showDialogueSelection, setShowDialogueSelection] = useState(false);
  const [selectedDialogueId, setSelectedDialogueId] = useState<number>(1);
  const [aiDialogue, setAiDialogue] = useState<AIDialogueStep[] | null>(null);
  
  // Mobile controls state
  const [mobileMovement, setMobileMovement] = useState({ x: 0, z: 0 });
  const [mobileLook, setMobileLook] = useState({ x: 0, y: 0 });

  // Fetch character data
  useEffect(() => {
    // Set up character1
    setCharacter({
      id: 1,
      name: 'Tom',
      role: 'Taxi Driver',
      position_x: 53,
      position_y: -0.3,
      position_z: 17,
      scale_x: 0.6,
      scale_y: 0.6,
      scale_z: 0.6,
      rotation_y: Math.PI * 1, // Default forward facing
      is_active: true
    } as CharacterType);
    
    // Set up character2
    setCharacter2({
      id: 2,
      name: 'Noah',
      role: 'Shop Clerk',
      position_x: 34,
      position_y: 0,
      position_z: 12.55,
      scale_x: 1,
      scale_y: 1,
      scale_z: 1,
      rotation_y: Math.PI * 0.5, // 90-degree rotation to face towards the street/player
      is_active: true
    } as CharacterType);

    // Set up character3
    setCharacter3({
      id: 3,
      name: 'Eli',
      role: 'Bus Driver',
      position_x: 64,
      position_y: -0.25,
      position_z: -47,
      scale_x: 1,
      scale_y: 1,
      scale_z: 1,
      rotation_y: Math.PI * 1.5, // 270-degree rotation to face towards the street/player
      is_active: true
    } as CharacterType);
    
    // Set up character4
    setCharacter4({
      id: 4,
      name: 'Rover',
      role: 'Talking Dog',
      position_x: -6.5,
      position_y: 0,
      position_z: -34,
      scale_x: 0.4,
      scale_y: 0.4,
      scale_z: 0.4,
      rotation_y: Math.PI * 0.25, // 45-degree rotation to face towards the path/player
      is_active: true
    } as CharacterType);
    
    // Set up character5
    setCharacter5({
      id: 5,
      name: 'Navi-1',
      role: 'Info Robot',
      position_x: -7.25,
      position_y: 0,
      position_z: -21,
      scale_x: 0.7,
      scale_y: 0.7,
      scale_z: 0.7,
      rotation_y: Math.PI * 0.8, // Default forward facing
      is_active: true
    } as CharacterType);

    // Set up character6
    setCharacter6({
      id: 6,
      name: 'Ava',
      role: 'Librarian',
      position_x: 50,
      position_y: 0.8,
      position_z: -40,
      scale_x: 1,
      scale_y: 1,
      scale_z: 1,
      rotation_y: Math.PI * 2, // 270 degrees to face towards the street/player
      is_active: true
    } as CharacterType);

    // Set up character7
    setCharacter7({
      id: 7,
      name: 'Owen',
      role: 'Food Vendor',
      position_x: 2.5,
      position_y: 0,
      position_z: -6,
      scale_x: 1.3,
      scale_y: 1.3,
      scale_z: 1.3,
      rotation_y: Math.PI * 1, // Default forward facing
      is_active: true
    } as CharacterType);

    // Set up character8
    setCharacter8({
      id: 8,
      name: 'Cody',
      role: 'Park Keeper',
      position_x: -16,
      position_y: 0,
      position_z: -34,
      scale_x: 0.7,
      scale_y: 0.7,
      scale_z: 0.7,
      rotation_y: Math.PI * 1, // Default forward facing
      is_active: true
    } as CharacterType);

    // Set up character9
    setCharacter9({
      id: 9,
      name: 'Navi-2',
      role: 'Gallery Bot',
      position_x: 20,
      position_y: 0,
      position_z: -60,
      scale_x: 0.1,
      scale_y: 0.1,
      scale_z: 0.1,
      rotation_y: Math.PI * 2, // 180 degrees to face towards the player
      is_active: true
    } as CharacterType);

    // Set up character10
    setCharacter10({
      id: 10,
      name: 'Jack',
      role: 'Trainer',
      position_x: -14,
      position_y: 0,
      position_z: -52,
      scale_x: 1.2,
      scale_y: 1.2,
      scale_z: 1.2,
      rotation_y: Math.PI * 1.5, // Default forward facing
      is_active: true
    } as CharacterType);

    // Set up character11
    setCharacter11({
      id: 11,
      name: 'Character11',
      role: 'New Character',
      position_x: 52,
      position_y: 0,
      position_z: -63.8,
      scale_x: 0.1,
      scale_y: 0.1,
      scale_z: 0.1,
      rotation_y: Math.PI * 0.5, // Default forward facing
      is_active: true
    } as CharacterType);

    // Set up character12
    setCharacter12({
      id: 12,
      name: 'Character12',
      role: 'New Character',
      position_x: -19.2,
      position_y: 0,
      position_z: -77.4,
      scale_x: 1.3,
      scale_y: 1.3,
      scale_z: 1.3,
      rotation_y: Math.PI * 0, // Default forward facing
      is_active: true
    } as CharacterType);

    // Set up character13
    setCharacter13({
      id: 13,
      name: 'Character13',
      role: 'New Character',
      position_x: 21.41,
      position_y: -0.8,
      position_z: -7.6,
      scale_x: 1,
      scale_y: 1,
      scale_z: 1,
      rotation_y: Math.PI * 1, // Default forward facing
      is_active: true
    } as CharacterType);

    // Set up character14
    setCharacter14({
      id: 14,
      name: 'Character14',
      role: 'New Character',
      position_x: -1.5,
      position_y: 0,
      position_z: -63.5,
      scale_x: 0.1,
      scale_y: 0.1,
      scale_z: 0.1,
      rotation_y: Math.PI * 1, // Default forward facing
      is_active: true
    } as CharacterType);

    // Set up character15
    setCharacter15({
      id: 15,
      name: 'Character15',
      role: 'New Character',
      position_x: -13,
      position_y: 0,
      position_z: -44,
      scale_x: 0.05,
      scale_y: 0.05,
      scale_z: 0.05,
      rotation_y: Math.PI * -0.5, // Default forward facing
      is_active: true
    } as CharacterType);

    // Set up character16
    setCharacter16({
      id: 16,
      name: 'Character16',
      role: 'New Character',
      position_x: 8,
      position_y: 0,
      position_z: 13,
      scale_x: 0.15,
      scale_y: 0.15,
      scale_z: 0.15,
      rotation_y: Math.PI * 0, // Default forward facing
      is_active: true
    } as CharacterType);

    // Set up character17
    setCharacter17({
      id: 17,
      name: 'Character17',
      role: 'New Character',
      position_x: 18.3,
      position_y: 0,
      position_z: 12,
      scale_x: 0.006,
      scale_y: 0.006,
      scale_z: 0.006, 
      rotation_y: Math.PI * 0, // Default forward facing
      is_active: true
    } as CharacterType);

    // Set up character18
    setCharacter18({
      id: 18,
      name: 'Character18',
      role: 'New Character',
      position_x: 50,
      position_y: 1.1,
      position_z: -17,
      scale_x: 0.15,
      scale_y: 0.15,
      scale_z: 0.15,
      rotation_y: Math.PI * 0, // Default forward facing
      is_active: true
    } as CharacterType);

    // Set up character19
    setCharacter19({
      id: 19,
      name: 'Character19',
      role: 'New Character',
      position_x: 7,
      position_y: 0.6,
      position_z: -74,
      scale_x: 0.3,
      scale_y: 0.3,
      scale_z: 0.3,
      rotation_y: Math.PI * 0, // Default forward facing
      is_active: true
    } as CharacterType);

    // Set up character20
    setCharacter20({
      id: 20,
      name: 'Character20',
      role: 'New Character',
      position_x: -4,
      position_y: 0,
      position_z: -40,
      scale_x: 0.01,
      scale_y: 0.01,
      scale_z: 0.01,
      rotation_y: Math.PI * -0.5, // Default forward facing
      is_active: true
    } as CharacterType);

    // Set up character21
    setCharacter21({
      id: 21,
      name: 'Character21',
      role: 'New Character',
      position_x: 25,
      position_y: 0,
      position_z: -17,
      scale_x: 1,
      scale_y: 1,
      scale_z: 1,
      rotation_y: Math.PI * 0, // Default forward facing
      is_active: true
    } as CharacterType);

    // Set up character22
    setCharacter22({
      id: 22,
      name: 'Character22',
      role: 'New Character',
      position_x: -9,
      position_y: 0,
      position_z: -91,
      scale_x: 1.5,
      scale_y: 1.5,
      scale_z: 1.5,
      rotation_y: Math.PI * 1, // Default forward facing
      is_active: true
    } as CharacterType);

    // Set up character23
    setCharacter23({
      id: 23,
      name: 'Character23',
      role: 'New Character',
      position_x: 66,
      position_y: 0,
      position_z: -3,
      scale_x: 0.8,
      scale_y: 0.8,
      scale_z: 0.8,
      rotation_y: Math.PI * -0.5, // Default forward facing
      is_active: true
    } as CharacterType);

    // Set up character24
    setCharacter24({
      id: 24,
      name: 'Character24',
      role: 'New Character',
      position_x: 34,
      position_y: 2,
      position_z: -44,
      scale_x: 0.5,
      scale_y: 0.5,
      scale_z: 0.5,
      rotation_y: Math.PI * 0, // Default forward facing
      is_active: true
    } as CharacterType);

    // Set up character25
    setCharacter25({
      id: 25,
      name: 'Character25',
      role: 'New Character',
      position_x: -16,
      position_y: 0,
      position_z: 3,
      scale_x: 0.5,
      scale_y: 0.5,
      scale_z: 0.5,
      rotation_y: Math.PI * 0.5, // Default forward facing
      is_active: true
    } as CharacterType);

    // Set up character26
    setCharacter26({
      id: 26,
      name: 'Character26',
      role: 'New Character',
      position_x: 73,
      position_y: -0.1,
      position_z: -20,
      scale_x: 0.1,
      scale_y: 0.1,
      scale_z: 0.1,
      rotation_y: Math.PI * 0.5, // Default forward facing
      is_active: true
    } as CharacterType);

    // Set up character27
    setCharacter27({
      id: 27,
      name: 'Character27',
      role: 'New Character',
      position_x: 40,
      position_y: 0,
      position_z: -83,
      scale_x: 1,
      scale_y: 1,
      scale_z: 1,
      rotation_y: Math.PI * 0.5, // Default forward facing
      is_active: true
    } as CharacterType);

    // Set up character28
    setCharacter28({
      id: 28,
      name: 'Character28',
      role: 'New Character',
      position_x: -4,
      position_y: -0.2,
      position_z: -10,
      scale_x: 1.3,
      scale_y: 1.3,
      scale_z: 1.3,
      rotation_y: Math.PI * 1, // Default forward facing
      is_active: true
    } as CharacterType);

    // Set up character29
    setCharacter29({
      id: 29,
      name: 'Character29',
      role: 'New Character',
      position_x: 37,
      position_y: 0,
      position_z: -40,
      scale_x: 0.6,
      scale_y: 0.6,
      scale_z: 0.6,
      rotation_y: Math.PI * 0, // Default forward facing
      is_active: true
    } as CharacterType);

    // Set up character30
    setCharacter30({
      id: 30,
      name: 'Character30',
      role: 'New Character',
      position_x: 35,
      position_y: 0,
      position_z: -25,
      scale_x: 8,
      scale_y: 8,
      scale_z: 8,
      rotation_y: Math.PI * 1, // Default forward facing
      is_active: true
    } as CharacterType);
  }, []);

  // Calculate distance between player and characters
  useEffect(() => {
    if (!character && !character2 && !character3 && !character4 && !character5 && 
        !character6 && !character7 && !character8 && !character9 && !character10 && !character11 && !character12 && !character13 && !character14 && !character15 && !character16 && !character17 && !character18 && !character19 && !character20 && !character21 && !character22 && !character23 && !character24 && !character25 && !character26 && !character27 && !character28 && !character29 && !character30) return;

    const characterPosition = character ? new THREE.Vector3(
      character.position_x,
      character.position_y,
      character.position_z
    ) : null;
    
    const character2Position = character2 ? new THREE.Vector3(
      character2.position_x,
      character2.position_y,
      character2.position_z
    ) : null;
    
    const character3Position = character3 ? new THREE.Vector3(
      character3.position_x,
      character3.position_y,
      character3.position_z
    ) : null;
    
    const character4Position = character4 ? new THREE.Vector3(
      character4.position_x,
      character4.position_y,
      character4.position_z
    ) : null;
    
    const character5Position = character5 ? new THREE.Vector3(
      character5.position_x,
      character5.position_y,
      character5.position_z
    ) : null;

    const character6Position = character6 ? new THREE.Vector3(
      character6.position_x,
      character6.position_y,
      character6.position_z
    ) : null;

    const character7Position = character7 ? new THREE.Vector3(
      character7.position_x,
      character7.position_y,
      character7.position_z
    ) : null;

    const character8Position = character8 ? new THREE.Vector3(
      character8.position_x,
      character8.position_y,
      character8.position_z
    ) : null;

    const character9Position = character9 ? new THREE.Vector3(
      character9.position_x,
      character9.position_y,
      character9.position_z
    ) : null;

    const character10Position = character10 ? new THREE.Vector3(
      character10.position_x,
      character10.position_y,
      character10.position_z
    ) : null;

    const character11Position = character11 ? new THREE.Vector3(
      character11.position_x,
      character11.position_y,
      character11.position_z
    ) : null;

    const character12Position = character12 ? new THREE.Vector3(
      character12.position_x,
      character12.position_y,
      character12.position_z
    ) : null;

    const character13Position = character13 ? new THREE.Vector3(
      character13.position_x,
      character13.position_y,
      character13.position_z
    ) : null;

    const character14Position = character14 ? new THREE.Vector3(
      character14.position_x,
      character14.position_y,
      character14.position_z
    ) : null;

    const character15Position = character15 ? new THREE.Vector3(
      character15.position_x,
      character15.position_y,
      character15.position_z
    ) : null;

    const character16Position = character16 ? new THREE.Vector3(
      character16.position_x,
      character16.position_y,
      character16.position_z
    ) : null;

    const character17Position = character17 ? new THREE.Vector3(
      character17.position_x,
      character17.position_y,
      character17.position_z
    ) : null;

    const character18Position = character18 ? new THREE.Vector3(
      character18.position_x,
      character18.position_y,
      character18.position_z
    ) : null;

    const character19Position = character19 ? new THREE.Vector3(
      character19.position_x,
      character19.position_y,
      character19.position_z
    ) : null;

    const character20Position = character20 ? new THREE.Vector3(
      character20.position_x,
      character20.position_y,
      character20.position_z
    ) : null;

    const character21Position = character21 ? new THREE.Vector3(
      character21.position_x,
      character21.position_y,
      character21.position_z
    ) : null;

    const character22Position = character22 ? new THREE.Vector3(
      character22.position_x,
      character22.position_y,
      character22.position_z
    ) : null;

    const character23Position = character23 ? new THREE.Vector3(
      character23.position_x,
      character23.position_y,
      character23.position_z
    ) : null;

    const character24Position = character24 ? new THREE.Vector3(
      character24.position_x,
      character24.position_y,
      character24.position_z
    ) : null;

    const character25Position = character25 ? new THREE.Vector3(
      character25.position_x,
      character25.position_y,
      character25.position_z
    ) : null;

    const character26Position = character26 ? new THREE.Vector3(
      character26.position_x,
      character26.position_y,
      character26.position_z
    ) : null;

    const character27Position = character27 ? new THREE.Vector3(
      character27.position_x,
      character27.position_y,
      character27.position_z
    ) : null;

    const character28Position = character28 ? new THREE.Vector3(
      character28.position_x,
      character28.position_y,
      character28.position_z
    ) : null;

    const character29Position = character29 ? new THREE.Vector3(
      character29.position_x,
      character29.position_y,
      character29.position_z
    ) : null;

    const character30Position = character30 ? new THREE.Vector3(
      character30.position_x,
      character30.position_y,
      character30.position_z
    ) : null;

    const checkDistance = () => {
      // Calculate distances and interactions for all characters
      
      // Character 1
      if (characterPosition) {
        // Calculate distance only in X and Z (horizontal plane), ignoring Y (height)
        const playerXZ = new THREE.Vector2(playerPosition.x, playerPosition.z);
        const characterXZ = new THREE.Vector2(characterPosition.x, characterPosition.z);
        const horizontalDistance = playerXZ.distanceTo(characterXZ);
        
        setDistanceToCharacter(horizontalDistance);
        
        // Show dialogue selection when close enough (5 units)
        if (horizontalDistance <= 5 && !isDialogueActive && !loadingDialogue && !showDialogueSelection) {
          logger.info('Player is within range of character 1, showing dialogue selection', { 
            distance: horizontalDistance,
            playerPosition: [playerPosition.x, playerPosition.y, playerPosition.z],
            characterPosition: [characterPosition.x, characterPosition.y, characterPosition.z]
          });
          setActiveCharacterId(1);
          setShowDialogueSelection(true);
        }
      }
      
      // Character 2
      if (character2Position) {
        const playerXZ = new THREE.Vector2(playerPosition.x, playerPosition.z);
        const character2XZ = new THREE.Vector2(character2Position.x, character2Position.z);
        const horizontalDistance2 = playerXZ.distanceTo(character2XZ);
        
        setDistanceToCharacter2(horizontalDistance2);
        
        // Show dialogue selection when close enough (5 units)
        if (horizontalDistance2 <= 5 && !isDialogueActive && !loadingDialogue && !showDialogueSelection) {
          logger.info('Player is within range of character 2, showing dialogue selection', { 
            distance: horizontalDistance2,
            playerPosition: [playerPosition.x, playerPosition.y, playerPosition.z],
            characterPosition: [character2Position.x, character2Position.y, character2Position.z]
          });
          setActiveCharacterId(2);
          setShowDialogueSelection(true);
        }
      }
      
      // Character 3
      if (character3Position) {
        const playerXZ = new THREE.Vector2(playerPosition.x, playerPosition.z);
        const character3XZ = new THREE.Vector2(character3Position.x, character3Position.z);
        const horizontalDistance3 = playerXZ.distanceTo(character3XZ);
        
        setDistanceToCharacter3(horizontalDistance3);
        
        // Show dialogue selection when close enough (5 units)
        if (horizontalDistance3 <= 5 && !isDialogueActive && !loadingDialogue && !showDialogueSelection) {
          logger.info('Player is within range of character 3, showing dialogue selection', { 
            distance: horizontalDistance3,
            playerPosition: [playerPosition.x, playerPosition.y, playerPosition.z],
            characterPosition: [character3Position.x, character3Position.y, character3Position.z]
          });
          setActiveCharacterId(3);
          setShowDialogueSelection(true);
        }
      }
      
      // Character 4
      if (character4Position) {
        const playerXZ = new THREE.Vector2(playerPosition.x, playerPosition.z);
        const character4XZ = new THREE.Vector2(character4Position.x, character4Position.z);
        const horizontalDistance4 = playerXZ.distanceTo(character4XZ);
        
        setDistanceToCharacter4(horizontalDistance4);
        
        // Show dialogue selection when close enough (5 units)
        if (horizontalDistance4 <= 5 && !isDialogueActive && !loadingDialogue && !showDialogueSelection) {
          logger.info('Player is within range of character 4, showing dialogue selection', { 
            distance: horizontalDistance4,
            playerPosition: [playerPosition.x, playerPosition.y, playerPosition.z],
            characterPosition: [character4Position.x, character4Position.y, character4Position.z]
          });
          setActiveCharacterId(4);
          setShowDialogueSelection(true);
        }
      }
      
      // Character 5
      if (character5Position) {
        const playerXZ = new THREE.Vector2(playerPosition.x, playerPosition.z);
        const character5XZ = new THREE.Vector2(character5Position.x, character5Position.z);
        const horizontalDistance5 = playerXZ.distanceTo(character5XZ);
        
        setDistanceToCharacter5(horizontalDistance5);
        
        // Show dialogue selection when close enough (5 units)
        if (horizontalDistance5 <= 5 && !isDialogueActive && !loadingDialogue && !showDialogueSelection) {
          logger.info('Player is within range of character 5, showing dialogue selection', { 
            distance: horizontalDistance5,
            playerPosition: [playerPosition.x, playerPosition.y, playerPosition.z],
            characterPosition: [character5Position.x, character5Position.y, character5Position.z]
          });
          setActiveCharacterId(5);
          setShowDialogueSelection(true);
        }
      }
      
      // Character 6
      if (character6Position) {
        const playerXZ = new THREE.Vector2(playerPosition.x, playerPosition.z);
        const character6XZ = new THREE.Vector2(character6Position.x, character6Position.z);
        const horizontalDistance6 = playerXZ.distanceTo(character6XZ);
        
        setDistanceToCharacter6(horizontalDistance6);
        
        if (horizontalDistance6 <= 5 && !isDialogueActive && !loadingDialogue && !showDialogueSelection) {
          logger.info('Player is within range of character 6, showing dialogue selection', { 
            distance: horizontalDistance6,
            playerPosition: [playerPosition.x, playerPosition.y, playerPosition.z],
            characterPosition: [character6Position.x, character6Position.y, character6Position.z]
          });
          setActiveCharacterId(6);
          setShowDialogueSelection(true);
        }
      }

      // Character 7
      if (character7Position) {
        const playerXZ = new THREE.Vector2(playerPosition.x, playerPosition.z);
        const character7XZ = new THREE.Vector2(character7Position.x, character7Position.z);
        const horizontalDistance7 = playerXZ.distanceTo(character7XZ);
        
        setDistanceToCharacter7(horizontalDistance7);
        
        if (horizontalDistance7 <= 5 && !isDialogueActive && !loadingDialogue && !showDialogueSelection) {
          logger.info('Player is within range of character 7, showing dialogue selection', { 
            distance: horizontalDistance7,
            playerPosition: [playerPosition.x, playerPosition.y, playerPosition.z],
            characterPosition: [character7Position.x, character7Position.y, character7Position.z]
          });
          setActiveCharacterId(7);
          setShowDialogueSelection(true);
        }
      }

      // Character 8
      if (character8Position) {
        const playerXZ = new THREE.Vector2(playerPosition.x, playerPosition.z);
        const character8XZ = new THREE.Vector2(character8Position.x, character8Position.z);
        const horizontalDistance8 = playerXZ.distanceTo(character8XZ);
        
        setDistanceToCharacter8(horizontalDistance8);
        
        if (horizontalDistance8 <= 5 && !isDialogueActive && !loadingDialogue && !showDialogueSelection) {
          logger.info('Player is within range of character 8, showing dialogue selection', { 
            distance: horizontalDistance8,
            playerPosition: [playerPosition.x, playerPosition.y, playerPosition.z],
            characterPosition: [character8Position.x, character8Position.y, character8Position.z]
          });
          setActiveCharacterId(8);
          setShowDialogueSelection(true);
        }
      }

      // Character 9
      if (character9Position) {
        const playerXZ = new THREE.Vector2(playerPosition.x, playerPosition.z);
        const character9XZ = new THREE.Vector2(character9Position.x, character9Position.z);
        const horizontalDistance9 = playerXZ.distanceTo(character9XZ);
        
        setDistanceToCharacter9(horizontalDistance9);
        
        if (horizontalDistance9 <= 5 && !isDialogueActive && !loadingDialogue && !showDialogueSelection) {
          logger.info('Player is within range of character 9, showing dialogue selection', { 
            distance: horizontalDistance9,
            playerPosition: [playerPosition.x, playerPosition.y, playerPosition.z],
            characterPosition: [character9Position.x, character9Position.y, character9Position.z]
          });
          setActiveCharacterId(9);
          setShowDialogueSelection(true);
        }
      }

      // Character 10
      if (character10Position) {
        const playerXZ = new THREE.Vector2(playerPosition.x, playerPosition.z);
        const character10XZ = new THREE.Vector2(character10Position.x, character10Position.z);
        const horizontalDistance10 = playerXZ.distanceTo(character10XZ);
        
        setDistanceToCharacter10(horizontalDistance10);
        
        if (horizontalDistance10 <= 5 && !isDialogueActive && !loadingDialogue && !showDialogueSelection) {
          logger.info('Player is within range of character 10, showing dialogue selection', { 
            distance: horizontalDistance10,
            playerPosition: [playerPosition.x, playerPosition.y, playerPosition.z],
            characterPosition: [character10Position.x, character10Position.y, character10Position.z]
          });
          setActiveCharacterId(10);
          setShowDialogueSelection(true);
        }
      }

      // Character 11
      if (character11Position) {
        const playerXZ = new THREE.Vector2(playerPosition.x, playerPosition.z);
        const character11XZ = new THREE.Vector2(character11Position.x, character11Position.z);
        const horizontalDistance11 = playerXZ.distanceTo(character11XZ);
        
        setDistanceToCharacter11(horizontalDistance11);
        
        if (horizontalDistance11 <= 5 && !isDialogueActive && !loadingDialogue && !showDialogueSelection) {
          logger.info('Player is within range of character 11, showing dialogue selection', { 
            distance: horizontalDistance11,
            playerPosition: [playerPosition.x, playerPosition.y, playerPosition.z],
            characterPosition: [character11Position.x, character11Position.y, character11Position.z]
          });
          setActiveCharacterId(11);
          setShowDialogueSelection(true);
        }
      }

      // Character 12
      if (character12Position) {
        const playerXZ = new THREE.Vector2(playerPosition.x, playerPosition.z);
        const character12XZ = new THREE.Vector2(character12Position.x, character12Position.z);
        const horizontalDistance12 = playerXZ.distanceTo(character12XZ);
        
        setDistanceToCharacter12(horizontalDistance12);
        
        if (horizontalDistance12 <= 5 && !isDialogueActive && !loadingDialogue && !showDialogueSelection) {
          logger.info('Player is within range of character 12, showing dialogue selection', { 
            distance: horizontalDistance12,
            playerPosition: [playerPosition.x, playerPosition.y, playerPosition.z],
            characterPosition: [character12Position.x, character12Position.y, character12Position.z]
          });
          setActiveCharacterId(12);
          setShowDialogueSelection(true);
        }
      }

      // Character 13
      if (character13Position) {
        const playerXZ = new THREE.Vector2(playerPosition.x, playerPosition.z);
        const character13XZ = new THREE.Vector2(character13Position.x, character13Position.z);
        const horizontalDistance13 = playerXZ.distanceTo(character13XZ);
        
        setDistanceToCharacter13(horizontalDistance13);
        
        if (horizontalDistance13 <= 5 && !isDialogueActive && !loadingDialogue && !showDialogueSelection) {
          logger.info('Player is within range of character 13, showing dialogue selection', { 
            distance: horizontalDistance13,
            playerPosition: [playerPosition.x, playerPosition.y, playerPosition.z],
            characterPosition: [character13Position.x, character13Position.y, character13Position.z]
          });
          setActiveCharacterId(13);
          setShowDialogueSelection(true);
        }
      }

      // Character 14
      if (character14Position) {
        const playerXZ = new THREE.Vector2(playerPosition.x, playerPosition.z);
        const character14XZ = new THREE.Vector2(character14Position.x, character14Position.z);
        const horizontalDistance14 = playerXZ.distanceTo(character14XZ);
        
        setDistanceToCharacter14(horizontalDistance14);
        
        if (horizontalDistance14 <= 5 && !isDialogueActive && !loadingDialogue && !showDialogueSelection) {
          logger.info('Player is within range of character 14, showing dialogue selection', { 
            distance: horizontalDistance14,
            playerPosition: [playerPosition.x, playerPosition.y, playerPosition.z],
            characterPosition: [character14Position.x, character14Position.y, character14Position.z]
          });
          setActiveCharacterId(14);
          setShowDialogueSelection(true);
        }
      }

      // Character 15
      if (character15Position) {
        const playerXZ = new THREE.Vector2(playerPosition.x, playerPosition.z);
        const character15XZ = new THREE.Vector2(character15Position.x, character15Position.z);
        const horizontalDistance15 = playerXZ.distanceTo(character15XZ);
        
        setDistanceToCharacter15(horizontalDistance15);
        
        if (horizontalDistance15 <= 5 && !isDialogueActive && !loadingDialogue && !showDialogueSelection) {
          logger.info('Player is within range of character 15, showing dialogue selection', { 
            distance: horizontalDistance15,
            playerPosition: [playerPosition.x, playerPosition.y, playerPosition.z],
            characterPosition: [character15Position.x, character15Position.y, character15Position.z]
          });
          setActiveCharacterId(15);
          setShowDialogueSelection(true);
        }
      }

      // Character 16
      if (character16Position) {
        const playerXZ = new THREE.Vector2(playerPosition.x, playerPosition.z);
        const character16XZ = new THREE.Vector2(character16Position.x, character16Position.z);
        const horizontalDistance16 = playerXZ.distanceTo(character16XZ);
        
        setDistanceToCharacter16(horizontalDistance16);
        
        if (horizontalDistance16 <= 5 && !isDialogueActive && !loadingDialogue && !showDialogueSelection) {
          logger.info('Player is within range of character 16, showing dialogue selection', { 
            distance: horizontalDistance16,
            playerPosition: [playerPosition.x, playerPosition.y, playerPosition.z],
            characterPosition: [character16Position.x, character16Position.y, character16Position.z]
          });
          setActiveCharacterId(16);
          setShowDialogueSelection(true);
        }
      }

      // Character 17
      if (character17Position) {
        const playerXZ = new THREE.Vector2(playerPosition.x, playerPosition.z);
        const character17XZ = new THREE.Vector2(character17Position.x, character17Position.z);
        const horizontalDistance17 = playerXZ.distanceTo(character17XZ);
        
        setDistanceToCharacter17(horizontalDistance17);
        
        if (horizontalDistance17 <= 5 && !isDialogueActive && !loadingDialogue && !showDialogueSelection) {
          logger.info('Player is within range of character 17, showing dialogue selection', { 
            distance: horizontalDistance17,
            playerPosition: [playerPosition.x, playerPosition.y, playerPosition.z],
            characterPosition: [character17Position.x, character17Position.y, character17Position.z]
          });
          setActiveCharacterId(17);
          setShowDialogueSelection(true);
        }
      }

      // Character 18
      if (character18Position) {
        const playerXZ = new THREE.Vector2(playerPosition.x, playerPosition.z);
        const character18XZ = new THREE.Vector2(character18Position.x, character18Position.z);
        const horizontalDistance18 = playerXZ.distanceTo(character18XZ);
        
        setDistanceToCharacter18(horizontalDistance18);
        
        if (horizontalDistance18 <= 5 && !isDialogueActive && !loadingDialogue && !showDialogueSelection) {
          logger.info('Player is within range of character 18, showing dialogue selection', { 
            distance: horizontalDistance18,
            playerPosition: [playerPosition.x, playerPosition.y, playerPosition.z],
            characterPosition: [character18Position.x, character18Position.y, character18Position.z]
          });
          setActiveCharacterId(18);
          setShowDialogueSelection(true);
        }
      }

      // Character 19
      if (character19Position) {
        const playerXZ = new THREE.Vector2(playerPosition.x, playerPosition.z);
        const character19XZ = new THREE.Vector2(character19Position.x, character19Position.z);
        const horizontalDistance19 = playerXZ.distanceTo(character19XZ);
        
        setDistanceToCharacter19(horizontalDistance19);
        
        if (horizontalDistance19 <= 5 && !isDialogueActive && !loadingDialogue && !showDialogueSelection) {
          logger.info('Player is within range of character 19, showing dialogue selection', { 
            distance: horizontalDistance19,
            playerPosition: [playerPosition.x, playerPosition.y, playerPosition.z],
            characterPosition: [character19Position.x, character19Position.y, character19Position.z]
          });
          setActiveCharacterId(19);
          setShowDialogueSelection(true);
        }
      }

      // Character 20
      if (character20Position) {
        const playerXZ = new THREE.Vector2(playerPosition.x, playerPosition.z);
        const character20XZ = new THREE.Vector2(character20Position.x, character20Position.z);
        const horizontalDistance20 = playerXZ.distanceTo(character20XZ);
        
        setDistanceToCharacter20(horizontalDistance20);
        
        if (horizontalDistance20 <= 5 && !isDialogueActive && !loadingDialogue && !showDialogueSelection) {
          logger.info('Player is within range of character 20, showing dialogue selection', { 
            distance: horizontalDistance20,
            playerPosition: [playerPosition.x, playerPosition.y, playerPosition.z],
            characterPosition: [character20Position.x, character20Position.y, character20Position.z]
          });
          setActiveCharacterId(20);
          setShowDialogueSelection(true);
        }
      }

      // Character 21
      if (character21Position) {
        const playerXZ = new THREE.Vector2(playerPosition.x, playerPosition.z);
        const character21XZ = new THREE.Vector2(character21Position.x, character21Position.z);
        const horizontalDistance21 = playerXZ.distanceTo(character21XZ);
        
        setDistanceToCharacter21(horizontalDistance21);
        
        if (horizontalDistance21 <= 5 && !isDialogueActive && !loadingDialogue && !showDialogueSelection) {
          logger.info('Player is within range of character 21, showing dialogue selection', { 
            distance: horizontalDistance21,
            playerPosition: [playerPosition.x, playerPosition.y, playerPosition.z],
            characterPosition: [character21Position.x, character21Position.y, character21Position.z]
          });
          setActiveCharacterId(21);
          setShowDialogueSelection(true);
        }
      }

      // Character 22
      if (character22Position) {
        const playerXZ = new THREE.Vector2(playerPosition.x, playerPosition.z);
        const character22XZ = new THREE.Vector2(character22Position.x, character22Position.z);
        const horizontalDistance22 = playerXZ.distanceTo(character22XZ);
        
        setDistanceToCharacter22(horizontalDistance22);
        
        if (horizontalDistance22 <= 5 && !isDialogueActive && !loadingDialogue && !showDialogueSelection) {
          logger.info('Player is within range of character 22, showing dialogue selection', { 
            distance: horizontalDistance22,
            playerPosition: [playerPosition.x, playerPosition.y, playerPosition.z],
            characterPosition: [character22Position.x, character22Position.y, character22Position.z]
          });
          setActiveCharacterId(22);
          setShowDialogueSelection(true);
        }
      }

      // Character 23
      if (character23Position) {
        const playerXZ = new THREE.Vector2(playerPosition.x, playerPosition.z);
        const character23XZ = new THREE.Vector2(character23Position.x, character23Position.z);
        const horizontalDistance23 = playerXZ.distanceTo(character23XZ);
        
        setDistanceToCharacter23(horizontalDistance23);
        
        if (horizontalDistance23 <= 5 && !isDialogueActive && !loadingDialogue && !showDialogueSelection) {
          logger.info('Player is within range of character 23, showing dialogue selection', { 
            distance: horizontalDistance23,
            playerPosition: [playerPosition.x, playerPosition.y, playerPosition.z],
            characterPosition: [character23Position.x, character23Position.y, character23Position.z]
          });
          setActiveCharacterId(23);
          setShowDialogueSelection(true);
        }
      }

      // Character 24
      if (character24Position) {
        const playerXZ = new THREE.Vector2(playerPosition.x, playerPosition.z);
        const character24XZ = new THREE.Vector2(character24Position.x, character24Position.z);
        const horizontalDistance24 = playerXZ.distanceTo(character24XZ);
        
        setDistanceToCharacter24(horizontalDistance24);
        
        if (horizontalDistance24 <= 5 && !isDialogueActive && !loadingDialogue && !showDialogueSelection) {
          logger.info('Player is within range of character 24, showing dialogue selection', { 
            distance: horizontalDistance24,
            playerPosition: [playerPosition.x, playerPosition.y, playerPosition.z],
            characterPosition: [character24Position.x, character24Position.y, character24Position.z]
          });
          setActiveCharacterId(24);
          setShowDialogueSelection(true);
        }
      }

      // Character 25
      if (character25Position) {
        const playerXZ = new THREE.Vector2(playerPosition.x, playerPosition.z);
        const character25XZ = new THREE.Vector2(character25Position.x, character25Position.z);
        const horizontalDistance25 = playerXZ.distanceTo(character25XZ);
        
        setDistanceToCharacter25(horizontalDistance25);
        
        if (horizontalDistance25 <= 5 && !isDialogueActive && !loadingDialogue && !showDialogueSelection) {
          logger.info('Player is within range of character 25, showing dialogue selection', { 
            distance: horizontalDistance25,
            playerPosition: [playerPosition.x, playerPosition.y, playerPosition.z],
            characterPosition: [character25Position.x, character25Position.y, character25Position.z]
          });
          setActiveCharacterId(25);
          setShowDialogueSelection(true);
        }
      }

      // Character 26
      if (character26Position) {
        const playerXZ = new THREE.Vector2(playerPosition.x, playerPosition.z);
        const character26XZ = new THREE.Vector2(character26Position.x, character26Position.z);
        const horizontalDistance26 = playerXZ.distanceTo(character26XZ);
        
        setDistanceToCharacter26(horizontalDistance26);
        
        if (horizontalDistance26 <= 5 && !isDialogueActive && !loadingDialogue && !showDialogueSelection) {
          logger.info('Player is within range of character 26, showing dialogue selection', { 
            distance: horizontalDistance26,
            playerPosition: [playerPosition.x, playerPosition.y, playerPosition.z],
            characterPosition: [character26Position.x, character26Position.y, character26Position.z]
          });
          setActiveCharacterId(26);
          setShowDialogueSelection(true);
        }
      }

      // Character 27
      if (character27Position) {
        const playerXZ = new THREE.Vector2(playerPosition.x, playerPosition.z);
        const character27XZ = new THREE.Vector2(character27Position.x, character27Position.z);
        const horizontalDistance27 = playerXZ.distanceTo(character27XZ);
        
        setDistanceToCharacter27(horizontalDistance27);
        
        if (horizontalDistance27 <= 5 && !isDialogueActive && !loadingDialogue && !showDialogueSelection) {
          logger.info('Player is within range of character 27, showing dialogue selection', { 
            distance: horizontalDistance27,
            playerPosition: [playerPosition.x, playerPosition.y, playerPosition.z],
            characterPosition: [character27Position.x, character27Position.y, character27Position.z]
          });
          setActiveCharacterId(27);
          setShowDialogueSelection(true);
        }
      }

      // Character 28
      if (character28Position) {
        const playerXZ = new THREE.Vector2(playerPosition.x, playerPosition.z);
        const character28XZ = new THREE.Vector2(character28Position.x, character28Position.z);
        const horizontalDistance28 = playerXZ.distanceTo(character28XZ);
        
        setDistanceToCharacter28(horizontalDistance28);
        
        if (horizontalDistance28 <= 5 && !isDialogueActive && !loadingDialogue && !showDialogueSelection) {
          logger.info('Player is within range of character 28, showing dialogue selection', { 
            distance: horizontalDistance28,
            playerPosition: [playerPosition.x, playerPosition.y, playerPosition.z],
            characterPosition: [character28Position.x, character28Position.y, character28Position.z]
          });
          setActiveCharacterId(28);
          setShowDialogueSelection(true);
        }
      }

      // Character 29
      if (character29Position) {
        const playerXZ = new THREE.Vector2(playerPosition.x, playerPosition.z);
        const character29XZ = new THREE.Vector2(character29Position.x, character29Position.z);
        const horizontalDistance29 = playerXZ.distanceTo(character29XZ);
        
        setDistanceToCharacter29(horizontalDistance29);
        
        if (horizontalDistance29 <= 5 && !isDialogueActive && !loadingDialogue && !showDialogueSelection) {
          logger.info('Player is within range of character 29, showing dialogue selection', { 
            distance: horizontalDistance29,
            playerPosition: [playerPosition.x, playerPosition.y, playerPosition.z],
            characterPosition: [character29Position.x, character29Position.y, character29Position.z]
          });
          setActiveCharacterId(29);
          setShowDialogueSelection(true);
        }
      }

      // Character 30
      if (character30Position) {
        const playerXZ = new THREE.Vector2(playerPosition.x, playerPosition.z);
        const character30XZ = new THREE.Vector2(character30Position.x, character30Position.z);
        const horizontalDistance30 = playerXZ.distanceTo(character30XZ);
        
        setDistanceToCharacter30(horizontalDistance30);
        
        if (horizontalDistance30 <= 5 && !isDialogueActive && !loadingDialogue && !showDialogueSelection) {
          logger.info('Player is within range of character 30, showing dialogue selection', { 
            distance: horizontalDistance30,
            playerPosition: [playerPosition.x, playerPosition.y, playerPosition.z],
            characterPosition: [character30Position.x, character30Position.y, character30Position.z]
          });
          setActiveCharacterId(30);
          setShowDialogueSelection(true);
        }
      }
      
      // Auto close panels when player moves away from all characters
      const withinRangeOfAnyCharacter = 
        (characterPosition && new THREE.Vector2(playerPosition.x, playerPosition.z).distanceTo(new THREE.Vector2(characterPosition.x, characterPosition.z)) <= 5) ||
        (character2Position && new THREE.Vector2(playerPosition.x, playerPosition.z).distanceTo(new THREE.Vector2(character2Position.x, character2Position.z)) <= 5) ||
        (character3Position && new THREE.Vector2(playerPosition.x, playerPosition.z).distanceTo(new THREE.Vector2(character3Position.x, character3Position.z)) <= 5) ||
        (character4Position && new THREE.Vector2(playerPosition.x, playerPosition.z).distanceTo(new THREE.Vector2(character4Position.x, character4Position.z)) <= 5) ||
        (character5Position && new THREE.Vector2(playerPosition.x, playerPosition.z).distanceTo(new THREE.Vector2(character5Position.x, character5Position.z)) <= 5) ||
        (character6Position && new THREE.Vector2(playerPosition.x, playerPosition.z).distanceTo(new THREE.Vector2(character6Position.x, character6Position.z)) <= 5) ||
        (character7Position && new THREE.Vector2(playerPosition.x, playerPosition.z).distanceTo(new THREE.Vector2(character7Position.x, character7Position.z)) <= 5) ||
        (character8Position && new THREE.Vector2(playerPosition.x, playerPosition.z).distanceTo(new THREE.Vector2(character8Position.x, character8Position.z)) <= 5) ||
        (character9Position && new THREE.Vector2(playerPosition.x, playerPosition.z).distanceTo(new THREE.Vector2(character9Position.x, character9Position.z)) <= 5) ||
        (character10Position && new THREE.Vector2(playerPosition.x, playerPosition.z).distanceTo(new THREE.Vector2(character10Position.x, character10Position.z)) <= 5) ||
        (character11Position && new THREE.Vector2(playerPosition.x, playerPosition.z).distanceTo(new THREE.Vector2(character11Position.x, character11Position.z)) <= 5) ||
        (character12Position && new THREE.Vector2(playerPosition.x, playerPosition.z).distanceTo(new THREE.Vector2(character12Position.x, character12Position.z)) <= 5) ||
        (character13Position && new THREE.Vector2(playerPosition.x, playerPosition.z).distanceTo(new THREE.Vector2(character13Position.x, character13Position.z)) <= 5) ||
        (character14Position && new THREE.Vector2(playerPosition.x, playerPosition.z).distanceTo(new THREE.Vector2(character14Position.x, character14Position.z)) <= 5) ||
        (character15Position && new THREE.Vector2(playerPosition.x, playerPosition.z).distanceTo(new THREE.Vector2(character15Position.x, character15Position.z)) <= 5) ||
        (character16Position && new THREE.Vector2(playerPosition.x, playerPosition.z).distanceTo(new THREE.Vector2(character16Position.x, character16Position.z)) <= 5) ||
        (character17Position && new THREE.Vector2(playerPosition.x, playerPosition.z).distanceTo(new THREE.Vector2(character17Position.x, character17Position.z)) <= 5) ||
        (character18Position && new THREE.Vector2(playerPosition.x, playerPosition.z).distanceTo(new THREE.Vector2(character18Position.x, character18Position.z)) <= 5) ||
        (character19Position && new THREE.Vector2(playerPosition.x, playerPosition.z).distanceTo(new THREE.Vector2(character19Position.x, character19Position.z)) <= 5) ||
        (character20Position && new THREE.Vector2(playerPosition.x, playerPosition.z).distanceTo(new THREE.Vector2(character20Position.x, character20Position.z)) <= 5) ||
        (character21Position && new THREE.Vector2(playerPosition.x, playerPosition.z).distanceTo(new THREE.Vector2(character21Position.x, character21Position.z)) <= 5) ||
        (character22Position && new THREE.Vector2(playerPosition.x, playerPosition.z).distanceTo(new THREE.Vector2(character22Position.x, character22Position.z)) <= 5) ||
        (character23Position && new THREE.Vector2(playerPosition.x, playerPosition.z).distanceTo(new THREE.Vector2(character23Position.x, character23Position.z)) <= 5) ||
        (character24Position && new THREE.Vector2(playerPosition.x, playerPosition.z).distanceTo(new THREE.Vector2(character24Position.x, character24Position.z)) <= 5) ||
        (character25Position && new THREE.Vector2(playerPosition.x, playerPosition.z).distanceTo(new THREE.Vector2(character25Position.x, character25Position.z)) <= 5) ||
        (character26Position && new THREE.Vector2(playerPosition.x, playerPosition.z).distanceTo(new THREE.Vector2(character26Position.x, character26Position.z)) <= 5) ||
        (character27Position && new THREE.Vector2(playerPosition.x, playerPosition.z).distanceTo(new THREE.Vector2(character27Position.x, character27Position.z)) <= 5) ||
        (character28Position && new THREE.Vector2(playerPosition.x, playerPosition.z).distanceTo(new THREE.Vector2(character28Position.x, character28Position.z)) <= 5) ||
        (character29Position && new THREE.Vector2(playerPosition.x, playerPosition.z).distanceTo(new THREE.Vector2(character29Position.x, character29Position.z)) <= 5) ||
        (character30Position && new THREE.Vector2(playerPosition.x, playerPosition.z).distanceTo(new THREE.Vector2(character30Position.x, character30Position.z)) <= 5);
      
      if (!withinRangeOfAnyCharacter && (isDialogueActive || showDialogueSelection)) {
        if (isDialogueActive) {
          handleCloseDialogue();
        }
        if (showDialogueSelection) {
          setShowDialogueSelection(false);
        }
      }
    };

    checkDistance();
    const interval = setInterval(checkDistance, 500); // Check less frequently to reduce load
    return () => clearInterval(interval);
  }, [playerPosition, character, character2, character3, character4, character5, 
      character6, character7, character8, character9, character10, character11, character12, character13, character14, character15, character16, character17, character18, character19, character20, character21, character22, character23, character24, character25, character26, character27, character28, character29, character30,
      isDialogueActive, loadingDialogue, showDialogueSelection]);
  
  // Handle dialogue activation with proper error handling
  const handleDialogueActivation = async (characterId: number, dialogueId: number) => {
    if (isDialogueActive || loadingDialogue) return;
    
    setLoadingDialogue(true);
    setDialogueError(null);
    
    try {
      // Check if this character has phrases for the selected dialogue
      const sourceTable = `phrases_${characterId}`;
      
      const { data, error } = await supabase
        .from(sourceTable)
        .select('*')
        .eq('dialogue_id', dialogueId)
        .limit(1);
        
      if (error) {
        logger.error('Error checking dialogue data', { error, table: sourceTable, dialogueId });
        setDialogueError(`No dialogue data found for character ${characterId}, dialogue ${dialogueId}`);
        throw new Error(`Dialogue data error: ${error.message}`);
      }
      
      if (!data || data.length === 0) {
        logger.warn('No dialogue data found', { characterId, dialogueId, table: sourceTable });
        setDialogueError(`Character ${characterId} has no phrases for dialogue ${dialogueId}`);
        setTimeout(() => setDialogueError(null), 5000);
        return;
      }
      
      // If we get here, data exists so show dialogue
      setSelectedDialogueId(dialogueId);
      setIsDialogueActive(true);
      setShowDialogueSelection(false); // Hide selection panel
      logger.info('Dialogue activated', { characterId, dialogueId });
    } catch (error) {
      logger.error('Failed to activate dialogue', { error, characterId, dialogueId });
    } finally {
      setLoadingDialogue(false);
    }
  };
  
  // Add a console log to track panel visibility
  useEffect(() => {
    console.log('Dialogue selection panel visibility changed:', showDialogueSelection);
  }, [showDialogueSelection]);

  // Handle dialogue selection
  const handleDialogueSelect = (dialogueId: number) => {
    console.log('Dialogue selected in City component:', dialogueId, 'for character:', activeCharacterId);
    setAiDialogue(null); // Clear any AI dialogue
    handleDialogueActivation(activeCharacterId, dialogueId);
  };

  // Handle AI dialogue selection
  const handleAIDialogueSelect = (dialogueId: number, dialogue: AIDialogueStep[]) => {
    console.log('AI Dialogue selected in City component:', dialogueId, 'for character:', activeCharacterId);
    setAiDialogue(dialogue);
    setSelectedDialogueId(dialogueId);
    setIsDialogueActive(true);
    setShowDialogueSelection(false);
    logger.info('AI Dialogue activated', { characterId: activeCharacterId, dialogueId });
  };
  
  // Handle dialogue panel close
  const handleDialogueSelectionClose = () => {
    console.log('Closing dialogue selection panel');
    setShowDialogueSelection(false);
  };
  
  const handleCloseDialogue = () => {
    setIsDialogueActive(false);
    setAiDialogue(null); // Clear AI dialogue when closing
    logger.info('Dialogue closed');
    // Show dialogue selection again after dialogue is closed
    setShowDialogueSelection(true);
  };
  
  return (
    <div className="h-screen w-full">
      <Canvas camera={{ fov: 75 }}>
        <ambientLight intensity={0.5} />
        <directionalLight position={[10, 10, 5]} intensity={1} />
        <CityModel />
        <Player 
          onMove={setPlayerPosition} 
          mobileMovement={mobileMovement}
          mobileLook={mobileLook}
        />
        {character && (
          <Character 
            position={[character.position_x, character.position_y, character.position_z]}
            scale={[character.scale_x, character.scale_y, character.scale_z]}
            rotation={[0, character.rotation_y ?? 0, 0]}
            onInteract={() => { setActiveCharacterId(1); setShowDialogueSelection(true); }}
            isSpeaking={isNpcSpeaking && activeCharacterId === 1}
            isDialogueActive={(isDialogueActive || showDialogueSelection) && activeCharacterId === 1}
            characterId={1}
          />
        )}
        {character2 && (
          <Character 
            position={[character2.position_x, character2.position_y, character2.position_z]}
            scale={[character2.scale_x, character2.scale_y, character2.scale_z]}
            rotation={[0, character2.rotation_y ?? 0, 0]}
            onInteract={() => { setActiveCharacterId(2); setShowDialogueSelection(true); }}
            isSpeaking={isNpcSpeaking && activeCharacterId === 2}
            isDialogueActive={(isDialogueActive || showDialogueSelection) && activeCharacterId === 2}
            characterId={2}
          />
        )}
        {character3 && (
          <Character 
            position={[character3.position_x, character3.position_y, character3.position_z]}
            scale={[character3.scale_x, character3.scale_y, character3.scale_z]}
            rotation={[0, character3.rotation_y ?? 0, 0]}
            onInteract={() => { setActiveCharacterId(3); setShowDialogueSelection(true); }}
            isSpeaking={isNpcSpeaking && activeCharacterId === 3}
            isDialogueActive={(isDialogueActive || showDialogueSelection) && activeCharacterId === 3}
            characterId={3}
          />
        )}
        {character4 && (
          <Character 
            position={[character4.position_x, character4.position_y, character4.position_z]}
            scale={[character4.scale_x, character4.scale_y, character4.scale_z]}
            rotation={[0, character4.rotation_y ?? 0, 0]}
            onInteract={() => { setActiveCharacterId(4); setShowDialogueSelection(true); }}
            isSpeaking={isNpcSpeaking && activeCharacterId === 4}
            isDialogueActive={(isDialogueActive || showDialogueSelection) && activeCharacterId === 4}
            characterId={4}
          />
        )}
        {character5 && (
          <Character 
            position={[character5.position_x, character5.position_y, character5.position_z]}
            scale={[character5.scale_x, character5.scale_y, character5.scale_z]}
            rotation={[0, character5.rotation_y ?? 0, 0]}
            onInteract={() => { setActiveCharacterId(5); setShowDialogueSelection(true); }}
            isSpeaking={isNpcSpeaking && activeCharacterId === 5}
            isDialogueActive={(isDialogueActive || showDialogueSelection) && activeCharacterId === 5}
            characterId={5}
          />
        )}
        {character6 && (
          <Character 
            position={[character6.position_x, character6.position_y, character6.position_z]}
            scale={[character6.scale_x, character6.scale_y, character6.scale_z]}
            rotation={[0, character6.rotation_y ?? 0, 0]}
            onInteract={() => { setActiveCharacterId(6); setShowDialogueSelection(true); }}
            isSpeaking={isNpcSpeaking && activeCharacterId === 6}
            isDialogueActive={(isDialogueActive || showDialogueSelection) && activeCharacterId === 6}
            characterId={6}
          />
        )}
        {character7 && (
          <Character 
            position={[character7.position_x, character7.position_y, character7.position_z]}
            scale={[character7.scale_x, character7.scale_y, character7.scale_z]}
            rotation={[0, character7.rotation_y ?? 0, 0]}
            onInteract={() => { setActiveCharacterId(7); setShowDialogueSelection(true); }}
            isSpeaking={isNpcSpeaking && activeCharacterId === 7}
            isDialogueActive={(isDialogueActive || showDialogueSelection) && activeCharacterId === 7}
            characterId={7}
          />
        )}
        {character8 && (
          <Character 
            position={[character8.position_x, character8.position_y, character8.position_z]}
            scale={[character8.scale_x, character8.scale_y, character8.scale_z]}
            rotation={[0, character8.rotation_y ?? 0, 0]}
            onInteract={() => { setActiveCharacterId(8); setShowDialogueSelection(true); }}
            isSpeaking={isNpcSpeaking && activeCharacterId === 8}
            isDialogueActive={(isDialogueActive || showDialogueSelection) && activeCharacterId === 8}
            characterId={8}
          />
        )}
        {character9 && (
          <Character 
            position={[character9.position_x, character9.position_y, character9.position_z]}
            scale={[character9.scale_x, character9.scale_y, character9.scale_z]}
            rotation={[0, character9.rotation_y ?? 0, 0]}
            onInteract={() => { setActiveCharacterId(9); setShowDialogueSelection(true); }}
            isSpeaking={isNpcSpeaking && activeCharacterId === 9}
            isDialogueActive={(isDialogueActive || showDialogueSelection) && activeCharacterId === 9}
            characterId={9}
          />
        )}
        {character10 && (
          <Character 
            position={[character10.position_x, character10.position_y, character10.position_z]}
            scale={[character10.scale_x, character10.scale_y, character10.scale_z]}
            rotation={[0, character10.rotation_y ?? 0, 0]}
            onInteract={() => { setActiveCharacterId(10); setShowDialogueSelection(true); }}
            isSpeaking={isNpcSpeaking && activeCharacterId === 10}
            isDialogueActive={(isDialogueActive || showDialogueSelection) && activeCharacterId === 10}
            characterId={10}
          />
        )}
        {character11 && (
          <Character 
            position={[character11.position_x, character11.position_y, character11.position_z]}
            scale={[character11.scale_x, character11.scale_y, character11.scale_z]}
            rotation={[0, character11.rotation_y ?? 0, 0]}
            onInteract={() => { setActiveCharacterId(11); setShowDialogueSelection(true); }}
            isSpeaking={isNpcSpeaking && activeCharacterId === 11}
            isDialogueActive={(isDialogueActive || showDialogueSelection) && activeCharacterId === 11}
            characterId={11}
          />
        )}
        {character12 && (
          <Character 
            position={[character12.position_x, character12.position_y, character12.position_z]}
            scale={[character12.scale_x, character12.scale_y, character12.scale_z]}
            rotation={[0, character12.rotation_y ?? 0, 0]}
            onInteract={() => { setActiveCharacterId(12); setShowDialogueSelection(true); }}
            isSpeaking={isNpcSpeaking && activeCharacterId === 12}
            isDialogueActive={(isDialogueActive || showDialogueSelection) && activeCharacterId === 12}
            characterId={12}
          />
        )}
        {character13 && (
          <Character 
            position={[character13.position_x, character13.position_y, character13.position_z]}
            scale={[character13.scale_x, character13.scale_y, character13.scale_z]}
            rotation={[0, character13.rotation_y ?? 0, 0]}
            onInteract={() => { setActiveCharacterId(13); setShowDialogueSelection(true); }}
            isSpeaking={isNpcSpeaking && activeCharacterId === 13}
            isDialogueActive={(isDialogueActive || showDialogueSelection) && activeCharacterId === 13}
            characterId={13}
          />
        )}
        {character14 && (
          <Character 
            position={[character14.position_x, character14.position_y, character14.position_z]}
            scale={[character14.scale_x, character14.scale_y, character14.scale_z]}
            rotation={[0, character14.rotation_y ?? 0, 0]}
            onInteract={() => { setActiveCharacterId(14); setShowDialogueSelection(true); }}
            isSpeaking={isNpcSpeaking && activeCharacterId === 14}
            isDialogueActive={(isDialogueActive || showDialogueSelection) && activeCharacterId === 14}
            characterId={14}
          />
        )}
        {character15 && (
          <Character 
            position={[character15.position_x, character15.position_y, character15.position_z]}
            scale={[character15.scale_x, character15.scale_y, character15.scale_z]}
            rotation={[0, character15.rotation_y ?? 0, 0]}
            onInteract={() => { setActiveCharacterId(15); setShowDialogueSelection(true); }}
            isSpeaking={isNpcSpeaking && activeCharacterId === 15}
            isDialogueActive={(isDialogueActive || showDialogueSelection) && activeCharacterId === 15}
            characterId={15}
          />
        )}
        {character16 && (
          <Character 
            position={[character16.position_x, character16.position_y, character16.position_z]}
            scale={[character16.scale_x, character16.scale_y, character16.scale_z]}
            rotation={[0, character16.rotation_y ?? 0, 0]}
            onInteract={() => { setActiveCharacterId(16); setShowDialogueSelection(true); }}
            isSpeaking={isNpcSpeaking && activeCharacterId === 16}
            isDialogueActive={(isDialogueActive || showDialogueSelection) && activeCharacterId === 16}
            characterId={16}
          />
        )}
        {character17 && (
          <Character 
            position={[character17.position_x, character17.position_y, character17.position_z]}
            scale={[character17.scale_x, character17.scale_y, character17.scale_z]}
            rotation={[0, character17.rotation_y ?? 0, 0]}
            onInteract={() => { setActiveCharacterId(17); setShowDialogueSelection(true); }}
            isSpeaking={isNpcSpeaking && activeCharacterId === 17}
            isDialogueActive={(isDialogueActive || showDialogueSelection) && activeCharacterId === 17}
            characterId={17}
          />
        )}
        {character18 && (
          <Character 
            position={[character18.position_x, character18.position_y, character18.position_z]}
            scale={[character18.scale_x, character18.scale_y, character18.scale_z]}
            rotation={[0, character18.rotation_y ?? 0, 0]}
            onInteract={() => { setActiveCharacterId(18); setShowDialogueSelection(true); }}
            isSpeaking={isNpcSpeaking && activeCharacterId === 18}
            isDialogueActive={(isDialogueActive || showDialogueSelection) && activeCharacterId === 18}
            characterId={18}
          />
        )}
        {character19 && (
          <Character 
            position={[character19.position_x, character19.position_y, character19.position_z]}
            scale={[character19.scale_x, character19.scale_y, character19.scale_z]}
            rotation={[0, character19.rotation_y ?? 0, 0]}
            onInteract={() => { setActiveCharacterId(19); setShowDialogueSelection(true); }}
            isSpeaking={isNpcSpeaking && activeCharacterId === 19}
            isDialogueActive={(isDialogueActive || showDialogueSelection) && activeCharacterId === 19}
            characterId={19}
          />
        )}
        {character20 && (
          <Character 
            position={[character20.position_x, character20.position_y, character20.position_z]}
            scale={[character20.scale_x, character20.scale_y, character20.scale_z]}
            rotation={[0, character20.rotation_y ?? 0, 0]}
            onInteract={() => { setActiveCharacterId(20); setShowDialogueSelection(true); }}
            isSpeaking={isNpcSpeaking && activeCharacterId === 20}
            isDialogueActive={(isDialogueActive || showDialogueSelection) && activeCharacterId === 20}
            characterId={20}
          />
        )}
        {character21 && (
          <Character 
            position={[character21.position_x, character21.position_y, character21.position_z]}
            scale={[character21.scale_x, character21.scale_y, character21.scale_z]}
            rotation={[0, character21.rotation_y ?? 0, 0]}
            onInteract={() => { setActiveCharacterId(21); setShowDialogueSelection(true); }}
            isSpeaking={isNpcSpeaking && activeCharacterId === 21}
            isDialogueActive={(isDialogueActive || showDialogueSelection) && activeCharacterId === 21}
            characterId={21}
          />
        )}
        {character22 && (
          <Character 
            position={[character22.position_x, character22.position_y, character22.position_z]}
            scale={[character22.scale_x, character22.scale_y, character22.scale_z]}
            rotation={[0, character22.rotation_y ?? 0, 0]}
            onInteract={() => { setActiveCharacterId(22); setShowDialogueSelection(true); }}
            isSpeaking={isNpcSpeaking && activeCharacterId === 22}
            isDialogueActive={(isDialogueActive || showDialogueSelection) && activeCharacterId === 22}
            characterId={22}
          />
        )}
        {character23 && (
          <Character 
            position={[character23.position_x, character23.position_y, character23.position_z]}
            scale={[character23.scale_x, character23.scale_y, character23.scale_z]}
            rotation={[0, character23.rotation_y ?? 0, 0]}
            onInteract={() => { setActiveCharacterId(23); setShowDialogueSelection(true); }}
            isSpeaking={isNpcSpeaking && activeCharacterId === 23}
            isDialogueActive={(isDialogueActive || showDialogueSelection) && activeCharacterId === 23}
            characterId={23}
          />
        )}
        {character24 && (
          <Character 
            position={[character24.position_x, character24.position_y, character24.position_z]}
            scale={[character24.scale_x, character24.scale_y, character24.scale_z]}
            rotation={[0, character24.rotation_y ?? 0, 0]}
            onInteract={() => { setActiveCharacterId(24); setShowDialogueSelection(true); }}
            isSpeaking={isNpcSpeaking && activeCharacterId === 24}
            isDialogueActive={(isDialogueActive || showDialogueSelection) && activeCharacterId === 24}
            characterId={24}
          />
        )}
        {character25 && (
          <Character 
            position={[character25.position_x, character25.position_y, character25.position_z]}
            scale={[character25.scale_x, character25.scale_y, character25.scale_z]}
            rotation={[0, character25.rotation_y ?? 0, 0]}
            onInteract={() => { setActiveCharacterId(25); setShowDialogueSelection(true); }}
            isSpeaking={isNpcSpeaking && activeCharacterId === 25}
            isDialogueActive={(isDialogueActive || showDialogueSelection) && activeCharacterId === 25}
            characterId={25}
          />
        )}
        {character26 && (
          <Character 
            position={[character26.position_x, character26.position_y, character26.position_z]}
            scale={[character26.scale_x, character26.scale_y, character26.scale_z]}
            rotation={[0, character26.rotation_y ?? 0, 0]}
            onInteract={() => { setActiveCharacterId(26); setShowDialogueSelection(true); }}
            isSpeaking={isNpcSpeaking && activeCharacterId === 26}
            isDialogueActive={(isDialogueActive || showDialogueSelection) && activeCharacterId === 26}
            characterId={26}
          />
        )}
        {character27 && (
          <Character 
            position={[character27.position_x, character27.position_y, character27.position_z]}
            scale={[character27.scale_x, character27.scale_y, character27.scale_z]}
            rotation={[0, character27.rotation_y ?? 0, 0]}
            onInteract={() => { setActiveCharacterId(27); setShowDialogueSelection(true); }}
            isSpeaking={isNpcSpeaking && activeCharacterId === 27}
            isDialogueActive={(isDialogueActive || showDialogueSelection) && activeCharacterId === 27}
            characterId={27}
          />
        )}
        {character28 && (
          <Character 
            position={[character28.position_x, character28.position_y, character28.position_z]}
            scale={[character28.scale_x, character28.scale_y, character28.scale_z]}
            rotation={[0, character28.rotation_y ?? 0, 0]}
            onInteract={() => { setActiveCharacterId(28); setShowDialogueSelection(true); }}
            isSpeaking={isNpcSpeaking && activeCharacterId === 28}
            isDialogueActive={(isDialogueActive || showDialogueSelection) && activeCharacterId === 28}
            characterId={28}
          />
        )}
        {character29 && (
          <Character 
            position={[character29.position_x, character29.position_y, character29.position_z]}
            scale={[character29.scale_x, character29.scale_y, character29.scale_z]}
            rotation={[0, character29.rotation_y ?? 0, 0]}
            onInteract={() => { setActiveCharacterId(29); setShowDialogueSelection(true); }}
            isSpeaking={isNpcSpeaking && activeCharacterId === 29}
            isDialogueActive={(isDialogueActive || showDialogueSelection) && activeCharacterId === 29}
            characterId={29}
          />
        )}
        {character30 && (
          <Character 
            position={[character30.position_x, character30.position_y, character30.position_z]}
            scale={[character30.scale_x, character30.scale_y, character30.scale_z]}
            rotation={[0, character30.rotation_y ?? 0, 0]}
            onInteract={() => { setActiveCharacterId(30); setShowDialogueSelection(true); }}
            isSpeaking={isNpcSpeaking && activeCharacterId === 30}
            isDialogueActive={(isDialogueActive || showDialogueSelection) && activeCharacterId === 30}
            characterId={30}
          />
        )}
      </Canvas>
      

      
      {dialogueError && (
        <div className="fixed top-4 left-1/2 transform -translate-x-1/2 bg-red-600 text-white p-4 rounded-lg shadow-lg z-50">
          <div className="font-bold mb-1">Error</div>
          <div>{dialogueError}</div>
        </div>
      )}

      {isDialogueActive && (
        <DialogueBox
          characterId={activeCharacterId}
          onClose={handleCloseDialogue}
          distance={
            activeCharacterId === 1 ? distanceToCharacter :
            activeCharacterId === 2 ? distanceToCharacter2 :
            activeCharacterId === 3 ? distanceToCharacter3 :
            activeCharacterId === 4 ? distanceToCharacter4 :
            activeCharacterId === 5 ? distanceToCharacter5 :
            activeCharacterId === 6 ? distanceToCharacter6 :
            activeCharacterId === 7 ? distanceToCharacter7 :
            activeCharacterId === 8 ? distanceToCharacter8 :
            activeCharacterId === 9 ? distanceToCharacter9 :
            activeCharacterId === 10 ? distanceToCharacter10 :
            activeCharacterId === 11 ? distanceToCharacter11 :
            activeCharacterId === 12 ? distanceToCharacter12 :
            activeCharacterId === 13 ? distanceToCharacter13 :
            activeCharacterId === 14 ? distanceToCharacter14 :
            activeCharacterId === 15 ? distanceToCharacter15 :
            activeCharacterId === 16 ? distanceToCharacter16 :
            activeCharacterId === 17 ? distanceToCharacter17 :
            activeCharacterId === 18 ? distanceToCharacter18 :
            activeCharacterId === 19 ? distanceToCharacter19 :
            activeCharacterId === 20 ? distanceToCharacter20 :
            activeCharacterId === 21 ? distanceToCharacter21 :
            activeCharacterId === 22 ? distanceToCharacter22 :
            activeCharacterId === 23 ? distanceToCharacter23 :
            activeCharacterId === 24 ? distanceToCharacter24 :
            activeCharacterId === 25 ? distanceToCharacter25 :
            activeCharacterId === 26 ? distanceToCharacter26 :
            activeCharacterId === 27 ? distanceToCharacter27 :
            activeCharacterId === 28 ? distanceToCharacter28 :
            activeCharacterId === 29 ? distanceToCharacter29 :
            distanceToCharacter30
          }
          onNpcSpeakStart={() => setIsNpcSpeaking(true)}
          onNpcSpeakEnd={() => setIsNpcSpeaking(false)}
          dialogueId={selectedDialogueId}
          aiDialogue={aiDialogue}
        />
      )}
      
      {showDialogueSelection && !isDialogueActive && (
        <DialogueSelectionPanel
          characterId={activeCharacterId}
          onDialogueSelect={handleDialogueSelect}
          onAIDialogueSelect={handleAIDialogueSelect}
          onClose={handleDialogueSelectionClose}
        />
      )}
      
      {/* Mobile Controls - Only visible on mobile devices */}
      <MobileControls
        onMovement={setMobileMovement}
        onLook={setMobileLook}
      />
    </div>
  );
};

export default CityScene;