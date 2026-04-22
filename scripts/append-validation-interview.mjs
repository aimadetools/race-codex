#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();
const DEFAULT_CSV = join(ROOT, "buyer-validation-interview-log.csv");
const HEADER = [
  "date",
  "person",
  "segment",
  "company",
  "trigger",
  "current_workflow",
  "pain_score",
  "urgency_score",
  "current_workaround_score",
  "buyer_clarity_score",
  "willingness_to_pay_score",
  "referral_value_score",
  "total_score",
  "validation_positive",
  "pay_or_referral_signal",
  "next_step",
  "notes"
];

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

function pickValue(source, names, fallback = "") {
  for (const name of names) {
    if (source[name] != null && String(source[name]).trim() !== "") {
      return String(source[name]).trim();
    }
  }
  return fallback;
}

function parseScore(source, names) {
  const raw = pickValue(source, names, "");
  if (raw === "") {
    throw new Error(`Missing required score field: ${names.join(" / ")}`);
  }

  const score = Number(raw);
  if (!Number.isInteger(score) || score < 0 || score > 2) {
    throw new Error(`Invalid score for ${names.join(" / ")}: expected an integer from 0 to 2.`);
  }

  return score;
}

function requireText(source, names) {
  const value = pickValue(source, names, "");
  if (value === "") {
    throw new Error(`Missing required field: ${names.join(" / ")}`);
  }
  return value;
}

function buildRow(payload) {
  const painScore = parseScore(payload, ["pain_score", "painScore"]);
  const urgencyScore = parseScore(payload, ["urgency_score", "urgencyScore"]);
  const workaroundScore = parseScore(payload, ["current_workaround_score", "currentWorkaroundScore"]);
  const buyerClarityScore = parseScore(payload, ["buyer_clarity_score", "buyerClarityScore"]);
  const willingnessScore = parseScore(payload, ["willingness_to_pay_score", "willingnessToPayScore"]);
  const referralScore = parseScore(payload, ["referral_value_score", "referralValueScore"]);
  const signal = pickValue(payload, ["pay_or_referral_signal", "payOrReferralSignal"], "");
  const totalScore = painScore + urgencyScore + workaroundScore + buyerClarityScore + willingnessScore + referralScore;
  const validationPositive = totalScore >= 8 && signal !== "";

  return {
    date: pickValue(payload, ["date"], utcDateString()),
    person: requireText(payload, ["person", "name"]),
    segment: requireText(payload, ["segment"]),
    company: requireText(payload, ["company", "organization"]),
    trigger: requireText(payload, ["trigger"]),
    current_workflow: requireText(payload, ["current_workflow", "currentWorkflow"]),
    pain_score: String(painScore),
    urgency_score: String(urgencyScore),
    current_workaround_score: String(workaroundScore),
    buyer_clarity_score: String(buyerClarityScore),
    willingness_to_pay_score: String(willingnessScore),
    referral_value_score: String(referralScore),
    total_score: String(totalScore),
    validation_positive: validationPositive ? "true" : "false",
    pay_or_referral_signal: signal,
    next_step: requireText(payload, ["next_step", "nextStep"]),
    notes: pickValue(payload, ["notes"]),
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const inputPath = args.get("input");
  const csvPath = args.get("csv") || DEFAULT_CSV;
  const dryRun = args.has("dry-run");

  if (!inputPath) {
    throw new Error("Missing required --input path to a JSON payload.");
  }

  const payload = JSON.parse(await readFile(inputPath, "utf8"));
  const row = buildRow(payload);
  const existing = await readFile(csvPath, "utf8");
  const parsed = parseCsv(existing);

  if (parsed.header.length === 0) {
    throw new Error(`Could not read header from ${csvPath}`);
  }

  const missingColumns = HEADER.filter((column) => !parsed.header.includes(column));
  if (missingColumns.length > 0) {
    throw new Error(`CSV header mismatch. Missing columns: ${missingColumns.join(", ")}`);
  }

  const updatedRows = [...parsed.records, row];
  const output = serializeCsv(parsed.header, updatedRows);

  if (dryRun) {
    process.stdout.write(`${JSON.stringify(row, null, 2)}\n`);
    return;
  }

  await writeFile(csvPath, output);
  process.stdout.write(`Appended interview row to ${csvPath}\n`);
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
