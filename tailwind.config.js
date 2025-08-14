/** @type {import('tailwindcss').Config} */
module.exports = {
  content: ['./src/**/*.{js,jsx,ts,tsx}', './public/index.html'],
  theme: {
    extend: {
      colors: {
        slate: {
          950: '#0c1525',
          900: '#0e192c',
          800: '#13203a',
          700: '#1c2c4f',
          600: '#233561',
          500: '#2c4072',
          400: '#495b8c',
          300: '#6476a6',
          200: '#98a5c6',
          100: '#cbd3e4',
        },
        blue: {
          700: '#1a4b91',
          600: '#2260b8',
          500: '#2872df',
        },
        emerald: {
          600: '#059669',
          500: '#10b981',
        },
        rose: {
          600: '#c11d38',
          500: '#e11d48',
        },
        amber: {
          500: '#d97706',
        },
      },
      spacing: {
        '1.5': '0.375rem',
      },
      maxHeight: {
        '520': '520px',
      },
      backgroundImage: {
        'gradient-dark': 'linear-gradient(to bottom right, var(--tw-gradient-stops))',
      },
    },
  },
  plugins: [],
}
