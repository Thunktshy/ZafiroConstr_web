// Server/services/imageService.js
'use strict';
const path   = require('path');
const fs     = require('fs/promises');
const sharp  = require('sharp');
const crypto = require('crypto');

// Base: <ProjectRoot>/Protected/Images/Productos
const PROJECT_ROOT = path.resolve(__dirname, '..', '..');
const BASE_IMG_DIR = path.join(PROJECT_ROOT, 'Protected', 'Images', 'Productos');

const VARIANTS = [
  { key: 'lg', width: 1600, quality: 82 },
  { key: 'md', width:  800, quality: 80 },
  { key: 'sm', width:  400, quality: 78 },
];

const safeSlug = (s) =>
  String(s || '').toLowerCase()
    .replace(/[^\w\-]+/g, '-')
    .replace(/\-+/g, '-')
    .replace(/^\-+|\-+$/g, '');

// Ensure folders exist
async function ensureDirs(...dirs) {
  await Promise.all(dirs.map(d => fs.mkdir(d, { recursive: true })));
}

// Base dir for a product owner
function ownerBase(ownerId) {
  if (!ownerId) throw new Error('ownerId (producto_id) es obligatorio');
  return path.join(BASE_IMG_DIR, String(ownerId));
}

/**
 * Converts an absolute file path to a project-root-relative path
 * starting with /Protected/Images/Productos/...
 * This is safe to store in DB and later resolve on disk.
 */
function toStoragePath(abs) {
  const relFromProject = path.relative(PROJECT_ROOT, abs).replace(/\\/g, '/');
  return '/' + relFromProject; // -> /Protected/Images/Productos/...
}

async function processAndSave({ buffer, originalName, mimetype, ownerId }) {
  const baseDir = ownerBase(ownerId);
  const subDirs = ['orig', ...VARIANTS.map(v => v.key)].map(k => path.join(baseDir, k));
  await ensureDirs(...subDirs);

  const baseName = `${Date.now()}-${crypto.randomBytes(6).toString('hex')}-${safeSlug(originalName)}`
    .replace(/\.(jpe?g|png|gif|webp)$/i, '');

  const isGif = /image\/gif/i.test(mimetype);
  const saved = [];

  if (isGif) {
    // Save original GIF
    const origGif = path.join(baseDir, 'orig', `${baseName}.gif`);
    await fs.writeFile(origGif, buffer);
    saved.push(toStoragePath(origGif));

    // Small webp preview
    const smPreview = path.join(baseDir, 'sm', `${baseName}.webp`);
    await sharp(buffer, { animated: true })
      .rotate()
      .resize({ width: 400, fit: 'inside', withoutEnlargement: true })
      .webp({ quality: 75 })
      .toFile(smPreview);
    saved.push(toStoragePath(smPreview));
  } else {
    // Original compressed as webp
    const origWebp = path.join(baseDir, 'orig', `${baseName}.webp`);
    await sharp(buffer).rotate().webp({ quality: 85 }).toFile(origWebp);
    saved.push(toStoragePath(origWebp));

    // Variants
    for (const v of VARIANTS) {
      const out = path.join(baseDir, v.key, `${baseName}.webp`);
      await sharp(buffer)
        .rotate()
        .resize({ width: v.width, fit: 'inside', withoutEnlargement: true })
        .webp({ quality: v.quality })
        .toFile(out);
      saved.push(toStoragePath(out));
    }
  }

  // Prefer the medium variant as "canonical"
  const canonical = saved.find(p => /\/md\//.test(p)) || saved[0];
  return { canonicalPath: canonical, allPaths: saved };
}

/**
 * Remove all size variants given the canonical (project-root-relative) path.
 * Example canonical: /Protected/Images/Productos/123/md/12345-abc-file.webp
 */
async function removeByCanonical(canonicalPath) {
  if (!canonicalPath) return;

  // Resolve to absolute on disk
  const abs = path.resolve(PROJECT_ROOT, canonicalPath.replace(/^\//, ''));
  const parsed = path.parse(abs);
  const name = parsed.name; // filename without extension

  // ownerDir: .../Productos/<ownerId>
  const ownerDir = path.dirname(path.dirname(abs)); // drop /md/<file> => /<ownerId>

  const candidates = [
    path.join(ownerDir, 'orig', `${name}.webp`),
    path.join(ownerDir, 'orig', `${name}.gif`),
    path.join(ownerDir, 'lg',   `${name}.webp`),
    path.join(ownerDir, 'md',   `${name}.webp`),
    path.join(ownerDir, 'sm',   `${name}.webp`)
  ];

  await Promise.all(candidates.map(async p => {
    try { await fs.unlink(p); } catch {}
  }));
}

module.exports = { processAndSave, removeByCanonical };
