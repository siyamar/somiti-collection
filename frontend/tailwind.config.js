/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        paper: '#F6F3EC',
        ink: {
          DEFAULT: '#1B2420',
          light: '#4E5A54',
          muted: '#86918B',
        },
        line: '#E5DFD2',
        forest: {
          DEFAULT: '#173F31',
          dark: '#173F31',
          medium: '#1F5541',
          light: '#2C6E55',
        },
        mint: '#E3EEE7',
        saffron: {
          DEFAULT: '#D8961C',
          light: '#FBF0D9',
        },
        brick: {
          DEFAULT: '#B2452E',
          light: '#F8E5DF',
        },
        ok: {
          DEFAULT: '#2D7A4E',
          light: '#E2F1E7',
        },
      },
      fontFamily: {
        sans: ['"Hind Siliguri"', 'sans-serif'],
        serif: ['"Noto Serif Bengali"', 'serif'],
        mono: ['"JetBrains Mono"', 'monospace'],
      },
      borderRadius: {
        card: '12px',
        input: '8px',
        btn: '8px',
      },
      height: {
        btn: '38px',
        input: '40px',
      },
      width: {
        sidebar: '228px',
      },
      boxShadow: {
        none: 'none',
      },
    },
  },
  plugins: [],
}
