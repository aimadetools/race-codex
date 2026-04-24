#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const ROOT = process.cwd();
const DEFAULT_FEEDBACK = join(ROOT, "COMMUNITY-FEEDBACK.md");
const DEFAULT_INTERVIEW_CSV = join(ROOT, "buyer-validation-interview-log.csv");

function parseArgs(argv) {
  const args = new Map();
  for (let i = 2; i < argv.length; i += 1) {
    const value = argv[i];
    if (!value.startsWith("--")) {
      continue;
    }

    const next = argv[i + 1];
    if (!next || next.startsWith("--")) {
      args.set(value.slice(2), "true");
      continue;
    }

    args.set(value.slice(2), next);
    i += 1;
  }
  return args;
}

function parseCsv(text) {
  const rows = [];
  let current = "";
  let row = [];
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (char === '"') {
      if (inQuotes && next === '"') {
        current += '"';
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
    return {
      header: [],
      records: []
    };
  }

  const keys = header.map((key) => key.trim());
  return {
    header: keys,
    records: dataRows.map((cells) => {
      const record = {};
      keys.forEach((key, index) => {
        record[key] = (cells[index] || "").trim();
      });
      return record;
    })
  };
}

function escapeCsvCell(value) {
  const text = String(value || "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, '""')}"`;
  }
  return text;
}

function serializeCsv(header, rows) {
  const lines = [
    header.map(escapeCsvCell).join(","),
    ...rows.map((row) => header.map((key) => escapeCsvCell(row[key])).join(","))
  ];
  return `${lines.join("\n")}\n`;
}

function utcDateString(date = new Date()) {
  return date.toISOString().slice(0, 10);
}

function parseReplyType(source) {
  const raw = String(source.replyType || source.reply_type || source.status || "").trim().toLowerCase();
  if (!raw) {
    throw new Error("Missing required reply_type/status field.");
  }

  if (["positive", "replied_positive", "referral", "interview", "interview_completed"].includes(raw)) {
    return "positive";
  }

  if (["negative", "replied_negative", "decline", "declined"].includes(raw)) {
    return "negative";
  }

  if (["bounce", "bounced"].includes(raw)) {
    return "bounce";
  }

  throw new Error(`Unsupported reply type: ${raw}`);
}

function replyStatus(replyType, hasInterviewInput) {
  if (hasInterviewInput) {
    return "interview_completed";
  }

  if (replyType === "positive") {
    return "replied_positive";
  }

  if (replyType === "negative") {
    return "replied_negative";
  }

  return "bounced";
}

function pickValue(source, names, fallback = "") {
  for (const name of names) {
    if (source[name] != null && String(source[name]).trim() !== "") {
      return String(source[name]).trim();
    }
  }
  return fallback;
}

function requireText(source, names) {
  const value = pickValue(source, names, "");
  if (value === "") {
    throw new Error(`Missing required field: ${names.join(" / ")}`);
  }
  return value;
}

function findTargetRow(rows, company) {
  const needle = company.toLowerCase();
  return rows.find((row) => {
    const companyName = String(row.company || row.organization || "").toLowerCase();
    return companyName === needle;
  });
}

function appendNotes(existing, additions) {
  const parts = [String(existing || "").trim(), ...additions.filter(Boolean)];
  return parts.filter(Boolean).join(" ");
}

function normalizeScoreBand(payload) {
  const band = pickValue(payload, ["score_band", "scoreBand", "self_audit_score_band", "selfAuditScoreBand"]);
  const rawScore = pickValue(payload, ["score", "self_audit_score", "selfAuditScore"]);

  if (band) {
    const normalized = band.replace(/\s+/g, "").replace(/\/10$/i, "");
    if (["0-4", "5-7", "8-10"].includes(normalized)) {
      return normalized;
    }
    throw new Error(`Unsupported score band: ${band}`);
  }

  if (rawScore) {
    const numericScore = Number(rawScore);
    if (!Number.isFinite(numericScore) || numericScore < 0 || numericScore > 10) {
      throw new Error(`Unsupported score value: ${rawScore}`);
    }

    if (numericScore <= 4) {
      return "0-4";
    }
    if (numericScore <= 7) {
      return "5-7";
    }
    return "8-10";
  }

  return "";
}

function formatFeedbackLine(entry) {
  const segments = [
    entry.date,
    entry.replyLabel,
    entry.company,
    entry.segment,
    `Summary: ${entry.summary}`
  ];

  if (entry.details) {
    segments.push(`Details: ${entry.details}`);
  }

  if (entry.nextStep) {
    segments.push(`Next step: ${entry.nextStep}`);
  }

  if (entry.source) {
    segments.push(`Source: ${entry.source}`);
  }

  if (entry.sourceTag) {
    segments.push(`Source tag: ${entry.sourceTag}`);
  }

  if (entry.scoreBand) {
    segments.push(`Score band: ${entry.scoreBand}`);
  }

  if (entry.ownershipSignal) {
    segments.push(`Ownership: ${entry.ownershipSignal}`);
  }

  if (entry.signal) {
    segments.push(`Signal: ${entry.signal}`);
  }

  return `- ${segments.filter(Boolean).join(" | ")}`;
}

function upsertFeedbackText(existing, entry) {
  const lines = existing.replace(/\s+$/, "").split("\n");
  const heading = `## ${entry.date}`;
  const headingIndex = lines.findIndex((line) => line.trim() === heading);
  const bullet = formatFeedbackLine(entry);

  if (headingIndex === -1) {
    const suffix = existing.endsWith("\n") ? "" : "\n";
    return `${existing}${suffix}\n${heading}\n\n${bullet}\n`;
  }

  let insertAt = headingIndex + 1;
  while (insertAt < lines.length && !lines[insertAt].startsWith("## ")) {
    insertAt += 1;
  }

  const updated = [
    ...lines.slice(0, insertAt),
    "",
    bullet,
    "",
    ...lines.slice(insertAt)
  ];

  return `${updated.join("\n").replace(/\n{3,}/g, "\n\n").trimEnd()}\n`;
}

function runInterviewAppender(interviewInput, interviewCsv, dryRun) {
  const args = [
    join(ROOT, "scripts/append-validation-interview.mjs"),
    "--input",
    interviewInput
  ];

  if (interviewCsv) {
    args.push("--csv", interviewCsv);
  }

  args.push("--skip-sync");

  if (dryRun) {
    args.push("--dry-run");
  }

  const result = spawnSync("node", args, {
    cwd: ROOT,
    stdio: "inherit"
  });

  if (result.status !== 0) {
    throw new Error("Interview log update failed.");
  }
}

function syncValidationArtifacts() {
  const result = spawnSync("node", [join(ROOT, "scripts", "sync-validation-artifacts.mjs")], {
    cwd: ROOT,
    stdio: "inherit"
  });

  if (result.status !== 0) {
    throw new Error("Validation artifact sync failed.");
  }
}

async function main() {
  const args = parseArgs(process.argv);
  const inputPath = args.get("input");
  const batch = String(args.get("batch") || "").padStart(2, "0");
  const csvPath = args.get("csv") || (batch ? join(ROOT, `buyer-validation-outreach-batch-${batch}.csv`) : "");
  const feedbackPath = args.get("feedback") || DEFAULT_FEEDBACK;
  const interviewCsv = args.get("interview-csv") || DEFAULT_INTERVIEW_CSV;
  const interviewInput = args.get("interview-input");
  const dryRun = args.has("dry-run");

  if (!inputPath) {
    throw new Error("Missing required --input path to a JSON payload.");
  }

  if (!csvPath) {
    throw new Error("Missing batch or --csv path for the outreach CSV.");
  }

  const payload = JSON.parse(await readFile(inputPath, "utf8"));
  const company = requireText(payload, ["company", "organization"]);
  const segment = requireText(payload, ["segment"]);
  const summary = requireText(payload, ["summary", "reply_summary", "replySummary"]);
  const replyType = parseReplyType(payload);
  const date = pickValue(payload, ["date"], utcDateString());
  const details = pickValue(payload, ["details", "body", "reply_body"]);
  const source = pickValue(payload, ["source", "route", "via"]);
  const sourceTag = pickValue(payload, ["source_tag", "sourceTag", "self_audit_source_tag", "selfAuditSourceTag"]);
  const scoreBand = normalizeScoreBand(payload);
  const ownershipSignal = pickValue(payload, ["ownership_signal", "ownershipSignal", "owner_role", "ownerRole"]);
  const signal = pickValue(payload, ["signal", "intent_signal", "intentSignal", "outcome_signal", "outcomeSignal"]);
  const nextStep = pickValue(payload, ["next_step", "nextStep"]);
  const feedbackLabel = replyType === "positive" ? "replied_positive" : replyType === "negative" ? "replied_negative" : "bounced";

  const parsed = parseCsv(await readFile(csvPath, "utf8"));
  if (parsed.header.length === 0) {
    throw new Error(`Could not read header from ${csvPath}`);
  }

  const targetRow = findTargetRow(parsed.records, company);
  if (!targetRow) {
    throw new Error(`Could not find ${company} in ${csvPath}.`);
  }

  const hasInterviewInput = Boolean(interviewInput);
  const updatedStatus = replyStatus(replyType, hasInterviewInput);
  const notes = appendNotes(targetRow.notes, [
    `${date}: ${feedbackLabel}`,
    `Summary: ${summary}`,
    details ? `Details: ${details}` : "",
    source ? `Source: ${source}` : "",
    sourceTag ? `Source tag: ${sourceTag}` : "",
    scoreBand ? `Score band: ${scoreBand}` : "",
    ownershipSignal ? `Ownership: ${ownershipSignal}` : "",
    signal ? `Signal: ${signal}` : "",
    nextStep ? `Next step: ${nextStep}` : ""
  ]);

  targetRow.status = updatedStatus;
  targetRow.notes = notes;

  const feedbackEntry = {
    date,
    replyLabel: feedbackLabel,
    company,
    segment,
    summary,
    details,
    nextStep,
    source,
    sourceTag,
    scoreBand,
    ownershipSignal,
    signal
  };

  const feedbackOutput = upsertFeedbackText(await readFile(feedbackPath, "utf8"), feedbackEntry);

  if (dryRun) {
    console.log(JSON.stringify({
      csvPath,
      feedbackPath,
      company,
      segment,
      status: updatedStatus,
      feedbackEntry
    }, null, 2));

    if (hasInterviewInput) {
      const interviewPreview = spawnSync("node", [
        join(ROOT, "scripts/append-validation-interview.mjs"),
        "--input",
        interviewInput,
        "--csv",
        interviewCsv,
        "--dry-run"
      ], {
        cwd: ROOT,
        encoding: "utf8"
      });

      if (interviewPreview.stdout) {
        process.stdout.write(interviewPreview.stdout);
      }
      if (interviewPreview.stderr) {
        process.stderr.write(interviewPreview.stderr);
      }
      if (interviewPreview.status !== 0) {
        throw new Error("Interview log preview failed.");
      }
    }

    return;
  }

  await writeFile(csvPath, serializeCsv(parsed.header, parsed.records), "utf8");
  await writeFile(feedbackPath, feedbackOutput, "utf8");
  console.log(`Updated ${csvPath} and ${feedbackPath}`);

  if (interviewInput) {
    runInterviewAppender(interviewInput, interviewCsv, false);
  }

  syncValidationArtifacts();
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
