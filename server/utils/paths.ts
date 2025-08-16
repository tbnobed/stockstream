import { fileURLToPath } from 'url';
import { dirname, resolve } from 'path';

// Fallback for import.meta.dirname when running in bundled environments
export function getServerDirname(importMetaUrl?: string): string {
  // In bundled environments, import.meta.dirname might be undefined
  if (typeof import.meta !== 'undefined' && import.meta.dirname) {
    return import.meta.dirname;
  }
  
  // Fallback for bundled environments
  if (importMetaUrl) {
    return dirname(fileURLToPath(importMetaUrl));
  }
  
  // Ultimate fallback - assume we're in the dist directory
  return resolve(process.cwd(), 'server');
}

export function resolveFromServer(...paths: string[]): string {
  return resolve(getServerDirname(import.meta.url), ...paths);
}

export function resolveFromApp(...paths: string[]): string {
  return resolve(getServerDirname(import.meta.url), '..', ...paths);
}