import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();
const OUTPUT = join(ROOT, "VALIDATION-OUTREACH-SEND-PLAN.md");
const TODAY = new Date().toISOString().slice(0, 10);

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

function countStatuses(rows) {
  return rows.reduce((counts, row) => {
    const status = String(row.status || "").trim() || "unknown";
    counts[status] = (counts[status] || 0) + 1;
    return counts;
  }, {});
}

function extractFirstEventDate(rows) {
  const sentDates = [];
  const followUpDates = [];
  const anyDates = [];

  for (const row of rows) {
    const notes = String(row.notes || "");

    for (const match of notes.matchAll(/Sent\s+(20\d{2}-\d{2}-\d{2})/g)) {
      sentDates.push(match[1]);
    }

    for (const match of notes.matchAll(/Followed up\s+(20\d{2}-\d{2}-\d{2})/g)) {
      followUpDates.push(match[1]);
    }

    for (const match of notes.matchAll(/\b(20\d{2}-\d{2}-\d{2})\b/g)) {
      anyDates.push(match[1]);
    }
  }

  const preferred = sentDates.length > 0 ? sentDates : followUpDates.length > 0 ? followUpDates : anyDates;
  if (preferred.length === 0) {
    return "unknown";
  }

  return preferred.sort()[0];
}

function describeBatchStatus(rows, { contingencyLabel = "" } = {}) {
  const counts = countStatuses(rows);
  const ready = counts.ready_for_send || 0;
  const sent = counts.sent || 0;
  const followedUp = counts.followed_up || 0;
  const terminal = (counts.replied_positive || 0) + (counts.replied_negative || 0) + (counts.bounced || 0) + (counts.interview_completed || 0);
  const firstEventDate = extractFirstEventDate(rows);
  const waiting = sent + followedUp;

  if (waiting > 0) {
    return `Status: active outbound on ${firstEventDate}; ${sent} sent, ${followedUp} followed_up, ${terminal} terminal row(s).`;
  }

  if (ready > 0) {
    const prefix = contingencyLabel
      ? `${contingencyLabel} remains queued`
      : "Prepared but not yet sent";
    return `Status: ${prefix}; ${ready} ready_for_send row(s), ${terminal} terminal row(s).`;
  }

  return `Status: no active send rows; ${terminal} terminal row(s).`;
}

function countReplyRows(rows) {
  return rows.filter((row) =>
    ["replied_positive", "replied_negative", "bounced", "interview_completed"].includes(String(row.status || "").trim())
  ).length;
}

function planSection(title, rows) {
  const lines = [
    "| Priority | Target | Segment | Route | Send method |",
    "|---:|---|---|---|---|",
    ...rows.map(
      (row) =>
        `| ${row.priority} | ${row.target} | ${row.segment} | ${row.route} | ${row.sendMethod} |`
    ),
    ""
  ];

  if (title) {
    lines.unshift("", `## ${title}`, "");
  }

  return lines.join("\n");
}

const batch01 = parseCsv(await readFile(join(ROOT, "buyer-validation-outreach-batch-01.csv"), "utf8"));
const batch02 = parseCsv(await readFile(join(ROOT, "buyer-validation-outreach-batch-02.csv"), "utf8"));
let batch03 = [];
let batch04 = [];

try {
  batch03 = parseCsv(await readFile(join(ROOT, "buyer-validation-outreach-batch-03.csv"), "utf8"));
} catch (error) {
  if (!error || error.code !== "ENOENT") {
    throw error;
  }
}

try {
  batch04 = parseCsv(await readFile(join(ROOT, "buyer-validation-outreach-batch-04.csv"), "utf8"));
} catch (error) {
  if (!error || error.code !== "ENOENT") {
    throw error;
  }
}

const normalized01 = batch01.map((row) => ({
  priority: row.priority,
  target: row.company,
  segment: row.segment,
  route: row.public_contact_route,
  sendMethod: classifyRoute(row.public_contact_route)
}));

const normalized02 = batch02.map((row) => ({
  priority: row.priority,
  target: row.organization,
  segment: row.segment,
  route: row.public_contact_route,
  sendMethod: classifyRoute(row.public_contact_route)
}));

const normalized03 = batch03.map((row) => ({
  priority: row.priority,
  target: row.company,
  segment: row.segment,
  route: row.public_contact_route,
  sendMethod: classifyRoute(row.public_contact_route)
}));

const normalized04 = batch04.map((row) => ({
  priority: row.priority,
  target: row.company,
  segment: row.segment,
  route: row.public_contact_route,
  sendMethod: classifyRoute(row.public_contact_route)
}));

const directEmailCount = [...normalized01, ...normalized02, ...normalized03, ...normalized04].filter(
  (row) => row.sendMethod === "direct-email"
).length;

const allRows = [batch01, batch02, batch03, batch04].flat();
const totalWaitingForReplies = allRows.filter((row) => ["sent", "followed_up"].includes(String(row.status || "").trim())).length;
const totalReplyRows = allRows.reduce((total, row) => {
  return total + (["replied_positive", "replied_negative", "bounced", "interview_completed"].includes(String(row.status || "").trim()) ? 1 : 0);
}, 0);

let currentPriority = "Monitor the active outreach queue for the first real reply and convert any real reply into a scored interview immediately.";
if (totalReplyRows > 0) {
  currentPriority = "Review the recorded reply rows, log the exact evidence, and convert any real conversation or referral into a scored interview.";
} else if (totalWaitingForReplies > 0) {
  currentPriority = `Monitor replies across the ${totalWaitingForReplies} active outbound row(s); no additional expansion is unlocked until evidence lands.`;
}

const batch03Section = normalized03.length
  ? [
      "## Batch 03 contingency",
      "",
      describeBatchStatus(batch03, { contingencyLabel: "Batch 03 contingency" }),
      "",
      planSection("", normalized03)
    ].join("\n")
  : "";

const batch04Section = normalized04.length
  ? [
      "## Batch 04 contingency",
      "",
      describeBatchStatus(batch04, { contingencyLabel: "Batch 04 contingency" }),
      "",
      planSection("", normalized04)
    ].join("\n")
  : "";

const output = [
  "# NoticeKit Validation Outreach Send Plan",
  "",
  `Date: ${TODAY}`,
  "",
  "This plan translates the current outreach CSV state into the active send and reply-handling queue.",
  "Use it to see which batches are live, which are still queued, and what should happen next when evidence arrives.",
  "",
  `Direct-email targets identified across all prepared batches: ${directEmailCount}`,
  "",
  "## Current Priority",
  "",
  currentPriority,
  "",
  "## Batch 01",
  "",
  describeBatchStatus(batch01),
  "",
  planSection("", normalized01),
  [
    "## Batch 02",
    "",
    describeBatchStatus(batch02),
    "",
    planSection("", normalized02)
  ].join("\n"),
  batch03Section,
  batch04Section,
  "## Notes",
  "",
  "- `direct-email` means the public route is a real email address or `mailto:` link.",
  "- `manual-form` means the public route is a contact page, support widget, or contact-sales flow that needs human submission.",
  "- `manual` means the route needs a different delivery path before it can be sent.",
  `- Total reply, bounce, or interview rows already recorded across all batches: ${countReplyRows(batch01) + countReplyRows(batch02) + countReplyRows(batch03) + countReplyRows(batch04)}.`,
  "- Convert any real reply into repo evidence before changing positioning or expanding the list again.",
  ""
].join("\n");

await writeFile(OUTPUT, output);
console.log(`Wrote ${OUTPUT}`);
