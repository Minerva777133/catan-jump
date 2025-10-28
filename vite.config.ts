// vite.config.ts
import { defineConfig } from 'vite';

export default defineConfig(({ mode }) => {
  const target = process.env.BUILD_TARGET || 'web'; // web | electron
  const isWeb = target === 'web';

  return {
    // 网页版要用仓库名作为 base；Electron 用相对路径
    base: isWeb ? '/catan-jump/' : './',
    build: {
      outDir: isWeb ? 'docs' : 'dist',
      emptyOutDir: true
    }
  };
});
