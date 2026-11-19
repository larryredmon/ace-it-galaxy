import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Split rarely-changing libraries into their own files. Browsers keep them cached
// between deploys, so returning students only re-download the app code that changed.
const FIREBASE_CORE = /node_modules[\\/](@firebase[\\/](app|auth|firestore|util|component|logger|webchannel-wrapper)|firebase[\\/](app|auth|firestore)|idb)[\\/]/
const REACT = /node_modules[\\/](react|react-dom|scheduler)[\\/]/

export default defineConfig({
  plugins: [react()],
  build: {
    chunkSizeWarningLimit: 900,
    rolldownOptions: {
      output: {
        codeSplitting: {
          groups: [
            { name: 'react', test: REACT },
            { name: 'firebase', test: FIREBASE_CORE },
          ],
        },
      },
    },
  },
})
