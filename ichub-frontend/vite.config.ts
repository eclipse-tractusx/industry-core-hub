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
export default defineConfig(({ mode }) => {
  const isDevelopment = mode === 'development';
  const isProduction = mode === 'production';

  return {
    plugins: [react()],
    
    resolve: {
      alias: {
        '@': path.resolve(__dirname, 'src'),
        '@config': path.resolve(__dirname, 'src/config'),
        '@services': path.resolve(__dirname, 'src/services'),
      },
    },

    define: {
      // Inject build-time variables
      __APP_VERSION__: JSON.stringify(process.env.npm_package_version || '1.0.0'),
      __BUILD_TIME__: JSON.stringify(new Date().toISOString()),
      __BUILD_MODE__: JSON.stringify(mode),
    },
  build: {
    target: 'esnext',
    minify: isProduction ? 'esbuild' : false,
    
    chunkSizeWarningLimit: 1000,
    reportCompressedSize: !isDevelopment,
    
    rollupOptions: {
      output: {
        inlineDynamicImports: false,
        manualChunks: {
          'react': ['react', 'react-dom'],
          'mui-emotion': ['@mui/material', '@mui/icons-material', '@emotion/react', '@emotion/styled'],
          'router': ['react-router-dom'],
          'vendor': ['axios', 'uuid'],
          'config': ['./src/config/ConfigFactory.ts', './src/services/EnvironmentService.ts']
        }
      }
    },
    
    sourcemap: isDevelopment ? 'inline' : false
  },
  
  server: {
    hmr: {
      overlay: false
    },
    // Proxy for development
    proxy: isDevelopment ? {
      '/api': {
        target: 'http://localhost:9000',
        changeOrigin: true,
        rewrite: (path) => path.replace(/^\/api/, '/v1')
      }
    } : undefined
  },
  
  optimizeDeps: {
    include: [
      'react',
      'react-dom',
      'react-router-dom',
      '@mui/material',
      '@mui/icons-material'
    ],
    force: true
  },
  
  esbuild: {
    target: 'esnext',
    drop: isProduction ? ['console', 'debugger'] : []
  }
  };
});
