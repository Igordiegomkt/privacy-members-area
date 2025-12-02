/** @type {import('tailwindcss').Config} */
const defaultTheme = require('tailwindcss/defaultTheme');

export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      fontFamily: {
        sans: ['Poppins', ...defaultTheme.fontFamily.sans],
      },
      colors: {
        'privacy-black': '#121212', // Fundo principal
        'privacy-surface': '#1A1A1A', // Fundo de cards e superfícies
        'privacy-border': '#2C2C2C', // Bordas sutis
        'primary': '#FF5F00', // Cor principal (laranja)
        'primary-dark': '#D95100', // Variação mais escura para hover
        'privacy-text-primary': '#FFFFFF', // Texto principal
        'privacy-text-secondary': '#A0A0A0', // Texto secundário e ícones
        'privacy-online': '#00C48C', // Indicador de online
      },
    },
  },
  plugins: [],
}