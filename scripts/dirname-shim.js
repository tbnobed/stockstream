// Shim for __dirname in ESM modules
import { fileURLToPath } from 'url';
import { dirname } from 'path';

// Provide __dirname for bundled environments
global.__dirname = process.cwd() + '/server';