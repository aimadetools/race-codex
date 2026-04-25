#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();
const FEEDBACK_FILE = join(ROOT, "COMMUNITY-FEEDBACK.md");
const INTERVIEW_LOG = join(ROOT, "buyer-validation-interview-log.csv");
const BATCH_FILES = [
  join(ROOT, "buyer-validation-outreach-batch-01.csv"),
  join(ROOT, "buyer-validation-outreach-batch-02.csv")
];
const FOUNDER_NOTE_PATTERN = /(?:Rechecked on [^:\n]+:\s*)?no founder\/operator replies have been posted here yet\.[^\n]*/i;
const ADVISOR_NOTE_PATTERN = /(?:Rechecked on [^:\n]+:\s*)?no advisor replies have been posted here yet\.[^\n]*/i;

function parseArgs(argv) {
  const args = new Map();
  for (let index = 2; index < argv.length; index += 1) {
    const value = argv[index];
    if (!value.startsWith("--")) {
      continue;
    }

    const next = argv[index + 1];
    if (!next || next.startsWith("--")) {
      args.set(value.slice(2), "true");
      continue;
    }

    args.set(value.slice(2), next);
    index += 1;
  }

  return args;
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

  return dataRows.map((cells) => {
    const record = {};
    header.forEach((key, cellIndex) => {
      record[key.trim()] = (cells[cellIndex] || "").trim();
    });
    return record;
  });
}

function countReplyRows(rows) {
  return rows.filter((row) => ["replied_positive", "replied_negative", "bounced", "interview_completed"].includes(String(row.status || "").trim())).length;
}

function countInterviewRows(rows) {
  return rows.filter((row) => Object.values(row).some((value) => String(value || "").trim() !== "")).length;
}

function normalizeTimestamp(value) {
  const text = String(value || "").trim();
  if (!text) {
    return new Date().toISOString().replace("T", " ").slice(0, 16) + " UTC";
  }
  return text;
}

function extractDateFromTimestamp(timestamp) {
  const match = timestamp.match(/\d{4}-\d{2}-\d{2}/);
  if (!match) {
    throw new Error(`Could not parse UTC date from timestamp: ${timestamp}`);
  }
  return match[0];
}

function buildNote(timestamp, segment) {
  if (segment === "founder") {
    return `Rechecked on ${timestamp}: no founder/operator replies have been posted here yet. Keep \`buyer-validation-outreach-batch-01.csv\` unchanged until a specific reply, bounce, referral, or interview is available.`;
  }

  return `Rechecked on ${timestamp}: no advisor replies have been posted here yet. Keep \`buyer-validation-outreach-batch-02.csv\` unchanged until a specific reply, bounce, referral, or interview is available.`;
}

function replaceSectionBody(lines, sectionDate, nextBodyLines) {
  const heading = `## ${sectionDate}`;
  const headingIndex = lines.findIndex((line) => line.trim() === heading);

  if (headingIndex === -1) {
    const replyLoggingIndex = lines.findIndex((line) => line.trim() === "## Reply Logging");
    const insertAt = replyLoggingIndex === -1 ? lines.length : replyLoggingIndex;

    return [
      ...lines.slice(0, insertAt),
      heading,
      "",
      ...nextBodyLines,
      "",
      ...lines.slice(insertAt)
    ];
  }

  let sectionEnd = headingIndex + 1;
  while (sectionEnd < lines.length && !lines[sectionEnd].startsWith("## ")) {
    sectionEnd += 1;
  }

  return [
    ...lines.slice(0, headingIndex + 1),
    "",
    ...nextBodyLines,
    "",
    ...lines.slice(sectionEnd)
  ];
}

function cleanSectionLines(lines) {
  return lines.filter((line, index, source) => {
    if (FOUNDER_NOTE_PATTERN.test(line) || ADVISOR_NOTE_PATTERN.test(line)) {
      return false;
    }

    if (line.trim() !== "") {
      return true;
    }

    const previous = source[index - 1] || "";
    const next = source[index + 1] || "";
    return previous.trim() !== "" && next.trim() !== "";
  });
}

async function main() {
  const args = parseArgs(process.argv);
  const feedbackPath = args.get("feedback") || FEEDBACK_FILE;
  const timestamp = normalizeTimestamp(args.get("timestamp"));
  const sectionDate = extractDateFromTimestamp(timestamp);

  const [feedbackText, interviewText, ...batchTexts] = await Promise.all([
    readFile(feedbackPath, "utf8"),
    readFile(INTERVIEW_LOG, "utf8"),
    ...BATCH_FILES.map((path) => readFile(path, "utf8"))
  ]);

  const [founderRows, advisorRows] = batchTexts.map((text) => parseCsv(text));
  const founderReplies = countReplyRows(founderRows);
  const advisorReplies = countReplyRows(advisorRows);
  const interviewRows = countInterviewRows(parseCsv(interviewText));

  if (founderReplies > 0 || advisorReplies > 0 || interviewRows > 0) {
    throw new Error("No-reply checkpoint is blocked because replies, bounces, or interview rows already exist.");
  }

  const lines = feedbackText.replace(/\s+$/, "").split("\n");
  const heading = `## ${sectionDate}`;
  const headingIndex = lines.findIndex((line) => line.trim() === heading);

  let preservedSectionLines = [];
  if (headingIndex !== -1) {
    let sectionEnd = headingIndex + 1;
    while (sectionEnd < lines.length && !lines[sectionEnd].startsWith("## ")) {
      sectionEnd += 1;
    }
    preservedSectionLines = cleanSectionLines(lines.slice(headingIndex + 1, sectionEnd));
  }

  const sectionBody = [
    buildNote(timestamp, "founder"),
    "",
    buildNote(timestamp, "advisor"),
    "",
    ...preservedSectionLines
  ];

  const updatedLines = replaceSectionBody(lines, sectionDate, sectionBody);
  const output = `${updatedLines.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`;

  await writeFile(feedbackPath, output, "utf8");
  console.log(`Updated ${feedbackPath} with a deduplicated no-reply checkpoint for ${timestamp}`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
