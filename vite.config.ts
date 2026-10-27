import { defineConfig, type Plugin } from 'vite';
import { cpSync, existsSync, readdirSync, statSync } from 'node:fs';
import { join, relative } from 'node:path';
import { fileURLToPath } from 'node:url';

const ROOT = fileURLToPath(new URL('.', import.meta.url));

// Collect every index.html in the tree so `vite build` emits all pages.
function collectHtmlPages(dir: string, entries: Record<string, string> = {}) {
  for (const name of readdirSync(dir)) {
    if (name === 'node_modules' || name === 'dist' || name === '.git') continue;
    const full = join(dir, name);
    if (statSync(full).isDirectory()) {
      collectHtmlPages(full, entries);
    } else if (name.endsWith('.html')) {
      const rel = relative(ROOT, full);
      entries[rel.replace(/\.html$/, '')] = join(ROOT, rel);
    }
  }
  return entries;
}

// Copy files that are referenced by URL (not bundled) into dist/ for builds.
function copyStaticAssets(): Plugin {
  return {
    name: 'copy-static-assets',
    apply: 'build',
    closeBundle() {
      if (existsSync(join(ROOT, 'assets'))) {
        cpSync(join(ROOT, 'assets'), join(ROOT, 'dist', 'assets'), { recursive: true });
      }
      if (existsSync(join(ROOT, 'robots.txt'))) {
        cpSync(join(ROOT, 'robots.txt'), join(ROOT, 'dist', 'robots.txt'));
      }
    },
  };
}

export default defineConfig({
  plugins: [copyStaticAssets()],
  build: {
    assetsDir: 'static',
    rollupOptions: {
      input: collectHtmlPages(ROOT),
    },
  },
});
