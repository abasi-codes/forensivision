import { cn } from '@/lib/utils';

interface LogoProps {
  size?: number;
  color?: string;
  variant?: 'default' | 'white' | 'dark';
  className?: string;
}

export function Logo({
  size = 32,
  color,
  variant = 'default',
  className = ''
}: LogoProps) {
  // Determine colors based on variant
  let shieldColor: string;
  let eyeIrisColor: string;

  if (color) {
    shieldColor = color;
    eyeIrisColor = color;
  } else {
    switch (variant) {
      case 'white':
        shieldColor = 'white';
        eyeIrisColor = '#2563EB';
        break;
      case 'dark':
        shieldColor = '#1e293b';
        eyeIrisColor = '#1e293b';
        break;
      default:
        shieldColor = 'currentColor';
        eyeIrisColor = 'currentColor';
    }
  }

  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 80 80"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
      className={cn('text-primary', className)}
      aria-label="ForensiVision Logo"
    >
      {/* Shield shape */}
      <path
        d="M40 4 L72 16 L72 40 C72 58 56 72 40 76 C24 72 8 58 8 40 L8 16 Z"
        fill={shieldColor}
      />
      {/* Eye white */}
      <ellipse cx="40" cy="40" rx="20" ry="12" fill="white"/>
      {/* Eye iris */}
      <circle cx="40" cy="40" r="8" fill={eyeIrisColor}/>
      {/* Eye pupil/highlight */}
      <circle cx="40" cy="40" r="4" fill="white"/>
      {/* Subtle scan line through eye */}
      <line
        x1="16"
        y1="40"
        x2="64"
        y2="40"
        stroke="white"
        strokeWidth="1"
        opacity="0.5"
      />
    </svg>
  );
}

export default Logo;
