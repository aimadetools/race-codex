#!/usr/bin/env node

import nodemailer from "nodemailer";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();
const BATCH_FILE = join(ROOT, "ai-benchmark-outreach-batch-01.csv");
const DEFAULT_FROM = "NoticeKit <hello@noticekit.tech>";
const DEFAULT_REPORT_URL = "https://noticekit.tech/blog-subprocessor-benchmark-report-01.html?source=benchmark-outreach-report";
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
  const url = new URL("https://noticekit.tech/free-teardown.html");
  url.searchParams.set("source", "benchmark-outreach-batch-01");
  url.searchParams.set("channel", "benchmark-email");
  url.searchParams.set("company", row.company || "");
  url.searchParams.set("subprocessor_url", row.source_url || "");
  url.searchParams.set(
    "review_need",
    mode === "follow-up"
      ? "Follow-up from benchmark-led outreach. Please give the 3-bullet async gap read for the public page and buyer-facing review path."
      : "Please give the 3-bullet async gap read for this public page and flag the clearest buyer-facing follow-through gap."
  );
  return url.toString();
}

function firstTouchContent(row) {
  return {
    subject: "Quick question on your public AI review page",
    text: [
      "Hi there,",
      "",
      "I run NoticeKit, a small browser-only toolkit for SaaS teams answering AI security questionnaires and public vendor-review threads.",
      "",
      `I reviewed ${row.company}'s public page because your team already exposes enough trust or subprocessor detail to make buyer follow-through visible.`,
      `The common gap in the pilot benchmark was not vendor names, it was what happens next for the reviewer when they need a clearer action path or history. Your page stood out because ${row.gap_observation}`,
      "",
      `If useful, I can send a blunt async 3-bullet gap read on the public page here: ${teardownUrlForRow(row, "first-touch")}`,
      `If you want the benchmark context first: ${DEFAULT_REPORT_URL}`,
      "",
      "If this belongs with someone else on the security, privacy, or trust workflow, I would appreciate the redirect.",
      "",
      "Best,",
      "NoticeKit"
    ].join("\n")
  };
}

function followUpContent(row) {
  return {
    subject: "Re: Quick question on your public AI review page",
    text: [
      "Hi there,",
      "",
      "Quick follow-up.",
      "",
      "I reached out because your team already has a public page, which usually means the hard part is no longer whether to publish something, but whether a buyer or counsel can actually move forward from what is already public.",
      "",
      `If a short async gap read is useful, here is the teardown path again: ${teardownUrlForRow(row, "follow-up")}`,
      "If not, even a one-line reply would help: is the real pain usually the questionnaire answer itself, the public page, or neither?",
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
  const info = await transporter.sendMail({
    from: DEFAULT_FROM,
    to,
    subject,
    text,
    replyTo: "hello@noticekit.tech"
  });
  return info?.messageId || "";
}

function markSent(row, recipient, timestamp, sendId = "") {
  row.status = "sent";
  const note = `Sent ${timestamp} via benchmark outreach to ${recipient}${sendId ? ` (id ${sendId})` : ""}.`;
  row.notes = row.notes ? `${row.notes} ${note}` : note;
}

function markFollowedUp(row, recipient, timestamp, sendId = "") {
  row.status = "followed_up";
  const note = `Followed up ${timestamp} via benchmark outreach to ${recipient}${sendId ? ` (id ${sendId})` : ""}.`;
  row.notes = row.notes ? `${row.notes} ${note}` : note;
}

async function main() {
  const args = parseArgs(process.argv);
  const limit = Number(args.get("limit") || "5");
  const doSend = args.has("send");
  const followUp = args.has("follow-up");
  const transport = String(args.get("transport") || "resend").trim().toLowerCase();
  const noUpdateCsv = args.has("no-update-csv");
  const today = getTodayIsoDate();

  const parsed = parseCsv(await readFile(BATCH_FILE, "utf8"));
  const rows = parsed.records;

  const eligible = rows.filter((row) => {
    const status = String(row.status || "").trim();
    if (TERMINAL_STATUSES.includes(status)) {
      return false;
    }

    if (followUp) {
      if (status !== "sent") {
        return false;
      }
      const sentDate = extractSentDate(row);
      return Boolean(sentDate) && addBusinessDays(sentDate, 3) <= today;
    }

    return status === "ready_for_send";
  }).slice(0, Number.isFinite(limit) ? limit : 5);

  if (eligible.length === 0) {
    console.log(followUp ? "No benchmark outreach follow-ups are due." : "No benchmark outreach rows are ready.");
    return;
  }

  console.log(followUp ? "Benchmark outreach follow-up queue:" : "Benchmark outreach first-touch queue:");
  for (const row of eligible) {
    const recipient = extractRecipient(row.public_contact_route);
    const subject = followUp ? followUpContent(row).subject : firstTouchContent(row).subject;
    console.log(`- ${row.company} <${recipient || "missing-email"}> | ${subject}`);
  }

  if (!doSend) {
    return;
  }

  for (const row of eligible) {
    const recipient = extractRecipient(row.public_contact_route);
    if (!recipient) {
      throw new Error(`Missing direct email route for ${row.company}.`);
    }

    const content = followUp ? followUpContent(row) : firstTouchContent(row);
    const timestamp = utcTimestamp();
    const sendId = transport === "smtp"
      ? await sendViaSmtp({ to: recipient, subject: content.subject, text: content.text })
      : await sendViaResend({ to: recipient, subject: content.subject, text: content.text });

    if (followUp) {
      markFollowedUp(row, recipient, timestamp, sendId);
    } else {
      markSent(row, recipient, timestamp, sendId);
    }

    console.log(`[sent:${transport}] ${recipient} | ${content.subject}`);
  }

  if (!noUpdateCsv) {
    await writeFile(BATCH_FILE, serializeCsv(parsed.header, rows), "utf8");
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
