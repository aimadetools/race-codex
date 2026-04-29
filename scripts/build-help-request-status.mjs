#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();
const HELP_REQUEST_FILE = join(ROOT, "HELP-REQUEST.md");
const HELP_STATUS_FILE = join(ROOT, "HELP-STATUS.md");
const OUTPUT = join(ROOT, "HELP-REQUEST-STATUS.md");

function formatUtcTimestamp(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute} UTC`;
}

function extractField(text, label) {
  const match = text.match(new RegExp(`^${label}:\\s*(.+)$`, "im"));
  return match ? match[1].trim() : "";
}

function normalize(text) {
  return String(text || "")
    .toLowerCase()
    .replace(/[`*_]/g, "")
    .replace(/\s+/g, " ")
    .trim();
}

function extractCompletedEntries(text) {
  const sections = text.split(/\n(?=###\s+)/);
  return sections
    .filter((section) => section.trim().startsWith("### "))
    .map((section) => {
      const lines = section.trim().split(/\r?\n/);
      const heading = lines[0].replace(/^###\s+/, "").trim();
      return {
        heading,
        body: section
      };
    });
}

const checkedAt = formatUtcTimestamp(new Date());
const helpRequestText = await readFile(HELP_REQUEST_FILE, "utf8").catch(() => "");
const helpStatusText = await readFile(HELP_STATUS_FILE, "utf8").catch(() => "");

const requestWhat = extractField(helpRequestText, "What");
const requestPriority = extractField(helpRequestText, "Priority") || "unknown";
const requestBudget = extractField(helpRequestText, "Budget") || "unknown";
const requestTime = extractField(helpRequestText, "Time") || "unknown";
const requestSteps = [...helpRequestText.matchAll(/^\d+\.\s+(.+)$/gm)].map((match) => match[1].trim());
const normalizedRequestWhat = normalize(requestWhat);
const completedEntries = extractCompletedEntries(helpStatusText);

let matchingEntry = null;

if (normalizedRequestWhat) {
  matchingEntry = completedEntries.find((entry) => normalize(entry.body).includes(normalizedRequestWhat)) || null;
  if (!matchingEntry && normalize(helpStatusText).includes(normalizedRequestWhat)) {
    matchingEntry = {
      heading: "Matched completed note in HELP-STATUS.md",
      body: helpStatusText
    };
  }
}

const status = matchingEntry ? "completed" : requestWhat ? "open" : "missing";
const output = [
  "# Help Request Status",
  "",
  `Checked at: ${checkedAt}`,
  "",
  "## Current Request",
  "",
  `- Status: ${status}`,
  `- What: ${requestWhat || "No current request found."}`,
  `- Priority: ${requestPriority}`,
  `- Time: ${requestTime}`,
  `- Budget: ${requestBudget}`,
  ""
];

if (requestSteps.length > 0) {
  output.push("## Requested Steps", "");
  for (const step of requestSteps) {
    output.push(`- ${step}`);
  }
  output.push("");
}

output.push("## Resolution");
output.push("");

if (matchingEntry) {
  output.push(`- Matching completed entry: ${matchingEntry.heading}`);
} else if (status === "open") {
  output.push("- No matching completion note is present in `HELP-STATUS.md` yet.");
} else {
  output.push("- `HELP-REQUEST.md` does not define an active request.");
}

output.push("");
await writeFile(OUTPUT, output.join("\n"));
console.log(`Wrote ${OUTPUT}`);
