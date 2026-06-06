#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();
const BATCH_CSV = join(ROOT, "ai-audit-outreach-batch-01.csv");
const OUTPUT = join(ROOT, "AI-AUDIT-OUTREACH-FOLLOW-UP-PASS.md");
const AUDIT_URL = "https://noticekit.tech/ai-security-questionnaire-audit.html";
const SECOND_TOUCH_EXHAUSTION_DATE = "2026-06-08";
const TERMINAL_STATUSES = new Set(["replied_positive", "replied_negative", "bounced", "interview_completed"]);

function parseCsv(text) {
  const rows = [];
  let row = [];
  let field = "";
  let inQuotes = false;

  for (let i = 0; i < text.length; i += 1) {
    const char = text[i];
    const next = text[i + 1];

    if (inQuotes) {
      if (char === "\"" && next === "\"") {
        field += "\"";
        i += 1;
      } else if (char === "\"") {
        inQuotes = false;
      } else {
        field += char;
      }
      continue;
    }

    if (char === "\"") {
      inQuotes = true;
      continue;
    }

    if (char === ",") {
      row.push(field);
      field = "";
      continue;
    }

    if (char === "\n") {
      row.push(field);
      rows.push(row);
      row = [];
      field = "";
      continue;
    }

    if (char !== "\r") {
      field += char;
    }
  }

  if (field.length || row.length) {
    row.push(field);
    rows.push(row);
  }

  const [header, ...body] = rows;
  return body
    .filter((cells) => cells.some((cell) => String(cell || "").trim().length > 0))
    .map((cells) => {
      const record = {};
      header.forEach((key, index) => {
        record[key] = cells[index] ?? "";
      });
      return record;
    });
}

function escapeTableCell(value) {
  return String(value || "").replace(/\|/g, "\\|");
}

function extractSentDate(row) {
  const notes = String(row.notes || "");
  const match = notes.match(/Sent (\d{4}-\d{2}-\d{2})(?:T|\s|$)/);
  return match ? match[1] : "";
}

