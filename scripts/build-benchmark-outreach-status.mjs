#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();
const BATCH_FILE = join(ROOT, "ai-benchmark-outreach-batch-01.csv");
const OUTPUT = join(ROOT, "BENCHMARK-OUTREACH-STATUS.md");

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

function describeNextAction(rows) {
  const positiveReplies = countBy(rows, "status", "replied_positive");
  const negativeReplies = countBy(rows, "status", "replied_negative");
  const bounces = countBy(rows, "status", "bounced");
  const interviews = countBy(rows, "status", "interview_completed");
  const activeRows = rows.filter((row) => ["sent", "followed_up"].includes(String(row.status || "").trim()));

  if (positiveReplies + negativeReplies + bounces + interviews > 0) {
    return "triage the live benchmark outreach response and classify whether the pain is the questionnaire answer, the public page, or neither";
  }

  if (activeRows.length === 0) {
    return "prepare the next benchmark outreach batch only after evidence or a new send decision lands";
  }

  const dueDates = activeRows
    .map((row) => parseSentDate(row))
    .filter(Boolean)
    .map((date) => addBusinessDays(date, 3))
    .sort();

  if (dueDates.length === 0) {
    return "monitor the sent rows for replies and recover the missing follow-up due date before sending again";
  }

  return `monitor the batch for replies and send the benchmark follow-up on or after ${dueDates[0]} UTC if replies are still zero`;
}

const now = formatUtcTimestamp(new Date());
const rows = parseCsv(await readFile(BATCH_FILE, "utf8"));
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

const output = [
  "# Benchmark Outreach Status",
  "",
  `Checked at: ${now}`,
  "",
  "## Current State",
  "",
  `- Sent and waiting on reply: ${sent}`,
  `- Followed up and waiting on reply: ${followedUp}`,
  `- Positive replies: ${positiveReplies}`,
  `- Negative replies: ${negativeReplies}`,
  `- Bounces: ${bounces}`,
  `- Interviews completed: ${interviews}`,
  `- Terminal rows: ${terminal}`,
  `- First benchmark outreach send: ${firstSent ? formatUtcTimestamp(firstSent) : "unknown"}`,
  `- Next benchmark action: ${describeNextAction(rows)}.`,
  ""
];

if (rows.length > 0) {
  output.push("## Batch Snapshot", "");
  for (const row of rows) {
    const status = row.status || "unknown";
    const dueDate = ["sent", "followed_up"].includes(status) && parseSentDate(row)
      ? addBusinessDays(parseSentDate(row), 3)
      : "n/a";
    output.push(`- ${row.company}: ${status}; follow-up due ${dueDate}; contact ${row.public_contact_route || "unknown"}.`);
  }
  output.push("");
}

await writeFile(OUTPUT, output.join("\n"));
console.log(`Wrote ${OUTPUT}`);
