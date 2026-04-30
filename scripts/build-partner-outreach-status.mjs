#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();
const TRACKER_FILE = join(ROOT, "consultant-partner-outreach-tracker.csv");
const OUTPUT = join(ROOT, "PARTNER-OUTREACH-STATUS.md");

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
    header.forEach((key, index) => {
      record[key.trim()] = (cells[index] || "").trim();
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

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function parseIsoDate(value) {
  const text = String(value || "").trim();
  if (!/^\d{4}-\d{2}-\d{2}$/.test(text)) {
    return null;
  }
  return new Date(`${text}T00:00:00Z`);
}

function diffUtcDays(startIso, endIso) {
  const start = parseIsoDate(startIso);
  const end = parseIsoDate(endIso);
  if (!start || !end) {
    return null;
  }
  return Math.round((end.getTime() - start.getTime()) / 86400000);
}

function describeFollowUpReadiness(rows, today) {
  const followUpRows = rows
    .filter((row) => String(row.next_action || "").trim() === "follow_up")
    .sort((left, right) => String(left.next_touch_date || "").localeCompare(String(right.next_touch_date || "")));

  if (followUpRows.length === 0) {
    return "no partner follow-ups are currently queued";
  }

  const dueNow = followUpRows.filter((row) => String(row.next_touch_date || "").trim() && String(row.next_touch_date || "").trim() <= today).length;
  if (dueNow > 0) {
    return `${dueNow} partner follow-up row(s) are due now`;
  }

  const nextDue = String(followUpRows[0].next_touch_date || "").trim();
  const daysRemaining = diffUtcDays(today, nextDue);
  if (!nextDue || daysRemaining == null) {
    return "partner follow-up is queued but the next due date is missing";
  }

  if (daysRemaining === 0) {
    return `next partner follow-up is due today (${nextDue})`;
  }

  if (daysRemaining === 1) {
    return `next partner follow-up is due on ${nextDue} (1 day remaining)`;
  }

  return `next partner follow-up is due on ${nextDue} (${daysRemaining} days remaining)`;
}

function describeNextStep(rows) {
  const replied = rows.filter((row) => String(row.outreach_status || "").trim() === "replied").length;
  if (replied > 0) {
    return "triage the real partner replies and classify referral-only vs client-delivery vs white-label demand";
  }

  const followUpRows = rows
    .filter((row) => String(row.next_action || "").trim() === "follow_up")
    .sort((left, right) => String(left.next_touch_date || "").localeCompare(String(right.next_touch_date || "")));

  if (followUpRows.length > 0) {
    const nextRow = followUpRows[0];
    return `send the next partner follow-up on or after ${nextRow.next_touch_date || "the scheduled due date"} if replies are still zero`;
  }

  const readyRows = rows.filter((row) => String(row.outreach_status || "").trim() === "ready_to_send");
  if (readyRows.length > 0) {
    return `send the next ${readyRows.length} ready partner prospect(s)`;
  }

  return "monitor the tracker for replies and keep the next expansion gated on evidence";
}

const now = formatUtcTimestamp(new Date());
const today = todayIsoDate();
const rows = parseCsv(await readFile(TRACKER_FILE, "utf8"));
const sent = countBy(rows, "outreach_status", "sent");
const ready = countBy(rows, "outreach_status", "ready_to_send");
const replied = countBy(rows, "outreach_status", "replied");
const booked = countBy(rows, "outreach_status", "booked");
const noResponse = countBy(rows, "outreach_status", "no_response");
const notFit = countBy(rows, "outreach_status", "not_fit");
const followUpRows = rows
  .filter((row) => String(row.next_action || "").trim() === "follow_up")
  .sort((left, right) => String(left.next_touch_date || "").localeCompare(String(right.next_touch_date || "")));

const output = [
  "# Partner Outreach Status",
  "",
  `Checked at: ${now}`,
  "",
  "## Current State",
  "",
  `- Ready to send: ${ready}`,
  `- Sent and waiting on reply: ${sent}`,
  `- Replied: ${replied}`,
  `- Booked: ${booked}`,
  `- No response: ${noResponse}`,
  `- Not fit: ${notFit}`,
  `- Follow-up readiness: ${describeFollowUpReadiness(rows, today)}.`,
  `- Next partner action: ${describeNextStep(rows)}.`,
  ""
];

if (followUpRows.length > 0) {
  output.push("## Upcoming Follow-Ups", "");
  for (const row of followUpRows) {
    output.push(`- ${row.organization}: follow up on or after ${row.next_touch_date || "unknown"} (last touch ${row.last_touch_date || "unknown"}).`);
  }
  output.push("");
}

if (rows.length > 0) {
  output.push("## Tracker Snapshot", "");
  for (const row of rows) {
    output.push(`- ${row.organization}: ${row.outreach_status || "unknown"}; next action ${row.next_action || "unknown"}; last touch ${row.last_touch_date || "unknown"}; next touch ${row.next_touch_date || "unknown"}.`);
  }
  output.push("");
}

await writeFile(OUTPUT, output.join("\n"));
console.log(`Wrote ${OUTPUT}`);
