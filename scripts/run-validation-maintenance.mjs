#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const ROOT = process.cwd();
const FEEDBACK_FILE = join(ROOT, "COMMUNITY-FEEDBACK.md");
const RECHECK_TIMESTAMP_PATTERN = /^Rechecked on (.+? UTC):/i;

function formatUtcTimestamp(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute} UTC`;
}

function formatUtcDateKey(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  return `${year}-${month}-${day}`;
}

function parseUtcTimestamp(value) {
  const text = String(value || "").trim();
  let match = text.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}) UTC$/);
  if (match) {
    const [, year, month, day, hour, minute] = match;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)));
  }

  match = text.match(/^(\d{4})-(\d{2})-(\d{2}) UTC$/);
  if (match) {
    const [, year, month, day] = match;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 0, 0));
  }

  return null;
}

function extractLatestCheckpoint(text) {
  let latestText = null;
  let latestDate = null;

  for (const line of text.split("\n")) {
    const match = line.match(RECHECK_TIMESTAMP_PATTERN);
    if (!match) {
      continue;
    }

    const timestamp = match[1].trim();
    const parsed = parseUtcTimestamp(timestamp);
    if (!parsed) {
      continue;
    }

    if (!latestDate || parsed > latestDate) {
      latestDate = parsed;
      latestText = timestamp;
    }
  }

  return {
    latestDate,
    latestText
  };
}

function runCommand(label, args) {
  const result = spawnSync(args[0], args.slice(1), {
    cwd: ROOT,
    encoding: "utf8"
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.status !== 0) {
    throw new Error(`${label} failed.`);
  }
}

async function main() {
  const feedbackText = await readFile(FEEDBACK_FILE, "utf8");
  const { latestDate, latestText } = extractLatestCheckpoint(feedbackText);
  const now = new Date();
  const nowText = formatUtcTimestamp(now);
  const nowDateKey = formatUtcDateKey(now);
  const latestDateKey = latestDate ? formatUtcDateKey(latestDate) : "";
  const effectiveDate = latestDate && latestDate > now && latestDateKey > nowDateKey ? latestDate : now;
  const effectiveText = formatUtcTimestamp(effectiveDate);

  if (latestDate && latestDate > now && latestDateKey > nowDateKey) {
    console.log(`Repo memory is ahead of the current system clock. Using safe checkpoint timestamp ${effectiveText} from COMMUNITY-FEEDBACK.md instead of ${nowText}.`);
  } else if (latestDate && latestDate > now && latestDateKey === nowDateKey) {
    console.log(`Latest checkpoint ${latestText} is later today than the current system clock ${nowText}. Clamping this maintenance pass to the current UTC timestamp.`);
  } else {
    console.log(`Using current UTC checkpoint timestamp ${effectiveText}.`);
  }

  if (latestText) {
    console.log(`Latest recorded checkpoint before this pass: ${latestText}`);
  }

  runCommand("Validation watch", ["npm", "run", "check:validation-watch"]);
  runCommand("Self-audit follow-up QA", ["npm", "run", "check:self-audit-follow-up"]);
  runCommand("Contact webhook record check", ["npm", "run", "check:contact-webhook-record"]);
  runCommand("Free teardown handoff check", ["npm", "run", "check:free-teardown-handoff"]);
  runCommand("Self-audit production check", ["npm", "run", "check:self-audit-production"]);
  runCommand("Source tag coverage check", ["npm", "run", "check:source-tag-coverage"]);
  runCommand("Structured-data ItemList check", ["npm", "run", "check:structured-data"]);
  runCommand("Site link check", ["npm", "run", "check:site-links"]);
  runCommand("No-reply checkpoint log", [
    "npm",
    "run",
    "log:validation-no-reply-check",
    "--",
    "--timestamp",
    effectiveText
  ]);
  runCommand("Validation artifact sync", ["npm", "run", "sync:validation-artifacts"]);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
