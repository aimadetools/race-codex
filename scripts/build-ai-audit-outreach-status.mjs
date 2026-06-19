#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { get, list } from "@vercel/blob";
import { formatUtcTimestamp, getEffectiveNow, getTodayKey } from "./lib/effective-now.mjs";

const ROOT = process.cwd();
const BATCH_FILE = join(ROOT, "ai-audit-outreach-batch-01.csv");
const OUTPUT = join(ROOT, "AI-AUDIT-OUTREACH-STATUS.md");
const FEEDBACK_FILE = join(ROOT, "COMMUNITY-FEEDBACK.md");
const DEFAULT_ENV_FILE = join(ROOT, ".env.production.local");
const FALLBACK_ENV_FILE = join(ROOT, ".env.local");
const BLOB_PREFIX = "contact-submissions/";
const MAX_SUBMISSIONS = 200;
const SECOND_TOUCH_EXHAUSTION_DATE = "2026-06-08";
const TODAY_OVERRIDE = String(process.env.NOTICEKIT_TODAY || "").trim();
const AUDIT_OUTREACH_SOURCE_TAGS = new Set(["ai-audit-outreach-batch-01"]);
const AUDIT_SAMPLE_SOURCE_TAGS = new Set([
  "ai-audit-email-sample",
  "ai-audit-page-sample",
  "ai-audit-sample-page",
  "about-page-audit-sample",
  "homepage-audit-sample",
  "free-tools-audit-sample",
  "pricing-audit-sample"
]);
const AUDIT_ROUTE_SOURCE_TAGS = new Set([
  "homepage-nav-audit",
  "pricing-nav-audit",
  "pricing-concierge-card",
  "start-here-nav-audit",
  "about-nav-audit",
  "free-tools-nav-audit",
  "ai-procurement-hub-nav-audit",
  "kit-preview-nav-audit",
  "purchase-next-steps-audit",
  "audit-request-nav-audit",
  "audit-request-hero-audit",
  "audit-request-side-panel",
  "blog-nav-audit",
  "ai-answer-builder-nav-audit",
  "ai-evidence-map-nav-audit",
  "ai-agent-gap-read-nav-audit",
  "ai-agent-workspace-nav-audit",
  "ai-answer-bank-nav-audit",
  "ai-follow-up-pack-nav-audit",
  "ai-pro-kit-nav-audit",
  "ai-starter-pack-nav-audit",
  "ai-bundle-sample-nav-audit",
  "ai-risk-worksheet-nav-audit",
  "openai-answer-template-nav-audit",
  "openai-answer-bank-nav-audit",
  "anthropic-answer-template-nav-audit",
  "anthropic-answer-bank-nav-audit",
  "claude-answer-template-nav-audit",
  "claude-answer-bank-nav-audit",
  "blog-ai-agent-approval-gate-nav-audit",
  "blog-ai-agent-checklist-nav-audit",
  "blog-ai-agent-tool-access-nav-audit",
  "blog-ai-answer-bank-vs-builder-nav-audit",
  "blog-ai-answer-library-comparison-nav-audit",
  "blog-ai-answer-bank-vs-pro-kit-nav-audit",
  "blog-ai-answer-example-nav-audit",
  "blog-ai-answer-template-nav-audit",
  "blog-ai-disclosure-packet-nav-audit",
  "blog-ai-follow-up-questions-nav-audit",
  "blog-ai-path-guide-nav-audit",
  "blog-ai-saas-list-template-nav-audit",
  "blog-ai-saas-notice-template-nav-audit",
  "blog-ai-starter-pack-vs-builder-nav-audit",
  "blog-ai-questionnaire-nav-audit",
  "blog-ai-training-stance-nav-audit",
  "blog-ai-inventory-nav-audit",
  "blog-ai-risk-assessment-nav-audit",
  "blog-openai-bank-vs-builder-nav-audit",
  "blog-openai-answer-example-nav-audit",
  "blog-openai-answer-template-nav-audit",
  "blog-openai-path-guide-nav-audit",
  "blog-anthropic-bank-vs-builder-nav-audit",
  "blog-anthropic-answer-example-nav-audit",
  "blog-anthropic-path-guide-nav-audit",
  "blog-claude-bank-vs-builder-nav-audit",
  "blog-claude-answer-example-nav-audit",
  "blog-claude-path-guide-nav-audit",
  "free-teardown-nav-audit",
  "generator-nav-audit",
  "partner-client-handoff-nav-audit",
  "partner-preview-nav-audit",
  "sample-ai-packet-nav-audit",
  "sample-teardown-nav-audit",
  "self-audit-nav-audit",
  "site-utility-nav-audit"
]);

