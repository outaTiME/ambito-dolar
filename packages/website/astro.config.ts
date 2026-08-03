import sitemap from '@astrojs/sitemap';
import { defineConfig } from 'astro/config';
import icon from 'astro-icon';

// https://astro.build/config
export default defineConfig({
  site: 'https://ambito-dolar.app',
  integrations: [icon(), sitemap()],
  build: { assets: 'assets' },
  vite: { build: { sourcemap: false } },
});
