#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { readdir } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();
const HELP_REQUEST_FILE = join(ROOT, "HELP-REQUEST.md");
const HELP_STATUS_FILE = join(ROOT, "HELP-STATUS.md");
const REPLY_PACK_FILE = join(ROOT, "AI-PROCUREMENT-COMMUNITY-REPLY-PACK.md");
const OUTPUT = join(ROOT, "HELP-REQUEST-LAUNCHPAD.md");

function formatUtcTimestamp(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute} UTC`;
}

function extractField(text, label) {
  const match = String(text || "").match(new RegExp(`^${label}:\\s*(.+)$`, "im"));
  if (match) {
    return match[1].trim();
  }

  const line = String(text || "")
    .split(/\r?\n/)
    .find((entry) => new RegExp(`^${label}:\\s*`, "i").test(entry));
  return line ? line.replace(new RegExp(`^${label}:\\s*`, "i"), "").trim() : "";
}

async function readActiveRequestText() {
  const directRequestText = await readFile(HELP_REQUEST_FILE, "utf8").catch(() => "");
  if (directRequestText.trim()) {
    return directRequestText;
  }

  const requestFiles = (await readdir(join(ROOT, "help-requests")).catch(() => []))
    .filter((name) => /^\d{8}-\d{6}-HELP-REQUEST\.md$/.test(name))
    .sort()
    .reverse();

  if (requestFiles.length === 0) {
    return "";
  }

  return readFile(join(ROOT, "help-requests", requestFiles[0]), "utf8").catch(() => "");
}

function parseThreadTargets(text) {
  return [...text.matchAll(/^\s*-\s+(Lead \d+.*?)\s*:\s*(https:\/\/\S+)\s*$/gm)].map((match) => ({
    label: match[1].trim(),
    url: match[2].trim()
  }));
}

function parseAllUrls(text) {
  return [...String(text || "").matchAll(/https:\/\/[^\s)`]+/g)].map((match) => match[0]);
}

function parseRequestedUrls(text) {
  const explicitBulletUrls = [...String(text || "").matchAll(/^\s*-\s+`(https:\/\/[^`]+)`\s*$/gm)].map((match) => match[1].trim());
  if (explicitBulletUrls.length > 0) {
    return explicitBulletUrls;
  }

  return parseAllUrls(text).filter((url) => {
    try {
      const parsed = new URL(url);
      return parsed.pathname && parsed.pathname !== "/";
    } catch {
      return false;
    }
  });
}

function requestNeedsExternalSession(text) {
  const normalized = String(text || "").toLowerCase();
  if (!normalized) {
    return false;
  }

  return [
    "your own authenticated",
    "your own browser session",
    "from your own browser",
    "outside this workspace",
    "outside the workspace",
    "manual browser session",
    "google search console",
    "bing webmaster tools"
  ].some((phrase) => normalized.includes(phrase));
}

function extractServiceTargets(text) {
  const lines = String(text || "").split(/\r?\n/);
  const services = [];

  for (const line of lines) {
    if (/google search console/i.test(line)) {
      services.push("Google Search Console");
    }
    if (/bing webmaster tools/i.test(line)) {
      services.push("Bing Webmaster Tools");
    }
  }

  return [...new Set(services)];
}

function parseLeadSourceTags(text) {
  const mapping = new Map();
  for (const match of text.matchAll(/^\s*-\s+(Lead \d+):.*source tag `([^`]+)`/gm)) {
    mapping.set(match[1].trim(), match[2].trim());
  }
  return mapping;
}

function parseLeadNotes(text) {
  const notes = new Map();
  for (const match of text.matchAll(/^\d+\.\s+For (lead \d+),\s+(.+)$/gim)) {
    notes.set(match[1].replace(/^lead/i, "Lead"), match[2].trim());
  }
  return notes;
}

