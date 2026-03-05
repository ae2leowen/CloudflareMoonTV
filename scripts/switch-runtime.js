#!/usr/bin/env node
/**
 * switch-runtime.js
 *
 * Replaces the Next.js `export const runtime` value in all API route files.
 * Used by Docker builds to switch from 'edge' to 'nodejs' runtime.
 *
 * Usage:
 *   node scripts/switch-runtime.js --runtime=nodejs
 *   node scripts/switch-runtime.js --runtime=edge
 */

const fs = require('fs');
const path = require('path');

// Parse --runtime=<value> argument
const runtimeArg = process.argv.slice(2).find((a) => a.startsWith('--runtime='));
const targetRuntime = runtimeArg ? runtimeArg.split('=')[1] : 'nodejs';

if (!['nodejs', 'edge'].includes(targetRuntime)) {
  console.error(`Invalid runtime "${targetRuntime}". Use --runtime=nodejs or --runtime=edge`);
  process.exit(1);
}

const RUNTIME_PATTERN = /export const runtime = '(edge|nodejs)';/g;
const REPLACEMENT = `export const runtime = '${targetRuntime}';`;

let updatedCount = 0;

function processDirectory(dir) {
  const entries = fs.readdirSync(dir, { withFileTypes: true });
  for (const entry of entries) {
    const fullPath = path.join(dir, entry.name);
    if (entry.isDirectory()) {
      processDirectory(fullPath);
    } else if (entry.isFile() && (entry.name === 'route.ts' || entry.name === 'route.js')) {
      const original = fs.readFileSync(fullPath, 'utf8');
      const updated = original.replace(RUNTIME_PATTERN, REPLACEMENT);
      if (updated !== original) {
        fs.writeFileSync(fullPath, updated, 'utf8');
        console.log(`  Updated: ${path.relative(process.cwd(), fullPath)}`);
        updatedCount++;
      }
    }
  }
}

const srcDir = path.join(process.cwd(), 'src');
if (!fs.existsSync(srcDir)) {
  console.error(`Source directory not found: ${srcDir}`);
  process.exit(1);
}

console.log(`Switching API route runtime to '${targetRuntime}'...`);
processDirectory(srcDir);
console.log(`Done. Updated ${updatedCount} file(s).`);
