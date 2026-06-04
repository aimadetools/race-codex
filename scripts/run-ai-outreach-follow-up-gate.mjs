#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const ROOT = process.cwd();
const BATCH_FILES = {
  benchmark: join(ROOT, "ai-benchmark-outreach-batch-01.csv"),
  agentReview: join(ROOT, "ai-agent-review-outreach-batch-01.csv"),
  audit: join(ROOT, "ai-audit-outreach-batch-01.csv")
};
const FOLLOW_UP_FILES = {
  benchmark: join(ROOT, "BENCHMARK-OUTREACH-FOLLOW-UP-PASS.md"),
  agentReview: join(ROOT, "AI-AGENT-REVIEW-OUTREACH-FOLLOW-UP-PASS.md"),
  audit: join(ROOT, "AI-AUDIT-OUTREACH-FOLLOW-UP-PASS.md")
};
const TERMINAL_STATUSES = new Set(["replied_positive", "replied_negative", "bounced", "interview_completed"]);

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

function runCommand(label, args) {
  const result = spawnSync(args[0], args.slice(1), {
    cwd: ROOT,
    encoding: "utf8"
  });

  if (result.stdout) {
    process.stdout.write(result.stdout);
  }

  if (result.stderr) {
    process.stderr.write(result.stderr);
  }

  if (result.status !== 0) {
    throw new Error(`${label} failed.`);
  }
}

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

  return dataRows
    .map((cells) => {
      const record = {};
      header.forEach((key, index) => {
        record[key.trim()] = (cells[index] || "").trim();
      });
      return record;
    })
    .filter((rowItem) => Object.values(rowItem).some((value) => String(value || "").trim() !== ""));
}

function countByStatuses(rows, statuses) {
  const expected = new Set(statuses);
  return rows.filter((row) => expected.has(String(row.status || "").trim())).length;
}

function extractDate(text) {
  const match = String(text || "").match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : "";
}

function extractFollowUpDate(text) {
  const match = String(text || "").match(/Follow-up date:\s*([^\n]+)/i);
  return extractDate(match ? match[1] : "");
}

function summarize(rows, today, dueDate) {
  const pending = rows.filter((row) => String(row.status || "").trim() === "sent").length;
  const followedUp = rows.filter((row) => String(row.status || "").trim() === "followed_up").length;
  const terminal = rows.filter((row) => TERMINAL_STATUSES.has(String(row.status || "").trim())).length;
  return {
    pending,
    followedUp,
    terminal,
    dueDate,
    dueNow: Boolean(dueDate) && today >= dueDate && pending > 0
  };
}

