
/** @type {import('tailwindcss').Config} */
export default {
  content: [
    "./index.html",
    "./App.tsx",
    "./components/**/*.{js,ts,jsx,tsx}",
  ],
  darkMode: 'class',
  theme: {
    extend: {
      fontFamily: {
        sans: ['Inter', 'sans-serif'],
      },
      colors: {
        primary: { // ZED Blue
          50: '#EBF5FF',
          100: '#D6EAF8',
          200: '#AED6F1',
          300: '#85C1E9',
          400: '#5DADE2',
          500: '#3498DB',
          600: '#2E86C1',
          700: '#2874A6',
          800: '#21618C',
          900: '#1B4F72',
          950: '#113043',
        },
        accent: { // ZED Orange/Gold
          50: '#FEF9E7',
          100: '#FDEBCF',
          200: '#FAD7A0',
          300: '#F8C471',
          400: '#F5B041',
          500: '#F39C12',
          600: '#D68910',
          700: '#B9770E',
          800: '#9C640C',
          900: '#7E5109',
          950: '#513404',
        },
      }
    }
  },
  plugins: [],
}
