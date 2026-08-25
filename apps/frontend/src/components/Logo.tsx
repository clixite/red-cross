import React from 'react';

/**
 * Logo du portail — croix rouge stylisée sur badge blanc.
 * Reprend le code visuel universel du secours (croix rouge sur fond blanc),
 * couleurs paramétrables via les jetons CSS --brand-red-* et --brand-border.
 */
export const Logo: React.FC<{ size?: number; className?: string }> = ({ size = 36, className }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Logo Croix-Rouge — Service du Sang"
      className={className}
    >
      <defs>
        <linearGradient id="sfsLogoRed" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--brand-red-500, #ef4444)" />
          <stop offset="100%" stopColor="var(--brand-red-700, #b91c1c)" />
        </linearGradient>
      </defs>

      {/* Badge blanc arrondi avec bordure fine (lisible sur fond clair et sombre) */}
      <rect width="64" height="64" rx="14" fill="#ffffff" />
      <rect width="64" height="64" rx="14" fill="none" stroke="var(--brand-border, #e2e8f0)" strokeWidth="2" />

      {/* Croix rouge — bras égaux, centrée */}
      <path
        d="M26 12 H38 V26 H52 V38 H38 V52 H26 V38 H12 V26 H26 Z"
        fill="url(#sfsLogoRed)"
      />
    </svg>
  );
};
