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
          DEFAULT: '#D90429', // Pimenta Ardente
          dark: '#B00321',
        },
        accent: {
          DEFAULT: '#FFD700', // Dourado
        },
        dark: {
          DEFAULT: '#121212', // Carvão
          light: '#1E1E1E',
          lighter: '#2C2C2C',
        },
        'text-light': '#F5F5F5',
      },
    },
  },
  plugins: [],
}