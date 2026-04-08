#!/usr/bin/env -S deno run --allow-read --allow-write --allow-run=git

const level = Deno.args[0] as "major" | "minor" | "patch" | undefined;
if (!level || !["major", "minor", "patch"].includes(level)) {
  console.error("Usage: bump-version.ts <major|minor|patch>");
  Deno.exit(1);
}

// Check for clean working tree
const gitStatus = new Deno.Command("git", { args: ["status", "--porcelain"], stdout: "piped" });
const statusResult = await gitStatus.output();
const statusOutput = new TextDecoder().decode(statusResult.stdout).trim();
if (statusOutput) {
  console.error("Git working directory not clean. Please commit or stash changes first.");
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

// Git commit and tag
const tag = `v${newVersion}`;
const gitAdd = new Deno.Command("git", { args: ["add", "deno.json", "lib/version.ts"] });
const addResult = await gitAdd.output();
if (!addResult.success) {
  console.error("Failed to stage files");
  Deno.exit(1);
}

const gitCommit = new Deno.Command("git", { args: ["commit", "-m", newVersion] });
const commitResult = await gitCommit.output();
if (!commitResult.success) {
  console.error("Failed to commit");
  Deno.exit(1);
}

const gitTag = new Deno.Command("git", { args: ["tag", tag] });
const tagResult = await gitTag.output();
if (!tagResult.success) {
  console.error("Failed to create tag");
  Deno.exit(1);
}

console.log(`Tagged ${tag}`);
