/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#7A9B76',
          dark: '#5C7A58',
          light: '#9BBA97',
        },
        dark: '#34483A',
        cream: '#F7F3EA',
        'light-green': '#E8EFE5',
        accent: {
          DEFAULT: '#B88765',
          dark: '#9C6F4F',
          light: '#D4A584',
        },
        ink: '#292929',
      },
      fontFamily: {
        sans: ['Hind Siliguri', 'sans-serif'],
        display: ['Playfair Display', 'serif'],
      },
      animation: {
        'fade-in-up': 'fadeInUp 0.6s ease-out forwards',
        'fade-in': 'fadeIn 0.5s ease-out forwards',
        'slide-in': 'slideIn 0.3s ease-out forwards',
      },
    },
  },
  plugins: [],
};