function extractPriorSendRecipient(row) {
  const notes = String(row.notes || "");
  const matches = [...notes.matchAll(/\bto\s+([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi)];
  return matches.length ? matches[matches.length - 1][1] : "";
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

function countByStatus(rows, status) {
  return rows.filter((row) => String(row.status || "").trim() === status).length;
}

function getTodayIsoDate() {
  const override = String(process.env.NOTICEKIT_TODAY || "").trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(override)) {
    return override;
  }
  return new Date().toISOString().slice(0, 10);
}

function auditUrlForRow(row) {
  const url = new URL(AUDIT_URL);
  url.searchParams.set("source", "ai-audit-outreach-batch-01");
  url.searchParams.set("channel", "ai-audit-email");
  url.searchParams.set("type", "concierge_audit");
  url.searchParams.set("company", row.company || "");
  url.searchParams.set("subprocessor_url", row.source_url || "");
  url.searchParams.set("vendor_change", row.gap_observation || "");
  url.searchParams.set(
    "review_need",
    "Follow-up from NoticeKit's AI audit outreach. Please review the current public trust/security path and identify the top blocker, the best fix path, and the reply-ready next step for one live buyer review thread."
  );
  url.searchParams.set(
    "deadline",
    "If a buyer review is active, include the actual due date or turnaround pressure in the intake so the audit can stay scoped to the live thread."
  );
  return url.toString();
}

const rows = parseCsv(await readFile(BATCH_CSV, "utf8"));
const today = getTodayIsoDate();
const activeRows = rows
  .filter((row) => ["sent", "followed_up"].includes(String(row.status || "").trim()))
  .sort((a, b) => Number(a.priority || 0) - Number(b.priority || 0))
  .map((row) => {
    const sentDate = extractSentDate(row);
    const followUpDate = sentDate ? addBusinessDays(sentDate, 2) : "unknown";
    return {
      priority: row.priority,
      company: row.company,
      segment: row.segment,
      status: row.status,
      followUpDate,
      recipient: extractPriorSendRecipient(row) || row.public_contact_route,
      sourceUrl: row.source_url,
      auditUrl: auditUrlForRow(row)
    };
  });

const sentRows = countByStatus(rows, "sent");
const followedUpRows = countByStatus(rows, "followed_up");
const terminalRows = rows.filter((row) => TERMINAL_STATUSES.has(String(row.status || "").trim())).length;
const batchDate = rows
  .map((row) => extractSentDate(row))
  .filter(Boolean)
  .sort()[0] || "unknown";
const exhausted = today >= SECOND_TOUCH_EXHAUSTION_DATE && followedUpRows > 0 && sentRows === 0 && terminalRows === 0;
const currentStatusLine = exhausted
  ? `AI audit follow-up is exhausted as of ${SECOND_TOUCH_EXHAUSTION_DATE} UTC: all ${followedUpRows} row(s) were followed up, and the outreach CSV still shows 0 terminal response rows. Keep the batch parked until a new offer or segment decision exists.`
  : followedUpRows > 0 && sentRows === 0
  ? `AI audit follow-up has already been sent for ${followedUpRows} row(s), and the outreach CSV still shows 0 terminal response rows.`
  : followedUpRows > 0
    ? `AI audit batch 01 currently has ${sentRows} sent row(s) still pending follow-up and ${followedUpRows} followed-up row(s).`
    : `AI audit batch 01 currently has ${activeRows.length} sent row(s) and no terminal response rows recorded in the outreach CSV.`;
const earliestFollowUpDate = activeRows
  .map((row) => row.followUpDate)
  .filter((value) => value && value !== "unknown")
  .sort()[0] || "unknown";

const output = [
  "# AI Audit Outreach Follow-Up Pass",
  "",
  `Date: ${batchDate}`,
  "",
  `Follow-up date: ${earliestFollowUpDate} UTC`,
  "",
  "This pass covers the dedicated AI audit outreach batch.",
  "Use it only for rows that are still in `sent` status after two business days and remove any target that has already replied, bounced, redirected, or submitted an audit intake.",
  "",
  `Prepared rows: ${activeRows.length}`,
  "",
  "## Current Status",
  "",
  currentStatusLine,
  ...(exhausted ? ["", `Exhaustion checkpoint: ${SECOND_TOUCH_EXHAUSTION_DATE} UTC.`] : []),
  "",
  "## Follow-Up Queue",
  "",
  "| Priority | Company | Segment | Status | Follow-up date | Recipient | Public page |",
  "|---:|---|---|---|---|---|---|",
  ...activeRows.map(
    (row) =>
      `| ${escapeTableCell(row.priority)} | ${escapeTableCell(row.company)} | ${escapeTableCell(row.segment)} | ${escapeTableCell(row.status)} | ${escapeTableCell(row.followUpDate)} | ${escapeTableCell(row.recipient)} | ${escapeTableCell(row.sourceUrl)} |`
  ),
  "",
  "## Follow-Up Copy",
  "",
  "Subject: Re: 48-hour audit for your live AI review path?",
  "",
  "Hi there,",
  "",
  "Quick follow-up.",
  "",
  "I reached out because your team already has a public trust path, which usually means the hard part is no longer publishing something, but tightening the exact proof, control boundary, or reviewer handoff that a live buyer thread pushes on next.",
  "",
  "If useful, here is the scoped audit path again:",
  "`<row-specific audit URL>`",
  "",
  "If not, even a one-line reply would help: is the real friction usually proof assets, named-vendor wording, or the control boundary itself?",
  "",
  "Best,",
  "NoticeKit",
  "",
  `Audit intake URL: \`${AUDIT_URL}?source=ai-audit-outreach-batch-01\`.`,
  "Use the row-specific audit URL listed below so the source tag and public page stay attached to the intake path.",
  "",
  "## Row-Specific Audit URLs",
  "",
  ...activeRows.map((row) => `- ${row.company}: \`${row.auditUrl}\``),
  "",
  "## Send Command",
  "",
  "`set -a && source .env.production.local && set +a && npm run run:ai-outreach-follow-up-gate -- --send --transport resend`",
  "",
  "## Send Guardrails",
  "",
  `- Do not send before ${earliestFollowUpDate} UTC.`,
  "- Do not send to any target that has already replied, bounced, redirected, or submitted an audit intake.",
  "- Dry-run `npm run run:ai-outreach-follow-up-gate -- --transport resend` first if you need to confirm the full AI follow-up queue before the live send.",
  "- The combined gate now runs a full validation-artifact sync immediately after a live send so the queue, send plan, and operator docs flip from `sent` to `followed_up` together.",
  `- If the batch still shows 0 replies, redirects, or intakes on ${SECOND_TOUCH_EXHAUSTION_DATE} UTC after the June 5 follow-up, record that the second-touch angle is exhausted and leave the batch parked until a new offer or segment decision exists.`,
  "- Record the first real AI audit reply, redirect, or intake in `COMMUNITY-FEEDBACK.md` before changing the audit copy or target list.",
  ""
].join("\n");

await writeFile(OUTPUT, output);
console.log(`Wrote ${OUTPUT}`);
