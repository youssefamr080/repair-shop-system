import { defineConfig } from 'vitest/config';
import react from '@vitejs/plugin-react';
import { resolve } from 'path';

export default defineConfig({
  plugins: [react()],
  test: {
    // Test environment for React components
    environment: 'happy-dom',
    
    // Global test setup
    setupFiles: ['./src/test/setup.ts'],
    
    // Test file patterns
    include: [
      'src/**/*.{test,spec}.{ts,tsx}',
      'electron/**/*.{test,spec}.ts'
    ],
    
    // Exclude patterns
    exclude: [
      'node_modules',
      'dist',
      'dist-electron',
      'release'
    ],
    
    // Global APIs available without imports
    globals: true,
    
    // Coverage configuration
    coverage: {
      provider: 'v8',
      reporter: ['text', 'json', 'html'],
      exclude: [
        'node_modules',
        'dist',
        'dist-electron',
        'src/test',
        '**/*.d.ts',
        '**/*.config.*',
        '**/types/*'
      ]
    },
    
    // Reporter configuration
    reporters: ['default'],
    
    // Timeout for each test
    testTimeout: 10000
  },
  resolve: {
    alias: {
      '@': resolve(__dirname, './src'),
    },
  },
});
