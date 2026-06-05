import path from "node:path";
import fs from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * Resolve a bundle subdirectory shipped with the package.
 * Works from src/<module>.ts under tsx, and from dist/<module>.js after build.
 * In both cases the directory sits next to this file (same parent dir).
 */
export function resolveBundleDir(name: string): string {
  // Optional override (used by tests for isolation): EASYPRM_BUNDLE_<UPPER_NAME>
  const envKey = `EASYPRM_BUNDLE_${name.toUpperCase().replace(/[^A-Z0-9]/g, "_")}`;
  const override = process.env[envKey];
  if (override) {
    if (fs.existsSync(override) && fs.statSync(override).isDirectory()) return override;
    throw new Error(`bundle directory not found: ${name} (override ${envKey}=${override} does not exist or is not a directory)`);
  }
  const here = path.dirname(fileURLToPath(import.meta.url));
  const candidate = path.resolve(here, name);
  if (fs.existsSync(candidate) && fs.statSync(candidate).isDirectory()) return candidate;
  throw new Error(`bundle directory not found: ${name} (looked in ${candidate})`);
}
