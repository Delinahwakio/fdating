import type { Config } from 'tailwindcss'

const config: Config = {
  content: [
    './pages/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './app/**/*.{js,ts,jsx,tsx,mdx}',
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          bg: '#0F0F23',
          secondary: '#1A1A2E',
          red: '#DC2626',
        },
        glass: {
          light: 'rgba(255, 255, 255, 0.1)',
          medium: 'rgba(255, 255, 255, 0.05)',
          dark: 'rgba(0, 0, 0, 0.2)',
        },
      },
      backdropBlur: {
        xs: '2px',
      },
      borderRadius: {
        glass: '16px',
        'glass-sm': '8px',
      },
    },
  },
  plugins: [],
}
export default config
