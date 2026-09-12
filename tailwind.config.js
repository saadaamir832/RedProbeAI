/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Outfit', 'system-ui', 'sans-serif'],
        mono: ['JetBrains Mono', 'ui-monospace', 'monospace'],
      },
      colors: {
        ink: {
          950: '#05070a',
          900: '#080b10',
          850: '#0b0f15',
          800: '#0f141c',
          750: '#131924',
          700: '#1a212e',
          600: '#273141',
          500: '#3a4658',
        },
        cyber: {
          50: '#e6fff6',
          100: '#b3ffe0',
          200: '#80ffc9',
          300: '#4dffb3',
          400: '#1aff9c',
          500: '#00e5a0',
          600: '#00b380',
          700: '#00805c',
          800: '#004d38',
          900: '#00261c',
        },
        signal: {
          500: '#00c2ff',
          600: '#0099cc',
        },
      },
      keyframes: {
        scanline: {
          '0%': { transform: 'translateY(-100%)' },
          '100%': { transform: 'translateY(100%)' },
        },
        pulseGlow: {
          '0%,100%': { opacity: '0.5' },
          '50%': { opacity: '1' },
        },
        fadeUp: {
          '0%': { opacity: '0', transform: 'translateY(10px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        fadeIn: {
          '0%': { opacity: '0' },
          '100%': { opacity: '1' },
        },
        blink: {
          '0%,100%': { opacity: '1' },
          '50%': { opacity: '0.2' },
        },
        sweep: {
          '0%': { transform: 'rotate(0deg)' },
          '100%': { transform: 'rotate(360deg)' },
        },
        shimmer: {
          '0%': { backgroundPosition: '-200% 0' },
          '100%': { backgroundPosition: '200% 0' },
        },
        slideIn: {
          '0%': { opacity: '0', transform: 'translateX(-12px)' },
          '100%': { opacity: '1', transform: 'translateX(0)' },
        },
        scaleIn: {
          '0%': { opacity: '0', transform: 'scale(0.96)' },
          '100%': { opacity: '1', transform: 'scale(1)' },
        },
        barGrow: {
          '0%': { transform: 'scaleY(0)', transformOrigin: 'bottom' },
          '100%': { transform: 'scaleY(1)', transformOrigin: 'bottom' },
        },
      },
      animation: {
        scanline: 'scanline 6s linear infinite',
        pulseGlow: 'pulseGlow 2.4s ease-in-out infinite',
        fadeUp: 'fadeUp 0.4s ease-out both',
        fadeIn: 'fadeIn 0.3s ease-out both',
        blink: 'blink 1.6s ease-in-out infinite',
        sweep: 'sweep 4s linear infinite',
        shimmer: 'shimmer 2.5s linear infinite',
        slideIn: 'slideIn 0.3s ease-out both',
        scaleIn: 'scaleIn 0.25s ease-out both',
        barGrow: 'barGrow 0.6s cubic-bezier(0.34, 1.56, 0.64, 1) both',
      },
      boxShadow: {
        cyber: '0 0 0 1px rgba(0,229,160,0.12), 0 0 20px -4px rgba(0,229,160,0.3)',
        panel: '0 1px 0 rgba(255,255,255,0.03) inset, 0 8px 28px -12px rgba(0,0,0,0.6)',
      },
    },
  },
  plugins: [],
};
