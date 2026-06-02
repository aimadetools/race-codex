#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";
import { get, list } from "@vercel/blob";

const ROOT = process.cwd();
const BATCH_FILE = join(ROOT, "ai-benchmark-outreach-batch-01.csv");
const OUTPUT = join(ROOT, "BENCHMARK-OUTREACH-STATUS.md");
const FEEDBACK_FILE = join(ROOT, "COMMUNITY-FEEDBACK.md");
const DEFAULT_ENV_FILE = join(ROOT, ".env.production.local");
const FALLBACK_ENV_FILE = join(ROOT, ".env.local");
const BLOB_PREFIX = "contact-submissions/";
const MAX_SUBMISSIONS = 200;
const BENCHMARK_SOURCE_TAGS = new Set([
  "benchmark-outreach-batch-01",
  "benchmark-outreach-report"
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
  } catch (error) {
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

function formatUtcTimestamp(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute} UTC`;
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

function isBenchmarkRecord(record) {
  const sourceTag = String(record.sourceTag || "").trim().toLowerCase();
  return BENCHMARK_SOURCE_TAGS.has(sourceTag);
}

function safeValue(value, fallback = "unknown") {
  const text = String(value || "").trim();
  return text || fallback;
}

async function loadBenchmarkInboxRecords() {
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
      if (isLikelyTestSubmission(record) || !isBenchmarkRecord(record)) {
        continue;
      }

      records.push({
        ...record,
        uploadedAt: blob.uploadedAt,
        pathname: blob.pathname
      });
    } catch (error) {
      continue;
    }
  }

  return { available: true, records };
}

function extractFeedbackMentions(text, companies) {
  const lines = text.split("\n");
  const companyPatterns = companies.map((company) => ({
    company,
    pattern: new RegExp(`\\b${company.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}\\b`, "i")
  }));
  const matches = [];

  for (const line of lines) {
    const trimmed = line.trim();
    if (!trimmed) {
      continue;
    }

    const lower = trimmed.toLowerCase();
    const matchesCompany = companyPatterns.some(({ pattern }) => pattern.test(trimmed));
    if (!matchesCompany && !lower.includes("benchmark")) {
      continue;
    }

    matches.push(trimmed);
  }

  return matches;
}

function describeNextAction(rows) {
  const positiveReplies = countBy(rows, "status", "replied_positive");
  const negativeReplies = countBy(rows, "status", "replied_negative");
  const bounces = countBy(rows, "status", "bounced");
  const interviews = countBy(rows, "status", "interview_completed");
  const sentRows = rows.filter((row) => String(row.status || "").trim() === "sent");
  const followedUpRows = rows.filter((row) => String(row.status || "").trim() === "followed_up");
  const activeRows = rows.filter((row) => ["sent", "followed_up"].includes(String(row.status || "").trim()));

  if (positiveReplies + negativeReplies + bounces + interviews > 0) {
    return "triage the live benchmark outreach response and classify whether the pain is the questionnaire answer, the public page, or neither";
  }

  if (activeRows.length === 0) {
    return "prepare the next benchmark outreach batch only after evidence or a new send decision lands";
  }

  const dueDates = sentRows
    .map((row) => parseSentDate(row))
    .filter(Boolean)
    .map((date) => addBusinessDays(date, 3))
    .sort();

  if (sentRows.length > 0 && dueDates.length === 0) {
    return "monitor the sent rows for replies and recover the missing follow-up due date before sending again";
  }

  if (dueDates.length > 0) {
    return `monitor the batch for replies and send the benchmark follow-up on or after ${dueDates[0]} UTC if replies are still zero`;
  }

  if (followedUpRows.length > 0) {
    return "monitor the followed-up benchmark rows for the first real reply, redirect, or teardown request before expanding the list";
  }

  return "monitor the benchmark outreach queue for the first real reply or teardown request";
}

async function main() {
  const now = formatUtcTimestamp(new Date());
  const rows = parseCsv(await readFile(BATCH_FILE, "utf8"));
  const feedbackText = await readFile(FEEDBACK_FILE, "utf8").catch(() => "");
  const inbox = await loadBenchmarkInboxRecords();
  const sent = countBy(rows, "status", "sent");
  const followedUp = countBy(rows, "status", "followed_up");
  const positiveReplies = countBy(rows, "status", "replied_positive");
  const negativeReplies = countBy(rows, "status", "replied_negative");
  const bounces = countBy(rows, "status", "bounced");
  const interviews = countBy(rows, "status", "interview_completed");
  const terminal = positiveReplies + negativeReplies + bounces + interviews;
  const firstSent = rows
    .map((row) => parseSentTimestamp(row))
    .filter((value) => value instanceof Date && !Number.isNaN(value.getTime()))
    .sort((left, right) => left.getTime() - right.getTime())[0];
  const companyNames = rows.map((row) => String(row.company || "").trim()).filter(Boolean);
  const feedbackMentions = extractFeedbackMentions(feedbackText, companyNames);
  const inboxTeardowns = inbox.records.filter((record) => String(record.type || "").trim() === "free_async_teardown");
  const latestInboxRecord = inbox.records[0] || null;

  const output = [
    "# Benchmark Outreach Status",
    "",
    `Checked at: ${now}`,
    "",
    "## Current State",
    "",
    `- Sent and waiting on reply: ${sent}`,
    `- Followed up and waiting on reply: ${followedUp}`,
    `- Positive replies in outreach CSV: ${positiveReplies}`,
    `- Negative replies in outreach CSV: ${negativeReplies}`,
    `- Bounces in outreach CSV: ${bounces}`,
    `- Interviews completed: ${interviews}`,
    `- Terminal rows: ${terminal}`,
    `- Benchmark-tagged inbox submissions: ${inbox.records.length}${inbox.available ? "" : " (Blob inbox unavailable in current environment)"}`,
    `- Benchmark-tagged teardown requests: ${inboxTeardowns.length}${inbox.available ? "" : " (Blob inbox unavailable in current environment)"}`,
    `- Benchmark mentions logged in COMMUNITY-FEEDBACK.md: ${feedbackMentions.length}`,
    `- First benchmark outreach send: ${firstSent ? formatUtcTimestamp(firstSent) : "unknown"}`,
    `- Next benchmark action: ${describeNextAction(rows)}.`,
    ""
  ];

  output.push("## Evidence Watch", "");

  if (terminal === 0 && inbox.records.length === 0 && feedbackMentions.length === 0) {
    output.push("- No benchmark reply, redirect, or teardown evidence is recorded yet across the outreach CSV, Blob inbox, or COMMUNITY-FEEDBACK.md.");
  } else {
    if (terminal > 0) {
      output.push(`- Outreach CSV evidence exists: ${positiveReplies} positive reply row(s), ${negativeReplies} negative reply row(s), ${bounces} bounce row(s), and ${interviews} interview row(s).`);
    }

    if (latestInboxRecord) {
      output.push(`- Latest benchmark-tagged inbox submission: ${safeValue(latestInboxRecord.submittedAt || latestInboxRecord.uploadedAt)} | ${safeValue(latestInboxRecord.type)} | ${safeValue(latestInboxRecord.sourceTag)} | ${safeValue(latestInboxRecord.company)}.`);
    } else if (inbox.available) {
      output.push("- Blob inbox check found no benchmark-tagged submissions yet.");
    } else {
      output.push("- Blob inbox check could not run because `BLOB_READ_WRITE_TOKEN` is unavailable in the current environment.");
    }

    if (feedbackMentions.length > 0) {
      output.push(`- COMMUNITY-FEEDBACK.md contains ${feedbackMentions.length} benchmark-related line(s); review the excerpts below before changing outreach copy.`);
    } else {
      output.push("- COMMUNITY-FEEDBACK.md does not contain a benchmark-specific reply or outcome yet.");
    }
  }

  output.push("", "## Inbox Matches", "");

  if (!inbox.available) {
    output.push("- Blob inbox unavailable in the current environment; benchmark intake cross-check could not be completed here.");
  } else if (inbox.records.length === 0) {
    output.push("- No real benchmark-tagged submissions are stored in the inbox yet.");
  } else {
    for (const record of inbox.records.slice(0, 5)) {
      output.push(`- ${safeValue(record.submittedAt || record.uploadedAt)} | ${safeValue(record.type)} | ${safeValue(record.sourceTag)} | ${safeValue(record.company)} | role ${safeValue(record.ownershipSignal, "unknown")}`);
    }
  }

  output.push("", "## Community Feedback Matches", "");

  if (feedbackMentions.length === 0) {
    output.push("- No benchmark-specific feedback lines are logged yet.");
  } else {
    for (const line of feedbackMentions.slice(-5)) {
      output.push(`- ${line}`);
    }
  }

  if (rows.length > 0) {
    output.push("", "## Batch Snapshot", "");
    for (const row of rows) {
      const status = row.status || "unknown";
      const sentDate = parseSentDate(row);
      const followedUpDate = parseFollowedUpDate(row);
      const pendingText = status === "sent" && sentDate
        ? `follow-up due ${addBusinessDays(sentDate, 3)}`
        : status === "followed_up" && followedUpDate
          ? `followed up ${followedUpDate}`
          : `status ${status}`;
      output.push(`- ${row.company}: ${status}; ${pendingText}; contact ${row.public_contact_route || "unknown"}.`);
    }
  }

  output.push("");
  await writeFile(OUTPUT, output.join("\n"));
  console.log(`Wrote ${OUTPUT}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
