#!/usr/bin/env node

// Custom build script for Docker that handles import.meta.dirname properly
import { build } from 'esbuild';
import { execSync } from 'child_process';

console.log('🏗️  Building frontend...');
execSync('vite build', { stdio: 'inherit' });

console.log('🏗️  Building backend for Docker...');
await build({
  entryPoints: ['server/index.ts'],
  bundle: true,
  platform: 'node',
  target: 'node18',
  format: 'esm',
  outdir: 'dist',
  packages: 'external',
  define: {
    'import.meta.dirname': '"__dirname"'
  },
  inject: ['scripts/dirname-shim.js'],
  external: ['__dirname']
});

console.log('✅ Docker build completed!');