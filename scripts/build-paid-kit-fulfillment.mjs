import fs from 'node:fs';
import path from 'node:path';

const root = process.cwd();
const paidKitsDir = path.join(root, 'paid-kits');
const exportsDir = path.join(paidKitsDir, 'exports');
const archivesDir = path.join(paidKitsDir, 'archives');

const markdownExports = [
  ['starter', 'README.md'],
  ['starter', 'notice-email-templates.md'],
  ['starter', 'internal-approval-checklist.md'],
  ['starter', 'attorney-review-handoff-note.md'],
  ['pro', 'README.md'],
  ['pro', 'attorney-review-packet.md'],
  ['pro', 'procurement-ready-summary.md'],
  ['pro', 'csv-import-export-guide.md'],
  ['pro', 'evidence-folder-workflow.md'],
];

const disclaimer =
  'NoticeKit provides operational templates and workflow materials. It is not a law firm, does not provide legal advice, and does not create an attorney-client relationship. Have qualified counsel review your notices, subprocessors, objection process, and customer communications before relying on them.';

function ensureDir(dir) {
  fs.mkdirSync(dir, { recursive: true });
}

function escapePdfText(value) {
  return value.replace(/\\/g, '\\\\').replace(/\(/g, '\\(').replace(/\)/g, '\\)');
}

