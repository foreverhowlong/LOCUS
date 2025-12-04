/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/renderer/index.html",
    "./src/renderer/src/**/*.{js,ts,jsx,tsx}",
  ],
  theme: {
    extend: {
      colors: {
        porcelain: '#F9F7F1',
        stone: '#F5F5F7',
        charcoal: '#333333',
        'indigo-muted': '#4A5D88',
      },
      fontFamily: {
        serif: ['"Crimson Pro"', 'serif'],
        sans: ['"Inter"', 'sans-serif'],
      },
    },
  },
  plugins: [],
}
