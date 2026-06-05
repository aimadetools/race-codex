#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { get, list } from "@vercel/blob";
import { formatUtcTimestamp, getEffectiveNow, getTodayKey } from "./lib/effective-now.mjs";

const ROOT = process.cwd();
const BATCH_FILE = join(ROOT, "ai-agent-review-outreach-batch-01.csv");
const OUTPUT = join(ROOT, "AI-AGENT-REVIEW-OUTREACH-STATUS.md");
const FEEDBACK_FILE = join(ROOT, "COMMUNITY-FEEDBACK.md");
const DEFAULT_ENV_FILE = join(ROOT, ".env.production.local");
const FALLBACK_ENV_FILE = join(ROOT, ".env.local");
const BLOB_PREFIX = "contact-submissions/";
const MAX_SUBMISSIONS = 200;
const SECOND_TOUCH_EXHAUSTION_DATE = "2026-06-05";
const TODAY_OVERRIDE = String(process.env.NOTICEKIT_TODAY || "").trim();
const AGENT_REVIEW_SOURCE_TAGS = new Set([
  "agent-review-outreach-batch-01",
  "agent-review-outreach-checklist",
  "agent-review-checklist-tool-access",
  "agent-review-checklist-approval-gate",
  "agent-review-checklist-builder",
  "agent-review-checklist-teardown",
  "agent-review-checklist-hub",
  "agent-review-checklist-workspace",
  "ai-agent-review-teardown",
  "ai-agent-approval-gate-teardown",
  "ai-agent-workspace-teardown",
  "ai-agent-review-workspace-tool-access",
  "ai-agent-review-workspace-approval-gate"
]);
const AI_AGENT_GAP_READ_SOURCE_TAGS = [
  "agent-review-outreach-batch-01",
  "ai-agent-review-teardown",
  "ai-agent-approval-gate-teardown",
  "agent-review-checklist-teardown",
  "ai-agent-workspace-teardown"
];

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

  return dataRows.map((cells) => {
    const record = {};
    header.forEach((key, cellIndex) => {
      record[key.trim()] = (cells[cellIndex] || "").trim();
    });
    return record;
  });
}

function countBy(rows, key, value) {
  return rows.filter((row) => String(row[key] || "").trim() === value).length;
}

function countBySourceTag(records, sourceTag) {
  return records.filter((record) => String(record.sourceTag || "").trim() === sourceTag).length;
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

function parseSentTimestamp(row) {
  const match = String(row.notes || "").match(/Sent (\d{4})-(\d{2})-(\d{2})T(\d{2}):(\d{2}):\d{2}Z/);
  if (!match) {
    return null;
  }

  const [, year, month, day, hour, minute] = match;
  return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)));
}

function parseSentDate(row) {
  const match = String(row.notes || "").match(/Sent (\d{4}-\d{2}-\d{2})(?:T|\s|$)/);
  return match ? match[1] : "";
}

function parseFollowedUpDate(row) {
  const match = String(row.notes || "").match(/Followed up (\d{4}-\d{2}-\d{2})(?:T|\s|$)/);
  return match ? match[1] : "";
}

function addBusinessDays(isoDate, businessDays) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  let added = 0;

  while (added < businessDays) {
    date.setUTCDate(date.getUTCDate() + 1);
    const day = date.getUTCDay();
    if (day !== 0 && day !== 6) {
      added += 1;
    }
  }

  return date.toISOString().slice(0, 10);
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

function isAgentReviewRecord(record) {
  const sourceTag = String(record.sourceTag || "").trim().toLowerCase();
  return AGENT_REVIEW_SOURCE_TAGS.has(sourceTag);
}

function safeValue(value, fallback = "unknown") {
  const text = String(value || "").trim();
  return text || fallback;
}

function hasLoggedAgentReviewExhaustion(feedbackText) {
  const explicitNote = `AI agent review angle exhausted its second touch on ${SECOND_TOUCH_EXHAUSTION_DATE} UTC`;
  const parkedNote = "keep the AI agent review batch parked and monitor the followed-up rows for any late reply, redirect, or teardown request while a new offer or segment decision is pending";
  return feedbackText.includes(explicitNote) || feedbackText.includes(parkedNote);
}

