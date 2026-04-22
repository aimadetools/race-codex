#!/usr/bin/env node

import nodemailer from "nodemailer";
import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();
const EARLIEST_SEND_DATE_BY_BATCH = new Map([
  ["02", "2026-04-23"]
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

function assertBatchCanSend(batch, args) {
  const earliestDate = EARLIEST_SEND_DATE_BY_BATCH.get(batch);
  if (!earliestDate || args.has("force-date")) {
    return;
  }

  const today = utcDateString();
  if (today < earliestDate) {
    throw new Error(
      `Batch ${batch} is held until ${earliestDate} UTC (earliest send at 00:00:00Z). Re-run on or after that UTC date, or pass --force-date only after a documented human override.`
    );
  }
}

function markSent(row, transport, recipient, sentAt) {
  row.status = "sent";
  const sendNote = `Sent ${sentAt} via ${transport} to ${recipient}.`;
  row.notes = row.notes ? `${row.notes} ${sendNote}` : sendNote;
}

function classifyRoute(route) {
  const value = String(route || "").trim();
  if (!value) {
    return "manual";
  }

  if (value.includes("@")) {
    return "direct-email";
  }

  if (value.includes("mailto:")) {
    return "direct-email";
  }

  if (/contact sales/i.test(value) || /support widget/i.test(value)) {
    return "manual-form";
  }

  if (value.startsWith("http")) {
    return "manual-form";
  }

  return "manual";
}

function extractRecipient(route) {
  const match = String(route || "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0] : "";
}

function bodyForRow(row) {
  const segment = row.segment || "";
  const company = row.company || row.organization || "";

  if (segment === "Founder/operator") {
    return {
      subject: "Quick question on your subprocessor notice process",
      firstTouch: [
        `Hi there,`,
        ``,
        `I noticed ${company} has public DPA, privacy, or subprocessor language, but I could not tell how the operational side works when the vendor list changes.`,
        ``,
        `I am validating NoticeKit, a small operational kit for SaaS teams that need notice copy, objection-window tracking, and an evidence log before they are ready for a full trust center. I am not offering legal advice; I am trying to understand the workflow.`,
        ``,
        `Could I ask you 6 questions about how you handle vendor changes today?`,
        ``,
        `Best,`,
        `NoticeKit`
      ].join("\n"),
      manualFollowUp: row.public_contact_route
    };
  }

  if (segment === "Fractional DPO/privacy consultant") {
    return {
      subject: "Do small SaaS clients ask you about subprocessors?",
      firstTouch: [
        `Hi there,`,
        ``,
        `I am validating NoticeKit, a small operational workflow for SaaS teams that need to prepare subprocessor change facts, customer notice copy, objection-window tracking, and evidence records before attorney or privacy review.`,
        ``,
        `I am not asking for legal advice. I am trying to learn whether this would save time for fractional DPOs and privacy consultants, or whether it creates review risk.`,
        ``,
        `Could I ask you 6 questions about how small SaaS clients handle vendor-change notices today?`,
        ``,
        `Best,`,
        `NoticeKit`
      ].join("\n"),
      manualFollowUp: row.public_contact_route
    };
  }

  return {
    subject: "Operational handoff for subprocessor notices",
    firstTouch: [
      `Hi there,`,
      ``,
      `I am validating NoticeKit, a non-legal operational kit for small SaaS teams that need to collect subprocessor change facts, draft notice copy, calculate objection-window dates, and preserve an evidence log for review.`,
      ``,
      `Could I ask for 15 minutes of feedback on what would make this useful or risky from a legal-review handoff perspective?`,
      ``,
      `Best,`,
      `NoticeKit`
    ].join("\n"),
    manualFollowUp: row.public_contact_route
  };
}

function smtpTransportFromEnv() {
  const smtpUrl = String(process.env.CONTACT_SMTP_URL || "").trim();
  const smtpHost = String(process.env.CONTACT_SMTP_HOST || "").trim();

  if (smtpUrl) {
    return nodemailer.createTransport(smtpUrl);
  }

  if (!smtpHost) {
    return null;
  }

  const smtpPort = Number(process.env.CONTACT_SMTP_PORT || 587);
  const smtpSecure = String(process.env.CONTACT_SMTP_SECURE || "").trim().toLowerCase() === "true";
  const smtpUser = String(process.env.CONTACT_SMTP_USER || "").trim();
  const smtpPassword = String(process.env.CONTACT_SMTP_PASSWORD || "").trim();
  const transportOptions = {
    host: smtpHost,
    port: Number.isFinite(smtpPort) ? smtpPort : 587,
    secure: smtpSecure
  };

  if (smtpUser || smtpPassword) {
    transportOptions.auth = {
      user: smtpUser,
      pass: smtpPassword
    };
  }

  return nodemailer.createTransport(transportOptions);
}

function smtpAuthConfigured() {
  const smtpUrl = String(process.env.CONTACT_SMTP_URL || "").trim();
  const smtpUser = String(process.env.CONTACT_SMTP_USER || "").trim();
  const smtpPassword = String(process.env.CONTACT_SMTP_PASSWORD || "").trim();

  if (smtpUrl) {
    return true;
  }

  return Boolean(smtpUser && smtpPassword);
}

async function sendResend({ to, subject, text, html, replyTo }) {
  const apiKey = String(process.env.RESEND_API_KEY || process.env.CONTACT_RESEND_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("RESEND_API_KEY or CONTACT_RESEND_API_KEY is not set.");
  }

  const from = String(process.env.CONTACT_RESEND_FROM || "NoticeKit <hello@noticekit.tech>").trim();
  const response = await fetch("https://api.resend.com/emails", {
    method: "POST",
    headers: {
      Authorization: `Bearer ${apiKey}`,
      "Content-Type": "application/json"
    },
    body: JSON.stringify({
      from,
      to,
      subject,
      text,
      html,
      "reply_to": replyTo
    })
  });

  if (!response.ok) {
    throw new Error(`Resend send failed with status ${response.status}.`);
  }
}

async function sendSmtp({ to, subject, text, html, replyTo }) {
  const transporter = smtpTransportFromEnv();
  if (!transporter) {
    throw new Error("CONTACT_SMTP_URL or CONTACT_SMTP_HOST is not set.");
  }

  const from = String(process.env.CONTACT_SMTP_FROM || "NoticeKit <hello@noticekit.tech>").trim();
  await transporter.sendMail({
    from,
    to,
    subject,
    text,
    html,
    replyTo
  });
}

function renderHtml(subject, text) {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
  return `<p><strong>${subject}</strong></p><p>${escaped}</p>`;
}

async function main() {
  const args = parseArgs(process.argv);
  const batch = String(args.get("batch") || "01").padStart(2, "0");
  const limit = Math.max(1, Number(args.get("limit") || 5));
  const send = args.has("send");
  const transport = String(args.get("transport") || "auto").toLowerCase();
  const updateCsv = send && !args.has("no-update-csv");

  if (send) {
    assertBatchCanSend(batch, args);
  }

  const csvPath = join(ROOT, `buyer-validation-outreach-batch-${batch}.csv`);
  const { header, records: rows } = parseCsv(await readFile(csvPath, "utf8"));
  const queue = rows.filter((row) => row.status === "ready_for_send").slice(0, limit);
  const replyTo = "hello@noticekit.tech";
  const persistCsv = async () => {
    await writeFile(csvPath, serializeCsv(header, rows), "utf8");
    console.log(`[updated] ${csvPath}`);
  };

  console.log(`Batch ${batch}: ${queue.length} rows selected from ${rows.length} ready targets.`);

  for (const row of queue) {
    const recipient = extractRecipient(row.public_contact_route);
    const signal = bodyForRow(row);
    const routeType = classifyRoute(row.public_contact_route);

    if (!recipient || routeType !== "direct-email") {
      console.log(`[manual] ${row.company || row.organization}: ${signal.manualFollowUp}`);
      continue;
    }

    const subject = signal.subject;
    const text = signal.firstTouch;
    const html = renderHtml(subject, text);

    if (!send) {
      console.log(`[dry-run] ${recipient} | ${subject}`);
      continue;
    }

    if (transport === "resend" || (transport === "auto" && (process.env.RESEND_API_KEY || process.env.CONTACT_RESEND_API_KEY))) {
      await sendResend({ to: recipient, subject, text, html, replyTo });
      console.log(`[sent:resend] ${recipient} | ${subject}`);
      if (updateCsv) {
        markSent(row, "Resend", recipient, new Date().toISOString());
        await persistCsv();
      }
      continue;
    }

    if (transport === "smtp" || transport === "auto") {
      if (!smtpAuthConfigured()) {
        throw new Error(
          "SMTP relay is reachable, but no authenticated sender secret is configured. Set CONTACT_SMTP_URL or both CONTACT_SMTP_USER and CONTACT_SMTP_PASSWORD, or use RESEND_API_KEY / CONTACT_RESEND_API_KEY."
        );
      }
      await sendSmtp({ to: recipient, subject, text, html, replyTo });
      console.log(`[sent:smtp] ${recipient} | ${subject}`);
      if (updateCsv) {
        markSent(row, "SMTP", recipient, new Date().toISOString());
        await persistCsv();
      }
      continue;
    }

    throw new Error(`Unknown transport "${transport}". Use auto, smtp, or resend.`);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
