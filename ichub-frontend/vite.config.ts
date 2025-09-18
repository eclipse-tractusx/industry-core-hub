/********************************************************************************
 * Eclipse Tractus-X - Industry Core Hub Frontend
 *
 * Copyright (c) 2025 Contributors to the Eclipse Foundation
 *
 * See the NOTICE file(s) distributed with this work for additional
 * information regarding copyright ownership.
 *
 * This program and the accompanying materials are made available under the
 * terms of the Apache License, Version 2.0 which is available at
 * https://www.apache.org/licenses/LICENSE-2.0.
 *
 * Unless required by applicable law or agreed to in writing, software
 * distributed under the License is distributed on an "AS IS" BASIS
 * WITHOUT WARRANTIES OR CONDITIONS OF ANY KIND,
 * either express or implied. See the
 * License for the specific language govern in permissions and limitations
 * under the License.
 *
 * SPDX-License-Identifier: Apache-2.0
********************************************************************************/

import path from 'path';
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react-swc'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  
  resolve: {
    alias: {
      '@': path.resolve(__dirname, 'src'),
    },
  },
  build: {
    // Optimize build performance and chunk sizes
    target: 'esnext',
    minify: 'esbuild',
    
    // Increase chunk size warning limit to 1MB (from default 500kB)
    chunkSizeWarningLimit: 1000,
    
    // Optimize for faster builds in Docker
    reportCompressedSize: false, // Skip gzip size reporting for faster builds
    
    rollupOptions: {
      // Define external dependencies to control loading
      external: () => {
        // Don't externalize anything - keep everything bundled but control order
        return false;
      },
      output: {
        // Ensure proper chunk loading order by defining imports
        inlineDynamicImports: false,
        // Manual chunking to ensure React loads before everything else
        manualChunks: {
          // Explicitly define React chunk first
          'react': ['react', 'react-dom'],
          // Then MUI and emotion together
          'mui-emotion': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          // Router separately
          'router': ['react-router-dom'],
          // Other vendor libs
          'vendor': ['axios', 'uuid']
        }
      }
    },
    
    // Disable source maps in production for faster builds
    sourcemap: false
  },
  
  // Optimize dev server
  server: {
    hmr: {
      overlay: false
    }
  },
  
  // Optimize dependency pre-bundling
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@mui/material',
      '@mui/icons-material'
    ],
    // Force React to be processed first to ensure useInsertionEffect is available
    force: true
  },
  
  // Additional optimizations for Docker builds
  esbuild: {
    target: 'esnext',
    // Drop console logs in production
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : []
  }
})
