#!/usr/bin/env node

import { readdir, readFile } from "node:fs/promises";
import { join, relative } from "node:path";
import {
  buildAiDealBlockerBranchSourceTags,
  buildAiDealBlockerRequestSourceTags
} from "./ai-deal-blocker-source-tags.mjs";
import { WATCHED_SOURCE_TAGS } from "./watched-source-tags.mjs";

const ROOT = process.cwd();
const SOURCE_TAG_PATTERN = /source=([a-z0-9-]+)/g;
const INCLUDED_EXTENSIONS = new Set([".html", ".md", ".mjs", ".js"]);
const SKIP_DIRS = new Set([".git", ".vercel", "node_modules", "logs"]);

function hasIncludedExtension(filePath) {
  for (const extension of INCLUDED_EXTENSIONS) {
    if (filePath.endsWith(extension)) {
      return true;
    }
  }

  return false;
}

async function collectFiles(dir) {
  const entries = await readdir(dir, { withFileTypes: true });
  const files = [];

  for (const entry of entries) {
    if (entry.name.startsWith(".") && entry.name !== ".env.local" && entry.name !== ".env.production.local") {
      continue;
    }

    const fullPath = join(dir, entry.name);
    if (entry.isDirectory()) {
      if (SKIP_DIRS.has(entry.name)) {
        continue;
      }
      files.push(...await collectFiles(fullPath));
      continue;
    }

    if (hasIncludedExtension(fullPath)) {
      files.push(fullPath);
    }
  }

  return files;
}

async function main() {
  const files = await collectFiles(ROOT);
  const emittedTags = new Map();

  for (const filePath of files) {
    const text = await readFile(filePath, "utf8");
    for (const match of text.matchAll(SOURCE_TAG_PATTERN)) {
      const tag = match[1];
      const locations = emittedTags.get(tag) || [];
      locations.push(relative(ROOT, filePath));
      emittedTags.set(tag, locations);
    }
  }

  for (const { tag } of buildAiDealBlockerBranchSourceTags()) {
    const locations = emittedTags.get(tag) || [];
    locations.push("ai-deal-blocker.html (runtime branch propagation)");
    emittedTags.set(tag, locations);
  }

  for (const { tag } of buildAiDealBlockerRequestSourceTags()) {
    const locations = emittedTags.get(tag) || [];
    locations.push("ai-deal-blocker.html (runtime inline request propagation)");
    emittedTags.set(tag, locations);
  }

  const emittedTagList = [...emittedTags.keys()].sort();
  const watchedTagSet = new Set(WATCHED_SOURCE_TAGS);
  const missingWatchedTags = emittedTagList.filter((tag) => !watchedTagSet.has(tag));
  const staleWatchedTags = WATCHED_SOURCE_TAGS.filter((tag) => !emittedTags.has(tag));

  if (missingWatchedTags.length > 0 || staleWatchedTags.length > 0) {
    if (missingWatchedTags.length > 0) {
      console.error("Emitted source tags missing from WATCHED_SOURCE_TAGS:");
      for (const tag of missingWatchedTags) {
        const locations = emittedTags.get(tag) || [];
        console.error(`- ${tag} (${locations.join(", ")})`);
      }
    }

    if (staleWatchedTags.length > 0) {
      console.error("WATCHED_SOURCE_TAGS entries not found in emitted source URLs:");
      for (const tag of staleWatchedTags) {
        console.error(`- ${tag}`);
      }
    }

    process.exitCode = 1;
    return;
  }

  console.log(`Checked ${emittedTagList.length} emitted source tags: watcher coverage is complete.`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
