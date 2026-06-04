#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();
const BATCH_CSV = join(ROOT, "ai-agent-review-outreach-batch-01.csv");
const OUTPUT = join(ROOT, "AI-AGENT-REVIEW-OUTREACH-FOLLOW-UP-PASS.md");
const CHECKLIST_URL = "https://noticekit.tech/blog-ai-agent-security-review-checklist.html?source=agent-review-outreach-checklist";
const TEARDOWN_BASE_URL = "https://noticekit.tech/ai-agent-gap-read.html";
const SECOND_TOUCH_EXHAUSTION_DATE = "2026-06-05";
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

function teardownUrlForRow(row) {
  const url = new URL(TEARDOWN_BASE_URL);
  url.searchParams.set("source", "agent-review-outreach-batch-01");
  url.searchParams.set("channel", "agent-review-email");
  url.searchParams.set("company", row.company || "");
  url.searchParams.set("subprocessor_url", row.source_url || "");
  url.searchParams.set(
    "review_need",
    "Follow-up from AI agent review outreach. Please give the 3-bullet async gap read for the public agent-review path, focusing on tool access, approvals, and audit trail."
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
      teardownUrl: teardownUrlForRow(row)
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
  ? `AI agent review follow-up is exhausted as of ${SECOND_TOUCH_EXHAUSTION_DATE} UTC: all ${followedUpRows} row(s) were followed up, and the outreach CSV still shows 0 replies, bounces, or interviews. Keep the batch parked until a new offer or segment decision exists.`
  : followedUpRows > 0 && sentRows === 0
  ? `AI agent review follow-up has already been sent for ${followedUpRows} row(s), and no reply or teardown evidence is recorded yet.`
  : followedUpRows > 0
    ? `AI agent review batch 01 currently has ${sentRows} sent row(s) still pending follow-up and ${followedUpRows} followed-up row(s).`
    : `AI agent review batch 01 currently has ${activeRows.length} sent row(s) and no recorded replies, bounces, or teardown submissions.`;
const earliestFollowUpDate = activeRows
  .map((row) => row.followUpDate)
  .filter((value) => value && value !== "unknown")
  .sort()[0] || "unknown";

const output = [
  "# AI Agent Review Outreach Follow-Up Pass",
  "",
  `Date: ${batchDate}`,
  "",
  `Follow-up date: ${earliestFollowUpDate} UTC`,
  "",
  "This pass covers the AI agent review outreach batch.",
  "Use it only for rows that are still in `sent` status after two business days and remove any target that has already replied, bounced, redirected, or submitted a teardown request.",
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
  "Subject: Re: Quick question on your AI agent review path",
  "",
  "Hi there,",
  "",
  "Quick follow-up.",
  "",
  "I reached out because your public materials already cover part of the trust story, and the next buyer objection often narrows to one of three things: tool access, approval gates, or audit trail.",
  "",
  "If a short async gap read is useful, here is the teardown path again:",
  "`<row-specific teardown URL>`",
  "",
  "If not, even a one-line reply would help: is the real friction usually the tool list, the approval path, or neither?",
  "",
  "Best,",
  "NoticeKit",
  "",
  `Agent review checklist URL: \`${CHECKLIST_URL}\`.`,
  "Use the row-specific teardown URL listed below so the source tag and public page stay attached to the reply path.",
  "",
  "## Row-Specific Teardown URLs",
  "",
  ...activeRows.map((row) => `- ${row.company}: \`${row.teardownUrl}\``),
  "",
  "## Send Command",
  "",
  "`set -a && source .env.production.local && set +a && npm run run:ai-outreach-follow-up-gate -- --send --transport resend`",
  "",
  "## Send Guardrails",
  "",
  `- Do not send before ${earliestFollowUpDate} UTC.`,
  "- Do not send to any target that has already replied, bounced, redirected, or submitted a teardown request.",
  "- Dry-run `npm run run:ai-outreach-follow-up-gate -- --transport resend` first if you need to confirm both AI follow-up queues before the live send.",
  "- The combined gate now runs a full validation-artifact sync immediately after a live send so the queue, send plan, and operator docs flip from `sent` to `followed_up` together.",
  `- If the batch still shows 0 replies, redirects, or teardown requests on ${SECOND_TOUCH_EXHAUSTION_DATE} UTC after the June 2 follow-up, record that the second-touch angle is exhausted and leave the batch parked until a new offer or segment decision exists.`,
  "- Record the first real AI agent review reply or redirect in `COMMUNITY-FEEDBACK.md` before changing the AI-agent-review copy or target list.",
  ""
].join("\n");

await writeFile(OUTPUT, output);
console.log(`Wrote ${OUTPUT}`);