async function loadAgentReviewInboxRecords() {
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
      if (isLikelyTestSubmission(record) || !isAgentReviewRecord(record)) {
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

  return {
    available: true,
    records
  };
}

function extractFeedbackMatches(text) {
  return text
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => /agent review|tool access|approval gate|approval path|blocked action|scope|audit trail/i.test(line));
}

async function main() {
  const now = getEffectiveNow(TODAY_OVERRIDE);
  const todayKey = getTodayKey(now, TODAY_OVERRIDE);
  const [batchText, feedbackText, inbox] = await Promise.all([
    readFile(BATCH_FILE, "utf8"),
    readFile(FEEDBACK_FILE, "utf8").catch(() => ""),
    loadAgentReviewInboxRecords()
  ]);

  const rows = parseCsv(batchText);
  const sentWaiting = countBy(rows, "status", "sent");
  const followedUpWaiting = countBy(rows, "status", "followed_up");
  const positiveReplies = countBy(rows, "status", "replied_positive");
  const negativeReplies = countBy(rows, "status", "replied_negative");
  const bounces = countBy(rows, "status", "bounced");
  const interviewsCompleted = countBy(rows, "status", "interview_completed");
  const terminalRows = positiveReplies + negativeReplies + bounces + interviewsCompleted;
  const inboxSubmissions = inbox.records.length;
  const teardownRequests = inbox.records.filter((record) => String(record.type || "").trim() === "free_async_teardown").length;
  const feedbackMentions = extractFeedbackMatches(feedbackText);
  const latestInboxRecord = inbox.records[0] || null;
  const hasInboxEvidence = inboxSubmissions > 0;
  const secondTouchExhausted = followedUpWaiting > 0 && terminalRows === 0 && !hasInboxEvidence && todayKey >= SECOND_TOUCH_EXHAUSTION_DATE;
  const hasExhaustionLogged = hasLoggedAgentReviewExhaustion(feedbackText);
  const gapReadSourceBreakdown = AI_AGENT_GAP_READ_SOURCE_TAGS.map((sourceTag) => ({
    sourceTag,
    count: countBySourceTag(inbox.records, sourceTag)
  }));
  const firstSendAt = rows
    .map((row) => parseSentTimestamp(row))
    .filter(Boolean)
    .sort((left, right) => left - right)[0];
  const earliestFollowUpDue = rows
    .map((row) => {
      if (String(row.status || "").trim() !== "sent") {
        return "";
      }
      const sentDate = parseSentDate(row);
      return sentDate ? addBusinessDays(sentDate, 2) : "";
    })
    .filter(Boolean)
    .sort()[0];
  const nextAction = positiveReplies + negativeReplies + bounces + interviewsCompleted > 0
    ? "review the recorded outcome and convert any real conversation into a qualification decision."
    : sentWaiting > 0 && earliestFollowUpDue
      ? `monitor the batch for replies and send the AI agent review follow-up on or after ${earliestFollowUpDue} UTC if replies are still zero.`
      : secondTouchExhausted
        ? hasExhaustionLogged
          ? "keep the AI agent review batch parked and monitor the followed-up rows for any late reply, redirect, or teardown request while a new offer or segment decision is pending."
          : `record that the AI agent review angle exhausted its second touch on ${SECOND_TOUCH_EXHAUSTION_DATE} UTC and leave the batch parked until a new offer or segment decision exists.`
        : followedUpWaiting > 0
          ? "monitor the followed-up AI agent review rows for the first real reply, redirect, or teardown request before expanding the list."
          : "monitor the batch for the first real reply or teardown request.";

  const output = [
    "# AI Agent Review Outreach Status",
    "",
    `Checked at: ${formatUtcTimestamp(now)}`,
    "",
    "## Current State",
    "",
    `- Sent and waiting on reply: ${sentWaiting}`,
    `- Followed up and waiting on reply: ${followedUpWaiting}`,
    `- Positive replies in outreach CSV: ${positiveReplies}`,
    `- Negative replies in outreach CSV: ${negativeReplies}`,
    `- Bounces in outreach CSV: ${bounces}`,
    `- Interviews completed: ${interviewsCompleted}`,
    `- Terminal rows: ${terminalRows}`,
    `- Agent-review-tagged inbox submissions: ${inboxSubmissions}`,
    `- Agent-review-tagged teardown requests: ${teardownRequests}`,
    `- Agent-review mentions logged in COMMUNITY-FEEDBACK.md: ${feedbackMentions.length}`,
    `- First AI agent review outreach send: ${firstSendAt ? formatUtcTimestamp(firstSendAt) : "unknown"}`,
    `- Second-touch exhaustion checkpoint: ${SECOND_TOUCH_EXHAUSTION_DATE} UTC`,
    ...(secondTouchExhausted
      ? [`- Second-touch state: exhausted on ${SECOND_TOUCH_EXHAUSTION_DATE} UTC with 0 recorded replies, bounces, interviews, or teardown submissions.`]
      : []),
    `- Next AI agent review action: ${nextAction}`,
    "",
    "## Evidence Watch",
    "",
    terminalRows === 0 && inboxSubmissions === 0 && feedbackMentions.length === 0
      ? "- No AI-agent-control reply, redirect, or gap-read evidence is recorded yet across the outreach CSV, Blob inbox, or COMMUNITY-FEEDBACK.md."
      : null,
    terminalRows > 0
      ? `- Outreach CSV evidence exists: ${positiveReplies} positive reply row(s), ${negativeReplies} negative reply row(s), ${bounces} bounce row(s), and ${interviewsCompleted} interview row(s).`
      : null,
    latestInboxRecord
      ? `- Latest agent-review-tagged inbox submission: ${safeValue(latestInboxRecord.submittedAt || latestInboxRecord.uploadedAt)} | ${safeValue(latestInboxRecord.type)} | ${safeValue(latestInboxRecord.sourceTag)} | ${safeValue(latestInboxRecord.company)}.`
      : inbox.available
        ? "- Blob inbox check found no agent-review-tagged submissions yet."
        : "- Blob inbox check is unavailable because no Blob token is configured in the current environment.",
    feedbackMentions.length > 0
      ? `- COMMUNITY-FEEDBACK.md contains ${feedbackMentions.length} agent-review-related line(s); review the excerpts below before changing outreach copy.`
      : terminalRows === 0 && inboxSubmissions === 0
        ? null
        : "- COMMUNITY-FEEDBACK.md does not contain an agent-review-specific reply or outcome yet.",
    secondTouchExhausted
      ? "- The June 2 follow-up has now aged past the June 5 UTC checkpoint with zero AI-agent-review evidence, so this batch should stay parked until a new offer or segment decision exists."
      : null,
    "",
    "## Inbox Matches",
    ""
  ].filter(Boolean);

  if (!inbox.available) {
    output.push("- Blob inbox unavailable in the current environment; AI-agent intake cross-check could not be completed here.");
  } else if (inbox.records.length === 0) {
    output.push("- No real agent-review-tagged submissions are stored in the inbox yet.");
  } else {
    for (const record of inbox.records.slice(0, 5)) {
      output.push(
        `- ${safeValue(record.submittedAt || record.uploadedAt)} | ${safeValue(record.type)} | ${safeValue(record.sourceTag)} | ${safeValue(record.company)} | role ${safeValue(record.ownershipSignal, "unknown")}`
      );
    }
  }

  output.push("", "## Gap-Read Source Breakdown", "");

  for (const { sourceTag, count } of gapReadSourceBreakdown) {
    output.push(`- ${sourceTag}: ${count}`);
  }

  output.push("", "## Community Feedback Matches", "");

  if (feedbackMentions.length === 0) {
  output.push("- No agent-review-specific feedback is logged yet.");
  } else {
    for (const line of feedbackMentions.slice(-5)) {
      output.push(`- ${line}`);
    }
  }

  output.push("", "## Batch Snapshot", "");

  for (const row of rows) {
    const sentDate = parseSentDate(row);
    const followedUpDate = parseFollowedUpDate(row);
    const followUpText = String(row.status || "").trim() === "sent" && sentDate
      ? `follow-up due ${addBusinessDays(sentDate, 2)}`
      : String(row.status || "").trim() === "followed_up" && followedUpDate
        ? `followed up ${followedUpDate}`
        : `status ${safeValue(row.status)}`;
    output.push(
      `- ${row.company}: ${row.status}; ${followUpText}; contact ${row.public_contact_route}.`
    );
  }

  output.push("");

  await writeFile(OUTPUT, output.join("\n"));
  console.log(`Wrote ${OUTPUT}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
