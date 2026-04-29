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
const CONTACT_INBOX_STATUS_FILE = join(ROOT, "CONTACT-INBOX-STATUS.md");
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

function describeFollowUpState(label, dueDate, rows) {
  const sent = countBy(rows, "status", "sent");
  const followedUp = countBy(rows, "status", "followed_up");

  if (followedUp > 0 && sent === 0) {
    return `- ${label}: completed; due was ${dueDate} and ${followedUp} row(s) are now waiting on replies.`;
  }

  if (sent > 0) {
    return `- ${label}: due ${dueDate}; ${sent} row(s) still need the non-responder follow-up pass.`;
  }

  return `- ${label}: ${dueDate === "unknown" ? "status unknown." : `due ${dueDate}, with no active follow-up rows remaining.`}`;
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
    ? /no founder\/operator replies have been posted here yet(?: across the active outreach batches)?\./i
    : /no advisor replies have been posted here yet\./i;
  return pattern.test(text);
}

function extractQueueState(text) {
  const match = text.match(/Trigger state:\s*([^\n]+)/i);
  return match ? match[1].trim() : "unknown";
}

function extractInboxMetric(text, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`- ${escaped}: (\\d+)`, "i"));
  return match ? Number(match[1]) : null;
}

function extractInboxCheckedAt(text) {
  const match = text.match(/Checked at:\s*([^\n]+)/i);
  return match ? match[1].trim() : "unknown";
}

