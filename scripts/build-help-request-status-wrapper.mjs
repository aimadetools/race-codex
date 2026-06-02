#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const ROOT = process.cwd();
const HELP_REQUEST_FILE = join(ROOT, "HELP-REQUEST.md");
const HELP_RESPONSES_FILE = join(ROOT, "HELP-RESPONSES.md");
const LEGACY_SCRIPT = join(ROOT, "scripts", "build-help-request-status.mjs");
const OUTPUT = join(ROOT, "HELP-REQUEST-STATUS.md");

function formatUtcTimestamp(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute} UTC`;
}

function pendingHelpResponsesState(text) {
  const pendingBlockMatch = String(text || "").match(/## Pending[\s\S]*?(?=\n## |\n---|$)/i);
  if (!pendingBlockMatch) {
    return "unknown";
  }

  if (/\[none currently\]|\bnone currently\b/i.test(pendingBlockMatch[0])) {
    return "none";
  }

  const pendingBullets = pendingBlockMatch[0]
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^-\s+/.test(line) && !/\[none currently\]/i.test(line));

  return pendingBullets.length > 0 ? "has-pending" : "unknown";
}

async function writeNoActiveRequestSnapshot() {
  const checkedAt = formatUtcTimestamp(new Date());
  const output = [
    "# Help Request Status",
    "",
    `Checked at: ${checkedAt}`,
    "",
    "## Current Request",
    "",
    "- Status: missing",
    "- What: No current request found.",
    "- Priority: unknown",
    "- Time: unknown",
    "- Budget: unknown",
    "",
    "## Resolution",
    "",
    "- `HELP-RESPONSES.md` shows no pending human requests, so archived `help-requests/*.md` files are not treated as active work.",
    ""
  ];

  await writeFile(OUTPUT, output.join("\n"));
  console.log(`Wrote ${OUTPUT}`);
}

async function main() {
  const directRequestText = await readFile(HELP_REQUEST_FILE, "utf8").catch(() => "");
  if (directRequestText.trim()) {
    const result = spawnSync("node", [LEGACY_SCRIPT], { cwd: ROOT, encoding: "utf8" });
    if (result.stdout) {
      process.stdout.write(result.stdout);
    }
    if (result.stderr) {
      process.stderr.write(result.stderr);
    }
    process.exit(result.status ?? 1);
  }

  const helpResponsesText = await readFile(HELP_RESPONSES_FILE, "utf8").catch(() => "");
  if (pendingHelpResponsesState(helpResponsesText) === "none") {
    await writeNoActiveRequestSnapshot();
    return;
  }

  const result = spawnSync("node", [LEGACY_SCRIPT], { cwd: ROOT, encoding: "utf8" });
  if (result.stdout) {
    process.stdout.write(result.stdout);
  }
  if (result.stderr) {
    process.stderr.write(result.stderr);
  }
  process.exit(result.status ?? 1);
}

await main();
