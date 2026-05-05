#!/usr/bin/env node

import { readdir, readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();
const HELP_REQUEST_FILE = join(ROOT, "HELP-REQUEST.md");
const HELP_REQUESTS_DIR = join(ROOT, "help-requests");
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

function extractRequestedSteps(text) {
  const lines = text.split(/\r?\n/);
  const steps = [];

  for (let index = 0; index < lines.length; index += 1) {
    const line = lines[index];
    const stepMatch = line.match(/^\d+\.\s+(.+)$/);
    if (!stepMatch) {
      continue;
    }

    const step = {
      text: stepMatch[1].trim(),
      substeps: []
    };

    let cursor = index + 1;
    while (cursor < lines.length) {
      const nestedMatch = lines[cursor].match(/^\s*-\s+(.+)$/);
      if (!nestedMatch) {
        break;
      }

      step.substeps.push(nestedMatch[1].trim());
      cursor += 1;
    }

    steps.push(step);
    index = cursor - 1;
  }

  return steps;
}

function extractResolution(text) {
  const match = text.match(/\*\*Human response.*?:\*\*\s*([\s\S]*?)(?=\n### |\n## |$)/i);
  return match ? match[1].trim() : "";
}

function parseIsoDate(value) {
  const text = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return null;
  }
  return new Date(`${text}T00:00:00Z`);
}

function formatRelativeAge(target, now = new Date()) {
  if (!(target instanceof Date) || Number.isNaN(target.getTime())) {
    return "age unknown";
  }

  const diffMs = now.getTime() - target.getTime();
  const future = diffMs < 0;
  const absoluteDays = Math.floor(Math.abs(diffMs) / 86400000);
  if (absoluteDays === 0) {
    return future ? "today or later" : "today";
  }
  return future
    ? `in ${absoluteDays} day${absoluteDays === 1 ? "" : "s"}`
    : `${absoluteDays} day${absoluteDays === 1 ? "" : "s"} ago`;
}

function extractClosedDate(text) {
  const match = String(text || "").match(/closed (\d{4}-\d{2}-\d{2})/i);
  return match ? match[1] : "";
}

async function readActiveRequestText() {
  const directRequestText = await readFile(HELP_REQUEST_FILE, "utf8").catch(() => "");
  if (directRequestText.trim()) {
    return {
      text: directRequestText,
      source: "HELP-REQUEST.md"
    };
  }

  const requestFiles = (await readdir(HELP_REQUESTS_DIR).catch(() => []))
    .filter((name) => /^\d{8}-\d{6}-HELP-REQUEST\.md$/.test(name))
    .sort()
    .reverse();

  if (requestFiles.length === 0) {
    return {
      text: "",
      source: ""
    };
  }

  const latestFile = requestFiles[0];
  const text = await readFile(join(HELP_REQUESTS_DIR, latestFile), "utf8").catch(() => "");
  return {
    text,
    source: `help-requests/${latestFile}`
  };
}

function tokenize(text) {
  return normalize(text)
    .split(/[^a-z0-9.://-]+/)
    .filter((token) => token.length >= 4)
    .filter((token) => !new Set([
      "what",
      "with",
      "that",
      "this",
      "from",
      "have",
      "will",
      "your",
      "into",
      "were",
      "they",
      "them",
      "then",
      "same",
      "page",
      "pages",
      "request",
      "requests",
      "exact",
      "steps",
      "using",
      "setup"
    ]).has(token));
}

function findRelatedEntries(requestText, entries) {
  const requestTokens = [...new Set(tokenize(requestText))];
  if (requestTokens.length === 0) {
    return [];
  }

  return entries
    .map((entry) => {
      const haystack = `${entry.heading}\n${entry.body}`;
      const entryTokens = new Set(tokenize(haystack));
      const overlap = requestTokens.filter((token) => entryTokens.has(token));
      return {
        ...entry,
        overlap,
        score: overlap.length
      };
    })
    .filter((entry) => entry.score >= 3)
    .sort((left, right) => right.score - left.score);
}

function extractOpenBlockers(relatedEntries) {
  return relatedEntries
    .map((entry) => {
      const resolution = extractResolution(entry.body).replace(/\s+/g, " ").trim();
      if (!/\bblocked\b/i.test(resolution)) {
        return null;
      }

      return {
        heading: entry.heading,
        resolution
      };
    })
    .filter(Boolean);
}

function extractOperatorBlockers(text) {
  const operatorNoteMatch = text.match(/##\s+\d{4}-\d{2}-\d{2} Operator Note[\s\S]*?(?=\n## |\n$)/i);
  if (!operatorNoteMatch) {
    return [];
  }

  const bulletLines = operatorNoteMatch[0]
    .split(/\r?\n/)
    .map((line) => line.replace(/^\-\s+/, "").trim())
    .filter(Boolean);

  const blockerLines = bulletLines.filter((line) =>
    /authenticated|workspace does not expose|could not complete|blocked|current help request/i.test(line)
  );

  return blockerLines.map((resolution) => ({
    heading: "HELP-STATUS.md operator note",
    resolution
  }));
}

const checkedAt = formatUtcTimestamp(new Date());
const { text: helpRequestText, source: helpRequestSource } = await readActiveRequestText();
const helpStatusText = await readFile(HELP_STATUS_FILE, "utf8").catch(() => "");

const requestWhat = extractField(helpRequestText, "What");
const requestPriority = extractField(helpRequestText, "Priority") || "unknown";
const requestBudget = extractField(helpRequestText, "Budget") || "unknown";
const requestTime = extractField(helpRequestText, "Time") || "unknown";
const requestSteps = extractRequestedSteps(helpRequestText);
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
const relatedEntries = status === "open" ? findRelatedEntries(requestWhat, completedEntries) : [];
const operatorBlockers = status === "open" ? extractOperatorBlockers(helpStatusText) : [];
const openBlockers = operatorBlockers.length > 0 ? operatorBlockers : (status === "open" ? extractOpenBlockers(relatedEntries) : []);
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
    output.push(`- ${step.text}`);
    for (const substep of step.substeps) {
      output.push(`  - ${substep}`);
    }
  }
  output.push("");
}

if (helpRequestSource) {
  output.push(`- Active request source: ${helpRequestSource}`);
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

if (relatedEntries.length > 0) {
  output.push("");
  output.push("## Related History");
  output.push("");

  const latestClosedDate = relatedEntries
    .map((entry) => extractClosedDate(entry.body))
    .filter(Boolean)
    .sort((left, right) => right.localeCompare(left))[0];

  if (latestClosedDate) {
    output.push(`- Latest related note closed on: ${latestClosedDate} (${formatRelativeAge(parseIsoDate(latestClosedDate))})`);
  }

  for (const entry of relatedEntries.slice(0, 2)) {
    const resolution = extractResolution(entry.body).replace(/\s+/g, " ").trim();
    output.push(`- ${entry.heading}`);
    output.push(`  - Shared keywords: ${entry.overlap.join(", ")}`);
    output.push(`  - Human response: ${resolution || "No response text extracted."}`);
  }
}

if (openBlockers.length > 0) {
  output.push("");
  output.push("## Open Blockers");
  output.push("");

  for (const blocker of openBlockers) {
    output.push(`- ${blocker.resolution}`);
    output.push(`  - Source: ${blocker.heading}`);
  }
}

output.push("");
await writeFile(OUTPUT, output.join("\n"));
console.log(`Wrote ${OUTPUT}`);
