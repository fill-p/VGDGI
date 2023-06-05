import basicSsl from '@vitejs/plugin-basic-ssl'
import { defineConfig } from 'vite';
import mkcert from'vite-plugin-mkcert'
export default defineConfig({
  base: '/',
  server: { https: true },
  plugins: [
    mkcert()
  ],
});
