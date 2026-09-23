import fs from 'node:fs/promises';
import path from 'node:path';

const root = process.cwd();
const dest = path.join(root, 'dist');

await fs.rm(dest, { recursive: true, force: true });
await fs.mkdir(dest, { recursive: true });

async function copy(from, to) {
  await fs.cp(from, to, { recursive: true, force: true });
}

for (const file of ['index.html', 'support.js', 'refugios.json']) {
  await copy(path.join(root, file), path.join(dest, file));
}

const form = path.join(root, 'Kongo Formulario.dc.html');
try {
  await copy(form, path.join(dest, 'Kongo Formulario.dc.html'));
} catch {
  // optional export, skip if missing
}

await copy(path.join(root, 'uploads'), path.join(dest, 'uploads'));
await copy(path.join(root, 'admin-dist'), path.join(dest, 'admin'));
console.log('Vercel static output listo en dist/');
