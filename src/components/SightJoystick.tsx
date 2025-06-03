import React, { useRef, useEffect, useState, useCallback } from 'react';
import { useStore } from '../store';

interface SightJoystickProps {
  onRotate: (rotation: { x: number; y: number }) => void;
  size?: number;
  deadZone?: number;
}

const SightJoystick: React.FC<SightJoystickProps> = ({ 
  onRotate, 
  size = 120, 
  deadZone = 0.1 
}) => {
  const containerRef = useRef<HTMLDivElement>(null);
  const knobRef = useRef<HTMLDivElement>(null);
  const [isDragging, setIsDragging] = useState(false);
  const [position, setPosition] = useState({ x: 0, y: 0 });
  const isMovementDisabled = useStore(state => state.isMovementDisabled);
  
  // Check if device is mobile
  const isMobile = /Android|webOS|iPhone|iPad|iPod|BlackBerry|IEMobile|Opera Mini/i.test(navigator.userAgent) || 
                   ('ontouchstart' in window) || 
                   (navigator.maxTouchPoints > 0);

  const handleStart = useCallback((clientX: number, clientY: number) => {
    if (isMovementDisabled || !isMobile) return;
    
    setIsDragging(true);
    const container = containerRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxDistance = size / 2 - 20; // Account for knob size
    
    if (distance <= maxDistance) {
      setPosition({ x: deltaX, y: deltaY });
      
      // Convert to rotation direction
      const normalizedX = deltaX / maxDistance;
      const normalizedY = deltaY / maxDistance;
      
      // Apply dead zone
      if (Math.abs(normalizedX) > deadZone || Math.abs(normalizedY) > deadZone) {
        onRotate({ x: normalizedY, y: normalizedX }); // Y controls vertical rotation, X controls horizontal
      }
    }
  }, [isMovementDisabled, isMobile, size, deadZone, onRotate]);

  const handleMove = useCallback((clientX: number, clientY: number) => {
    if (!isDragging || isMovementDisabled || !isMobile) return;
    
    const container = containerRef.current;
    if (!container) return;
    
    const rect = container.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const deltaX = clientX - centerX;
    const deltaY = clientY - centerY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxDistance = size / 2 - 20;
    
    let finalX = deltaX;
    let finalY = deltaY;
    
    if (distance > maxDistance) {
      const angle = Math.atan2(deltaY, deltaX);
      finalX = Math.cos(angle) * maxDistance;
      finalY = Math.sin(angle) * maxDistance;
    }
    
    setPosition({ x: finalX, y: finalY });
    
    // Convert to rotation direction
    const normalizedX = finalX / maxDistance;
    const normalizedY = finalY / maxDistance;
    
    // Apply dead zone
    if (Math.abs(normalizedX) > deadZone || Math.abs(normalizedY) > deadZone) {
      onRotate({ x: normalizedY, y: normalizedX }); // Y controls vertical rotation, X controls horizontal
    } else {
      onRotate({ x: 0, y: 0 });
    }
  }, [isDragging, isMovementDisabled, isMobile, size, deadZone, onRotate]);

  const handleEnd = useCallback(() => {
    if (!isMobile) return;
    
    setIsDragging(false);
    setPosition({ x: 0, y: 0 });
    onRotate({ x: 0, y: 0 });
  }, [isMobile, onRotate]);

  // Touch event handlers
  const handleTouchStart = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleStart(touch.clientX, touch.clientY);
  };

  const handleTouchMove = (e: React.TouchEvent) => {
    e.preventDefault();
    const touch = e.touches[0];
    handleMove(touch.clientX, touch.clientY);
  };

  const handleTouchEnd = (e: React.TouchEvent) => {
    e.preventDefault();
    handleEnd();
  };

  // Mouse event handlers (for testing on desktop)
  const handleMouseDown = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!containerRef.current) return;
    
    setIsDragging(true);
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const deltaX = e.clientX - centerX;
    const deltaY = e.clientY - centerY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxDistance = (size / 2) - 20;
    
    if (distance <= maxDistance) {
      setPosition({ x: deltaX, y: deltaY });
      
      const normalizedX = deltaX / maxDistance;
      const normalizedY = deltaY / maxDistance;
      
      if (Math.abs(normalizedX) > deadZone || Math.abs(normalizedY) > deadZone) {
        onRotate({ x: normalizedY, y: normalizedX });
      }
    }
  }, [size, deadZone, onRotate]);

  const handleMouseMove = useCallback((e: React.MouseEvent<HTMLDivElement>) => {
    if (!isDragging || !containerRef.current) return;
    
    const rect = containerRef.current.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    const deltaX = e.clientX - centerX;
    const deltaY = e.clientY - centerY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const maxDistance = (size / 2) - 20;
    
    let newX = deltaX;
    let newY = deltaY;
    
    if (distance > maxDistance) {
      const angle = Math.atan2(deltaY, deltaX);
      newX = Math.cos(angle) * maxDistance;
      newY = Math.sin(angle) * maxDistance;
    }
    
    setPosition({ x: newX, y: newY });
    
    const normalizedX = newX / maxDistance;
    const normalizedY = newY / maxDistance;
    
    if (Math.abs(normalizedX) > deadZone || Math.abs(normalizedY) > deadZone) {
      onRotate({ x: normalizedY, y: normalizedX });
    } else {
      onRotate({ x: 0, y: 0 });
    }
  }, [isDragging, size, deadZone, onRotate]);

  const handleMouseUp = useCallback(() => {
    setIsDragging(false);
    setPosition({ x: 0, y: 0 });
    onRotate({ x: 0, y: 0 });
  }, [onRotate]);

  // Only render on mobile devices
  if (!isMobile) {
    return null;
  }

  return (
    <div 
      className="sight-joystick-container"
      style={{
        position: 'fixed',
        bottom: '20px',
        right: '20px',
        width: `${size}px`,
        height: `${size}px`,
        zIndex: 1000,
        pointerEvents: isMovementDisabled ? 'none' : 'auto',
        opacity: isMovementDisabled ? 0.3 : 1,
        transition: 'opacity 0.3s ease'
      }}
    >
      <div
        ref={containerRef}
        className="joystick-base"
        style={{
          width: '100%',
          height: '100%',
          borderRadius: '50%',
          backgroundColor: 'rgba(255, 255, 255, 0.2)',
          border: '3px solid rgba(255, 255, 255, 0.4)',
          position: 'relative',
          cursor: 'pointer',
          boxShadow: '0 4px 12px rgba(0, 0, 0, 0.3)',
          backdropFilter: 'blur(10px)',
          WebkitBackdropFilter: 'blur(10px)'
        }}
        onTouchStart={handleTouchStart}
        onTouchMove={handleTouchMove}
        onTouchEnd={handleTouchEnd}
        onMouseDown={handleMouseDown}
        onMouseMove={handleMouseMove}
        onMouseUp={handleMouseUp}
        onMouseLeave={handleMouseUp}
      >
        <div
          ref={knobRef}
          className="joystick-knob"
          style={{
            width: '40%',
            height: '40%',
            borderRadius: '50%',
            backgroundColor: isDragging ? 'rgba(255, 255, 255, 0.9)' : 'rgba(255, 255, 255, 0.7)',
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: `translate(-50%, -50%) translate(${position.x}px, ${position.y}px)`,
            transition: isDragging ? 'none' : 'all 0.2s ease',
            boxShadow: '0 2px 8px rgba(0, 0, 0, 0.4)',
            border: '2px solid rgba(255, 255, 255, 0.8)'
          }}
        />
        
        {/* Eye icon in center to indicate sight control */}
        <div
          style={{
            position: 'absolute',
            top: '50%',
            left: '50%',
            transform: 'translate(-50%, -50%)',
            color: 'rgba(255, 255, 255, 0.6)',
            fontSize: '16px',
            fontWeight: 'bold',
            pointerEvents: 'none'
          }}
        >
          👁️
        </div>
        
        {/* Direction indicators */}
        <div
          style={{
            position: 'absolute',
            top: '8%',
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '10px',
            fontWeight: 'bold',
            pointerEvents: 'none'
          }}
        >
          ↑
        </div>
        <div
          style={{
            position: 'absolute',
            bottom: '8%',
            left: '50%',
            transform: 'translateX(-50%)',
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '10px',
            fontWeight: 'bold',
            pointerEvents: 'none'
          }}
        >
          ↓
        </div>
        <div
          style={{
            position: 'absolute',
            left: '8%',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '10px',
            fontWeight: 'bold',
            pointerEvents: 'none'
          }}
        >
          ←
        </div>
        <div
          style={{
            position: 'absolute',
            right: '8%',
            top: '50%',
            transform: 'translateY(-50%)',
            color: 'rgba(255, 255, 255, 0.5)',
            fontSize: '10px',
            fontWeight: 'bold',
            pointerEvents: 'none'
          }}
        >
          →
        </div>
      </div>
    </div>
  );
};

export default SightJoystick; 