/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      // The game's look, shared with the landing page (public/welcome/landing.css):
      // flat grounds (ink, sun, chalk), one accent (sun), and the four answer colours.
      colors: {
        ink: { DEFAULT: '#150A33', 2: '#24135C', 3: '#2F1A75', 4: '#432A95' },
        chalk: { DEFAULT: '#F6F2FF', 2: '#EAE3FA', edge: '#B9ACE0' },
        sun: { DEFAULT: '#FFC531', dark: '#C48A00', soft: '#FFE08A' },
        soft: '#CFC3EE', // secondary text on ink, tinted rather than flat grey
        ans: {
          a: '#E11D48', 'a-d': '#9F1239',
          b: '#2563EB', 'b-d': '#1E3A8A',
          c: '#F59E0B', 'c-d': '#B45309',
          d: '#10B981', 'd-d': '#047857',
        },
      },
      fontFamily: {
        display: ['Fredoka One', 'cursive'],
        body: ['Nunito', 'sans-serif'],
      },
      animation: {
        'bounce-in': 'bounceIn 0.5s ease-out',
        'pulse-slow': 'pulse 2s cubic-bezier(0.4, 0, 0.6, 1) infinite',
        'wiggle': 'wiggle 0.5s ease-in-out',
        'pop': 'pop 0.3s ease-out',
        'slide-up': 'slideUp 0.4s ease-out',
      },
      keyframes: {
        bounceIn: {
          '0%': { transform: 'scale(0.3)', opacity: '0' },
          '50%': { transform: 'scale(1.1)', opacity: '0.8' },
          '100%': { transform: 'scale(1)', opacity: '1' },
        },
        wiggle: {
          '0%, 100%': { transform: 'rotate(-5deg)' },
          '50%': { transform: 'rotate(5deg)' },
        },
        pop: {
          '0%': { transform: 'scale(1)' },
          '50%': { transform: 'scale(1.15)' },
          '100%': { transform: 'scale(1)' },
        },
        slideUp: {
          '0%': { transform: 'translateY(30px)', opacity: '0' },
          '100%': { transform: 'translateY(0)', opacity: '1' },
        },
      },
    },
  },
  plugins: [],
};
