// Classic-script build: ES modules are blocked on file:// by CORS, a plain <script src> is not.
import { readFileSync, writeFileSync } from 'node:fs';

const dist = new URL('../dist/', import.meta.url);
const read = (path) => readFileSync(new URL(path, dist), 'utf8');

const stripModuleSyntax = (source) =>
  source
    .replace(/^import .+;$/gm, '')
    .replace(/^export default \w+;$/gm, '')
    .replace(/^export (?=const|let|class|function)/gm, '');

const body = ['style.js', 'index.js'].map(read).map(stripModuleSyntax).join('\n');

if (/^(import|export)\b/m.test(body)) {
  throw new Error('dist/ contains module syntax the global build does not handle');
}

writeFileSync(new URL('index.global.js', dist), `(() => {\n${body}\nwindow.Tooltip = Tooltip;\n})();\n`);
