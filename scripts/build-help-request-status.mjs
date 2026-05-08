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

function requestNeedsExternalSession(text) {
  const normalized = normalize(text);
  if (!normalized) {
    return false;
  }

  return [
    "your own authenticated",
    "your own browser session",
    "from your own browser",
    "outside this workspace",
    "outside the workspace",
    "manual browser session"
  ].some((phrase) => normalized.includes(phrase));
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
      const requestCoverage = overlap.length / requestTokens.length;
      const entryCoverage = entryTokens.size === 0 ? 0 : overlap.length / entryTokens.size;
      return {
        ...entry,
        overlap,
        score: overlap.length,
        requestCoverage,
        entryCoverage
      };
    })
    .filter((entry) => entry.score >= 3)
    .sort((left, right) => {
      if (right.requestCoverage !== left.requestCoverage) {
        return right.requestCoverage - left.requestCoverage;
      }
      if (right.score !== left.score) {
        return right.score - left.score;
      }
      return right.entryCoverage - left.entryCoverage;
    });
}

function extractOpenBlockers(relatedEntries) {
  const blockers = relatedEntries
    .map((entry) => {
      const resolution = extractResolution(entry.body).replace(/\s+/g, " ").trim();
      if (!/\bblocked\b/i.test(resolution)) {
        return null;
      }

      return {
        heading: entry.heading,
        body: entry.body,
        resolution
      };
    })
    .filter(Boolean);

  if (blockers.length === 0) {
    return [];
  }

  const latestResolvedDate = relatedEntries
    .filter((entry) => {
      const resolution = extractResolution(entry.body).replace(/\s+/g, " ").trim();
      return resolution && !/\bblocked\b/i.test(resolution);
    })
    .map((entry) => parseIsoDate(extractClosedDate(entry.body)))
    .filter((value) => value instanceof Date && !Number.isNaN(value.getTime()))
    .sort((left, right) => right.getTime() - left.getTime())[0] || null;

  if (!latestResolvedDate) {
    return blockers;
  }

  return blockers.filter((blocker) => {
    const blockedDate = parseIsoDate(extractClosedDate(blocker.body));
    if (!(blockedDate instanceof Date) || Number.isNaN(blockedDate.getTime())) {
      return false;
    }
    return blockedDate.getTime() >= latestResolvedDate.getTime();
  });
}

function selectCarryForwardBlocker(relatedEntries) {
  for (const entry of relatedEntries) {
    const resolution = extractResolution(entry.body).replace(/\s+/g, " ").trim();
    if (!/\bblocked\b/i.test(resolution)) {
      continue;
    }

    if (entry.score >= 4 && entry.requestCoverage >= 0.45) {
      return {
        heading: entry.heading,
        resolution
      };
    }
  }

  return null;
}

function extractExternalSessionConstraints(requestText, relatedEntries) {
  const constraints = [];
  if (!requestNeedsExternalSession(requestText)) {
    return constraints;
  }

  constraints.push({
    heading: "Current request requirement",
    resolution: "This request requires a human-owned authenticated browser session outside this workspace."
  });

  for (const entry of relatedEntries) {
    const resolution = extractResolution(entry.body).replace(/\s+/g, " ").trim();
    if (!/\bblocked\b/i.test(resolution)) {
      continue;
    }
    if (!/authenticated|browser session|workspace does not expose/i.test(resolution)) {
      continue;
    }

    constraints.push({
      heading: entry.heading,
      resolution
    });
    break;
  }

  return constraints;
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

async function probeThread(url) {
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), 12000);

  try {
    const response = await fetch(url, {
      headers: {
        "user-agent": "noticekit-help-request-probe/1.0"
      },
      redirect: "follow",
      signal: controller.signal
    });
    const body = await response.text();
    const compactBody = body.replace(/\s+/g, " ").trim();

    if (
      response.status === 403 ||
      /whoa there, pardner|request has been blocked due to a network policy/i.test(compactBody)
    ) {
      return {
        status: "workspace-blocked",
        detail: `HTTP ${response.status}; Reddit blocked this workspace request with a network policy page`
      };
    }

    if (!response.ok) {
      return {
        status: "http-error",
        detail: `HTTP ${response.status}; workspace probe could not confirm whether replies are still open`
      };
    }

    return {
      status: "reachable",
      detail: `HTTP ${response.status}; workspace probe reached the thread page`
    };
  } catch (error) {
    if (error instanceof Error && error.name === "AbortError") {
      return {
        status: "timeout",
        detail: "Workspace probe timed out before the thread state could be confirmed"
      };
    }

    return {
      status: "error",
      detail: `Workspace probe failed: ${error instanceof Error ? error.message : String(error)}`
    };
  } finally {
    clearTimeout(timeout);
  }
}

