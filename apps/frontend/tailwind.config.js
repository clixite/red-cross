/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
        brand: {
          50: 'var(--brand-50, #eff6ff)',
          100: 'var(--brand-100, #dbeafe)',
          500: 'var(--brand-500, #2563eb)',
          600: 'var(--brand-600, #1d4ed8)',
          700: 'var(--brand-700, #1e40af)',
          900: 'var(--brand-900, #1e3a8a)',
        },
        slate: {
          850: '#151f32',
          950: '#0b1120',
        },
      },
    },
  },
  plugins: [],
};
