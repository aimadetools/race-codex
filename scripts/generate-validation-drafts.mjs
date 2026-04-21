#!/usr/bin/env node

import { mkdir, readFile, writeFile } from "node:fs/promises";
import { dirname, join } from "node:path";
import { fileURLToPath } from "node:url";

const __dirname = dirname(fileURLToPath(import.meta.url));
const ROOT = join(__dirname, "..");
const OUTPUT_DIR = join(ROOT, "validation-outreach-drafts");
const EML_OUTPUT_DIR = join(ROOT, "validation-outreach-eml");

function slugify(value) {
  return String(value)
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 64);
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
      followUp: [
        `Hi there,`,
        ``,
        `Quick follow-up. I am looking for blunt operator feedback, not a sales call.`,
        ``,
        `The specific question is whether a one-change subprocessor notice kit would save time when a SaaS team needs to update its list, notify customers, and keep evidence of what happened.`,
        ``,
        `Worth a 15-minute feedback call, or is this owned by someone else at ${company}?`,
        ``,
        `Best,`,
        `NoticeKit`
      ].join("\n"),
      opening: [
        `Thanks for taking the time. I am validating whether this is a real operational pain for small SaaS teams. This is not legal advice, and I am not asking you to share confidential customer or contract details.`,
        ``,
        `I will ask about the workflow: how vendor changes are tracked, how customers are notified, who owns the evidence trail, and what would make a paid kit useful or risky.`
      ].join("\n")
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
      followUp: [
        `Hi there,`,
        ``,
        `Quick follow-up. I am looking for blunt feedback, not a sales call.`,
        ``,
        `The specific question is whether a small structured packet for vendor changes would reduce back-and-forth before privacy or legal review, or whether the positioning needs to be narrower.`,
        ``,
        `Worth a 15-minute feedback call, or is there someone else who sees this workflow more often?`,
        ``,
        `Best,`,
        `NoticeKit`
      ].join("\n"),
      opening: [
        `Thanks for taking the time. I am validating whether subprocessor notice operations are a real pain for small SaaS teams and the advisors who support them. This is not legal advice, and I am not asking you to review a contract or share confidential client details.`,
        ``,
        `I will ask about patterns you see: who owns vendor-change notices, what fields are missing, what evidence matters, and what would make a paid operational kit useful or risky.`
      ].join("\n")
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
    followUp: [
      `Hi there,`,
      ``,
      `Quick follow-up. I am looking for blunt feedback, not a sales call.`,
      ``,
      `The specific question is whether a small structured packet for vendor changes would reduce back-and-forth before privacy or legal review, or whether the positioning needs to be narrower.`,
      ``,
      `Worth a 15-minute feedback call, or is there someone else who sees this workflow more often?`,
      ``,
      `Best,`,
      `NoticeKit`
    ].join("\n"),
    opening: [
      `Thanks for taking the time. I am validating whether subprocessor notice operations are a real pain for small SaaS teams and the advisors who support them. This is not legal advice, and I am not asking you to review a contract or share confidential client details.`,
      ``,
      `I will ask about patterns you see: who owns vendor-change notices, what facts attorneys want founders to gather, what evidence matters, and what would make a paid operational kit useful or risky.`
    ].join("\n")
  };
}

function extractRecipient(route) {
  const match = String(route || "").match(/[A-Z0-9._%+-]+@[A-Z0-9.-]+\.[A-Z]{2,}/i);
  return match ? match[0] : "";
}

function escapeHeader(value) {
  return String(value || "")
    .replace(/\r/g, "")
    .replace(/\n/g, " ")
    .trim();
}

function buildEml(row, batchLabel) {
  const content = bodyForRow(row);
  const recipient = extractRecipient(row.public_contact_route);
  if (!recipient) {
    return null;
  }

  const company = escapeHeader(row.company || row.organization || "");
  const subject = escapeHeader(content.subject);
  const textBody = [
    `To: ${recipient}`,
    `From: NoticeKit <hello@noticekit.tech>`,
    `Subject: ${subject}`,
    `Content-Type: text/plain; charset=utf-8`,
    `Reply-To: hello@noticekit.tech`,
    ``,
    content.firstTouch
  ].join("\n");

  return {
    fileName: `${String(row.priority).padStart(2, "0")}-${slugify(company)}.eml`,
    body: textBody,
    recipient,
    subject,
    company,
    batchLabel
  };
}

