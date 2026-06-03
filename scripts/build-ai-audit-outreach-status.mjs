#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();
const BATCH_FILE = join(ROOT, "ai-audit-outreach-batch-01.csv");
const OUTPUT = join(ROOT, "AI-AUDIT-OUTREACH-STATUS.md");
const SECOND_TOUCH_EXHAUSTION_DATE = "2026-06-08";

function formatUtcTimestamp(date) {
  const year = date.getUTCFullYear();
  const month = String(date.getUTCMonth() + 1).padStart(2, "0");
  const day = String(date.getUTCDate()).padStart(2, "0");
  const hour = String(date.getUTCHours()).padStart(2, "0");
  const minute = String(date.getUTCMinutes()).padStart(2, "0");
  return `${year}-${month}-${day} ${hour}:${minute} UTC`;
}

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

function firstDateMatch(notes, label) {
  const match = String(notes || "").match(new RegExp(`${label}\\s+(\\d{4}-\\d{2}-\\d{2})`));
  return match ? match[1] : "";
}

function describeNextAction(rows, today) {
  const sentWaiting = rows.filter((row) => String(row.status || "").trim() === "sent").length;
  const followedUpWaiting = rows.filter((row) => String(row.status || "").trim() === "followed_up").length;

  if (sentWaiting > 0) {
    const dueDates = rows
      .filter((row) => String(row.status || "").trim() === "sent")
      .map((row) => firstDateMatch(row.notes, "Follow-up due"))
      .filter(Boolean)
      .sort();
    return `monitor the batch and send the audit follow-up on or after ${dueDates[0] || "the first due date"} UTC if replies are still zero`;
  }

  if (followedUpWaiting > 0) {
    if (today >= SECOND_TOUCH_EXHAUSTION_DATE) {
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
  const now = new Date();
  const today = now.toISOString().slice(0, 10);
  const rows = parseCsv(await readFile(BATCH_FILE, "utf8"));
  const sent = countBy(rows, "sent");
  const followedUp = countBy(rows, "followed_up");
  const ready = countBy(rows, "ready_for_send");
  const terminal = ["replied_positive", "replied_negative", "bounced", "interview_completed"]
    .map((status) => countBy(rows, status))
    .reduce((sum, value) => sum + value, 0);

  const firstSent = rows
    .map((row) => firstDateMatch(row.notes, "Sent"))
    .filter(Boolean)
    .sort()[0];

  const lines = [
    "# AI Audit Outreach Status",
    "",
    `- Checked at: ${formatUtcTimestamp(now)}`,
    `- First audit outreach send: ${firstSent || "not sent yet"}`,
    `- Ready for first send: ${ready}`,
    `- Sent and waiting on reply: ${sent}`,
    `- Followed up and waiting on reply: ${followedUp}`,
    `- Terminal rows (reply/bounce/interview): ${terminal}`,
    `- Next audit action: ${describeNextAction(rows, today)}.`,
    "",
    "## Batch Snapshot",
    "",
    "| Priority | Company | Segment | Status | Route |",
    "|---:|---|---|---|---|",
    ...rows.map((row) => `| ${row.priority} | ${row.company} | ${row.segment} | ${row.status} | ${row.public_contact_route} |`)
  ];

  await writeFile(OUTPUT, `${lines.join("\n")}\n`, "utf8");
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
