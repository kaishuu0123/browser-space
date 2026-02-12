import { resolve } from 'path'
import { defineConfig, externalizeDepsPlugin } from 'electron-vite'
import react from '@vitejs/plugin-react'
import fs from 'fs'
import path from 'path'
import type { Plugin } from 'vite'

// findbar.html を out/main/ にコピーするカスタムプラグイン
function copyFindbarPlugin(): Plugin {
  return {
    name: 'copy-findbar-html',
    closeBundle() {
      const src = resolve('src/main/findbar/findbar.html')
      const dest = resolve('out/main/findbar.html')
      fs.mkdirSync(path.dirname(dest), { recursive: true })
      fs.copyFileSync(src, dest)
      console.log('[copy-findbar-html] Copied findbar.html to out/main/')
    },
  }
}

export default defineConfig({
  main: {
    plugins: [externalizeDepsPlugin(), copyFindbarPlugin()],
    resolve: {
      alias: {
        '@shared': resolve('src/shared'),
      },
    },
  },
  preload: {
    build: {
      rollupOptions: {
        input: {
          index: resolve('src/preload/index.ts'),
          findbarPreload: resolve('src/preload/findbarPreload.ts'),
        },
      },
    },
    plugins: [externalizeDepsPlugin()],
    resolve: {
      alias: {
        '@shared': resolve('src/shared'),
      },
    },
  },
  renderer: {
    resolve: {
      alias: {
        '@renderer': resolve('src/renderer/src'),
        '@shared': resolve('src/shared'),
      },
    },
    plugins: [react()],
  },
})
