import { defineConfig } from 'vite';

const CSP = [
  "default-src 'self'",
  "script-src 'self'",
  "style-src 'self' 'unsafe-inline' https://fonts.googleapis.com",
  "font-src 'self' https://fonts.gstatic.com",
  "img-src 'self' data:",
  "connect-src 'self' https://api.filebrowserquantum.com",
  "base-uri 'self'",
  "object-src 'none'",
  "form-action 'none'",
].join('; ');

export default defineConfig({
  base: '/',
  build: {
    // Keep the built index.html free of inline scripts (required by script-src 'self').
    modulePreload: { polyfill: false },
  },
  plugins: [
    {
      name: 'inject-csp-meta',
      apply: 'build',
      transformIndexHtml(html: string) {
        return html.replace(
          '<meta name="viewport" content="width=device-width, initial-scale=1.0" />',
          `<meta name="viewport" content="width=device-width, initial-scale=1.0" />\n    <meta http-equiv="Content-Security-Policy" content="${CSP}" />`,
        );
      },
    },
  ],
});
