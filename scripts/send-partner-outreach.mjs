#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();
const PARTNER_TRACKER = join(ROOT, "consultant-partner-outreach-tracker.csv");
const ADVISOR_BATCH = join(ROOT, "buyer-validation-outreach-batch-02.csv");
const ENV_FILE = join(ROOT, ".vercel", ".env.production.local");

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
  return `${[
    header.map(escapeCsvCell).join(","),
    ...rows.map((row) => header.map((key) => escapeCsvCell(row[key])).join(","))
  ].join("\n")}\n`;
}

function loadEnvFile() {
  if (process.env.RESEND_API_KEY || process.env.CONTACT_RESEND_API_KEY) {
    return;
  }

  return readFile(ENV_FILE, "utf8")
    .then((text) => {
      for (const line of text.split(/\r?\n/)) {
        if (!line || line.trim().startsWith("#")) {
          continue;
        }
        const delimiter = line.indexOf("=");
        if (delimiter === -1) {
          continue;
        }
        const key = line.slice(0, delimiter).trim();
        let value = line.slice(delimiter + 1).trim();
        if ((value.startsWith("\"") && value.endsWith("\"")) || (value.startsWith("'") && value.endsWith("'"))) {
          value = value.slice(1, -1);
        }
        if (!(key in process.env)) {
          process.env[key] = value;
        }
      }
    })
    .catch(() => {});
}

function extractEmail(value) {
  const match = String(value || "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0] : "";
}

function extractLastSentRecipient(notes) {
  const matches = [...String(notes || "").matchAll(/\bto\s+([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi)];
  return matches.length ? matches[matches.length - 1][1] : "";
}

function addBusinessDays(isoDate, businessDays) {
  const date = new Date(`${isoDate}T00:00:00Z`);
  let added = 0;

  while (added < businessDays) {
    date.setUTCDate(date.getUTCDate() + 1);
    const day = date.getUTCDay();
    if (day === 0 || day === 6) {
      continue;
    }
    added += 1;
  }

  return date.toISOString().slice(0, 10);
}

function todayIsoDate() {
  return new Date().toISOString().slice(0, 10);
}

function parseList(value) {
  return String(value || "")
    .split(",")
    .map((item) => item.trim())
    .filter(Boolean);
}

function isDueOnOrBefore(dateText, cutoff) {
  const value = String(dateText || "").trim();
  if (!value) {
    return false;
  }
  return value <= cutoff;
}

function renderHtml(subject, text) {
  const escaped = text
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;")
    .replace(/\n/g, "<br>");
  return `<p><strong>${subject}</strong></p><p>${escaped}</p>`;
}

async function sendResend({ to, subject, text, html }) {
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
      reply_to: "hello@noticekit.tech"
    })
  });

  if (!response.ok) {
    throw new Error(`Resend send failed with status ${response.status}.`);
  }

  return response.json();
}

function buildMessage(row) {
  const isAttorney = String(row.segment || "").includes("attorney");
  const subject = isAttorney
    ? "Partner workflow for startup counsel handling subprocessor reviews"
    : "Partner workflow for your SaaS privacy clients";
  const intakeLink = "https://noticekit.tech/audit-request.html?type=partner_request&source=partner-outreach-batch-01";
  const previewLink = "https://noticekit.tech/partner-preview.html";
  const intro = isAttorney
    ? "I reached out last week while validating NoticeKit. I now have the narrower partner version ready for startup counsel who want client facts organized before legal review."
    : "I reached out last week while validating NoticeKit. I now have the narrower partner version ready for consultants who help SaaS clients handle subprocessor change work.";
  const body = [
    "Hi there,",
    "",
    intro,
    "",
    row.partner_angle,
    "",
    "NoticeKit is not legal advice. It organizes vendor facts, notice copy, objection-window dates, customer tracking, and an evidence log so privacy or legal review can happen faster.",
    "",
    `Partner preview: ${previewLink}`,
    `Partner intake: ${intakeLink}`,
    "",
    "If this fits your client work, I can share the early referral and white-label terms through the intake form.",
    "",
    "Best,",
    "NoticeKit"
  ].join("\n");

  return {
    subject,
    text: body,
    html: renderHtml(subject, body)
  };
}

function buildFollowUpMessage(row, variant) {
  const isAttorney = String(row.segment || "").includes("attorney");
  const subject = isAttorney
    ? "Re: Partner workflow for startup counsel handling subprocessor reviews"
    : "Re: Partner workflow for your SaaS privacy clients";
  const intakeLink = "https://noticekit.tech/audit-request.html?type=partner_request&source=partner-outreach-follow-up-01";
  const previewLink = "https://noticekit.tech/partner-preview.html";
  const trackerLink = "https://noticekit.tech/blog-dpa-objection-window.html";
  const kitPreviewLink = "https://noticekit.tech/kit-preview.html";
  const intro = isAttorney
    ? "Quick follow-up on the partner workflow note I sent last week."
    : "Quick follow-up on the partner workflow note I sent last week.";
  const useKitPreview = variant === "kit-preview";
  const valueLine = useKitPreview
    ? isAttorney
      ? "The most concrete asset is the kit preview. It shows exactly what a founder would hand over before startup counsel reviews the change."
      : "The most concrete asset is the kit preview. It shows exactly what a client would hand over before privacy review."
    : isAttorney
      ? "The most concrete asset is the free objection-window tracker. It shows the operational packet a founder can complete before legal review."
      : "The most concrete asset is the free objection-window tracker. It shows the operational packet a client can complete before privacy review.";
  const primaryAssetLine = useKitPreview
    ? `Kit preview: ${kitPreviewLink}`
    : `Free tracker: ${trackerLink}`;
  const body = [
    "Hi there,",
    "",
    intro,
    "",
    valueLine,
    "",
    primaryAssetLine,
    `Partner preview: ${previewLink}`,
    `Partner intake: ${intakeLink}`,
    "",
    "If this fits your client work, I can share the early referral or white-label terms through the intake form.",
    "",
    "Best,",
    "NoticeKit"
  ].join("\n");

  return {
    subject,
    text: body,
    html: renderHtml(subject, body)
  };
}

