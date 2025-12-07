/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#FF6B35',
          dark: '#E55A2B',
        },
        dark: {
          DEFAULT: '#0F0F0F',
          light: '#1A1A1A',
          lighter: '#2A2A2A',
        }
      },
    },
  },
  plugins: [],
}