function extractThreadTargets(text) {
  return [...String(text || "").matchAll(/https:\/\/www\.reddit\.com\/r\/[^\s)]+/g)].map((match) => match[0]);
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
const requestRequiresExternalSession = requestNeedsExternalSession(helpRequestText);
const completedEntries = extractCompletedEntries(helpStatusText);
const relatedCompletedEntries = normalizedRequestWhat ? findRelatedEntries(requestWhat, completedEntries) : [];

let matchingEntry = null;

if (normalizedRequestWhat) {
  matchingEntry = completedEntries.find((entry) => normalize(entry.body).includes(normalizedRequestWhat)) || null;
  if (!matchingEntry && normalize(helpStatusText).includes(normalizedRequestWhat)) {
    matchingEntry = {
      heading: "Matched completed note in HELP-STATUS.md",
      body: helpStatusText
    };
  }
  if (
    !matchingEntry &&
    relatedCompletedEntries.length > 0 &&
    relatedCompletedEntries[0].score >= 4 &&
    relatedCompletedEntries[0].requestCoverage >= 0.7
  ) {
    matchingEntry = {
      heading: relatedCompletedEntries[0].heading,
      body: relatedCompletedEntries[0].body
    };
  }
}

const relatedEntries = requestWhat ? findRelatedEntries(requestWhat, completedEntries) : [];
const externalSessionConstraints = requestWhat ? extractExternalSessionConstraints(helpRequestText, relatedEntries) : [];
const operatorBlockers = requestWhat && !requestRequiresExternalSession ? extractOperatorBlockers(helpStatusText) : [];
const relatedBlockers = requestWhat && !requestRequiresExternalSession ? extractOpenBlockers(relatedEntries) : [];
const threadTargets = [...new Set(extractThreadTargets(helpRequestText))];
const threadProbes = await Promise.all(threadTargets.map(probeThread));
const carryForwardBlocker = requestWhat && !matchingEntry && !requestRequiresExternalSession
  ? selectCarryForwardBlocker(relatedEntries)
  : null;
const status = matchingEntry
  ? "completed"
  : requestWhat
    ? (operatorBlockers.length > 0 || relatedBlockers.length > 0 || carryForwardBlocker ? "blocked" : "open")
    : "missing";
const openBlockers = status === "blocked"
  ? (operatorBlockers.length > 0
      ? operatorBlockers
      : (relatedBlockers.length > 0 ? relatedBlockers : (carryForwardBlocker ? [carryForwardBlocker] : [])))
  : [];
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
} else if (status === "blocked") {
  output.push("- The active request is still blocked by an unresolved blocker already recorded in `HELP-STATUS.md`.");
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

if (externalSessionConstraints.length > 0) {
  output.push("");
  output.push("## Active Constraints");
  output.push("");

  for (const constraint of externalSessionConstraints) {
    output.push(`- ${constraint.resolution}`);
    output.push(`  - Source: ${constraint.heading}`);
  }
}

if (threadTargets.length > 0) {
  output.push("");
  output.push("## Workspace Thread Probe");
  output.push("");
  output.push("- These checks come from the current workspace only; they do not prove whether a human-authenticated browser can still reply.");
  output.push(`- Checked at: ${checkedAt}`);

  for (let index = 0; index < threadTargets.length; index += 1) {
    const probe = threadProbes[index];
    output.push(`- ${threadTargets[index]} -> \`${probe.status}\`: ${probe.detail}`);
  }
}

output.push("");
await writeFile(OUTPUT, output.join("\n"));
console.log(`Wrote ${OUTPUT}`);
