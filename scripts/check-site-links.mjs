import fs from 'node:fs';
import path from 'node:path';
import { JSDOM } from 'jsdom';

const rootDir = process.cwd();
const htmlFiles = fs
  .readdirSync(rootDir)
  .filter((file) => file.endsWith('.html'))
  .sort();

const skipPrefixes = ['http:', 'https:', 'mailto:', 'tel:', 'data:', '//', '#'];
const ignoreRootPaths = ['/_vercel/'];
const targets = ['a[href]', 'link[href]', 'img[src]', 'script[src]'];
const issues = [];

function resolveTarget(rawTarget) {
  const target = rawTarget.trim();
  if (!target) return null;
  if (skipPrefixes.some((prefix) => target.startsWith(prefix))) return null;

  const cleanTarget = target.split('#')[0].split('?')[0];
  if (!cleanTarget) return null;

  if (ignoreRootPaths.some((prefix) => cleanTarget.startsWith(prefix))) return null;

  const relativePath = cleanTarget.startsWith('/') ? cleanTarget.slice(1) : cleanTarget;
  if (!relativePath) return null;
  return path.resolve(rootDir, relativePath);
}

for (const htmlFile of htmlFiles) {
  const html = fs.readFileSync(path.join(rootDir, htmlFile), 'utf8');
  const dom = new JSDOM(html);
  const document = dom.window.document;

  for (const selector of targets) {
    for (const element of document.querySelectorAll(selector)) {
      const rawTarget = element.getAttribute('href') || element.getAttribute('src');
      const resolved = resolveTarget(rawTarget || '');
      if (!resolved) continue;

      if (!fs.existsSync(resolved)) {
        issues.push(`${htmlFile}: missing ${rawTarget}`);
      }
    }
  }
}

if (issues.length > 0) {
  console.error('Broken local targets found:');
  for (const issue of issues) console.error(`- ${issue}`);
  process.exitCode = 1;
} else {
  console.log(`Checked ${htmlFiles.length} HTML files: no missing local targets found.`);
}
