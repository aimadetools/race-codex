#!/usr/bin/env node

import { readFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const ROOT = process.cwd();
const GATE_DATE = "2026-04-27";
const BATCH_FILES = {
  founder: join(ROOT, "buyer-validation-outreach-batch-01.csv"),
  advisor: join(ROOT, "buyer-validation-outreach-batch-02.csv"),
  batch03: join(ROOT, "buyer-validation-outreach-batch-03.csv"),
  batch04: join(ROOT, "buyer-validation-outreach-batch-04.csv")
};
const FOLLOW_UP_FILES = {
  founder: join(ROOT, "BUYER-VALIDATION-FOUNDER-FOLLOW-UP-PASS.md"),
  advisor: join(ROOT, "BUYER-VALIDATION-ADVISOR-FOLLOW-UP-PASS.md")
};

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

  return dataRows.map((cells) => {
    const record = {};
    header.forEach((key, index) => {
      record[key.trim()] = (cells[index] || "").trim();
    });
    return record;
  }).filter((rowItem) => Object.values(rowItem).some((value) => String(value || "").trim() !== ""));
}

function countByStatuses(rows, statuses) {
  return rows.filter((row) => statuses.includes(String(row.status || "").trim())).length;
}

function extractFollowUpDate(text) {
  const match = text.match(/Follow-up date:\s*([^\n]+)/i);
  return match ? match[1].trim() : "unknown";
}

function parseDate(value) {
  const match = String(value || "").match(/\d{4}-\d{2}-\d{2}/);
  return match ? match[0] : "";
}

async function loadState() {
  const [
    founderBatchText,
    advisorBatchText,
    batch03Text,
    batch04Text,
    founderFollowUpText,
    advisorFollowUpText
  ] = await Promise.all([
    readFile(BATCH_FILES.founder, "utf8"),
    readFile(BATCH_FILES.advisor, "utf8"),
    readFile(BATCH_FILES.batch03, "utf8"),
    readFile(BATCH_FILES.batch04, "utf8"),
    readFile(FOLLOW_UP_FILES.founder, "utf8"),
    readFile(FOLLOW_UP_FILES.advisor, "utf8")
  ]);

  const founderRows = parseCsv(founderBatchText);
  const advisorRows = parseCsv(advisorBatchText);
  const batch03Rows = parseCsv(batch03Text);
  const batch04Rows = parseCsv(batch04Text);
  const founderFollowUpDate = extractFollowUpDate(founderFollowUpText);
  const advisorFollowUpDate = extractFollowUpDate(advisorFollowUpText);
  const today = new Date().toISOString().slice(0, 10);
  const batch03Replies = countByStatuses(batch03Rows, ["replied_positive", "replied_negative", "bounced", "interview_completed"]);

  return {
    today,
    founderRows,
    advisorRows,
    batch03Rows,
    batch04Rows,
    founderFollowUpDate,
    advisorFollowUpDate,
    founderReplies: countByStatuses(founderRows, ["replied_positive", "replied_negative", "bounced", "interview_completed"]),
    advisorReplies: countByStatuses(advisorRows, ["replied_positive", "replied_negative", "bounced", "interview_completed"]),
    batch03Replies,
    founderWaiting: countByStatuses(founderRows, ["sent"]),
    advisorWaiting: countByStatuses(advisorRows, ["sent"]),
    founderFollowUpsSent: countByStatuses(founderRows, ["followed_up"]),
    advisorFollowUpsSent: countByStatuses(advisorRows, ["followed_up"]),
    batch03Ready: countByStatuses(batch03Rows, ["ready_for_send"]),
    batch04Ready: countByStatuses(batch04Rows, ["ready_for_send"]),
    gateOpen: today >= GATE_DATE,
    founderFollowUpDue: parseDate(founderFollowUpDate) !== "" && today >= parseDate(founderFollowUpDate),
    advisorFollowUpDue: parseDate(advisorFollowUpDate) !== "" && today >= parseDate(advisorFollowUpDate)
  };
}

