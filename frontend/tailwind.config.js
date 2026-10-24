/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        cream: {
          50: '#FDFCF7',
          100: '#FAF7F2',
          200: '#F4EFE6',
          300: '#ECE3D4',
        },
        beige: {
          50: '#FDFBF7',
          100: '#F8F4EC',
          200: '#EFE7DA',
          300: '#E2D5C1',
          400: '#C9B69B',
          500: '#AF9674',
        },
        brown: {
          50: '#F9F6F0',
          100: '#EFE7DB',
          200: '#DACBBB',
          300: '#BFAB94',
          400: '#A48B6F',
          500: '#8A6E50',
          600: '#6F553D',
          700: '#543F2D',
          800: '#3D2D20',
          900: '#271D14',
        },
        vault: {
          bg: '#FAF7F2',
          surface: '#FFFFFF',
          card: '#FFFFFF',
          border: '#E8E1D5',
          text: '#2C2523',
          muted: '#736B63',
          accent: '#7D5A44',
          accentHover: '#654632',
        },
      },
      fontFamily: {
        sans: ['Inter', 'system-ui', '-apple-system', 'sans-serif'],
      },
      boxShadow: {
        soft: '0 2px 10px rgba(74, 53, 37, 0.04), 0 1px 3px rgba(74, 53, 37, 0.02)',
        card: '0 4px 20px -2px rgba(74, 53, 37, 0.06), 0 2px 6px -1px rgba(74, 53, 37, 0.03)',
        modal: '0 20px 40px -4px rgba(44, 37, 35, 0.15)',
      },
    },
  },
  plugins: [],
};
