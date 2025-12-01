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
          DEFAULT: '#211522', // Fundo: Vinho Secreto
          light: '#392A48',   // Superfícies: Roxo Profundo
          lighter: '#4E3A5E', // Detalhes: Ametista Escuro
        },
        'text-light': '#F5F5F5',
      },
    },
  },
  plugins: [],
}