async function main() {
  const args = parseArgs(process.argv);
  const send = args.has("send");
  const includeBatch03 = args.has("include-batch03");
  const includeBatch04 = args.has("include-batch04");
  const transport = String(args.get("transport") || "resend").toLowerCase();
  const limit = String(args.get("limit") || "5");

  runCommand("Validation artifact sync", ["npm", "run", "sync:validation-artifacts"]);

  const state = await loadState();
  console.log("");
  console.log(`# Validation gate snapshot for ${state.today}`);
  console.log(`- Gate open: ${state.gateOpen ? "yes" : `no (opens ${GATE_DATE} UTC)`}`);
  console.log(`- Founder replies/bounces/interviews: ${state.founderReplies}`);
  console.log(`- Advisor replies/bounces/interviews: ${state.advisorReplies}`);
  console.log(`- Founder follow-up rows still pending: ${state.founderWaiting}`);
  console.log(`- Advisor follow-up rows still pending: ${state.advisorWaiting}`);
  console.log(`- Founder follow-ups already sent: ${state.founderFollowUpsSent}`);
  console.log(`- Advisor follow-ups already sent: ${state.advisorFollowUpsSent}`);
  console.log(`- Batch 03 ready rows: ${state.batch03Ready}`);
  console.log(`- Batch 03 replies/bounces/interviews: ${state.batch03Replies}`);
  console.log(`- Batch 04 ready rows: ${state.batch04Ready}`);
  console.log("");

  if (!state.gateOpen && send) {
    throw new Error(`Validation gate is still closed. Re-run on or after ${GATE_DATE} UTC.`);
  }

  if (state.founderFollowUpDue && state.founderWaiting > 0) {
    runCommand("Founder follow-up self-audit QA", ["npm", "run", "check:self-audit-follow-up"]);
    runCommand("Founder follow-up batch", [
      "node",
      join(ROOT, "scripts", "send-validation-batch.mjs"),
      "--batch",
      "01",
      "--follow-up",
      "--limit",
      limit,
      ...(send ? ["--send"] : []),
      "--transport",
      transport
    ]);
  } else {
    console.log("- Founder follow-up queue is not due or has no pending rows.");
  }

  if (state.advisorFollowUpDue && state.advisorWaiting > 0) {
    runCommand("Advisor follow-up self-audit QA", ["npm", "run", "check:self-audit-follow-up"]);
    runCommand("Advisor follow-up batch", [
      "node",
      join(ROOT, "scripts", "send-validation-batch.mjs"),
      "--batch",
      "02",
      "--follow-up",
      "--limit",
      limit,
      ...(send ? ["--send"] : []),
      "--transport",
      transport
    ]);
  } else {
    console.log("- Advisor follow-up queue is not due or has no pending rows.");
  }

  if (includeBatch03) {
    if (!state.gateOpen) {
      console.log(`- Batch 03 remains blocked until ${GATE_DATE} UTC.`);
    } else if (state.founderReplies > 0) {
      console.log("- Batch 03 remains blocked because founder replies or interviews already exist.");
    } else if (state.batch03Ready === 0) {
      console.log("- Batch 03 has no ready rows left.");
    } else {
      runCommand("Founder batch 03", [
        "node",
        join(ROOT, "scripts", "send-validation-batch.mjs"),
        "--batch",
        "03",
        "--limit",
        limit,
        ...(send ? ["--send"] : []),
        "--transport",
        transport
      ]);
    }
  } else {
    console.log("- Batch 03 not requested. Re-run with --include-batch03 when the no-reply contingency should be evaluated.");
  }

  if (includeBatch04) {
    if (!state.gateOpen) {
      console.log(`- Batch 04 remains blocked until ${GATE_DATE} UTC.`);
    } else if (state.founderReplies + state.batch03Replies > 0) {
      console.log("- Batch 04 remains blocked because founder or batch 03 replies, bounces, or interviews already exist.");
    } else if (state.batch03Ready > 0) {
      console.log("- Batch 04 remains blocked because batch 03 still has ready rows.");
    } else if (state.batch04Ready === 0) {
      console.log("- Batch 04 has no ready rows left.");
    } else {
      runCommand("Founder batch 04", [
        "node",
        join(ROOT, "scripts", "send-validation-batch.mjs"),
        "--batch",
        "04",
        "--limit",
        limit,
        ...(send ? ["--send"] : []),
        "--transport",
        transport
      ]);
    }
  } else {
    console.log("- Batch 04 not requested. Re-run with --include-batch04 only after batch 03 is exhausted and founder replies are still zero.");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
