// vite.config.js
import { defineConfig } from 'vite';

export default defineConfig({
  // Use relative paths so the built project is fully portable
  // and works on GitHub Pages subfolders (e.g., username.github.io/repo-name/)
  base: './'
});
