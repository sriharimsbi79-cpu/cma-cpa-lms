import type { Config } from 'tailwindcss';

// Colours and type taken from the canvas designs.
// Change the brand colour in src/index.css (--brand) to re-theme the whole app.
export default {
  content: ['./index.html', './src/**/*.{ts,tsx}'],
  theme: {
    extend: {
      fontFamily: {
        sans: ['"Plus Jakarta Sans"', 'system-ui', '-apple-system', 'Segoe UI', 'sans-serif'],
      },
      colors: {
        page: '#F4F6FA',
        ink: { DEFAULT: '#111827', 2: '#374151', 3: '#5B6472' },
        line: { DEFAULT: '#E3E7EF', strong: '#D5DBE5', soft: '#EEF1F5', dash: '#C3CAD6' },
        mist: { DEFAULT: '#F1F3F7', 2: '#E6E9EF', 3: '#E9EDF3', 4: '#F8F9FB' },
        navy: {
          DEFAULT: '#0E1A2B',
          2: '#17263D',
          3: '#22324B',
          4: '#3A4B66',
          text: '#C9D2E0',
          muted: '#9AA7BA',
          dim: '#8794A8',
        },
        brand: 'rgb(var(--brand) / <alpha-value>)',
        ok: { bg: '#E2F3F1', fg: '#0F5F59' },
        warn: { bg: '#FDF1E3', line: '#F3D3AE', fg: '#7A4209', strong: '#A34F0C', text: '#8A4B0B', track: '#F3E3D2' },
      },
      borderRadius: {
        card: '18px',
      },
      maxWidth: {
        content: '1160px',
        admin: '1180px',
      },
    },
  },
  plugins: [],
} satisfies Config;
