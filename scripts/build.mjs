// Builds the two loadable extensions into dist/:
//   dist/firefox  = shared/ + firefox/   (Firefox and Zen)
//   dist/chrome   = shared/ + chrome/    (Chrome, Brave, Edge and other Chromium browsers)
// Files in the browser's own folder win over files in shared/.
//
// Usage: node scripts/build.mjs [firefox] [chrome]
import { cpSync, existsSync, readFileSync, rmSync } from "node:fs";
import { dirname, join, relative } from "node:path";
import { fileURLToPath } from "node:url";

const root = join(dirname(fileURLToPath(import.meta.url)), "..");
const dist = join(root, "dist");

// Shared files a browser doesn't use are left out of its build.
const EXCLUDE = {
  firefox: [],
  chrome: ["content/opener.js", "icons/icon.svg"],
};

const readJson = path => JSON.parse(readFileSync(path, "utf8"));
const version = readJson(join(root, "package.json")).version;

const wanted = process.argv.slice(2);
const targets = wanted.length ? wanted : Object.keys(EXCLUDE);

for (const target of targets) {
  if (!(target in EXCLUDE)) throw new Error(`Unknown target "${target}" (use firefox or chrome)`);

  const manifest = readJson(join(root, target, "manifest.json"));
  if (manifest.version !== version) {
    throw new Error(`${target}/manifest.json is version ${manifest.version} but package.json is ${version}`);
  }

  const out = join(dist, target);
  rmSync(out, { recursive: true, force: true });

  const shared = join(root, "shared");
  const skip = new Set(EXCLUDE[target]);
  cpSync(shared, out, {
    recursive: true,
    filter: src => !skip.has(relative(shared, src).replaceAll("\\", "/")),
  });
  cpSync(join(root, target), out, { recursive: true });

  if (!existsSync(join(out, "manifest.json"))) throw new Error(`${target}: manifest.json missing`);
  console.log(`built dist/${target} (v${version})`);
}