function applyInitialSendUpdate(row, recipient, timestamp, sendId) {
  const sentDate = timestamp.slice(0, 10);
  row.outreach_status = "sent";
  row.next_action = "follow_up";
  row.last_touch_date = sentDate;
  row.next_touch_date = addBusinessDays(sentDate, 3);
  const sendNote = `Partner outreach sent ${timestamp} via Resend to ${recipient} using source tag partner-outreach-batch-01${sendId ? ` (id ${sendId})` : ""}.`;
  row.notes = row.notes ? `${row.notes} ${sendNote}` : sendNote;
}

function applyFollowUpSendUpdate(row, recipient, timestamp, sendId, variant) {
  const sentDate = timestamp.slice(0, 10);
  row.outreach_status = "sent";
  row.next_action = "archive";
  row.last_touch_date = sentDate;
  row.next_touch_date = "";
  const sendNote = `Partner follow-up sent ${timestamp} via Resend to ${recipient} using source tag partner-outreach-follow-up-01 with ${variant} CTA${sendId ? ` (id ${sendId})` : ""}.`;
  row.notes = row.notes ? `${row.notes} ${sendNote}` : sendNote;
}

async function main() {
  const args = parseArgs(process.argv);
  const limit = Math.max(1, Number(args.get("limit") || 5));
  const send = args.has("send");
  const followUp = args.has("follow-up");
  const force = args.has("force");
  const organizations = new Set(parseList(args.get("organization")).map((value) => value.toLowerCase()));
  const followUpVariant = String(args.get("follow-up-asset") || "tracker").trim().toLowerCase();

  if (!["tracker", "kit-preview"].includes(followUpVariant)) {
    throw new Error("Unsupported --follow-up-asset value. Use tracker or kit-preview.");
  }

  await loadEnvFile();

  const { header, records } = parseCsv(await readFile(PARTNER_TRACKER, "utf8"));
  const advisorRows = parseCsv(await readFile(ADVISOR_BATCH, "utf8")).records;
  const advisorMap = new Map(advisorRows.map((row) => [row.organization, row]));
  let queue = followUp
    ? records
        .filter((row) => String(row.outreach_status || "").trim() === "sent")
        .filter((row) => String(row.next_action || "").trim() === "follow_up")
        .filter((row) => force || isDueOnOrBefore(row.next_touch_date, todayIsoDate()))
    : records.filter((row) => String(row.outreach_status || "").trim() === "ready_to_send");

  if (organizations.size > 0) {
    queue = queue.filter((row) => organizations.has(String(row.organization || "").trim().toLowerCase()));
  }

  queue = queue.slice(0, limit);

  if (queue.length === 0) {
    if (followUp) {
      console.log(`No due partner follow-up rows found as of ${todayIsoDate()}.`);
      return;
    }
    console.log("No ready_to_send partner rows found.");
    return;
  }

  for (const row of queue) {
    const advisorRow = advisorMap.get(row.organization);
    const recipient = extractLastSentRecipient(advisorRow?.notes) || extractEmail(advisorRow?.public_contact_route);
    if (!recipient) {
      throw new Error(`No direct email route found for ${row.organization}.`);
    }

    const message = followUp ? buildFollowUpMessage(row, followUpVariant) : buildMessage(row);

    if (!send) {
      const variantNote = followUp ? ` | asset ${followUpVariant}` : "";
      console.log(`DRY RUN | ${followUp ? "follow-up" : "initial"} | ${row.organization} | ${recipient} | ${message.subject}${variantNote}`);
      continue;
    }

    const response = await sendResend({
      to: recipient,
      subject: message.subject,
      text: message.text,
      html: message.html
    });
    if (followUp) {
      applyFollowUpSendUpdate(row, recipient, new Date().toISOString(), response?.id || "", followUpVariant);
    } else {
      applyInitialSendUpdate(row, recipient, new Date().toISOString(), response?.id || "");
    }
    const variantNote = followUp ? ` | asset ${followUpVariant}` : "";
    console.log(`SENT | ${followUp ? "follow-up" : "initial"} | ${row.organization} | ${recipient} | ${response?.id || "no-id"}${variantNote}`);
  }

  if (send) {
    await writeFile(PARTNER_TRACKER, serializeCsv(header, records));
  }
}

main().catch((error) => {
  console.error(error instanceof Error ? error.message : String(error));
  process.exit(1);
});
