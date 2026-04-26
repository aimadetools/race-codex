#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { spawnSync } from "node:child_process";
import { join } from "node:path";

const ROOT = process.cwd();
const ALLOWED_STATUSES = new Set([
  "ready_for_send",
  "sent",
  "follow_up_scheduled",
  "followed_up",
  "replied_positive",
  "replied_negative",
  "bounced",
  "interview_completed"
]);

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

function utcTimestamp() {
  return new Date().toISOString();
}

function appendNotes(existing, additions) {
  const parts = [String(existing || "").trim(), ...additions.filter(Boolean)];
  return parts.filter(Boolean).join(" ");
}

function requireText(args, name) {
  const value = String(args.get(name) || "").trim();
  if (!value) {
    throw new Error(`Missing required --${name} value.`);
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

function buildStatusNote({ status, timestamp, transport, recipient, route, followUpDate }) {
  if (status === "sent") {
    const destination = recipient ? ` to ${recipient}` : route ? ` through ${route}` : "";
    return `Sent ${timestamp} via ${transport}${destination}.`;
  }

  if (status === "followed_up") {
    const destination = recipient ? ` to ${recipient}` : route ? ` through ${route}` : "";
    return `Followed up ${timestamp} via ${transport}${destination}.`;
  }

  if (status === "follow_up_scheduled") {
    return `Follow-up scheduled ${timestamp}${followUpDate ? ` for ${followUpDate}` : ""}.`;
  }

  if (status === "bounced") {
    return `Bounced ${timestamp}${route ? ` via ${route}` : ""}.`;
  }

  if (status === "ready_for_send") {
    return `Reset to ready_for_send ${timestamp}.`;
  }

  return "";
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
  const batch = String(args.get("batch") || "").padStart(2, "0");
  const csvPath = args.get("csv") || (batch ? join(ROOT, `buyer-validation-outreach-batch-${batch}.csv`) : "");
  const company = requireText(args, "company");
  const status = requireText(args, "status");
  const dryRun = args.has("dry-run");
  const skipSync = args.has("skip-sync");
  const timestamp = String(args.get("timestamp") || utcTimestamp()).trim();
  const transport = String(args.get("transport") || "manual").trim();
  const recipient = String(args.get("recipient") || "").trim();
  const route = String(args.get("route") || "").trim();
  const note = String(args.get("note") || "").trim();
  const followUpDate = String(args.get("follow-up-date") || "").trim();

  if (!csvPath) {
    throw new Error("Missing batch or --csv path for the outreach CSV.");
  }

  if (!ALLOWED_STATUSES.has(status)) {
    throw new Error(`Unsupported status "${status}".`);
  }

  const parsed = parseCsv(await readFile(csvPath, "utf8"));
  if (parsed.header.length === 0) {
    throw new Error(`Could not read header from ${csvPath}`);
  }

  const targetRow = findTargetRow(parsed.records, company);
  if (!targetRow) {
    throw new Error(`Could not find ${company} in ${csvPath}.`);
  }

  const autoNote = buildStatusNote({
    status,
    timestamp,
    transport,
    recipient,
    route,
    followUpDate
  });

  targetRow.status = status;
  targetRow.notes = appendNotes(targetRow.notes, [autoNote, note]);

  if (dryRun) {
    console.log(JSON.stringify({
      csvPath,
      company,
      status,
      timestamp,
      transport,
      recipient,
      route,
      note: targetRow.notes
    }, null, 2));
    return;
  }

  await writeFile(csvPath, serializeCsv(parsed.header, parsed.records), "utf8");
  console.log(`Updated ${csvPath} for ${company} -> ${status}`);

  if (!skipSync) {
    syncValidationArtifacts();
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
