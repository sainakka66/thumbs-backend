/** @type {import('tailwindcss').Config} */
const withAlpha = (v) => `rgb(var(${v}) / <alpha-value>)`;

export default {
  darkMode: 'class',
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
        // Brand
        brand: {
          DEFAULT: withAlpha('--brand'),
          light: withAlpha('--brand-light'),
          dark: withAlpha('--brand-dark'),
          soft: withAlpha('--brand-soft'),
        },
        // Surfaces (themed via CSS vars — light = Fintech, dark = Premium)
        ink: withAlpha('--bg'),
        bg: withAlpha('--bg'),
        surface: withAlpha('--surface'),
        card: withAlpha('--surface'),
        surface2: withAlpha('--surface-2'),
        elevated: withAlpha('--surface-2'),
        border: withAlpha('--border'),
        // Text
        text: withAlpha('--text'),
        sub: withAlpha('--text-sub'),
        muted: withAlpha('--text-muted'),
        // Semantic
        success: withAlpha('--success'),
        warning: withAlpha('--warning'),
        danger: withAlpha('--danger'),
        info: withAlpha('--info'),
      },
      fontFamily: {
        head: ['"Barlow Condensed"', 'sans-serif'],
        body: ['Barlow', 'system-ui', 'sans-serif'],
      },
      borderRadius: {
        card: '16px',
        xl2: '20px',
      },
      boxShadow: {
        card: 'var(--shadow-card)',
        elev: 'var(--shadow-elev)',
        glow: '0 0 0 1px rgb(var(--brand) / 0.25), 0 8px 30px rgb(var(--brand) / 0.18)',
      },
      keyframes: {
        shimmer: {
          '100%': { transform: 'translateX(100%)' },
        },
        'fade-in': {
          from: { opacity: '0' },
          to: { opacity: '1' },
        },
        'fade-up': {
          from: { opacity: '0', transform: 'translateY(8px)' },
          to: { opacity: '1', transform: 'translateY(0)' },
        },
        'slide-up': {
          from: { transform: 'translateY(100%)' },
          to: { transform: 'translateY(0)' },
        },
        'scale-in': {
          from: { opacity: '0', transform: 'scale(0.96)' },
          to: { opacity: '1', transform: 'scale(1)' },
        },
        'toast-in': {
          from: { opacity: '0', transform: 'translateX(16px)' },
          to: { opacity: '1', transform: 'translateX(0)' },
        },
      },
      animation: {
        'fade-in': 'fade-in 180ms ease-out',
        'fade-up': 'fade-up 220ms ease-out',
        'slide-up': 'slide-up 250ms cubic-bezier(0.22, 1, 0.36, 1)',
        'scale-in': 'scale-in 160ms ease-out',
        'toast-in': 'toast-in 200ms ease-out',
      },
      transitionTimingFunction: {
        spring: 'cubic-bezier(0.22, 1, 0.36, 1)',
      },
    },
  },
  plugins: [],
};
