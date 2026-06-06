const fs = require("node:fs");
const path = require("node:path");
const src = path.resolve(__dirname, "..", "src", "playbooks");
const dst = path.resolve(__dirname, "..", "dist", "playbooks");
if (!fs.existsSync(src)) {
  console.error(`source playbooks dir missing: ${src}`);
  process.exit(1);
}
fs.rmSync(dst, { recursive: true, force: true });
fs.cpSync(src, dst, { recursive: true });
console.log(`copied playbooks: ${src} -> ${dst}`);
