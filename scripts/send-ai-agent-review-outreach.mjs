#!/usr/bin/env node

import nodemailer from "nodemailer";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();
const BATCH_FILE = join(ROOT, "ai-agent-review-outreach-batch-01.csv");
const DEFAULT_FROM = "NoticeKit <hello@noticekit.tech>";
const DEFAULT_CHECKLIST_URL = "https://noticekit.tech/blog-ai-agent-security-review-checklist.html?source=agent-review-outreach-checklist";
const TERMINAL_STATUSES = ["replied_positive", "replied_negative", "bounced", "interview_completed"];

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
    return { header: [], records: [] };
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

function extractRecipient(route) {
  const match = String(route || "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0] : "";
}

function extractSentDate(row) {
  const notes = String(row.notes || "");
  const match = notes.match(/Sent\s+(\d{4}-\d{2}-\d{2})(?:T|\s|$)/);
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

function getTodayIsoDate() {
  const override = String(process.env.NOTICEKIT_TODAY || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(override)) {
    return override;
  }
  return new Date().toISOString().slice(0, 10);
}

function utcTimestamp(date = new Date()) {
  return date.toISOString().replace(/\.\d{3}Z$/, "Z");
}

function teardownUrlForRow(row, mode) {
  const url = new URL("https://noticekit.tech/ai-agent-gap-read.html");
  url.searchParams.set("source", "agent-review-outreach-batch-01");
  url.searchParams.set("channel", "agent-review-email");
  url.searchParams.set("company", row.company || "");
  url.searchParams.set("subprocessor_url", row.source_url || "");
  url.searchParams.set(
    "review_need",
    mode === "follow-up"
      ? "Follow-up from AI agent review outreach. Please give the 3-bullet async gap read for the public agent-review path, focusing on tool access, approvals, and audit trail."
      : "Please give the 3-bullet async gap read for this public AI agent review path, focusing on tool access, approvals, and audit trail."
  );
  return url.toString();
}

function firstTouchContent(row) {
  return {
    subject: "Quick question on your AI agent review path",
    text: [
      "Hi there,",
      "",
      "I run NoticeKit, a small browser-only toolkit for SaaS teams answering buyer AI security questionnaires.",
      "",
      `I checked ${row.company}'s public materials because your team already exposes enough detail that the next buyer question is usually not which model vendor you use, but what the agent can actually touch, change, or do without approval.`,
      `${row.gap_observation}`,
      "",
      `I put together a short checklist for that exact review path: ${DEFAULT_CHECKLIST_URL}`,
      `If useful, I can also send a blunt async 3-bullet gap read on the current public agent-review path here: ${teardownUrlForRow(row, "first-touch")}`,
      "",
      "If this belongs with someone else on the security, privacy, trust, or AI governance workflow, I would appreciate the redirect.",
      "",
      "Best,",
      "NoticeKit"
    ].join("\n")
  };
}

function followUpContent(row) {
  return {
    subject: "Re: Quick question on your AI agent review path",
    text: [
      "Hi there,",
      "",
      "Quick follow-up.",
      "",
      "I reached out because your public materials already cover part of the trust story, and the next buyer objection often narrows to one of three things: tool access, approval gates, or audit trail.",
      "",
      `If a short async gap read is useful, here is the teardown path again: ${teardownUrlForRow(row, "follow-up")}`,
      "If not, even a one-line reply would help: is the real friction usually the tool list, the approval path, or neither?",
      "",
      "Best,",
      "NoticeKit"
    ].join("\n")
  };
}

function smtpTransportFromEnv() {
  const smtpUrl = String(process.env.CONTACT_SMTP_URL || "").trim();
  const smtpHost = String(process.env.CONTACT_SMTP_HOST || "").trim();

  if (smtpUrl) {
    return nodemailer.createTransport(smtpUrl);
  }

  if (!smtpHost) {
    throw new Error("SMTP is not configured.");
  }

  const smtpPort = Number(process.env.CONTACT_SMTP_PORT || 587);
  const smtpSecure = String(process.env.CONTACT_SMTP_SECURE || "").trim().toLowerCase() === "true";
  const smtpUser = String(process.env.CONTACT_SMTP_USER || "").trim();
  const smtpPassword = String(process.env.CONTACT_SMTP_PASSWORD || "").trim();
  const config = {
    host: smtpHost,
    port: Number.isFinite(smtpPort) ? smtpPort : 587,
    secure: smtpSecure
  };

  if (smtpUser || smtpPassword) {
    config.auth = { user: smtpUser, pass: smtpPassword };
  }

  return nodemailer.createTransport(config);
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
      text
    })
  });

  const data = await response.json().catch(() => ({}));
  if (!response.ok) {
    throw new Error(data?.message || `Resend send failed with status ${response.status}.`);
  }

  return data?.id || "";
}

