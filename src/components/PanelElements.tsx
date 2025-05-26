import React, { ReactNode, ButtonHTMLAttributes, forwardRef } from 'react';

interface PanelTitleProps {
  children: ReactNode;
  className?: string;
  withAnimation?: boolean;
}

/**
 * Panel title with optional animation effect
 */
export const PanelTitle: React.FC<PanelTitleProps> = ({ 
  children, 
  className = '', 
  withAnimation = false 
}) => {
  return (
    <div style={{ marginBottom: 24 }} className="relative">
      <div className="absolute -left-4 -top-4 w-2 h-2 bg-blue-400 rounded-full animate-ping" />
      <div className="absolute -right-4 -bottom-4 w-2 h-2 bg-purple-400 rounded-full animate-ping delay-500" />
      <h2 className={`panel-heading ${withAnimation ? 'animate-glitch' : ''} text-shadow-neon ${className}`}>
        {children}
      </h2>
    </div>
  );
};

interface PanelButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: 'primary' | 'secondary';
  children: ReactNode;
  className?: string;
}

/**
 * Panel button with consistent styling
 */
export const PanelButton = forwardRef<HTMLButtonElement, PanelButtonProps>(({ 
  variant = 'secondary', 
  children, 
  className = '',
  ...props 
}, ref) => {
  const baseClass = variant === 'primary' ? 'panel-btn-primary' : 'panel-btn';
  
  return (
    <button ref={ref} className={`${baseClass} ${className}`} {...props}>
      {children}
    </button>
  );
});

PanelButton.displayName = 'PanelButton';

interface PanelInputProps extends React.InputHTMLAttributes<HTMLInputElement> {
  label?: string;
  className?: string;
}

/**
 * Panel input with consistent styling
 */
export const PanelInput: React.FC<PanelInputProps> = ({ 
  label, 
  className = '', 
  ...props 
}) => {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-white/80 text-sm font-medium mb-2">
          {label}
        </label>
      )}
      <input 
        className={`panel-input ${className}`}
        {...props} 
      />
    </div>
  );
};

interface PanelSelectProps extends React.SelectHTMLAttributes<HTMLSelectElement> {
  label?: string;
  options: { value: string; label: string; disabled?: boolean }[];
  className?: string;
}

/**
 * Panel select input with consistent styling
 */
export const PanelSelect: React.FC<PanelSelectProps> = ({ 
  label, 
  options, 
  className = '', 
  ...props 
}) => {
  return (
    <div className="mb-4">
      {label && (
        <label className="block text-white/80 text-sm font-medium mb-2">
          {label}
        </label>
      )}
      <select 
        className={`panel-input ${className}`}
        {...props}
      >
        {options.map(option => (
          <option 
            key={option.value} 
            value={option.value}
            disabled={option.disabled}
            className="bg-gray-900"
          >
            {option.label}
          </option>
        ))}
      </select>
    </div>
  );
};

interface PanelDotProps {
  color?: 'blue' | 'purple';
  ping?: boolean;
  className?: string;
}

/**
 * Animated dot for visual feedback
 */
export const PanelDot: React.FC<PanelDotProps> = ({ 
  color = 'blue', 
  ping = false,
  className = ''
}) => {
  const colorClass = color === 'blue' ? 'panel-dot-blue' : 'panel-dot-purple';
  
  if (ping) {
    return <span className={`panel-dot-ping ${colorClass} ${className}`} />;
  }
  
  return <span className={`panel-dot ${colorClass} ${className}`} />;
}; 