function renderDraft(row, batchLabel) {
  const content = bodyForRow(row);
  const safeCompany = String(row.company || row.organization || "").replace(/[\r\n]+/g, " ").trim();
  const fileName = `${String(row.priority).padStart(2, "0")}-${slugify(safeCompany)}.md`;

  return {
    fileName,
    body: [
      `# ${safeCompany}`,
      ``,
      `Batch: ${batchLabel}`,
      `Priority: ${row.priority}`,
      `Segment: ${row.segment}`,
      `Source URL: ${row.source_url}`,
      `Public signal: ${row.public_signal}`,
      `Suggested contact path: ${row.suggested_contact_path}`,
      `Public contact route: ${row.public_contact_route || ""}`,
      `Status: ${row.status}`,
      ``,
      `## First Touch`,
      ``,
      `Subject: ${content.subject}`,
      ``,
      content.firstTouch,
      ``,
      `## Follow-Up`,
      ``,
      `Subject: Re: ${content.subject}`,
      ``,
      content.followUp,
      ``,
      `## Call Opening`,
      ``,
      content.opening,
      ``,
      `## Notes`,
      ``,
      `Do not score silence, opens, clicks, or generic replies. Only add an interview row after an actual call, async interview response, or specific referral.`
    ].join("\n")
  };
}

async function main() {
  const batch01 = parseCsv(await readFile(join(ROOT, "buyer-validation-outreach-batch-01.csv"), "utf8"));
  const batch02 = parseCsv(await readFile(join(ROOT, "buyer-validation-outreach-batch-02.csv"), "utf8"));

  await mkdir(OUTPUT_DIR, { recursive: true });
  await mkdir(EML_OUTPUT_DIR, { recursive: true });

  const files = [];
  const emlFiles = [];
  for (const row of batch01) {
    files.push({ ...renderDraft(row, "batch-01"), batch: "batch-01" });
    const emlDraft = buildEml(row, "batch-01");
    if (emlDraft) {
      emlFiles.push(emlDraft);
    }
  }
  for (const row of batch02) {
    files.push({ ...renderDraft(row, "batch-02"), batch: "batch-02" });
    const emlDraft = buildEml(row, "batch-02");
    if (emlDraft) {
      emlFiles.push(emlDraft);
    }
  }

  for (const draft of files) {
    await writeFile(join(OUTPUT_DIR, draft.fileName), draft.body + "\n", "utf8");
  }

  for (const draft of emlFiles) {
    await writeFile(join(EML_OUTPUT_DIR, draft.fileName), draft.body + "\n", "utf8");
  }

  const summary = [
    `# Validation Outreach Drafts`,
    ``,
    `Generated from the prepared buyer validation CSV files.`,
    ``,
    `## Send Order`,
    ``,
    `1. Founder/operator batch 01.`,
    `2. Wait one business day.`,
    `3. Advisor batch 02.`,
    ``,
    `## Status`,
    ``,
    `This workspace still has no approved outbound mail transport, so these drafts are ready for a human sender or email connector.`,
    ``,
    `The direct-email targets also have RFC-style .eml exports in validation-outreach-eml/ for easier manual sending.`,
    ``,
    `## Files`,
    ``,
    ...files.map((draft) => `- ${draft.fileName}`)
  ].join("\n");

  await writeFile(join(OUTPUT_DIR, "README.md"), summary + "\n", "utf8");

  const emlSummary = [
    `# Validation Outreach EML Exports`,
    ``,
    `Generated from the prepared buyer validation CSV files.`,
    ``,
    `## Status`,
    ``,
    `Only direct-email targets are exported here. Manual-form and contact-sales targets remain in validation-outreach-drafts/ for human sending.`,
    ``,
    `## Files`,
    ``,
    ...emlFiles.map((draft) => `- ${draft.fileName} -> ${draft.recipient} (${draft.subject})`)
  ].join("\n");

  await writeFile(join(EML_OUTPUT_DIR, "README.md"), emlSummary + "\n", "utf8");
}

main().catch((error) => {
  console.error(error);
  process.exitCode = 1;
});
