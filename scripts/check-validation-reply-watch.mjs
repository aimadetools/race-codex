#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();
const FEEDBACK_FILE = join(ROOT, "COMMUNITY-FEEDBACK.md");
const FOLLOW_UP_FILES = [
  { label: "Founder follow-up pass", path: join(ROOT, "BUYER-VALIDATION-FOUNDER-FOLLOW-UP-PASS.md") },
  { label: "Advisor follow-up pass", path: join(ROOT, "BUYER-VALIDATION-ADVISOR-FOLLOW-UP-PASS.md") }
];
const BATCH_FILES = [
  { label: "Founder/operator batch 01", path: join(ROOT, "buyer-validation-outreach-batch-01.csv") },
  { label: "Advisor batch 02", path: join(ROOT, "buyer-validation-outreach-batch-02.csv") }
];
const INTERVIEW_LOG = join(ROOT, "buyer-validation-interview-log.csv");

function parseCsv(text) {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === "\"") {
      if (inQuotes && next === "\"") {
        current += "\"";
        i += 1;
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
        i += 1;
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

function extractFollowUpDate(text) {
  const match = text.match(/Follow-up date:\s*([^\n]+)/i);
  return match ? match[1].trim() : "unknown";
}

function countReplies(rows) {
  return rows.filter((row) => ["replied_positive", "replied_negative", "bounced", "interview_completed"].includes(String(row.status || "").trim())).length;
}

function countStatus(rows, status) {
  return rows.filter((row) => String(row.status || "").trim() === status).length;
}

function parseDate(value) {
  const match = String(value || "").match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : "";
}

async function main() {
  const [feedbackText, interviewRows, ...texts] = await Promise.all([
    readFile(FEEDBACK_FILE, "utf8"),
    readFile(INTERVIEW_LOG, "utf8"),
    ...BATCH_FILES.map((batch) => readFile(batch.path, "utf8")),
    ...FOLLOW_UP_FILES.map((file) => readFile(file.path, "utf8").catch(() => ""))
  ]);

  const batchTexts = texts.slice(0, BATCH_FILES.length);
  const followUpTexts = texts.slice(BATCH_FILES.length);
  const parsedBatches = batchTexts.map((text, index) => ({
    ...BATCH_FILES[index],
    rows: parseCsv(text)
  }));
  const parsedInterviews = parseCsv(interviewRows).filter((row) => Object.values(row).some((value) => String(value || "").trim() !== ""));
  const followUps = followUpTexts.map((text, index) => ({
    label: FOLLOW_UP_FILES[index].label,
    due: extractFollowUpDate(text)
  }));
  const totalReplyRows = parsedBatches.reduce((total, batch) => total + countReplies(batch.rows), 0);
  const noFounderRepliesPosted = feedbackText.includes("No founder/operator replies have been posted here yet.");
  const today = new Date().toISOString().slice(0, 10);
  const dueFollowUps = followUps.filter((item) => {
    const dueDate = parseDate(item.due);
    return dueDate && today >= dueDate;
  });

  const lines = [
    "# Validation Reply Watch",
    "",
    ...parsedBatches.map((batch) => `- ${batch.label} replies, bounces, or interview rows recorded in CSV: ${countReplies(batch.rows)}`),
    `- Interview log rows: ${parsedInterviews.length}`,
    ...parsedBatches.map((batch) => `- ${batch.label} sent rows still waiting for replies: ${countStatus(batch.rows, "sent")}`),
    `- Community feedback note: ${noFounderRepliesPosted ? "no founder/operator replies have been posted yet." : "replies are present and need review."}`,
    ...followUps.map((item) => `- ${item.label} due: ${item.due}`),
    "",
    "## Next Action",
    ""
  ];

  if (totalReplyRows > 0 || parsedInterviews.length > 0) {
    lines.push("- Review `COMMUNITY-FEEDBACK.md` and convert any real reply into an interview.");
  } else if (followUps.some((item) => item.due === "unknown")) {
    lines.push("- Rebuild the follow-up passes because at least one due date could not be parsed.");
  } else if (dueFollowUps.length > 0) {
    lines.push(`- Send due non-responder follow-ups for: ${dueFollowUps.map((item) => item.label).join(", ")}.`);
  } else {
    lines.push("- Keep monitoring `COMMUNITY-FEEDBACK.md` until the follow-up window opens.");
  }

  process.stdout.write(`${lines.join("\n")}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