function markdownToLines(markdown) {
  const lines = [];

  for (const rawLine of markdown.split(/\r?\n/)) {
    let line = rawLine.trimEnd();

    if (line.startsWith('# ')) line = line.slice(2).toUpperCase();
    else if (line.startsWith('## ')) line = line.slice(3);
    else if (line.startsWith('### ')) line = line.slice(4);

    line = line
      .replace(/`([^`]+)`/g, '$1')
      .replace(/\[([^\]]+)\]\([^)]+\)/g, '$1')
      .replace(/\*\*([^*]+)\*\*/g, '$1')
      .replace(/\*([^*]+)\*/g, '$1')
      .replace(/^-\s+/g, '- ')
      .replace(/^\|\s*/g, '| ')
      .replace(/\s*\|$/g, ' |');

    if (line.length === 0) {
      lines.push('');
      continue;
    }

    lines.push(...wrapLine(line, 94));
  }

  return lines;
}

function wrapLine(line, width) {
  if (line.length <= width) return [line];

  const words = line.split(/\s+/);
  const lines = [];
  let current = '';

  for (const word of words) {
    if (!current) {
      current = word;
      continue;
    }

    if (`${current} ${word}`.length <= width) {
      current += ` ${word}`;
    } else {
      lines.push(current);
      current = word;
    }
  }

  if (current) lines.push(current);
  return lines;
}

function buildPdf(title, markdown) {
  const bodyLines = markdownToLines(markdown);
  const allLines = [
    title,
    '',
    `Generated: ${new Date().toISOString().slice(0, 10)}`,
    '',
    ...bodyLines,
    '',
    'Fulfillment disclaimer:',
    ...wrapLine(disclaimer, 94),
  ];

  const objects = [];
  const pages = [];
  const pageHeight = 792;
  const left = 54;
  const top = 744;
  const lineHeight = 13;
  const linesPerPage = 52;

  function addObject(content) {
    objects.push(content);
    return objects.length;
  }

  const fontId = addObject('<< /Type /Font /Subtype /Type1 /BaseFont /Helvetica >>');

  for (let index = 0; index < allLines.length; index += linesPerPage) {
    const pageLines = allLines.slice(index, index + linesPerPage);
    const textOps = ['BT', `/F1 10 Tf`, `${left} ${top} Td`, '14 TL'];

    pageLines.forEach((line, lineIndex) => {
      if (lineIndex > 0) textOps.push('T*');
      textOps.push(`(${escapePdfText(line)}) Tj`);
    });

    textOps.push('ET');
    const stream = textOps.join('\n');
    const contentId = addObject(`<< /Length ${Buffer.byteLength(stream)} >>\nstream\n${stream}\nendstream`);
    const pageId = addObject(
      `<< /Type /Page /Parent 0 0 R /MediaBox [0 0 612 ${pageHeight}] /Resources << /Font << /F1 ${fontId} 0 R >> >> /Contents ${contentId} 0 R >>`
    );

    pages.push(pageId);
  }

  const pagesId = addObject(`<< /Type /Pages /Kids [${pages.map((id) => `${id} 0 R`).join(' ')}] /Count ${pages.length} >>`);
  const catalogId = addObject(`<< /Type /Catalog /Pages ${pagesId} 0 R >>`);

  for (const pageId of pages) {
    objects[pageId - 1] = objects[pageId - 1].replace('/Parent 0 0 R', `/Parent ${pagesId} 0 R`);
  }

  const chunks = ['%PDF-1.4\n'];
  const offsets = [0];

  objects.forEach((object, index) => {
    offsets.push(Buffer.byteLength(chunks.join('')));
    chunks.push(`${index + 1} 0 obj\n${object}\nendobj\n`);
  });

  const xrefOffset = Buffer.byteLength(chunks.join(''));
  chunks.push(`xref\n0 ${objects.length + 1}\n`);
  chunks.push('0000000000 65535 f\n');

  for (const offset of offsets.slice(1)) {
    chunks.push(`${String(offset).padStart(10, '0')} 00000 n\n`);
  }

  chunks.push(`trailer\n<< /Size ${objects.length + 1} /Root ${catalogId} 0 R >>\nstartxref\n${xrefOffset}\n%%EOF\n`);
  return Buffer.from(chunks.join(''), 'utf8');
}

const crcTable = new Uint32Array(256);
for (let n = 0; n < 256; n += 1) {
  let c = n;
  for (let k = 0; k < 8; k += 1) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
  crcTable[n] = c >>> 0;
}

function crc32(buffer) {
  let crc = 0xffffffff;
  for (const byte of buffer) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
  return (crc ^ 0xffffffff) >>> 0;
}

function dosDateTime(date) {
  const year = Math.max(date.getFullYear(), 1980);
  const dosTime = (date.getHours() << 11) | (date.getMinutes() << 5) | Math.floor(date.getSeconds() / 2);
  const dosDate = ((year - 1980) << 9) | ((date.getMonth() + 1) << 5) | date.getDate();
  return { dosTime, dosDate };
}

function collectFiles(baseDir, prefix = '') {
  const results = [];

  for (const name of fs.readdirSync(baseDir).sort()) {
    const absolute = path.join(baseDir, name);
    const relative = path.posix.join(prefix, name);
    const stat = fs.statSync(absolute);

    if (stat.isDirectory()) {
      results.push(...collectFiles(absolute, relative));
    } else if (stat.isFile()) {
      results.push({ absolute, relative });
    }
  }

  return results;
}

function buildZip(entries) {
  const localParts = [];
  const centralParts = [];
  let offset = 0;

  for (const entry of entries) {
    const data = fs.readFileSync(entry.absolute);
    const name = Buffer.from(entry.relative.replace(/\\/g, '/'));
    const stat = fs.statSync(entry.absolute);
    const { dosTime, dosDate } = dosDateTime(stat.mtime);
    const crc = crc32(data);

    const local = Buffer.alloc(30);
    local.writeUInt32LE(0x04034b50, 0);
    local.writeUInt16LE(20, 4);
    local.writeUInt16LE(0, 6);
    local.writeUInt16LE(0, 8);
    local.writeUInt16LE(dosTime, 10);
    local.writeUInt16LE(dosDate, 12);
    local.writeUInt32LE(crc, 14);
    local.writeUInt32LE(data.length, 18);
    local.writeUInt32LE(data.length, 22);
    local.writeUInt16LE(name.length, 26);
    local.writeUInt16LE(0, 28);
    localParts.push(local, name, data);

    const central = Buffer.alloc(46);
    central.writeUInt32LE(0x02014b50, 0);
    central.writeUInt16LE(20, 4);
    central.writeUInt16LE(20, 6);
    central.writeUInt16LE(0, 8);
    central.writeUInt16LE(0, 10);
    central.writeUInt16LE(dosTime, 12);
    central.writeUInt16LE(dosDate, 14);
    central.writeUInt32LE(crc, 16);
    central.writeUInt32LE(data.length, 20);
    central.writeUInt32LE(data.length, 24);
    central.writeUInt16LE(name.length, 28);
    central.writeUInt16LE(0, 30);
    central.writeUInt16LE(0, 32);
    central.writeUInt16LE(0, 34);
    central.writeUInt16LE(0, 36);
    central.writeUInt32LE(0, 38);
    central.writeUInt32LE(offset, 42);
    centralParts.push(central, name);

    offset += local.length + name.length + data.length;
  }

  const centralSize = centralParts.reduce((total, part) => total + part.length, 0);
  const end = Buffer.alloc(22);
  end.writeUInt32LE(0x06054b50, 0);
  end.writeUInt16LE(0, 4);
  end.writeUInt16LE(0, 6);
  end.writeUInt16LE(entries.length, 8);
  end.writeUInt16LE(entries.length, 10);
  end.writeUInt32LE(centralSize, 12);
  end.writeUInt32LE(offset, 16);
  end.writeUInt16LE(0, 20);

  return Buffer.concat([...localParts, ...centralParts, end]);
}

function writePdfExports() {
  for (const [kit, fileName] of markdownExports) {
    const sourcePath = path.join(paidKitsDir, kit, fileName);
    const markdown = fs.readFileSync(sourcePath, 'utf8');
    const title = `NoticeKit ${kit === 'starter' ? 'Starter' : 'Pro'} - ${fileName.replace(/\.md$/, '').replace(/-/g, ' ')}`;
    const outputDir = path.join(exportsDir, kit);
    const outputName = fileName.replace(/\.md$/, '.pdf');

    ensureDir(outputDir);
    fs.writeFileSync(path.join(outputDir, outputName), buildPdf(title, markdown));
  }
}

function writeArchive(name, directories) {
  const entries = directories.flatMap(([sourceDir, archivePrefix]) =>
    collectFiles(path.join(paidKitsDir, sourceDir), archivePrefix)
  );
  const exportEntries = directories.flatMap(([sourceDir, archivePrefix]) => {
    const dir = path.join(exportsDir, sourceDir);
    if (!fs.existsSync(dir)) return [];
    return collectFiles(dir, path.posix.join(archivePrefix, 'pdf-exports'));
  });

  const outputPath = path.join(archivesDir, name);
  ensureDir(archivesDir);
  fs.writeFileSync(outputPath, buildZip([...entries, ...exportEntries]));
  return outputPath;
}

ensureDir(exportsDir);
writePdfExports();

const starterZip = writeArchive('noticekit-starter-early-access.zip', [['starter', 'noticekit-starter']]);
const proZip = writeArchive('noticekit-pro-early-access.zip', [
  ['starter', 'noticekit-pro/starter'],
  ['pro', 'noticekit-pro/pro'],
]);

console.log(`Wrote ${path.relative(root, starterZip)}`);
console.log(`Wrote ${path.relative(root, proZip)}`);
