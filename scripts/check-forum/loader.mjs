// Lets plain Node run the app's src/*.js: react-native is replaced by a stub,
// extensionless relative imports get ".js", and src files load as ES modules.
import { readFile } from 'node:fs/promises';
export async function resolve(spec, ctx, next) {
  if (spec === 'react-native') return { url: 'data:text/javascript,export const Platform={OS:"ios"};', shortCircuit: true };
  if (spec.startsWith('.') && !/\.\w+$/.test(spec)) spec += '.js';
  return next(spec, ctx);
}
export async function load(url, ctx, next) {
  if (url.startsWith('file:') && url.includes('/src/') && url.endsWith('.js'))
    return { format: 'module', source: await readFile(new URL(url)), shortCircuit: true };
  return next(url, ctx);
}
