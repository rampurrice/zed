/** @type {import('tailwindcss').Config} */
export default {
  darkMode: 'class',
  content: [
    './index.html',
    './index.tsx',
    './App.{js,ts,jsx,tsx}',

    // common folders
    './src/**/*.{js,ts,jsx,tsx,mdx}',
    './components/**/*.{js,ts,jsx,tsx,mdx}',
    './pages/**/*.{js,ts,jsx,tsx,mdx}',

    // fallback for files at repo root (as in your screenshot)
    './**/*.{js,ts,jsx,tsx,mdx,html}'
  ],
  theme: {
    extend: {
      fontFamily: { sans: ['Inter', 'sans-serif'] },
      colors: {
        primary: {
          50: '#EBF5FF', 100: '#D6EAF8', 200: '#AED6F1', 300: '#85C1E9',
          400: '#5DADE2', 500: '#3498DB', 600: '#2E86C1', 700: '#2874A6',
          800: '#21618C', 900: '#1B4F72', 950: '#113043',
        },
        accent: {
          50: '#FEF9E7', 100: '#FDEBCF', 200: '#FAD7A0', 300: '#F8C471',
          400: '#F5B041', 500: '#F39C12', 600: '#D68910', 700: '#B9770E',
          800: '#9C640C', 900: '#7E5109', 950: '#513404',
        },
      },
      borderRadius: { '2xl': '1rem' },
    },
  },
  // keep the build from dropping dynamic classes (optional but useful)
  safelist: [
    { pattern: /(bg|text|border)-primary-(100|200|300|400|500|600|700|800|900)/ },
    { pattern: /(bg|text|border)-accent-(100|200|300|400|500|600|700|800|900)/ },
    { pattern: /dark/ }
  ],
  plugins: [
    // optional but recommended
    // require('@tailwindcss/forms'),
    // require('@tailwindcss/typography'),
  ],
};
