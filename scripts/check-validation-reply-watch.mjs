#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();
const FEEDBACK_FILE = join(ROOT, "COMMUNITY-FEEDBACK.md");
const FOLLOW_UP_FILE = join(ROOT, "BUYER-VALIDATION-FOUNDER-FOLLOW-UP-PASS.md");
const BATCH_01_FILE = join(ROOT, "buyer-validation-outreach-batch-01.csv");
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

async function main() {
  const [feedbackText, followUpText, batchRows, interviewRows] = await Promise.all([
    readFile(FEEDBACK_FILE, "utf8"),
    readFile(FOLLOW_UP_FILE, "utf8"),
    readFile(BATCH_01_FILE, "utf8"),
    readFile(INTERVIEW_LOG, "utf8")
  ]);

  const parsedBatch = parseCsv(batchRows);
  const parsedInterviews = parseCsv(interviewRows).filter((row) => Object.values(row).some((value) => String(value || "").trim() !== ""));
  const replyRows = countReplies(parsedBatch);
  const noRepliesPosted = feedbackText.includes("No founder/operator replies have been posted here yet.");
  const followUpDate = extractFollowUpDate(followUpText);
  const sentRows = parsedBatch.filter((row) => String(row.status || "").trim() === "sent").length;

  const lines = [
    "# Validation Reply Watch",
    "",
    `- Founder/operator replies recorded in batch 01 CSV: ${replyRows}`,
    `- Interview log rows: ${parsedInterviews.length}`,
    `- Batch 01 sent rows still waiting for replies: ${sentRows}`,
    `- Community feedback note: ${noRepliesPosted ? "no founder/operator replies have been posted yet." : "replies are present and need review."}`,
    `- Founder follow-up pass due: ${followUpDate}`,
    "",
    "## Next Action",
    ""
  ];

  if (replyRows > 0 || parsedInterviews.length > 0) {
    lines.push("- Review `COMMUNITY-FEEDBACK.md` and convert any real reply into an interview.");
  } else if (followUpDate === "unknown") {
    lines.push("- Rebuild the founder follow-up pass because the due date could not be parsed.");
  } else {
    lines.push("- Keep monitoring `COMMUNITY-FEEDBACK.md` until the follow-up window opens.");
  }

  process.stdout.write(`${lines.join("\n")}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
