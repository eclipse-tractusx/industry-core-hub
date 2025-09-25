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
      output: {
        // Automatic chunking based on file patterns - no manual maintenance needed
        manualChunks: (id) => {
          // Vendor chunks
          if (id.includes('node_modules')) {
            // Split large vendor libraries into separate chunks
            if (id.includes('@mui')) return 'mui';
            if (id.includes('react-router')) return 'router';
            if (id.includes('react') || id.includes('react-dom')) return 'react';
            return 'vendor';
          }
          
          // Feature-based chunking - automatically handles new features
          if (id.includes('/features/')) {
            const featureName = id.split('/features/')[1]?.split('/')[0];
            if (featureName) return `feature-${featureName}`;
          }
          
          // Page-based chunking - automatically handles new pages
          if (id.includes('/pages/')) {
            const pageName = id.split('/pages/')[1]?.split('.')[0];
            if (pageName) return `page-${pageName}`;
          }
          
          // Component-based chunking for large component directories
          if (id.includes('/components/') && id.includes('/part-discovery/')) {
            return 'components-part-discovery';
          }
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
    ]
  },
  
  // Additional optimizations for Docker builds
  esbuild: {
    target: 'esnext',
    // Drop console logs in production
    drop: process.env.NODE_ENV === 'production' ? ['console', 'debugger'] : []
  }
})
