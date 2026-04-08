#!/usr/bin/env -S deno run --allow-read --allow-write

const level = Deno.args[0] as "major" | "minor" | "patch" | undefined;
if (!level || !["major", "minor", "patch"].includes(level)) {
  console.error("Usage: bump-version.ts <major|minor|patch>");
  Deno.exit(1);
}

// Read and bump version in deno.json
const denoJsonPath = new URL("../deno.json", import.meta.url);
const denoJson = JSON.parse(await Deno.readTextFile(denoJsonPath));
const [major, minor, patch] = denoJson.version.split(".").map(Number);

const newVersion =
  level === "major"
    ? `${major + 1}.0.0`
    : level === "minor"
      ? `${major}.${minor + 1}.0`
      : `${major}.${minor}.${patch + 1}`;

denoJson.version = newVersion;
await Deno.writeTextFile(denoJsonPath, JSON.stringify(denoJson, null, 2) + "\n");

// Update lib/version.ts
const versionTsPath = new URL("../lib/version.ts", import.meta.url);
await Deno.writeTextFile(versionTsPath, `export const VERSION = "${newVersion}";\n`);

console.log(`${[major, minor, patch].join(".")} → ${newVersion}`);
