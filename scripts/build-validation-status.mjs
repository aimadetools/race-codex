#!/usr/bin/env node

import { readFile, writeFile } from "node:fs/promises";
import { join } from "node:path";

const ROOT = process.cwd();
const OUTPUT = join(ROOT, "VALIDATION-STATUS.md");
const BATCH_FILES = [
  { label: "Founder/operator batch 01", path: join(ROOT, "buyer-validation-outreach-batch-01.csv") },
  { label: "Advisor batch 02", path: join(ROOT, "buyer-validation-outreach-batch-02.csv") },
  { label: "Contingency batch 03", path: join(ROOT, "buyer-validation-outreach-batch-03.csv") },
  { label: "Contingency batch 04", path: join(ROOT, "buyer-validation-outreach-batch-04.csv") }
];
const FEEDBACK_FILE = join(ROOT, "COMMUNITY-FEEDBACK.md");
const HOMEPAGE_QUEUE_FILE = join(ROOT, "HOMEPAGE-COPY-REFRESH-QUEUE.md");
const DECISION_BRIEF_FILE = join(ROOT, "VALIDATION-DECISION-BRIEF.md");
const POSITIONING_BRIEF_FILE = join(ROOT, "VALIDATION-POSITIONING-BRIEF.md");
const FOLLOW_UP_FILE = join(ROOT, "BUYER-VALIDATION-FOUNDER-FOLLOW-UP-PASS.md");
const ADVISOR_FOLLOW_UP_FILE = join(ROOT, "BUYER-VALIDATION-ADVISOR-FOLLOW-UP-PASS.md");
const INTERVIEW_LOG = join(ROOT, "buyer-validation-interview-log.csv");

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

function countBy(rows, key, value) {
  return rows.filter((row) => String(row[key] || "").trim() === value).length;
}

function extractFollowUpDate(text) {
  const match = text.match(/Follow-up date:\s*([^\n]+)/i);
  return match ? match[1].trim() : "unknown";
}

function extractSentDate(rows) {
  for (const row of rows) {
    if (!["sent", "followed_up"].includes(String(row.status || "").trim())) {
      continue;
    }

    const notes = String(row.notes || "");
    const match = notes.match(/Sent (\d{4}-\d{2}-\d{2})/);
    if (match) {
      return match[1];
    }
  }

  return "unknown";
}

function normalizeRows(rows) {
  return rows.filter((row) => Object.values(row).some((value) => String(value || "").trim() !== ""));
}

function extractFeedbackSignals(text) {
  const sourceTagMatches = [...text.matchAll(/Source tag:\s*([^\n|]+)/g)];
  const channelMatches = [...text.matchAll(/Channel:\s*([^\n|]+)/g)];
  const scoreBandMatches = [...text.matchAll(/Score band:\s*([^\n|]+)/g)];
  const ownershipMatches = [...text.matchAll(/Ownership:\s*([^\n|]+)/g)];

  const sourceTags = sourceTagMatches.map((match) => match[1].trim());
  const channels = channelMatches.map((match) => match[1].trim().toLowerCase());
  const scoreBands = scoreBandMatches.map((match) => match[1].trim());
  const ownershipSignals = ownershipMatches.map((match) => match[1].trim().toLowerCase());
  const inPageFormChannels = channels.filter((value) => ["in-page-form", "inline-form", "self-audit-form", "form"].includes(value)).length;
  const mailtoChannels = channels.filter((value) => ["mailto", "email", "mail-forward", "email-forward", "forwarded-email"].includes(value)).length;

  const founderOwnership = ownershipSignals.filter((value) => ["founder", "operator", "ops"].includes(value)).length;
  const advisorOwnership = ownershipSignals.filter((value) => ["privacy consultant", "consultant", "fractional dpo", "dpo", "attorney", "lawyer"].includes(value)).length;

  return {
    sourceTags,
    channels,
    scoreBands,
    founderFollowUpReplies: sourceTags.filter((value) => value === "founder-follow-up").length,
    advisorFollowUpReplies: sourceTags.filter((value) => value === "advisor-follow-up").length,
    inPageFormChannels,
    mailtoChannels,
    founderOwnership,
    advisorOwnership,
    lowScoreBands: scoreBands.filter((value) => value === "0-4").length,
    mediumScoreBands: scoreBands.filter((value) => value === "5-7").length,
    highScoreBands: scoreBands.filter((value) => value === "8-10").length
  };
}