async function sendViaSmtp({ to, subject, text }) {
  const transporter = smtpTransportFromEnv();
  const response = await transporter.sendMail({
    from: DEFAULT_FROM,
    to,
    subject,
    text
  });
  return response?.messageId || "";
}

function appendNote(existing, note) {
  return [String(existing || "").trim(), note].filter(Boolean).join(" ");
}

function extractFollowUpDate(row) {
  const notes = String(row.notes || "");
  const match = notes.match(/Follow-up due\s+(\d{4}-\d{2}-\d{2})(?:T|\s|$)/);
  if (match) {
    return match[1];
  }

  const sentDate = extractSentDate(row);
  return sentDate ? addBusinessDays(sentDate, 2) : "";
}

async function main() {
  const args = parseArgs(process.argv);
  const send = args.has("send");
  const followUp = args.has("follow-up");
  const limit = Number.parseInt(String(args.get("limit") || "5"), 10);
  const transport = String(args.get("transport") || "resend").trim().toLowerCase();
  const dryRun = !send;
  const today = getTodayIsoDate();

  const parsed = parseCsv(await readFile(BATCH_FILE, "utf8"));
  if (!parsed.header.length) {
    throw new Error(`No CSV header found in ${BATCH_FILE}.`);
  }

  const selected = parsed.records
    .filter((row) => {
      const status = String(row.status || "").trim();
      if (TERMINAL_STATUSES.includes(status)) {
        return false;
      }

      if (followUp) {
        if (status !== "sent") {
          return false;
        }

        const followUpDate = extractFollowUpDate(row);
        return Boolean(followUpDate) && followUpDate <= today;
      }

      return status === "ready_for_send";
    })
    .slice(0, Number.isFinite(limit) ? limit : 5);

  if (!selected.length) {
    console.log(followUp ? "No AI agent review outreach follow-ups are due." : "No eligible AI agent review outreach rows.");
    return;
  }

  for (const row of selected) {
    const recipient = extractRecipient(row.public_contact_route);
    if (!recipient) {
      throw new Error(`Could not find recipient email for ${row.company}.`);
    }

    const content = followUp ? followUpContent(row) : firstTouchContent(row);
    if (dryRun) {
      console.log(JSON.stringify({
        company: row.company,
        recipient,
        subject: content.subject,
        followUp
      }));
      continue;
    }

    let messageId = "";
    if (transport === "smtp") {
      messageId = await sendViaSmtp({
        to: recipient,
        subject: content.subject,
        text: content.text
      });
    } else {
      messageId = await sendViaResend({
        to: recipient,
        subject: content.subject,
        text: content.text
      });
    }

    const timestamp = utcTimestamp();
    if (followUp) {
      row.status = "followed_up";
      row.notes = appendNote(
        row.notes,
        `Followed up ${timestamp} via agent-review outreach to ${recipient}${messageId ? ` (id ${messageId}).` : "."}`
      );
    } else {
      const sentDate = extractSentDate(row) || timestamp.slice(0, 10);
      const followUpDate = addBusinessDays(sentDate, 2);
      row.status = "sent";
      row.notes = appendNote(
        row.notes,
        `Sent ${timestamp} via agent-review outreach to ${recipient}${messageId ? ` (id ${messageId}).` : ""} Follow-up due ${followUpDate}.`
      );
    }
  }

  if (!dryRun) {
    await writeFile(BATCH_FILE, serializeCsv(parsed.header, parsed.records), "utf8");
  }
}

main().catch((error) => {
  console.error(error.message);
  process.exitCode = 1;
});
