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
useGLTF.preload('/models/character6.glb');
useGLTF.preload('/models/character7.glb');
useGLTF.preload('/models/character8.glb');
useGLTF.preload('/models/character9.glb');
useGLTF.preload('/models/character10.glb');

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

const Player: React.FC<{ onMove: (position: THREE.Vector3) => void }> = ({ onMove }) => {
  const { camera } = useThree();
  const isMovementDisabled = useStore(state => state.isMovementDisabled);
  const moveSpeed = 0.15;
  const rotateSpeed = 0.002;
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
    
    if (keys['keyw'] || keys['arrowup']) movement.add(forward);
    if (keys['keys'] || keys['arrowdown']) movement.sub(forward);
    if (keys['keyd'] || keys['arrowright']) movement.add(right);
    if (keys['keya'] || keys['arrowleft']) movement.sub(right);
    
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
  const [loadingDialogue, setLoadingDialogue] = useState(false);
  const [dialogueError, setDialogueError] = useState<string | null>(null);
  const [isNpcSpeaking, setIsNpcSpeaking] = useState(false);
  const [activeCharacterId, setActiveCharacterId] = useState<number>(1);
  
  // Add new state for dialogue selection
  const [showDialogueSelection, setShowDialogueSelection] = useState(false);
  const [selectedDialogueId, setSelectedDialogueId] = useState<number>(1);

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
      scale_x: 0.2,
      scale_y: 0.2,
      scale_z: 0.2,
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
      position_x: -4,
      position_y: 0,
      position_z: -40,
      scale_x: 1.2,
      scale_y: 1.2,
      scale_z: 1.2,
      rotation_y: Math.PI * 1.5, // Default forward facing
      is_active: true
    } as CharacterType);
  }, []);

  // Calculate distance between player and characters
  useEffect(() => {
    if (!character && !character2 && !character3 && !character4 && !character5 && 
        !character6 && !character7 && !character8 && !character9 && !character10) return;

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
        (character10Position && new THREE.Vector2(playerPosition.x, playerPosition.z).distanceTo(new THREE.Vector2(character10Position.x, character10Position.z)) <= 5);
      
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
      character6, character7, character8, character9, character10, 
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
    handleDialogueActivation(activeCharacterId, dialogueId);
  };
  
  // Handle dialogue panel close
  const handleDialogueSelectionClose = () => {
    console.log('Closing dialogue selection panel');
    setShowDialogueSelection(false);
  };
  
  const handleCloseDialogue = () => {
    setIsDialogueActive(false);
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
        <Player onMove={setPlayerPosition} />
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
      </Canvas>
      
      <CoordinateTracker position={playerPosition} />
      
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
            distanceToCharacter10
          }
          onNpcSpeakStart={() => setIsNpcSpeaking(true)}
          onNpcSpeakEnd={() => setIsNpcSpeaking(false)}
          dialogueId={selectedDialogueId}
        />
      )}
      
      {showDialogueSelection && !isDialogueActive && (
        <DialogueSelectionPanel
          characterId={activeCharacterId}
          onDialogueSelect={handleDialogueSelect}
          onClose={handleDialogueSelectionClose}
        />
      )}
    </div>
  );
};

export default CityScene;