function hasNoReplyNote(text, segment) {
  const pattern = segment === "founder"
    ? /no founder\/operator replies have been posted here yet\./i
    : /no advisor replies have been posted here yet\./i;
  return pattern.test(text);
}

function extractQueueState(text) {
  const match = text.match(/Trigger state:\s*([^\n]+)/i);
  return match ? match[1].trim() : "unknown";
}

function extractDecisionHeadline(text) {
  const match = text.match(/Recommended action headline:\s*([^\n]+)/i);
  return match ? match[1].trim() : "unknown";
}

function extractPositioningHeadline(text) {
  const match = text.match(/Recommended headline:\s*([^\n]+)/i);
  return match ? match[1].trim() : "unknown";
}

function renderBatchSummary(label, rows) {
  const sent = countBy(rows, "status", "sent");
  const followedUp = countBy(rows, "status", "followed_up");
  const ready = countBy(rows, "status", "ready_for_send");
  const repliedPositive = countBy(rows, "status", "replied_positive");
  const repliedNegative = countBy(rows, "status", "replied_negative");
  const bounced = countBy(rows, "status", "bounced");
  const interviews = countBy(rows, "status", "interview_completed");
  const sentDate = extractSentDate(rows);

  const parts = [`- ${label}: ${sent} sent`];

  if (followedUp > 0) {
    parts.push(`${followedUp} followed_up`);
  }

  if (ready > 0) {
    parts.push(`${ready} ready_for_send`);
  }

  if (repliedPositive + repliedNegative + bounced + interviews > 0) {
    parts.push(`${repliedPositive} positive replies`, `${repliedNegative} negative replies`, `${bounced} bounces`, `${interviews} interview rows`);
  }

  if (sentDate !== "unknown") {
    parts.push(`first sent on ${sentDate}`);
  }

  return parts.join(", ");
}

const now = new Date().toISOString().slice(0, 10);
const founderBatchRows = parseCsv(await readFile(BATCH_FILES[0].path, "utf8"));
const advisorBatchRows = parseCsv(await readFile(BATCH_FILES[1].path, "utf8"));
const contingencyRows = parseCsv(await readFile(BATCH_FILES[2].path, "utf8"));
const contingencyTwoRows = parseCsv(await readFile(BATCH_FILES[3].path, "utf8"));
const feedbackText = await readFile(FEEDBACK_FILE, "utf8");
const homepageQueueText = await readFile(HOMEPAGE_QUEUE_FILE, "utf8").catch(() => "");
const decisionBriefText = await readFile(DECISION_BRIEF_FILE, "utf8").catch(() => "");
const positioningBriefText = await readFile(POSITIONING_BRIEF_FILE, "utf8").catch(() => "");
const followUpText = await readFile(FOLLOW_UP_FILE, "utf8");
const advisorFollowUpText = await readFile(ADVISOR_FOLLOW_UP_FILE, "utf8");
const interviewRows = normalizeRows(parseCsv(await readFile(INTERVIEW_LOG, "utf8")));
const founderReplies = founderBatchRows.filter((row) => ["replied_positive", "replied_negative", "bounced", "interview_completed"].includes(String(row.status || "").trim())).length;
const advisorReplies = advisorBatchRows.filter((row) => ["replied_positive", "replied_negative", "bounced", "interview_completed"].includes(String(row.status || "").trim())).length;
const followUpDate = extractFollowUpDate(followUpText);
const advisorFollowUpDate = extractFollowUpDate(advisorFollowUpText);
const noFounderRepliesPosted = hasNoReplyNote(feedbackText, "founder");
const noAdvisorRepliesPosted = hasNoReplyNote(feedbackText, "advisor");
const feedbackSignals = extractFeedbackSignals(feedbackText);
const shouldQueueAdvisorCopyRefresh = feedbackSignals.advisorOwnership > feedbackSignals.founderOwnership && feedbackSignals.advisorOwnership > 0;
const homepageQueueState = extractQueueState(homepageQueueText);
const decisionHeadline = extractDecisionHeadline(decisionBriefText);
const positioningHeadline = extractPositioningHeadline(positioningBriefText);

