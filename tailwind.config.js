/** @type {import('tailwindcss').Config} */
export default {
  content: ['./index.html', './src/**/*.{js,ts,jsx,tsx}'],
  theme: {
    extend: {
      colors: {
        primary: {
          DEFAULT: '#5F7448',
          dark: '#3F5732',
          light: '#8FA36F',
        },
        dark: '#263A2D',
        cream: '#F7F4EA',
        'light-green': '#E8EEDF',
        accent: {
          DEFAULT: '#B46F4F',
          dark: '#8F5138',
          light: '#D09A7D',
        },
        ink: '#29332D',
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
