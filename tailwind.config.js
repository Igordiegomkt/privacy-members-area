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
          DEFAULT: '#D90429', // Pimenta Ardente (Mantido)
          dark: '#B00321',
        },
        accent: {
          DEFAULT: '#FFD700', // Dourado (Mantido)
        },
        dark: {
          DEFAULT: '#1C1917', // Fundo: Grafite Vulcânico
          light: '#292524',   // Superfícies
          lighter: '#44403C', // Detalhes
        },
        'text-light': '#F5F5F5',
      },
    },
  },
  plugins: [],
}