async function loadState() {
  const [
    benchmarkBatchText,
    agentReviewBatchText,
    auditBatchText,
    benchmarkFollowUpText,
    agentReviewFollowUpText,
    auditFollowUpText
  ] = await Promise.all([
    readFile(BATCH_FILES.benchmark, "utf8"),
    readFile(BATCH_FILES.agentReview, "utf8"),
    readFile(BATCH_FILES.audit, "utf8"),
    readFile(FOLLOW_UP_FILES.benchmark, "utf8"),
    readFile(FOLLOW_UP_FILES.agentReview, "utf8"),
    readFile(FOLLOW_UP_FILES.audit, "utf8")
  ]);

  const today = new Date().toISOString().slice(0, 10);
  const benchmarkRows = parseCsv(benchmarkBatchText);
  const agentReviewRows = parseCsv(agentReviewBatchText);
  const auditRows = parseCsv(auditBatchText);

  return {
    today,
    benchmark: summarize(benchmarkRows, today, extractFollowUpDate(benchmarkFollowUpText)),
    agentReview: summarize(agentReviewRows, today, extractFollowUpDate(agentReviewFollowUpText)),
    audit: summarize(auditRows, today, extractFollowUpDate(auditFollowUpText)),
    benchmarkReplies: countByStatuses(benchmarkRows, TERMINAL_STATUSES),
    agentReviewReplies: countByStatuses(agentReviewRows, TERMINAL_STATUSES),
    auditReplies: countByStatuses(auditRows, TERMINAL_STATUSES)
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const send = args.has("send");
  const transport = String(args.get("transport") || "resend").toLowerCase();
  const limit = String(args.get("limit") || "5");

  runCommand("Validation artifact sync", ["npm", "run", "sync:validation-artifacts"]);

  const state = await loadState();

  console.log("");
  console.log(`# AI outreach follow-up gate snapshot for ${state.today}`);
  console.log(`- Benchmark replies/bounces/interviews: ${state.benchmarkReplies}`);
  console.log(`- Benchmark sent rows still pending follow-up: ${state.benchmark.pending}`);
  console.log(`- Benchmark follow-ups already sent: ${state.benchmark.followedUp}`);
  console.log(`- Benchmark follow-up date: ${state.benchmark.dueDate || "missing"}`);
  console.log(`- AI agent review replies/bounces/interviews: ${state.agentReviewReplies}`);
  console.log(`- AI agent review sent rows still pending follow-up: ${state.agentReview.pending}`);
  console.log(`- AI agent review follow-ups already sent: ${state.agentReview.followedUp}`);
  console.log(`- AI agent review follow-up date: ${state.agentReview.dueDate || "missing"}`);
  console.log(`- AI audit replies/bounces/interviews: ${state.auditReplies}`);
  console.log(`- AI audit sent rows still pending follow-up: ${state.audit.pending}`);
  console.log(`- AI audit follow-ups already sent: ${state.audit.followedUp}`);
  console.log(`- AI audit follow-up date: ${state.audit.dueDate || "missing"}`);
  console.log("");

  if (state.benchmark.dueNow) {
    runCommand("Benchmark outreach follow-up", [
      "node",
      join(ROOT, "scripts", "send-ai-benchmark-outreach.mjs"),
      "--follow-up",
      "--limit",
      limit,
      ...(send ? ["--send"] : []),
      "--transport",
      transport
    ]);
    if (send) {
      runCommand("Benchmark outreach status rebuild", ["npm", "run", "build:benchmark-outreach-status"]);
      runCommand("Benchmark follow-up pass rebuild", ["npm", "run", "build:benchmark-follow-up-pass"]);
    }
  } else {
    console.log(`- Benchmark outreach follow-up queue is not due or has no pending sent rows (due ${state.benchmark.dueDate || "unknown"} UTC).`);
  }

  if (state.agentReview.dueNow) {
    runCommand("AI agent review follow-up", [
      "node",
      join(ROOT, "scripts", "send-ai-agent-review-outreach.mjs"),
      "--follow-up",
      "--limit",
      limit,
      ...(send ? ["--send"] : []),
      "--transport",
      transport
    ]);
    if (send) {
      runCommand("AI agent review status rebuild", ["npm", "run", "build:ai-agent-review-outreach-status"]);
      runCommand("AI agent review follow-up pass rebuild", ["npm", "run", "build:ai-agent-review-follow-up-pass"]);
    }
  } else {
    console.log(`- AI agent review follow-up queue is not due or has no pending sent rows (due ${state.agentReview.dueDate || "unknown"} UTC).`);
  }

  if (state.audit.dueNow) {
    runCommand("AI audit outreach follow-up", [
      "node",
      join(ROOT, "scripts", "send-ai-audit-outreach.mjs"),
      "--follow-up",
      "--limit",
      limit,
      ...(send ? ["--send"] : []),
      "--transport",
      transport
    ]);
    if (send) {
      runCommand("AI audit outreach status rebuild", ["npm", "run", "build:ai-audit-outreach-status"]);
      runCommand("AI audit follow-up pass rebuild", ["npm", "run", "build:ai-audit-follow-up-pass"]);
    }
  } else {
    console.log(`- AI audit follow-up queue is not due or has no pending sent rows (due ${state.audit.dueDate || "unknown"} UTC).`);
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
