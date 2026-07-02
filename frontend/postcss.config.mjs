/** PostCSS pipeline. Tailwind CSS v4 ships its own PostCSS plugin; no config
 * file is needed for Tailwind itself because the theme is defined in CSS. */
const config = {
  plugins: {
    "@tailwindcss/postcss": {},
  },
};

export default config;
