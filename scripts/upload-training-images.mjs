/**
 * Upload les images docs/training/ vers Cloudinary
 * et met à jour les chemins dans README.md.
 *
 * Usage : node scripts/upload-training-images.mjs
 */

import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = path.dirname(fileURLToPath(import.meta.url));
const ROOT = path.resolve(__dirname, "..");

// Parsing robuste du .env.local
const envContent = fs.readFileSync(path.join(ROOT, ".env.local"), "utf8");
const env = {};
for (const line of envContent.split(/\r?\n/)) {
  const trimmed = line.trim();
  if (!trimmed || trimmed.startsWith("#")) continue;
  const idx = trimmed.indexOf("=");
  if (idx === -1) continue;
  const key = trimmed.slice(0, idx).trim();
  const val = trimmed.slice(idx + 1).trim().replace(/^["']|["']$/g, "");
  env[key] = val;
}

const CLOUD_NAME = env.CLOUDINARY_CLOUD_NAME;
const API_KEY    = env.CLOUDINARY_API_KEY;
const API_SECRET = env.CLOUDINARY_API_SECRET;
const FOLDER     = "checkyourdrip/training";

if (!CLOUD_NAME || !API_KEY || !API_SECRET) {
  console.error("Cloudinary credentials manquants dans .env.local");
  process.exit(1);
}

function sign(params) {
  // Trier alphabétiquement, joindre en key=value&key=value, puis append secret
  const str = Object.keys(params)
    .sort()
    .map((k) => `${k}=${params[k]}`)
    .join("&") + API_SECRET;

  return crypto.createHash("sha1").update(str).digest("hex");
}

async function upload(filePath) {
  const filename = path.basename(filePath, path.extname(filePath));
  const timestamp = Math.floor(Date.now() / 1000);

  const params = {
    folder: FOLDER,
    public_id: filename,
    timestamp,
  };

  const signature = sign(params);

  const form = new FormData();
  form.append("file", new Blob([fs.readFileSync(filePath)]), path.basename(filePath));
  form.append("api_key", API_KEY);
  form.append("timestamp", String(timestamp));
  form.append("signature", signature);
  form.append("folder", FOLDER);
  form.append("public_id", filename);

  const res = await fetch(
    `https://api.cloudinary.com/v1_1/${CLOUD_NAME}/image/upload`,
    { method: "POST", body: form }
  );

  const json = await res.json();
  if (json.error) throw new Error(json.error.message);
  return json.secure_url;
}

const imagesDir = path.join(ROOT, "docs", "training");
const files = fs.readdirSync(imagesDir).filter((f) => /\.(png|jpg)$/i.test(f));

console.log(`Upload de ${files.length} images vers Cloudinary (${CLOUD_NAME})...\n`);

const mapping = {};

for (const file of files) {
  process.stdout.write(`  ${file} ... `);
  try {
    const url = await upload(path.join(imagesDir, file));
    mapping[file] = url;
    console.log("OK");
  } catch (err) {
    console.log(`ERREUR: ${err.message}`);
  }
}

// Mettre à jour le README
let readme = fs.readFileSync(path.join(ROOT, "README.md"), "utf8");
let replacements = 0;

for (const [file, url] of Object.entries(mapping)) {
  const localPath = `docs/training/${file}`;
  if (readme.includes(localPath)) {
    readme = readme.replaceAll(localPath, url);
    replacements++;
  }
}

fs.writeFileSync(path.join(ROOT, "README.md"), readme);

const mappingPath = path.join(ROOT, "scripts", "cloudinary-urls.json");
fs.writeFileSync(mappingPath, JSON.stringify(mapping, null, 2));

console.log(`\n${replacements} chemins mis à jour dans README.md`);
console.log(`Mapping complet : scripts/cloudinary-urls.json`);
