import React from 'react';
import * as THREE from 'three';

interface CoordinateTrackerProps {
  position: THREE.Vector3;
}

const CoordinateTracker: React.FC<CoordinateTrackerProps> = ({ position }) => {
  return (
    <div className="fixed top-4 right-4 bg-black/70 text-white p-4 rounded-lg font-mono text-sm">
      <div>X: {position.x.toFixed(2)}</div>
      <div>Y: {position.y.toFixed(2)}</div>
      <div>Z: {position.z.toFixed(2)}</div>
    </div>
  );
};

export default CoordinateTracker; 