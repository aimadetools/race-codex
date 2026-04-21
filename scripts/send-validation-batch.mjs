#!/usr/bin/env node

import nodemailer from "nodemailer";
import { readFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();

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
    return [];
  }

  return dataRows.map((cells) => {
    const record = {};
    header.forEach((key, index) => {
      record[key.trim()] = (cells[index] || "").trim();
    });
    return record;
  });
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
  const apiKey = String(process.env.CONTACT_RESEND_API_KEY || "").trim();
  if (!apiKey) {
    throw new Error("CONTACT_RESEND_API_KEY is not set.");
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

  const csvPath = join(ROOT, `buyer-validation-outreach-batch-${batch}.csv`);
  const rows = parseCsv(await readFile(csvPath, "utf8"));
  const queue = rows.filter((row) => row.status === "ready_for_send").slice(0, limit);
  const from = "NoticeKit <hello@noticekit.tech>";
  const replyTo = "hello@noticekit.tech";

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

    if (transport === "resend" || (transport === "auto" && process.env.CONTACT_RESEND_API_KEY)) {
      await sendResend({ to: recipient, subject, text, html, replyTo });
      console.log(`[sent:resend] ${recipient} | ${subject}`);
      continue;
    }

    if (transport === "smtp" || transport === "auto") {
      if (!smtpAuthConfigured()) {
        throw new Error(
          "SMTP relay is reachable, but no authenticated sender secret is configured. Set CONTACT_SMTP_URL or both CONTACT_SMTP_USER and CONTACT_SMTP_PASSWORD, or use CONTACT_RESEND_API_KEY."
        );
      }
      await sendSmtp({ to: recipient, subject, text, html, replyTo });
      console.log(`[sent:smtp] ${recipient} | ${subject}`);
      continue;
    }

    throw new Error(`Unknown transport "${transport}". Use auto, smtp, or resend.`);
  }
}

main().catch((error) => {
  console.error(error.message || error);
  process.exitCode = 1;
});
