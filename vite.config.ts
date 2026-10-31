import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { readdirSync, readFileSync, statSync, writeFileSync } from 'node:fs';
import { join, relative } from 'node:path';

// Replaces __PRECACHE__ in dist/sw.js with the list of built files so the
// whole app is cached on first visit and works offline.
function precacheManifest() {
  let outDir = 'dist';
  return {
    name: 'pressratio-precache',
    apply: 'build' as const,
    configResolved(c: { build: { outDir: string } }) {
      outDir = c.build.outDir;
    },
    closeBundle() {
      const files: string[] = [];
      const walk = (dir: string) => {
        for (const f of readdirSync(dir)) {
          const p = join(dir, f);
          if (statSync(p).isDirectory()) walk(p);
          else files.push(relative(outDir, p).split('\\').join('/'));
        }
      };
      walk(outDir);
      // .well-known/ is for Android's Digital Asset Links check, never for the app itself.
      const skip = (f: string) => ['sw.js', 'index.html', '_headers', '_redirects'].includes(f) || f.startsWith('.well-known/');
      const urls = ['./', ...files.filter((f) => !skip(f)).map((f) => `./${f}`)];
      const swPath = join(outDir, 'sw.js');
      const cacheId = String(Date.now());
      writeFileSync(
        swPath,
        readFileSync(swPath, 'utf8')
          .replace('/*__PRECACHE__*/', JSON.stringify(urls).slice(1, -1))
          .replace('__CACHE_ID__', cacheId),
      );
    },
  };
}

export default defineConfig({
  base: './',
  plugins: [react(), precacheManifest()],
  test: { environment: 'node', include: ['src/**/*.test.{ts,tsx}'] },
});
