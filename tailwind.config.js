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
        dark: { // NOTE: This is now the LIGHT theme "Veludo Picante"
          DEFAULT: '#F7F4F2', // Background: Branco Acetinado
          light: '#FFFFFF',   // Surface: Branco Puro
          lighter: '#F0EBE8', // Details/Hover: Areia Quente
        },
        text: {
          primary: '#312A27',   // Café Expresso
          secondary: '#786A64', // Café com Leite
        },
      },
    },
  },
  plugins: [],
}