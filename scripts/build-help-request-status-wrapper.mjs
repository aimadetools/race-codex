#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const ROOT = process.cwd();
const HELP_REQUEST_FILE = join(ROOT, "HELP-REQUEST.md");
const HELP_RESPONSES_FILE = join(ROOT, "HELP-RESPONSES.md");
const HELP_STATUS_FILE = join(ROOT, "HELP-STATUS.md");
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

function extractOpenHelpStatusRequest(text) {
  const openBlockMatch = String(text || "").match(/## 🔄 Open Requests[\s\S]*?(?=\n## |\n---|$)/i);
  if (!openBlockMatch) {
    return null;
  }

  const openBlock = openBlockMatch[0];

  const sectionMatch = openBlock.match(/###\s+\[HELP\]\s+What:\s*(.+?)(?=\n\*\*Human response:|\n### |\n## |$)/i);
  if (!sectionMatch) {
    return null;
  }

  const what = sectionMatch[1].trim().replace(/\*\*$/, "").trim();
  const responseMatch = openBlock.match(/\*\*Human response.*?:\*\*\s*([\s\S]*?)(?=\n-\s+\d{4}-\d{2}-\d{2}|\n### |\n## |$)/i);
  const response = responseMatch ? responseMatch[1].trim() : "";
  const status = /\bpending\b/i.test(response) ? "open" : /\bblocked\b/i.test(response) ? "blocked" : "open";
  const blockers = [...new Set(
    openBlock
      .split(/\r?\n/)
      .map((line) => line.trim())
      .filter((line) => /^-\s+Remaining blocker:/i.test(line))
      .map((line) => line.replace(/^-\s+Remaining blocker:\s*/i, "").trim())
  )];
  const latestPublicCheck = openBlock
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /^-\s+\d{4}-\d{2}-\d{2}.*public web check:/i.test(line))
    .at(0)
    ?.replace(/^-\s+/, "")
    .trim() || "";

  return {
    status,
    what,
    response,
    blockers,
    latestPublicCheck
  };
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

async function writeOpenHelpStatusSnapshot(openRequest) {
  const checkedAt = formatUtcTimestamp(new Date());
  const output = [
    "# Help Request Status",
    "",
    `Checked at: ${checkedAt}`,
    "",
    "## Current Request",
    "",
    `- Status: ${openRequest.status}`,
    `- What: ${openRequest.what || "No current request found."}`,
    "- Priority: unknown",
    "- Time: unknown",
    "- Budget: unknown",
    "",
    "- Active request source: HELP-STATUS.md",
    "",
    "## Resolution",
    "",
    openRequest.response
      ? `- Open operator note from \`HELP-STATUS.md\`: ${openRequest.response}`
      : "- `HELP-STATUS.md` still shows an open request, but no operator response note was extracted.",
    ""
  ];

  if (openRequest.latestPublicCheck) {
    output.push("## Latest Public Check", "");
    output.push(`- ${openRequest.latestPublicCheck}`);
    output.push("");
  }

  if (openRequest.blockers?.length) {
    output.push("## Open Blockers", "");
    for (const blocker of openRequest.blockers) {
      output.push(`- ${blocker}`);
    }
    output.push("");
  }

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
  const helpStatusText = await readFile(HELP_STATUS_FILE, "utf8").catch(() => "");
  const openHelpStatusRequest = extractOpenHelpStatusRequest(helpStatusText);

  if (openHelpStatusRequest) {
    await writeOpenHelpStatusSnapshot(openHelpStatusRequest);
    return;
  }

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