function parseReplyPack(text) {
  const sections = text.split(/\n(?=### )/);
  const bySourceTag = new Map();

  for (const section of sections) {
    if (!section.trim().startsWith("### ")) {
      continue;
    }

    const heading = section.match(/^###\s+(.+)$/m)?.[1]?.trim() || "Untitled";
    const sourceTag = section.match(/^- Exact source tag:\s*`([^`]+)`/m)?.[1]?.trim() || "";
    if (!sourceTag) {
      continue;
    }

    const fallback = section.match(/^- Fallback if links are not allowed:\s*\n\s*"([\s\S]*?)"/m)?.[1]?.trim() || "";
    const replyDraft = section.match(/^- Reply draft:\s*\n\s*"([\s\S]*?)"/m)?.[1]?.trim() || "";
    const bestAsset = section.match(/^- Best asset:\s*(.+)$/m)?.[1]?.trim() || "";
    const useWhen = section.match(/^- Use when:\s*(.+)$/m)?.[1]?.trim() || "";

    bySourceTag.set(sourceTag, {
      heading,
      bestAsset,
      useWhen,
      fallback,
      replyDraft
    });
  }

  return bySourceTag;
}

function extractLatestRelatedAuthBlocker(text) {
  const entries = text.split(/\n(?=###\s+)/);
  for (const entry of entries) {
    if (!/authenticated reddit posting session|workspace does not expose an authenticated reddit posting session/i.test(entry)) {
      continue;
    }

    const summary = entry.match(/\*\*Human response.*?:\*\*\s*([\s\S]*?)(?=\n### |\n## |$)/i)?.[1]?.replace(/\s+/g, " ").trim();
    if (summary) {
      return summary;
    }
  }

  return "";
}

function compactResolution(text) {
  return String(text || "")
    .replace(/\s+/g, " ")
    .split(/ - \d{4}-\d{2}-\d{2}\s+lead\b/i)[0]
    .trim();
}

function formatReadyLabel(label) {
  return String(label || "").replace(/^Lead\b/, "lead");
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

const checkedAt = formatUtcTimestamp(new Date());
const helpRequestText = await readActiveRequestText();
const helpStatusText = await readFile(HELP_STATUS_FILE, "utf8").catch(() => "");
const replyPackText = await readFile(REPLY_PACK_FILE, "utf8").catch(() => "");

const requestWhat = extractField(helpRequestText, "What") || "No active help request found.";
const requestPriority = extractField(helpRequestText, "Priority") || "unknown";
const requestTime = extractField(helpRequestText, "Time") || "unknown";
const requestBudget = extractField(helpRequestText, "Budget") || "unknown";

const threadTargets = parseThreadTargets(helpRequestText);
const requestedUrls = [...new Set(parseRequestedUrls(helpRequestText))].filter((url) => !/reddit\.com\/r\//i.test(url));
const sourceTags = parseLeadSourceTags(helpRequestText);
const leadNotes = parseLeadNotes(helpRequestText);
const replyPack = parseReplyPack(replyPackText);
const relatedAuthBlocker = compactResolution(extractLatestRelatedAuthBlocker(helpStatusText));
const requestRequiresExternalSession = requestNeedsExternalSession(helpRequestText);
const serviceTargets = extractServiceTargets(helpRequestText);
const threadProbes = new Map(
  await Promise.all(
    threadTargets.map(async (target) => [target.url, await probeThread(target.url)])
  )
);

const output = [
  "# Help Request Launchpad",
  "",
  `Checked at: ${checkedAt}`,
  "",
  "## Current Request",
  "",
  `- What: ${requestWhat}`,
  `- Priority: ${requestPriority}`,
  `- Time: ${requestTime}`,
  `- Budget: ${requestBudget}`,
  ""
];

if (relatedAuthBlocker && threadTargets.length > 0) {
  output.push("## Active Constraint", "");
  output.push(`- ${relatedAuthBlocker}`);
  output.push("");
}

if (threadTargets.length === 0) {
  output.push("## Status", "");
  if (requestedUrls.length === 0) {
    output.push("- No thread-style launch targets were found in `HELP-REQUEST.md`.");
    output.push("");
  } else {
    output.push("- No thread-style launch targets were found in `HELP-REQUEST.md`.");
    output.push("- This request is URL-based, so use the checklist below and record one status line per URL in `HELP-STATUS.md`.");
    output.push("");
    if (requestRequiresExternalSession) {
      output.push("## Active Constraint", "");
      output.push("- This submission flow requires a human-owned authenticated browser session; the workspace cannot submit or verify Search Console / Bing actions directly.");
      output.push("");
    }
    output.push("## Outcome Codes", "");
    output.push("- `submitted`: the console accepted a new indexing request for that URL.");
    output.push("- `already indexed`: the console already showed the URL as indexed or already queued.");
    output.push("- `blocked`: the console could not submit the URL; add the reason.");
    output.push("- `not supported`: the console did not offer direct submission for that URL or service.");
    output.push("");
    output.push("## URL Checklist", "");
    output.push("- Open each requested service in your own authenticated browser session.");
    if (serviceTargets.length > 0) {
      for (const service of serviceTargets) {
        output.push(`- In ${service}, submit each URL exactly as listed below.`);
      }
    } else {
      output.push("- Submit each URL exactly as listed below.");
    }
    output.push("- Update `HELP-STATUS.md` with one line per URL using `submitted`, `already indexed`, `blocked`, or `not supported` plus any useful note.");
    output.push("");
    if (serviceTargets.length > 0) {
      output.push("## Service Checklist", "");
      for (const service of serviceTargets) {
        output.push(`### ${service}`);
        output.push("");
        for (const url of requestedUrls) {
          output.push(`- ${url}`);
        }
        output.push("");
      }
    }
    output.push("## Ready To Paste Into `HELP-STATUS.md`", "");
    for (const url of requestedUrls) {
      output.push(`- ${checkedAt.split(" ")[0]} ${url} -> status: [submitted|already indexed|blocked|not supported]; note: [service + short result]`);
    }
    output.push("");
    output.push("## Requested URLs", "");
    for (const url of requestedUrls) {
      output.push(`- ${url}`);
    }
    output.push("");
  }
} else {
  output.push("## Launch Checklist", "");
  output.push("- Open each target URL from your own authenticated browser session.");
  output.push("- Check the workspace thread probe below first; `workspace-blocked` means only your browser session can confirm whether replies are still open.");
  output.push("- Paste the exact draft below first; if links are blocked, use the fallback text and note `blocked-no-link` in `HELP-STATUS.md`.");
  output.push("- After each attempt, record one outcome in `HELP-STATUS.md`: `posted`, `removed`, `blocked`, `blocked-no-link`, or `no longer open for replies`.");
  output.push("");
  output.push("## Ready To Paste Into `HELP-STATUS.md`", "");

  for (const target of threadTargets) {
    output.push(`- ${checkedAt.split(" ")[0]} ${formatReadyLabel(target.label)}: <posted|removed|blocked|blocked-no-link|no longer open for replies>; add short note or visible reply summary here`);
  }

  output.push("");

  for (const target of threadTargets) {
    const leadKey = target.label.match(/^Lead \d+/)?.[0] || target.label;
    const sourceTag = sourceTags.get(leadKey) || "";
    const packEntry = replyPack.get(sourceTag);
    const note = leadNotes.get(leadKey) || "";
    const probe = threadProbes.get(target.url);

    output.push(`## ${target.label}`, "");
    output.push(`- Thread: ${target.url}`);
    if (probe) {
      output.push(`- Workspace thread probe: \`${probe.status}\``);
      output.push(`- Probe detail: ${probe.detail}`);
    }
    if (sourceTag) {
      output.push(`- Source tag: \`${sourceTag}\``);
    }
    if (packEntry?.bestAsset) {
      output.push(`- Best asset: ${packEntry.bestAsset}`);
    }
    if (packEntry?.useWhen) {
      output.push(`- Use when: ${packEntry.useWhen}`);
    }
    if (note) {
      output.push(`- Request note: ${note}`);
    }
    output.push("");

    if (packEntry?.replyDraft) {
      output.push("Reply draft:");
      output.push("");
      output.push(`> ${packEntry.replyDraft}`);
      output.push("");
    }

    if (packEntry?.fallback) {
      output.push("Fallback if direct links are blocked:");
      output.push("");
      output.push(`> ${packEntry.fallback}`);
      output.push("");
    }
  }
}

await writeFile(OUTPUT, output.join("\n"));
console.log(`Wrote ${OUTPUT}`);
