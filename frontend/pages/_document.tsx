import { Html, Head, Main, NextScript } from "next/document";

// Apply persisted theme/density before first paint to avoid a flash. Defaults
// to the dark theme (engineers default to dark; light is a first-class peer).
const noFlash = `(function(){try{var t=localStorage.getItem('arc.theme');var d=localStorage.getItem('arc.density');document.documentElement.setAttribute('data-theme',t==='light'?'light':'dark');document.documentElement.setAttribute('data-density',d==='compact'?'compact':'comfortable');}catch(e){document.documentElement.setAttribute('data-theme','dark');document.documentElement.setAttribute('data-density','comfortable');}})();`;

export default function Document() {
  return (
    <Html lang="en">
      <Head />
      <body>
        <script dangerouslySetInnerHTML={{ __html: noFlash }} />
        <Main />
        <NextScript />
      </body>
    </Html>
  );
}
