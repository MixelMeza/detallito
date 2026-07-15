import { defineConfig } from 'vite'
import { viteSingleFile } from 'vite-plugin-singlefile'

// base: './' + viteSingleFile -> genera UN SOLO archivo dist/index.html con todo
// dentro (JS y CSS inline). Se abre con doble clic o se envia como un archivo,
// y tambien funciona subido a cualquier hosting.
export default defineConfig({
  base: './',
  plugins: [viteSingleFile()],
  server: {
    port: 8080,
    host: true
  },
  preview: {
    port: 8080,
    host: true
  }
})
