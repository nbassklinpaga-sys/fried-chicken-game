/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        'japan-red': '#E34234',
        'japan-gold': '#D4AF37'
      }
    },
  },
  plugins: [],
}
