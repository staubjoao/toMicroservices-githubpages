import { defineConfig } from 'vite';
import path from 'path';

export default defineConfig({
  base: './', 
  build: {
    outDir: 'dist', 
    rollupOptions: {
      input: {
        main: path.resolve(__dirname, 'index.html'),
        graph: path.resolve(__dirname, 'graph.js'),
        form: path.resolve(__dirname, 'form.js'),
        classes: path.resolve(__dirname, 'classes.js'),
        mainJS: path.resolve(__dirname, 'main.js')
      },
      output: {
        assetFileNames: 'assets/[name].[ext]', 
      }
    }
  }
});