function parseCsv(text) {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;

  for (let index = 0; index < text.length; index += 1) {
    const char = text[index];
    const next = text[index + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        current += "\"";
        index += 1;
      } else {
        inQuotes = !inQuotes;
      }
      continue;
    }

    if (!inQuotes && char === ",") {
      row.push(current);
      current = "";
      continue;
    }

    if (!inQuotes && (char === "\n" || char === "\r")) {
      if (char === "\r" && next === "\n") {
        index += 1;
      }
      row.push(current);
      current = "";
      if (row.some((value) => value !== "")) {
        rows.push(row);
      }
      row = [];
      continue;
    }

    current += char;
  }

  if (current.length > 0 || row.length > 0) {
    row.push(current);
    if (row.some((value) => value !== "")) {
      rows.push(row);
    }
  }

  const [header, ...dataRows] = rows;
  if (!header) {
    return [];
  }

  return dataRows
    .map((cells) => {
      const record = {};
      header.forEach((key, cellIndex) => {
        record[key.trim()] = (cells[cellIndex] || "").trim();
      });
      return record;
    })
    .filter((rowItem) => Object.values(rowItem).some((value) => String(value || "").trim() !== ""));
}

function countBy(rows, status) {
  return rows.filter((row) => String(row.status || "").trim() === status).length;
}

async function loadEnvFile(envPath) {
  try {
    const content = await readFile(envPath, "utf8");
    const entries = {};

    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      let value = trimmed.slice(separatorIndex + 1).trim();
      if (
        (value.startsWith("\"") && value.endsWith("\"")) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }
      entries[key] = value;
    }

    return entries;
  } catch {
    return {};
  }
}

function pickEnvValue(key, ...sources) {
  for (const source of sources) {
    const value = String(source?.[key] || "").trim();
    if (value) {
      return value;
    }
  }

  return "";
}

async function readStream(stream) {
  const chunks = [];
  for await (const chunk of stream) {
    chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
  }
  return Buffer.concat(chunks).toString("utf8");
}

function firstDateMatch(notes, label) {
  const match = String(notes || "").match(new RegExp(`${label}\\s+(\\d{4}-\\d{2}-\\d{2})`));
  return match ? match[1] : "";
}

function parseSentTimestamp(row) {
  const match = String(row.notes || "").match(/Sent (\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):\d{2}Z/);
  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)));
}

function isLikelyTestSubmission(record) {
  const company = String(record.company || "").trim().toLowerCase();
  const email = String(record.email || "").trim().toLowerCase();
  const sourceTag = String(record.sourceTag || "").trim().toLowerCase();
  const summary = String(record.summary || "").trim().toLowerCase();
  const reviewNeed = String(record.reviewNeed || "").trim().toLowerCase();
  const vendorChange = String(record.vendorChange || "").trim().toLowerCase();

  const text = [company, sourceTag, summary, reviewNeed, vendorChange].join(" ");
  const emailDomain = email.includes("@") ? email.split("@").pop() : "";
  const placeholderDomain = emailDomain === "example.com" ||
    emailDomain === "example.org" ||
    emailDomain === "example.net" ||
    emailDomain.endsWith(".test") ||
    emailDomain.includes(".example");

  if (placeholderDomain) {
    return true;
  }

  if (/(^|\b)(testco|acme saas|beta labs|codex validation test)(\b|$)/.test(company)) {
    return true;
  }

  if (text.includes("noticekit") && /(test|check|verification|post-deploy|restore)/.test(text)) {
    return true;
  }

  return false;
}

