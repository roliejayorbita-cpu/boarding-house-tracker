/** @type {import('tailwindcss').Config} */
module.exports = {
  content: [
    // CRITICAL: This points to your app folder.
    // If it said "./src/app...", that was the problem!
    "./app/**/*.{js,ts,jsx,tsx,mdx}",
    "./components/**/*.{js,ts,jsx,tsx,mdx}",
  ],
  theme: {
    extend: {},
  },
  plugins: [],
};
