import { readdir, readFile, writeFile, stat } from 'node:fs/promises';
import path from 'node:path';
import { fileURLToPath } from 'node:url';

const root = path.resolve(path.dirname(fileURLToPath(import.meta.url)), '..');
const output = path.join(root, 'dist');
const checkOnly = process.argv.includes('--check-only');
const hostname = process.env.SITE_URL || process.env.VERCEL_PROJECT_PRODUCTION_URL || process.env.VERCEL_URL;
const sourceOrigin = hostname ? new URL(/^https?:\/\//.test(hostname) ? hostname : `https://${hostname}`) : null;
if (sourceOrigin && !['https:', 'http:'].includes(sourceOrigin.protocol)) {
  throw new Error('SITE_URL must be an HTTP(S) website URL.');
}
const origin = sourceOrigin?.origin;
const files = (await readdir(output)).filter(file => file.endsWith('.html')).sort();
for (const required of ['index.html', '404.html', 'site.css', 'site.js', 'properties.json', 'hero-data.json', 'spatial.css', 'viewer3d.js', 'building3d.js', 'apartment-interior.html', 'apartment3d.js', 'interior-experience.js', 'atelier.css', 'mobile.css', 'vendor/three/three.module.min.js', 'vendor/three/three.core.min.js', 'vendor/three/OrbitControls.js', 'vendor/three/RoomEnvironment.js', 'vendor/three/LICENSE']) {
  await stat(path.join(output, required));
}
if (!files.length) throw new Error('No website pages found in dist/.');

const failures = [];
let references = 0;
const decodeEntities = value => value.replaceAll('&amp;', '&').replaceAll('&quot;', '"').replaceAll('&#39;', "'");
const escapeXML = value => value.replaceAll('&', '&amp;').replaceAll('"', '&quot;').replaceAll('<', '&lt;').replaceAll('>', '&gt;');
const attr = (tag, name) => tag.match(new RegExp(`\\b${name}=["']([^"']*)["']`, 'i'))?.[1];
const setAttr = (tag, name, value) => tag.replace(new RegExp(`(\\b${name}=)["'][^"']*["']`, 'i'), `$1"${escapeXML(value)}"`);

for (const file of files) {
  const filePath = path.join(output, file);
  let html = await readFile(filePath, 'utf8');
  for (const [, raw] of html.matchAll(/\b(?:href|src)=["']([^"']+)["']/gi)) {
    const url = new URL(decodeEntities(raw), `https://local-check.invalid/${file}`);
    if (url.origin !== 'https://local-check.invalid') continue;
    references++;
    const target = path.resolve(output, '.' + decodeURIComponent(url.pathname));
    if (!target.startsWith(output + path.sep) && target !== output) {
      failures.push(`${file}: reference escapes dist/: ${raw}`);
      continue;
    }
    try {
      const result = await stat(target);
      if (!result.isFile() && !result.isDirectory()) failures.push(`${file}: invalid target ${raw}`);
    } catch {
      failures.push(`${file}: missing ${raw}`);
    }
  }
  if (origin && !checkOnly) {
    const pageURL = `${origin}/${file === 'index.html' ? '' : file}`;
    html = html.replace(/<link\b[^>]*>/gi, tag => attr(tag, 'rel') === 'canonical' ? setAttr(tag, 'href', pageURL) : tag);
    html = html.replace(/<meta\b[^>]*>/gi, tag => {
      if (attr(tag, 'property') !== 'og:image') return tag;
      const image = attr(tag, 'content');
      if (!image) return tag;
      return setAttr(tag, 'content', `${origin}${new URL(decodeEntities(image), pageURL).pathname}`);
    });
    await writeFile(filePath, html);
  }
}
if (failures.length) throw new Error(`Website validation failed:\n${failures.join('\n')}`);

if (origin && !checkOnly) {
  const urls = files.filter(file => !['404.html', 'sitemap.html', 'ready-to-occupy-projects.html.html'].includes(file));
  const sitemap = '<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n' +
    urls.map(file => `  <url><loc>${escapeXML(`${origin}/${file === 'index.html' ? '' : file}`)}</loc></url>`).join('\n') + '\n</urlset>\n';
  await writeFile(path.join(output, 'sitemap.xml'), sitemap);
  await writeFile(path.join(output, 'robots.txt'), `User-agent: *\nAllow: /\n\nSitemap: ${origin}/sitemap.xml\n`);
  console.log(`Prepared production metadata, sitemap.xml and robots.txt for ${origin}.`);
}
console.log(`Validated ${files.length} HTML pages and ${references} local references. Deployment output: dist/.`);
if (!origin && !checkOnly) console.log('No deployment domain provided; metadata is unchanged. Vercel supplies its domain automatically.');
