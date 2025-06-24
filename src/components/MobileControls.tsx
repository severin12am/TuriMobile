import React, { useEffect, useRef, useState, useCallback } from 'react';
import * as THREE from 'three';
import './MobileControls.css';

interface JoystickData {
  x: number;
  y: number;
  distance: number;
  angle: number;
}

interface MobileControlsProps {
  onMovement: (movement: { x: number, z: number }) => void;
  onLook: (look: { x: number, y: number }) => void;
}

const MobileControls: React.FC<MobileControlsProps> = ({ onMovement, onLook }) => {
  const [isMobile, setIsMobile] = useState(false);
  const [showOrientationPrompt, setShowOrientationPrompt] = useState(false);
  
  const leftJoystickRef = useRef<HTMLDivElement>(null);
  const rightJoystickRef = useRef<HTMLDivElement>(null);
  const leftKnobRef = useRef<HTMLDivElement>(null);
  const rightKnobRef = useRef<HTMLDivElement>(null);
  
  const leftJoystickData = useRef<JoystickData>({ x: 0, y: 0, distance: 0, angle: 0 });
  const rightJoystickData = useRef<JoystickData>({ x: 0, y: 0, distance: 0, angle: 0 });
  
  const isLeftActive = useRef(false);
  const isRightActive = useRef(false);
  
  const leftCenter = useRef({ x: 0, y: 0 });
  const rightCenter = useRef({ x: 0, y: 0 });

  // Check if device is mobile
  useEffect(() => {
    const checkMobile = () => {
      const userAgent = navigator.userAgent.toLowerCase();
      const isMobileDevice = /android|webos|iphone|ipad|ipod|blackberry|iemobile|opera mini/i.test(userAgent);
      const isTouchDevice = 'ontouchstart' in window || navigator.maxTouchPoints > 0;
      const isSmallScreen = window.innerWidth <= 768;
      
      return isMobileDevice || (isTouchDevice && isSmallScreen);
    };

    const mobile = checkMobile();
    setIsMobile(mobile);
    
    if (mobile) {
      checkOrientation();
      // Prevent default touch behaviors on mobile
      document.body.classList.add('mobile-controls-active');
      document.body.style.touchAction = 'none';
    } else {
      document.body.classList.remove('mobile-controls-active');
      document.body.style.touchAction = 'auto';
    }

    const handleResize = () => {
      const mobile = checkMobile();
      setIsMobile(mobile);
      if (mobile) {
        checkOrientation();
      }
    };

    const handleOrientationChange = () => {
      setTimeout(() => {
        if (isMobile) {
          checkOrientation();
        }
      }, 100);
    };

    window.addEventListener('resize', handleResize);
    window.addEventListener('orientationchange', handleOrientationChange);
    
    return () => {
      window.removeEventListener('resize', handleResize);
      window.removeEventListener('orientationchange', handleOrientationChange);
      // Cleanup mobile controls
      document.body.classList.remove('mobile-controls-active');
      document.body.style.touchAction = 'auto';
    };
  }, [isMobile]);

  const checkOrientation = () => {
    const isPortrait = window.innerHeight > window.innerWidth;
    setShowOrientationPrompt(isPortrait);
  };

  const calculateJoystickData = (centerX: number, centerY: number, currentX: number, currentY: number, maxDistance: number): JoystickData => {
    const deltaX = currentX - centerX;
    const deltaY = currentY - centerY;
    const distance = Math.sqrt(deltaX * deltaX + deltaY * deltaY);
    const clampedDistance = Math.min(distance, maxDistance);
    const angle = Math.atan2(deltaY, deltaX);
    
    const normalizedX = clampedDistance > 0 ? (deltaX / distance) * (clampedDistance / maxDistance) : 0;
    const normalizedY = clampedDistance > 0 ? (deltaY / distance) * (clampedDistance / maxDistance) : 0;
    
    return {
      x: normalizedX,
      y: normalizedY,
      distance: clampedDistance,
      angle: angle
    };
  };

  const updateJoystickPosition = (knobElement: HTMLDivElement, data: JoystickData, maxDistance: number) => {
    const clampedX = data.x * maxDistance;
    const clampedY = data.y * maxDistance;
    knobElement.style.transform = `translate(${clampedX}px, ${clampedY}px)`;
  };

  const handleTouchStart = useCallback((event: TouchEvent, isLeft: boolean) => {
    event.preventDefault();
    const touch = event.touches[0];
    const joystickElement = isLeft ? leftJoystickRef.current : rightJoystickRef.current;
    
    if (!joystickElement) return;
    
    const rect = joystickElement.getBoundingClientRect();
    const centerX = rect.left + rect.width / 2;
    const centerY = rect.top + rect.height / 2;
    
    if (isLeft) {
      isLeftActive.current = true;
      leftCenter.current = { x: centerX, y: centerY };
    } else {
      isRightActive.current = true;
      rightCenter.current = { x: centerX, y: centerY };
    }
  }, []);

  const handleTouchMove = useCallback((event: TouchEvent, isLeft: boolean) => {
    event.preventDefault();
    const touch = event.touches[0];
    const maxDistance = 35; // 70% of standard joystick size
    
    if (isLeft && isLeftActive.current) {
      const data = calculateJoystickData(
        leftCenter.current.x,
        leftCenter.current.y,
        touch.clientX,
        touch.clientY,
        maxDistance
      );
      
      leftJoystickData.current = data;
      
      if (leftKnobRef.current) {
        updateJoystickPosition(leftKnobRef.current, data, maxDistance);
      }
      
      // Send movement data (inverted Y for correct movement)
      onMovement({ x: data.x, z: -data.y });
      
    } else if (!isLeft && isRightActive.current) {
      const data = calculateJoystickData(
        rightCenter.current.x,
        rightCenter.current.y,
        touch.clientX,
        touch.clientY,
        maxDistance
      );
      
      rightJoystickData.current = data;
      
      if (rightKnobRef.current) {
        updateJoystickPosition(rightKnobRef.current, data, maxDistance);
      }
      
      // Send look data (camera rotation)
      onLook({ x: data.x * 2, y: -data.y * 2 }); // Multiply for sensitivity
    }
  }, [onMovement, onLook]);

  const handleTouchEnd = useCallback((event: TouchEvent, isLeft: boolean) => {
    event.preventDefault();
    
    if (isLeft) {
      isLeftActive.current = false;
      leftJoystickData.current = { x: 0, y: 0, distance: 0, angle: 0 };
      if (leftKnobRef.current) {
        leftKnobRef.current.style.transform = 'translate(0px, 0px)';
      }
      onMovement({ x: 0, z: 0 });
    } else {
      isRightActive.current = false;
      rightJoystickData.current = { x: 0, y: 0, distance: 0, angle: 0 };
      if (rightKnobRef.current) {
        rightKnobRef.current.style.transform = 'translate(0px, 0px)';
      }
      onLook({ x: 0, y: 0 });
    }
  }, [onMovement, onLook]);

  useEffect(() => {
    if (!isMobile) return;

    const leftJoystick = leftJoystickRef.current;
    const rightJoystick = rightJoystickRef.current;

    if (!leftJoystick || !rightJoystick) return;

    const leftTouchStart = (e: TouchEvent) => handleTouchStart(e, true);
    const leftTouchMove = (e: TouchEvent) => handleTouchMove(e, true);
    const leftTouchEnd = (e: TouchEvent) => handleTouchEnd(e, true);

    const rightTouchStart = (e: TouchEvent) => handleTouchStart(e, false);
    const rightTouchMove = (e: TouchEvent) => handleTouchMove(e, false);
    const rightTouchEnd = (e: TouchEvent) => handleTouchEnd(e, false);

    leftJoystick.addEventListener('touchstart', leftTouchStart, { passive: false });
    leftJoystick.addEventListener('touchmove', leftTouchMove, { passive: false });
    leftJoystick.addEventListener('touchend', leftTouchEnd, { passive: false });

    rightJoystick.addEventListener('touchstart', rightTouchStart, { passive: false });
    rightJoystick.addEventListener('touchmove', rightTouchMove, { passive: false });
    rightJoystick.addEventListener('touchend', rightTouchEnd, { passive: false });

    return () => {
      leftJoystick.removeEventListener('touchstart', leftTouchStart);
      leftJoystick.removeEventListener('touchmove', leftTouchMove);
      leftJoystick.removeEventListener('touchend', leftTouchEnd);

      rightJoystick.removeEventListener('touchstart', rightTouchStart);
      rightJoystick.removeEventListener('touchmove', rightTouchMove);
      rightJoystick.removeEventListener('touchend', rightTouchEnd);
    };
  }, [isMobile, handleTouchStart, handleTouchMove, handleTouchEnd]);

  if (!isMobile) {
    return null; // Don't render anything on desktop
  }

  return (
    <>
      {/* Orientation Prompt */}
      {showOrientationPrompt && (
        <div className="mobile-orientation-prompt">
          <div className="orientation-content">
            <div className="phone-icon">📱</div>
            <h3>Rotate Your Device</h3>
            <p>Please rotate your device to landscape mode for the best gaming experience.</p>
            <div className="rotate-icon">🔄</div>
          </div>
        </div>
      )}

      {/* Mobile Joysticks */}
      <div className="mobile-controls">
        {/* Left Joystick - Movement */}
        <div 
          ref={leftJoystickRef}
          className="joystick left-joystick"
        >
          <div 
            ref={leftKnobRef}
            className="joystick-knob"
          />
          <div className="joystick-label">Move</div>
        </div>

        {/* Right Joystick - Look */}
        <div 
          ref={rightJoystickRef}
          className="joystick right-joystick"
        >
          <div 
            ref={rightKnobRef}
            className="joystick-knob"
          />
          <div className="joystick-label">Look</div>
        </div>
      </div>


    </>
  );
};

export default MobileControls; 