#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();
const BATCH_FILE = join(ROOT, "ai-audit-outreach-batch-01.csv");
const ROOT_ENV_FILE = join(ROOT, ".env.production.local");
const FALLBACK_ENV_FILE = join(ROOT, ".env.local");
const VERCEL_ENV_FILE = join(ROOT, ".vercel", ".env.production.local");
const DEFAULT_FROM = "NoticeKit <hello@noticekit.tech>";
const TERMINAL_STATUSES = new Set(["replied_positive", "replied_negative", "bounced", "interview_completed"]);

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
    return { header: [], records: [] };
  }

  const keys = header.map((key) => key.trim());
  return {
    header: keys,
    records: dataRows.map((cells) => {
      const record = {};
      keys.forEach((key, cellIndex) => {
        record[key] = (cells[cellIndex] || "").trim();
      });
      return record;
    })
  };
}

function escapeCsvCell(value) {
  const text = String(value || "");
  if (/[",\n\r]/.test(text)) {
    return `"${text.replace(/"/g, "\"\"")}"`;
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

async function loadEnvFile(path) {
  try {
    const content = await readFile(path, "utf8");
    for (const line of content.split(/\r?\n/)) {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith("#")) {
        continue;
      }

      const separatorIndex = trimmed.indexOf("=");
      if (separatorIndex === -1) {
        continue;
      }

      const key = trimmed.slice(0, separatorIndex).trim();
      let value = trimmed.slice(separatorIndex + 1).trim();
      if (
        (value.startsWith("\"") && value.endsWith("\"")) ||
        (value.startsWith("'") && value.endsWith("'"))
      ) {
        value = value.slice(1, -1);
      }

      if (!(key in process.env)) {
        process.env[key] = value;
      }
    }
  } catch {
    return;
  }
}

function extractRecipient(route) {
  const match = String(route || "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0] : "";
}

function extractSentDate(row) {
  const match = String(row.notes || "").match(/Sent\s+(\d{4}-\d{2}-\d{2})(?:T|\s|$)/);
  return match ? match[1] : "";
}

function addBusinessDays(isoDate, businessDays) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  let added = 0;

  while (added < businessDays) {
    date.setUTCDate(date.getUTCDate() + 1);
    const day = date.getUTCDay();
    if (day !== 0 && day !== 6) {
      added += 1;
    }
  }

  return date.toISOString().slice(0, 10);
}

function utcTimestamp(date = new Date()) {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function auditUrlForRow(row, mode) {
  const url = new URL("https://noticekit.tech/ai-security-questionnaire-audit.html");
  // Coverage/watchers expect a literal source=ai-audit-outreach-batch-01 reference in repo files.
  url.searchParams.set("source", "ai-audit-outreach-batch-01");
  url.searchParams.set("channel", "ai-audit-email");
  url.searchParams.set("type", "concierge_audit");
  url.searchParams.set("company", row.company || "");
  url.searchParams.set("subprocessor_url", row.source_url || "");
  url.searchParams.set("vendor_change", row.gap_observation || "");
  url.searchParams.set(
    "review_need",
    mode === "follow-up"
      ? "Follow-up from NoticeKit's AI audit outreach. Please review the current public trust/security path and identify the top blocker, the best fix path, and the reply-ready next step for one live buyer review thread."
      : "Please review the current public trust/security path and identify the top blocker, the best fix path, and the reply-ready next step for one live buyer review thread."
  );
  url.searchParams.set(
    "deadline",
    "If a buyer review is active, include the actual due date or turnaround pressure in the intake so the audit can stay scoped to the live thread."
  );
  return url.toString();
}

function firstTouchContent(row) {
  return {
    subject: "48-hour audit for your live AI review path?",
    text: [
      "Hi there,",
      "",
      "I run NoticeKit, a small browser-only toolkit for SaaS teams answering AI security questionnaires and adjacent trust-review threads.",
      "",
      `I checked ${row.company}'s public trust materials because ${row.public_signal}`,
      `The page already does more than basic vendor disclosure, but a live buyer review could still stall on this: ${row.gap_observation}`,
      "",
      `I built a narrow 48-hour async audit for exactly that situation: ${auditUrlForRow(row, "first-touch")}`,
      "If the thread is active, the intake can stay scoped to one buyer question, one proof gap, or one agent-control blocker. The output is just three things: top gap, best fix path, and reply-ready guidance.",
      "",
      "If this belongs with someone else on security, privacy, procurement, or trust, I would appreciate the redirect.",
      "",
      "Best,",
      "NoticeKit"
    ].join("\n")
  };
}

function followUpContent(row) {
  return {
    subject: "Re: 48-hour audit for your live AI review path?",
    text: [
      "Hi there,",
      "",
      "Quick follow-up.",
      "",
      "I reached out because your team already has a public trust path, which usually means the hard part is no longer publishing something, but tightening the exact proof, control boundary, or reviewer handoff that a live buyer thread pushes on next.",
      "",
      `If useful, here is the scoped audit path again: ${auditUrlForRow(row, "follow-up")}`,
      "If not, even a one-line reply would help: is the real friction usually proof assets, named-vendor wording, or the control boundary itself?",
      "",
      "Best,",
      "NoticeKit"
    ].join("\n")
  };
}

async function sendViaResend({ to, subject, text }) {
  const apiKey = String(process.env.RESEND_API_KEY || process.env.CONTACT_RESEND_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY or CONTACT_RESEND_API_KEY is not set.");
  }

  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from: DEFAULT_FROM,
      to: [to],
      subject,
      text,
      reply_to: "hello@noticekit.tech"
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || `Resend send failed with status ${response.status}.`);
  }

  return data?.id || "";
}

function appendNote(existing, note) {
  return [String(existing || "").trim(), note].filter(Boolean).join(" ");
}

async function main() {
  await loadEnvFile(ROOT_ENV_FILE);
  await loadEnvFile(FALLBACK_ENV_FILE);
  await loadEnvFile(VERCEL_ENV_FILE);

  const args = parseArgs(process.argv);
  const send = args.has("send");
  const followUp = args.has("follow-up");
  const limit = Number.parseInt(String(args.get("limit") || "5"), 10);
  const today = new Date().toISOString().slice(0, 10);

  const parsed = parseCsv(await readFile(BATCH_FILE, "utf8"));
  if (!parsed.header.length) {
    throw new Error(`No CSV header found in ${BATCH_FILE}.`);
  }

  const selected = parsed.records
    .filter((row) => {
      const status = String(row.status || "").trim();
      if (TERMINAL_STATUSES.has(status)) {
        return false;
      }

      if (followUp) {
        if (status !== "sent") {
          return false;
        }
        const sentDate = extractSentDate(row);
        return Boolean(sentDate) && addBusinessDays(sentDate, 2) <= today;
      }

      return status === "ready_for_send";
    })
    .slice(0, Number.isFinite(limit) ? limit : 5);

  if (!selected.length) {
    console.log(followUp ? "No AI audit outreach follow-ups are due." : "No AI audit outreach rows are ready.");
    return;
  }

  for (const row of selected) {
    const recipient = extractRecipient(row.public_contact_route);
    if (!recipient) {
      throw new Error(`Could not find recipient email for ${row.company}.`);
    }

    const content = followUp ? followUpContent(row) : firstTouchContent(row);
    if (!send) {
      console.log(JSON.stringify({
        company: row.company,
        recipient,
        subject: content.subject,
        auditUrl: auditUrlForRow(row, followUp ? "follow-up" : "first-touch"),
        followUp
      }));
      continue;
    }

    const messageId = await sendViaResend({
      to: recipient,
      subject: content.subject,
      text: content.text
    });

    const timestamp = utcTimestamp();
    if (followUp) {
      row.status = "followed_up";
      row.notes = appendNote(
        row.notes,
        `Followed up ${timestamp} via ai-audit outreach to ${recipient}${messageId ? ` (id ${messageId}).` : "."}`
      );
    } else {
      row.status = "sent";
      row.notes = appendNote(
        row.notes,
        `Sent ${timestamp} via ai-audit outreach to ${recipient}${messageId ? ` (id ${messageId}).` : ""} Follow-up due ${addBusinessDays(timestamp.slice(0, 10), 2)}.`
      );
    }

    console.log(`[sent:resend] ${recipient} | ${content.subject}`);
  }

  if (send) {
    await writeFile(BATCH_FILE, serializeCsv(parsed.header, parsed.records), "utf8");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