const output = [
  "# NoticeKit Validation Status",
  "",
  `Date: ${now}`,
  "",
  "## Current Read",
  "",
  "- Highest-priority incomplete work: exact buyer validation through real interviews.",
  `- Next executable validation step: monitor ` + "`COMMUNITY-FEEDBACK.md`" + ` for replies and convert any real reply into an interview.`,
  `- Founder follow-up pass due: ${followUpDate}.`,
  `- Advisor follow-up pass due: ${advisorFollowUpDate}.`,
  "- Batch 03 remains contingency-only until the 2026-04-27 no-reply check.",
  "- Batch 04 remains a second contingency expansion until batch 03 is exhausted after the same check.",
  "",
  "## Batch Snapshot",
  "",
  renderBatchSummary(BATCH_FILES[0].label, founderBatchRows),
  renderBatchSummary(BATCH_FILES[1].label, advisorBatchRows),
  renderBatchSummary(BATCH_FILES[2].label, contingencyRows),
  renderBatchSummary(BATCH_FILES[3].label, contingencyTwoRows),
  "",
  "## Reply Watch",
  "",
  `- ` + "`COMMUNITY-FEEDBACK.md`" + ` currently says: ${noFounderRepliesPosted && noAdvisorRepliesPosted ? "no founder/operator or advisor replies have been posted yet." : "replies are present and need review."}`,
  `- Interview log rows: ${interviewRows.length}`,
  `- Founder batch reply or bounce rows recorded in CSV: ${founderReplies}`,
  `- Advisor batch reply or bounce rows recorded in CSV: ${advisorReplies}`,
  `- Tagged self-audit replies logged: ${feedbackSignals.sourceTags.length} (${feedbackSignals.founderFollowUpReplies} founder-follow-up, ${feedbackSignals.advisorFollowUpReplies} advisor-follow-up)`,
  `- Self-audit channels logged: ${feedbackSignals.channels.length} (${feedbackSignals.inPageFormChannels} in-page-form, ${feedbackSignals.mailtoChannels} mailto)`,
  `- Self-audit score bands logged: ${feedbackSignals.lowScoreBands} low (0-4), ${feedbackSignals.mediumScoreBands} medium (5-7), ${feedbackSignals.highScoreBands} high (8-10)`,
  `- Ownership signals logged: ${feedbackSignals.founderOwnership} founder/operator, ${feedbackSignals.advisorOwnership} consultant/attorney`,
  "",
  "## Notes",
  "",
  "- Use `scripts/record-validation-feedback.mjs --input <json>` when a reply arrives.",
  "- Use `scripts/append-validation-interview.mjs --input <json>` only after a real conversation or specific referral.",
  `- Decision brief: ${decisionHeadline === "unknown" ? "missing; run \`npm run build:validation-decision-brief\`." : `\`VALIDATION-DECISION-BRIEF.md\` says: ${decisionHeadline}`}`,
  `- Positioning brief: ${positioningHeadline === "unknown" ? "missing; run \`node scripts/build-validation-positioning-brief.mjs\`." : `\`VALIDATION-POSITIONING-BRIEF.md\` says: ${positioningHeadline}`}`,
  `- Homepage advisor-handoff copy refresh queue: ${shouldQueueAdvisorCopyRefresh ? "queue it now based on logged ownership signals." : "not triggered."}`,
  `- Queue file: ${homepageQueueState === "unknown" ? "missing; run \`npm run build:homepage-copy-refresh-queue\`." : `\`HOMEPAGE-COPY-REFRESH-QUEUE.md\` is ${homepageQueueState}.`}`,
  "- Do not send batch 03 before the no-reply check date documented in the runbook.",
  "- The reply watch now also surfaces batch 04 when batch 03 is exhausted after the same check.",
  ""
].join("\n");

await writeFile(OUTPUT, output);
console.log(`Wrote ${OUTPUT}`);
