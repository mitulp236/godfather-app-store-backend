/** @type {import('tailwindcss').Config} */
export default {
  content: ['./public/admin/**/*.html', './public/admin/**/*.js'],
  theme: {
    extend: {
      colors: {
        ink: {
          950: '#070406',
          900: '#0b0709',
          850: '#110b0e',
          800: '#170f13',
          700: '#221619',
          600: '#312125',
        },
        blood: {
          900: '#4a0710',
          800: '#6d0a16',
          700: '#8f0f1f',
          600: '#b3121f',
          500: '#d81f2c',
          400: '#e94452',
          300: '#f4757f',
        },
        gold: {
          500: '#c9a227',
          400: '#e0bd4e',
          300: '#f0d786',
        },
      },
      fontFamily: {
        display: ['"Playfair Display"', 'Georgia', 'serif'],
        sans: ['Inter', 'system-ui', '-apple-system', 'Segoe UI', 'Roboto', 'sans-serif'],
      },
      keyframes: {
        'fade-up': {
          from: { opacity: '0', transform: 'translate3d(0, 10px, 0)' },
          to: { opacity: '1', transform: 'translate3d(0, 0, 0)' },
        },
        'fade-in': { from: { opacity: '0' }, to: { opacity: '1' } },
      },
      animation: {
        'fade-up': 'fade-up 260ms cubic-bezier(0.2, 0.9, 0.3, 1) both',
        'fade-in': 'fade-in 200ms ease-out both',
      },
    },
  },
  plugins: [],
};
