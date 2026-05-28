/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,jsx}'],
  theme: {
    screens: {
      xs: '375px',
      sm: '640px',
      md: '768px',
      lg: '1024px',
      xl: '1280px',
    },
    extend: {
      colors: {
        brand: {
          DEFAULT: '#D42B2B',
          light: '#FF4545',
          dark: '#A51E1E',
        },
        surface: '#1A1A1A',
        card: '#232323',
        border: '#2E2E2E',
        muted: '#666666',
        sub: '#A0A0A0',
        ink: '#0F0F0F',
        text: '#F0F0F0',
      },
      fontFamily: {
        head: ['"Barlow Condensed"', 'sans-serif'],
        body: ['Barlow', 'sans-serif'],
      },
      boxShadow: {
        card: '0 8px 24px rgba(0,0,0,0.35)',
      },
    },
  },
  plugins: [],
};