function isAuditRecord(record) {
  const sourceTag = String(record.sourceTag || "").trim().toLowerCase();
  return AUDIT_OUTREACH_SOURCE_TAGS.has(sourceTag) ||
    AUDIT_SAMPLE_SOURCE_TAGS.has(sourceTag) ||
    AUDIT_ROUTE_SOURCE_TAGS.has(sourceTag);
}

function safeValue(value, fallback = "unknown") {
  const text = String(value || "").trim();
  return text || fallback;
}

function hasLoggedAuditExhaustion(feedbackText) {
  const explicitNote = `audit outreach angle exhausted its second touch on ${SECOND_TOUCH_EXHAUSTION_DATE} UTC`;
  const parkedNote = "keep the audit batch parked and monitor the followed-up rows for any late reply, redirect, or intake while a new offer or segment decision is pending";
  return feedbackText.includes(explicitNote) || feedbackText.includes(parkedNote);
}

async function loadAuditInboxRecords() {
  const env = await loadEnvFile(DEFAULT_ENV_FILE);
  const fallbackEnv = await loadEnvFile(FALLBACK_ENV_FILE);
  const token = pickEnvValue("BLOB_READ_WRITE_TOKEN", process.env, env, fallbackEnv);

  if (!token) {
    return { available: false, records: [] };
  }

  const lookup = await list({
    prefix: BLOB_PREFIX,
    limit: MAX_SUBMISSIONS,
    token
  });

  const blobs = [...lookup.blobs].sort((left, right) =>
    String(right.uploadedAt || "").localeCompare(String(left.uploadedAt || ""))
  );
  const records = [];

  for (const blob of blobs) {
    const result = await get(blob.pathname, {
      access: "private",
      token
    });

    if (!result || result.statusCode !== 200 || !result.stream) {
      continue;
    }

    try {
      const record = JSON.parse(await readStream(result.stream));
      if (isLikelyTestSubmission(record) || !isAuditRecord(record)) {
        continue;
      }

      records.push({
        ...record,
        uploadedAt: blob.uploadedAt,
        pathname: blob.pathname
      });
    } catch {
      continue;
    }
  }

  return { available: true, records };
}

function extractFeedbackMentions(text, companyNames) {
  const lowerCompanyNames = companyNames.map((name) => name.toLowerCase());
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => {
      const lower = line.toLowerCase();
      return lower.includes("ai-audit-outreach-batch-01") ||
        lower.includes("audit outreach") ||
        lower.includes("audit-intent") ||
        lower.includes("48-hour audit") ||
        lowerCompanyNames.some((name) => name && lower.includes(name));
    });
}

function describeNextAction(rows, options = {}) {
  const {
    today = "",
    hasExternalEvidence = false,
    hasExhaustionLogged = false
  } = options;
  const sentWaiting = rows.filter((row) => String(row.status || "").trim() === "sent").length;
  const followedUpWaiting = rows.filter((row) => String(row.status || "").trim() === "followed_up").length;
  const terminalRows = ["replied_positive", "replied_negative", "bounced", "interview_completed"]
    .map((status) => countBy(rows, status))
    .reduce((sum, value) => sum + value, 0);

  if (terminalRows > 0) {
    return "triage the live audit outreach response and classify whether the blocker was proof assets, owner metadata, named-vendor wording, control boundary, or deadline pressure";
  }

  if (sentWaiting > 0) {
    const dueDates = rows
      .filter((row) => String(row.status || "").trim() === "sent")
      .map((row) => firstDateMatch(row.notes, "Follow-up due"))
      .filter(Boolean)
      .sort();
    return `monitor the batch and send the audit follow-up on or after ${dueDates[0] || "the first due date"} UTC if replies are still zero`;
  }

  if (followedUpWaiting > 0) {
    if (!hasExternalEvidence && today >= SECOND_TOUCH_EXHAUSTION_DATE) {
      if (hasExhaustionLogged) {
        return "keep the audit batch parked and monitor the followed-up rows for any late reply, redirect, or intake while a new offer or segment decision is pending";
      }
      return `record that the audit outreach angle exhausted its second touch on ${SECOND_TOUCH_EXHAUSTION_DATE} UTC and leave the batch parked until a new offer or segment decision exists`;
    }
    return "monitor the followed-up audit rows for the first real reply, redirect, or intake before expanding the list";
  }

  const ready = countBy(rows, "ready_for_send");
  if (ready > 0) {
    return "send the prepared audit outreach batch";
  }

  return "no audit outreach action queued";
}