function hasRealInboxSubmission(text) {
  return /- No real submissions are stored in the inbox yet\./i.test(text) ? false : /## Latest Real Submission/i.test(text);
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

function describeBatchPosition(label, rows) {
  const ready = countBy(rows, "status", "ready_for_send");
  const sent = countBy(rows, "status", "sent");
  const followedUp = countBy(rows, "status", "followed_up");
  const terminal = countBy(rows, "status", "replied_positive")
    + countBy(rows, "status", "replied_negative")
    + countBy(rows, "status", "bounced")
    + countBy(rows, "status", "interview_completed");

  if (ready > 0) {
    return `- ${label} is still queued as contingency with ${ready} ready_for_send row(s).`;
  }

  if (sent + followedUp > 0) {
    return `- ${label} has already been sent and is now waiting on replies (${sent} sent, ${followedUp} followed_up, ${terminal} terminal row(s)).`;
  }

  return `- ${label} has no active rows yet.`;
}

function describeContingencyNotes(batch03Rows, batch04Rows) {
  const batch03Ready = countBy(batch03Rows, "status", "ready_for_send");
  const batch03Active = countBy(batch03Rows, "status", "sent") + countBy(batch03Rows, "status", "followed_up");
  const batch04Ready = countBy(batch04Rows, "status", "ready_for_send");
  const batch04Active = countBy(batch04Rows, "status", "sent") + countBy(batch04Rows, "status", "followed_up");
  const notes = [];

  if (batch03Ready > 0) {
    notes.push("- Batch 03 remains queued until the validation gate or new evidence changes the send plan.");
  } else if (batch03Active > 0) {
    notes.push("- Batch 03 is already live outbound, so the immediate job is reply capture rather than more founder-list expansion.");
  }

  if (batch04Ready > 0) {
    notes.push("- Batch 04 stays as reserve contingency inventory until batch 03 is exhausted or the evidence plan changes.");
  } else if (batch04Active > 0) {
    notes.push("- Batch 04 is already live outbound too; keep monitoring replies across all 20 active rows before expanding further.");
  }

  return notes;
}

const now = new Date().toISOString().slice(0, 10);
const founderBatchRows = parseCsv(await readFile(BATCH_FILES[0].path, "utf8"));
const advisorBatchRows = parseCsv(await readFile(BATCH_FILES[1].path, "utf8"));
const contingencyRows = parseCsv(await readFile(BATCH_FILES[2].path, "utf8"));
const contingencyTwoRows = parseCsv(await readFile(BATCH_FILES[3].path, "utf8"));
const feedbackText = await readFile(FEEDBACK_FILE, "utf8");
const contactInboxStatusText = await readFile(CONTACT_INBOX_STATUS_FILE, "utf8").catch(() => "");
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
const noRepliesPosted = noFounderRepliesPosted && noAdvisorRepliesPosted;
const feedbackSignals = extractFeedbackSignals(feedbackText);
const inboxCheckedAt = extractInboxCheckedAt(contactInboxStatusText);
const inboxRealSubmissions = extractInboxMetric(contactInboxStatusText, "Real submissions");
const inboxTeardowns = extractInboxMetric(contactInboxStatusText, "Real free async teardown submissions");
const inboxPartnerRequests = extractInboxMetric(contactInboxStatusText, "Real partner requests");
const inboxTaggedValidation = extractInboxMetric(contactInboxStatusText, "Real tagged validation replies");
const inboxHasRealSubmissions = hasRealInboxSubmission(contactInboxStatusText);
const shouldQueueAdvisorCopyRefresh = feedbackSignals.advisorOwnership > feedbackSignals.founderOwnership && feedbackSignals.advisorOwnership > 0;
const homepageQueueState = extractQueueState(homepageQueueText);
const decisionHeadline = extractDecisionHeadline(decisionBriefText);
const positioningHeadline = extractPositioningHeadline(positioningBriefText);
const contingencyNotes = describeContingencyNotes(contingencyRows, contingencyTwoRows);

const output = [
  "# NoticeKit Validation Status",
  "",
  `Date: ${now}`,
  "",
  "## Current Read",
  "",
  "- Highest-priority incomplete work: exact buyer validation through real interviews.",
  `- Next executable validation step: monitor ` + "`COMMUNITY-FEEDBACK.md`" + ` and ` + "`CONTACT-INBOX-STATUS.md`" + ` for the first real reply or intake, then convert it into the right evidence log.`,
  describeFollowUpState("Founder follow-up pass", followUpDate, founderBatchRows),
  describeFollowUpState("Advisor follow-up pass", advisorFollowUpDate, advisorBatchRows),
  describeBatchPosition("Batch 03", contingencyRows),
  describeBatchPosition("Batch 04", contingencyTwoRows),
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
  `- ` + "`COMMUNITY-FEEDBACK.md`" + ` currently says: ${noRepliesPosted ? "no replies from the active outreach batches have been posted yet." : "replies are present and need review."}`,
  `- Interview log rows: ${interviewRows.length}`,
  `- Founder batch reply or bounce rows recorded in CSV: ${founderReplies}`,
  `- Advisor batch reply or bounce rows recorded in CSV: ${advisorReplies}`,
  `- Tagged self-audit replies logged: ${feedbackSignals.sourceTags.length} (${feedbackSignals.founderFollowUpReplies} founder-follow-up, ${feedbackSignals.advisorFollowUpReplies} advisor-follow-up)`,
  `- Self-audit channels logged: ${feedbackSignals.channels.length} (${feedbackSignals.inPageFormChannels} in-page-form, ${feedbackSignals.mailtoChannels} mailto)`,
  `- Self-audit score bands logged: ${feedbackSignals.lowScoreBands} low (0-4), ${feedbackSignals.mediumScoreBands} medium (5-7), ${feedbackSignals.highScoreBands} high (8-10)`,
  `- Ownership signals logged: ${feedbackSignals.founderOwnership} founder/operator, ${feedbackSignals.advisorOwnership} consultant/attorney`,
  `- Contact inbox check: ${inboxCheckedAt === "unknown" ? "missing; run \`npm run build:contact-inbox-status\`." : `last checked ${inboxCheckedAt}`}`,
  `- Real inbox submissions: ${inboxRealSubmissions == null ? "unknown" : inboxRealSubmissions}`,
  `- Real free async teardown submissions: ${inboxTeardowns == null ? "unknown" : inboxTeardowns}`,
  `- Real partner requests: ${inboxPartnerRequests == null ? "unknown" : inboxPartnerRequests}`,
  `- Real tagged validation replies in inbox: ${inboxTaggedValidation == null ? "unknown" : inboxTaggedValidation}`,
  "",
  "## Notes",
  "",
  "- Use `scripts/record-validation-feedback.mjs --input <json>` when a reply arrives.",
  "- Use `CONTACT-INBOX-STATUS.md` as the live intake snapshot for `free_async_teardown`, `partner_request`, and tagged self-audit submissions.",
  "- Use `scripts/append-validation-interview.mjs --input <json>` only after a real conversation or specific referral.",
  `- Decision brief: ${decisionHeadline === "unknown" ? "missing; run \`npm run build:validation-decision-brief\`." : `\`VALIDATION-DECISION-BRIEF.md\` says: ${decisionHeadline}`}`,
  `- Positioning brief: ${positioningHeadline === "unknown" ? "missing; run \`node scripts/build-validation-positioning-brief.mjs\`." : `\`VALIDATION-POSITIONING-BRIEF.md\` says: ${positioningHeadline}`}`,
  `- Homepage advisor-handoff copy refresh queue: ${shouldQueueAdvisorCopyRefresh ? "queue it now based on logged ownership signals." : "not triggered."}`,
  `- Queue file: ${homepageQueueState === "unknown" ? "missing; run \`npm run build:homepage-copy-refresh-queue\`." : `\`HOMEPAGE-COPY-REFRESH-QUEUE.md\` is ${homepageQueueState}.`}`,
  `- Inbox evidence read: ${contactInboxStatusText ? (inboxHasRealSubmissions ? "real intake exists and needs manual triage." : "no real intake is stored in Blob yet.") : "inbox snapshot missing."}`,
  ...contingencyNotes,
  ""
].join("\n");

await writeFile(OUTPUT, output);
console.log(`Wrote ${OUTPUT}`);
