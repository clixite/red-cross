import React from 'react';

/**
 * Logo neutre et original du portail — monogramme « goutte de sang » stylisé.
 * Aucun emblème protégé (Conventions de Genève) ni charte d'organisation réelle.
 * Couleurs issues des jetons de design brand (paramétrables via CSS variables).
 */
export const Logo: React.FC<{ size?: number; className?: string }> = ({ size = 36, className }) => {
  return (
    <svg
      width={size}
      height={size}
      viewBox="0 0 64 64"
      role="img"
      aria-label="Logo SFS — Service du Sang"
      className={className}
    >
      <defs>
        <linearGradient id="sfsLogoGrad" x1="0" y1="0" x2="1" y2="1">
          <stop offset="0%" stopColor="var(--brand-500, #2563eb)" />
          <stop offset="100%" stopColor="var(--brand-700, #1e40af)" />
        </linearGradient>
      </defs>

      {/* Badge arrondi */}
      <rect width="64" height="64" rx="14" fill="url(#sfsLogoGrad)" />

      {/* Goutte stylisée (symbole transfusionnel générique) */}
      <path
        d="M32 11.5 C 32 11.5, 16.5 30, 16.5 39.5 A 15.5 15.5 0 0 0 47.5 39.5 C 47.5 30, 32 11.5, 32 11.5 Z"
        fill="#ffffff"
      />

      {/* Reflet de la goutte */}
      <ellipse cx="26.5" cy="34" rx="4" ry="7.5" fill="#ffffff" opacity="0.35" transform="rotate(28 26.5 34)" />

      {/* Micro-goutte interne (profondeur) */}
      <path
        d="M32 31.5 C 32 31.5, 26 39, 26 43.5 A 6 6 0 0 0 38 43.5 C 38 39, 32 31.5, 32 31.5 Z"
        fill="var(--brand-600, #1d4ed8)"
        opacity="0.85"
      />
    </svg>
  );
};
