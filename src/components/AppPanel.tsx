import React, { ReactNode, CSSProperties } from 'react';

interface AppPanelProps {
  children: ReactNode;
  width?: number | string;
  height?: number | string;
  padding?: number;
  className?: string;
  withBackdrop?: boolean;
  withGradient?: boolean;
  withGridPattern?: boolean;
  style?: CSSProperties;
}

/**
 * AppPanel - A reusable panel component with consistent styling
 * Used for all app panels except dialogue boxes
 */
const AppPanel: React.FC<AppPanelProps> = ({
  children,
  width = 600,
  height = 'auto',
  padding = 32,
  className = '',
  withBackdrop = true,
  withGradient = true,
  withGridPattern = true,
  style = {},
}) => {
  return (
    <div
      className={`
        bg-black/50 backdrop-blur-md 
        rounded-3xl border border-white/10 
        shadow-2xl relative overflow-hidden
        ${className}
      `}
      style={{
        width,
        height,
        padding,
        ...style
      }}
    >
      {/* Background effects */}
      {withGradient && (
        <div className="absolute inset-0 bg-gradient-to-br from-blue-500/10 to-purple-500/10 pointer-events-none" />
      )}
      {withGridPattern && (
        <div className="absolute inset-0 bg-grid-pattern opacity-5 pointer-events-none" />
      )}
      
      {/* Content */}
      <div className="relative z-10">
        {children}
      </div>
    </div>
  );
};

// Also export a full-screen backdrop
interface PanelBackdropProps {
  children: ReactNode; 
  zIndex?: number;
  onClick?: (event: React.MouseEvent) => void;
  style?: CSSProperties;
  className?: string;
}

export const PanelBackdrop: React.FC<PanelBackdropProps> = ({ 
  children, 
  zIndex = 50,
  onClick,
  style = {},
  className = ''
}) => {
  const combinedStyle = { zIndex, ...style };
  
  return (
    <div 
      className={`fixed inset-0 flex items-center justify-center bg-black/30 ${className}`} 
      style={combinedStyle}
      onClick={onClick}
    >
      {children}
    </div>
  );
};

export default AppPanel; 