/** @type {import('tailwindcss').Config} */
export default {
  content: ["./index.html", "./src/**/*.{js,ts,jsx,tsx}"],
  theme: {
    extend: {
      fontFamily: {
        serif: ['"Playfair Display"', 'serif'],
      },
      colors: {
        brand: {
          black: '#060606',
          gray: '#7f7c7a',
          lightGray: '#ada8a3',
          brown: '#544941',
          gold: '#9c7f64',
        },
      },
    },
  },
  plugins: [],
};