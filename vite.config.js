import { defineConfig } from 'vite'
import { resolve } from 'path'

export default defineConfig({
  base: '/SchoolPhotoRobynArt/',
  server: {
    port: 5174
  },
  build: {
    rollupOptions: {
      input: {
        main:     resolve(__dirname, 'index.html'),
        syllabus: resolve(__dirname, 'syllabus.html'),
      }
    }
  }
})
