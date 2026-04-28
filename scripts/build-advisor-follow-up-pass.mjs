import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();
const BATCH_CSV = join(ROOT, "buyer-validation-outreach-batch-02.csv");
const OUTPUT = join(ROOT, "BUYER-VALIDATION-ADVISOR-FOLLOW-UP-PASS.md");
const SELF_AUDIT_URL = "https://noticekit.tech/self-audit.html?source=advisor-follow-up";

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

function classifyRoute(route) {
  const value = String(route || "").trim();
  if (!value) {
    return "manual";
  }

  if (value.includes("@") || value.includes("mailto:")) {
    return "direct-email";
  }

  if (value.startsWith("http")) {
    return "manual-form";
  }

  return "manual";
}

function extractPriorSendRecipient(row) {
  const notes = String(row.notes || "");
  const matches = [...notes.matchAll(/\bto\s+([A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,})/gi)];
  return matches.length ? matches[matches.length - 1][1] : "";
}

function escapeTableCell(value) {
  return String(value || "").replace(/\|/g, "\\|");
}

function countByStatus(rows, status) {
  return rows.filter((row) => String(row.status || "").trim() === status).length;
}

function extractSentDate(rows) {
  for (const row of rows) {
    const status = String(row.status || "").trim();
    if (!["sent", "followed_up"].includes(status)) {
      continue;
    }

    const notes = String(row.notes || "");
    const match = notes.match(/Sent (\d{4}-\d{2}-\d{2})/);
    if (match) {
      return match[1];
    }
  }

  throw new Error("Could not find a sent date in buyer-validation-outreach-batch-02.csv notes.");
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

const rows = parseCsv(await readFile(BATCH_CSV, "utf8"));
const followUpRows = rows
  .filter((row) => ["sent", "followed_up"].includes(String(row.status || "").trim()))
  .sort((a, b) => Number(a.priority || 0) - Number(b.priority || 0))
  .map((row) => {
    const priorRecipient = extractPriorSendRecipient(row);
    const followUpRoute = priorRecipient || row.public_contact_route;

    return {
      priority: row.priority,
      target: row.organization,
      segment: row.segment,
      originalRoute: row.public_contact_route,
      followUpRoute,
      sendMethod: priorRecipient ? "direct-email" : classifyRoute(followUpRoute)
    };
  });

const sentDate = extractSentDate(rows);
const followUpDate = addBusinessDays(sentDate, 3);
const sentCount = countByStatus(rows, "sent");
const followedUpCount = countByStatus(rows, "followed_up");
const currentStatusLine = followedUpCount > 0 && sentCount === 0
  ? `Batch 02 follow-up has already been sent for ${followedUpCount} row(s), and no recorded replies are in the outreach CSV yet.`
  : followedUpCount > 0
    ? `Batch 02 currently has ${sentCount} sent row(s) still pending follow-up, ${followedUpCount} followed-up row(s), and no recorded replies in the outreach CSV.`
    : `Batch 02 currently has ${followUpRows.length} sent row(s) and no recorded replies in the outreach CSV.`;

const output = [
  "# NoticeKit Advisor Follow-Up Pass",
  "",
  `Date: ${sentDate}`,
  "",
  `Follow-up date: ${followUpDate} UTC`,
  "",
  "This pass covers the advisor validation batch: fractional DPO/privacy consultant and startup attorney targets.",
  "Use it only for non-responders after three business days, and remove any row that has already replied, bounced, referred, or turned into an interview.",
  "",
  `Prepared rows: ${followUpRows.length}`,
  "",
  "## Current Status",
  "",
  currentStatusLine,
  "",
  "## Follow-Up Queue",
  "",
  "| Priority | Target | Segment | Original route | Follow-up route | Send method |",
  "|---:|---|---|---|---|---|",
  ...followUpRows.map(
    (row) =>
      `| ${escapeTableCell(row.priority)} | ${escapeTableCell(row.target)} | ${escapeTableCell(row.segment)} | ${escapeTableCell(row.originalRoute)} | ${escapeTableCell(row.followUpRoute)} | ${escapeTableCell(row.sendMethod)} |`
  ),
  "",
  "## Follow-Up Copy",
  "",
  "Use the consultant and attorney follow-up subjects and bodies from `BUYER-VALIDATION-OUTREACH-BATCH-02.md`.",
  "When the first send already recorded a direct-email inbox in CSV notes, use that inbox as the follow-up route instead of falling back to the broader public contact path.",
  `If it helps, include \`${SELF_AUDIT_URL}\` as a quick self-check hook before asking for blunt feedback.`,
  "Ask recipients to reply with the score and top two gaps if they do not want a call.",
  "Keep the message short, avoid product pitching, and keep the non-legal-advice boundary intact.",
  "",
  "## Send Guardrails",
  "",
  `- Do not send before ${followUpDate} UTC.`,
  "- Do not send to any target that has already replied or bounced.",
  "- Keep founder follow-ups and any future batch expansion separate from this pass.",
  ""
].join("\n");

await writeFile(OUTPUT, output);
console.log(`Wrote ${OUTPUT}`);
