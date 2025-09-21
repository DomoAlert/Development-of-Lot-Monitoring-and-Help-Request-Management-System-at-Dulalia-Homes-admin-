/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    "./src/**/*.{js,jsx,ts,tsx}",
  ],
  darkMode: 'class', // Enable class-based dark mode
  theme: {
    extend: {      colors: {
        primary: '#0F3460', // Dark blue from logo
        primaryLight: '#1D5B8C', // Lighter blue variant
        secondary: '#F7B801', // Yellow/gold from logo
        secondaryLight: '#FFDC82', // Lighter yellow variant
        accent: '#E94560', // Optional accent color for important actions
        neutral: '#f8fafc', // Light background
        "neutral-content": '#1A374D', // Text on light background
        base: '#ffffff', // White background
        "base-content": '#1A374D', // Text on white background
      }
    },
  },
  plugins: [],
}