async function main() {
  const now = getEffectiveNow(TODAY_OVERRIDE);
  const today = getTodayKey(now, TODAY_OVERRIDE);
  const [rows, feedbackText, inbox] = await Promise.all([
    readFile(BATCH_FILE, "utf8").then(parseCsv),
    readFile(FEEDBACK_FILE, "utf8").catch(() => ""),
    loadAuditInboxRecords()
  ]);
  const sent = countBy(rows, "sent");
  const followedUp = countBy(rows, "followed_up");
  const ready = countBy(rows, "ready_for_send");
  const positiveReplies = countBy(rows, "replied_positive");
  const negativeReplies = countBy(rows, "replied_negative");
  const bounces = countBy(rows, "bounced");
  const interviews = countBy(rows, "interview_completed");
  const terminal = positiveReplies + negativeReplies + bounces + interviews;
  const firstSent = rows
    .map((row) => parseSentTimestamp(row))
    .filter((value) => value instanceof Date && !Number.isNaN(value.getTime()))
    .sort((left, right) => left.getTime() - right.getTime())[0];
  const companyNames = rows.map((row) => String(row.company || "").trim()).filter(Boolean);
  const feedbackMentions = extractFeedbackMentions(feedbackText, companyNames);
  const inboxSubmissions = inbox.records.length;
  const outreachTaggedInboxSubmissions = inbox.records.filter((record) =>
    AUDIT_OUTREACH_SOURCE_TAGS.has(String(record.sourceTag || "").trim().toLowerCase())
  ).length;
  const sampleProofInboxSubmissions = inbox.records.filter((record) =>
    AUDIT_SAMPLE_SOURCE_TAGS.has(String(record.sourceTag || "").trim().toLowerCase())
  ).length;
  const auditRouteInboxSubmissions = inbox.records.filter((record) =>
    AUDIT_ROUTE_SOURCE_TAGS.has(String(record.sourceTag || "").trim().toLowerCase())
  ).length;
  const auditIntakes = inbox.records.filter((record) => String(record.type || "").trim() === "concierge_audit").length;
  const latestInboxRecord = inbox.records[0] || null;
  const hasInboxEvidence = inboxSubmissions > 0;
  const secondTouchExhausted = followedUp > 0 && terminal === 0 && !hasInboxEvidence && today >= SECOND_TOUCH_EXHAUSTION_DATE;
  const hasExhaustionLogged = hasLoggedAuditExhaustion(feedbackText);

  const lines = [
    "# AI Audit Outreach Status",
    "",
    `Checked at: ${formatUtcTimestamp(now)}`,
    "",
    "## Current State",
    "",
    `- Ready for first send: ${ready}`,
    `- Sent and waiting on reply: ${sent}`,
    `- Followed up and waiting on reply: ${followedUp}`,
    `- Positive replies in outreach CSV: ${positiveReplies}`,
    `- Negative replies in outreach CSV: ${negativeReplies}`,
    `- Bounces in outreach CSV: ${bounces}`,
    `- Interviews completed: ${interviews}`,
    `- Terminal rows (reply/bounce/interview): ${terminal}`,
    `- Audit-path inbox submissions: ${inboxSubmissions}${inbox.available ? "" : " (Blob inbox unavailable in current environment)"}`,
    `- Audit outreach-tagged inbox submissions: ${outreachTaggedInboxSubmissions}${inbox.available ? "" : " (Blob inbox unavailable in current environment)"}`,
    `- Audit sample-proof inbox submissions: ${sampleProofInboxSubmissions}${inbox.available ? "" : " (Blob inbox unavailable in current environment)"}`,
    `- Audit route inbox submissions: ${auditRouteInboxSubmissions}${inbox.available ? "" : " (Blob inbox unavailable in current environment)"}`,
    `- Audit-tagged concierge intakes: ${auditIntakes}${inbox.available ? "" : " (Blob inbox unavailable in current environment)"}`,
    `- Audit mentions logged in COMMUNITY-FEEDBACK.md: ${feedbackMentions.length}`,
    `- First audit outreach send: ${firstSent ? formatUtcTimestamp(firstSent) : "unknown"}`,
    `- Second-touch exhaustion checkpoint: ${SECOND_TOUCH_EXHAUSTION_DATE} UTC.`,
    ...(secondTouchExhausted
      ? [`- Second-touch state: exhausted on ${SECOND_TOUCH_EXHAUSTION_DATE} UTC with 0 recorded replies, bounces, interviews, redirects, or audit intakes.`]
      : []),
    `- Next audit action: ${describeNextAction(rows, { today, hasExternalEvidence: hasInboxEvidence, hasExhaustionLogged })}.`,
    "",
    "## Evidence Watch",
    "",
    terminal === 0 && inboxSubmissions === 0 && feedbackMentions.length === 0
      ? "- No AI audit reply, redirect, or intake evidence is recorded yet across the outreach CSV, Blob inbox, or COMMUNITY-FEEDBACK.md."
      : null,
    terminal > 0
      ? `- Outreach CSV evidence exists: ${positiveReplies} positive reply row(s), ${negativeReplies} negative reply row(s), ${bounces} bounce row(s), and ${interviews} interview row(s).`
      : null,
    latestInboxRecord
      ? `- Latest audit-path inbox submission: ${safeValue(latestInboxRecord.submittedAt || latestInboxRecord.uploadedAt)} | ${safeValue(latestInboxRecord.type)} | ${safeValue(latestInboxRecord.sourceTag)} | ${safeValue(latestInboxRecord.company)}.`
      : inbox.available
        ? "- Blob inbox check found no audit-path submissions yet."
        : "- Blob inbox check is unavailable because no Blob token is configured in the current environment.",
    feedbackMentions.length > 0
      ? `- COMMUNITY-FEEDBACK.md contains ${feedbackMentions.length} audit-related line(s); review the excerpts below before changing outreach copy.`
      : terminal === 0 && inboxSubmissions === 0
        ? null
        : "- COMMUNITY-FEEDBACK.md does not contain an audit-specific reply or outcome yet.",
    secondTouchExhausted
      ? `- The June 5 follow-up has now aged past the ${SECOND_TOUCH_EXHAUSTION_DATE} UTC checkpoint with zero audit evidence, so this batch should stay parked until a new offer or segment decision exists.`
      : null,
    "",
    "## Inbox Matches",
    ""
  ].filter(Boolean);

  if (!inbox.available) {
    lines.push("- Blob inbox unavailable in the current environment; audit intake cross-check could not be completed here.");
  } else if (inbox.records.length === 0) {
    lines.push("- No real audit-tagged submissions are stored in the inbox yet.");
  } else {
    for (const record of inbox.records.slice(0, 5)) {
      lines.push(`- ${safeValue(record.submittedAt || record.uploadedAt)} | ${safeValue(record.type)} | ${safeValue(record.sourceTag)} | ${safeValue(record.company)} | role ${safeValue(record.ownershipSignal, "unknown")}`);
    }
  }

  lines.push("", "## Community Feedback Matches", "");

  if (feedbackMentions.length === 0) {
    lines.push("- No audit-specific feedback lines are logged yet.");
  } else {
    for (const line of feedbackMentions.slice(-5)) {
      lines.push(`- ${line}`);
    }
  }

  lines.push(
    "",
    "## Batch Snapshot",
    "",
    "| Priority | Company | Segment | Status | Route |",
    "|---:|---|---|---|---|",
    ...rows.map((row) => `| ${row.priority} | ${row.company} | ${row.segment} | ${row.status} | ${row.public_contact_route} |`)
  );

  await writeFile(OUTPUT, `${lines.join("\n")}\n`, "utf8");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
