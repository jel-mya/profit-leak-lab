import { defineConfig } from '../../frontend/node_modules/vite/dist/node/index.js';
import react from '../../frontend/node_modules/@vitejs/plugin-react/dist/index.js';
import { fileURLToPath } from 'node:url';
const path = value => fileURLToPath(new URL(value, import.meta.url));
export default defineConfig({
  root: path('./'),
  plugins: [react()],
  resolve: { alias: [
    { find: '@', replacement: path('../../frontend') },
    { find: /^react-dom(\/.*)?$/, replacement: path('../../frontend/node_modules/react-dom') + '$1' },
    { find: /^react(\/.*)?$/, replacement: path('../../frontend/node_modules/react') + '$1' },
    { find: '@supabase/supabase-js', replacement: path('./fixture.ts') },
    { find: /.*core\/supabase-port\.mjs$/, replacement: path('./fixture.ts') },
    { find: 'next/link', replacement: path('./link.tsx') },
  ] },
  server: { host: '127.0.0.1', port: 8792, fs: { allow: [path('../../')] } },
});
