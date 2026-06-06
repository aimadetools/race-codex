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
const HELP_REQUEST_STATUS_FILE = join(ROOT, "HELP-REQUEST-STATUS.md");
const GENERATOR_PRODUCTION_STATUS_FILE = join(ROOT, "GENERATOR-PRODUCTION-STATUS.md");
const GENERATOR_HANDOFF_STATUS_FILE = join(ROOT, "GENERATOR-HANDOFF-STATUS.md");
const PARTNER_OUTREACH_STATUS_FILE = join(ROOT, "PARTNER-OUTREACH-STATUS.md");
const BENCHMARK_OUTREACH_STATUS_FILE = join(ROOT, "BENCHMARK-OUTREACH-STATUS.md");
const AI_AGENT_REVIEW_OUTREACH_STATUS_FILE = join(ROOT, "AI-AGENT-REVIEW-OUTREACH-STATUS.md");
const AI_AUDIT_OUTREACH_STATUS_FILE = join(ROOT, "AI-AUDIT-OUTREACH-STATUS.md");
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

function extractBenchmarkMetric(text, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`- ${escaped}: (\\d+)`, "i"));
  return match ? Number(match[1]) : null;
}

function extractBenchmarkAction(text) {
  const match = text.match(/- Next benchmark action:\s*([^\n]+)/i);
  return match ? match[1].trim() : "unknown";
}

function extractBenchmarkCheckedAt(text) {
  const match = text.match(/Checked at:\s*([^\n]+)/i);
  return match ? match[1].trim() : "unknown";
}

function extractOutreachAction(text, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`- ${escaped}:\\s*([^\\n]+)`, "i"));
  return match ? match[1].trim() : "unknown";
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

function parseUtcTimestamp(value) {
  const text = String(value || "").trim();
  let match = text.match(/^(\d{4})-(\d{2})-(\d{2}) (\d{2}):(\d{2}) UTC$/);
  if (match) {
    const [, year, month, day, hour, minute] = match;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), Number(hour), Number(minute)));
  }

  match = text.match(/^(\d{4})-(\d{2})-(\d{2}) UTC$/);
  if (match) {
    const [, year, month, day] = match;
    return new Date(Date.UTC(Number(year), Number(month) - 1, Number(day), 0, 0));
  }

  return null;
}

function formatRelativeAge(target, now = new Date()) {
  if (!(target instanceof Date) || Number.isNaN(target.getTime())) {
    return "age unknown";
  }

  const diffMs = now.getTime() - target.getTime();
  const future = diffMs < 0;
  const absoluteMs = Math.abs(diffMs);
  const minutes = Math.floor(absoluteMs / 60000);
  const hours = Math.floor(absoluteMs / 3600000);
  const days = Math.floor(absoluteMs / 86400000);

  if (minutes < 1) {
    return future ? "in under 1 minute" : "less than 1 minute ago";
  }

  if (minutes < 60) {
    return future
      ? `in ${minutes} minute${minutes === 1 ? "" : "s"}`
      : `${minutes} minute${minutes === 1 ? "" : "s"} ago`;
  }

  if (hours < 48) {
    return future
      ? `in ${hours} hour${hours === 1 ? "" : "s"}`
      : `${hours} hour${hours === 1 ? "" : "s"} ago`;
  }

  return future
    ? `in ${days} day${days === 1 ? "" : "s"}`
    : `${days} day${days === 1 ? "" : "s"} ago`;
}

function describeFreshness(timestampText, now = new Date()) {
  if (!timestampText || timestampText === "unknown") {
    return "unknown";
  }

  const parsed = parseUtcTimestamp(timestampText);
  if (!parsed) {
    return timestampText;
  }

  return `${timestampText} (${formatRelativeAge(parsed, now)})`;
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

function extractLatestRecheckTimestamp(text) {
  const matches = [...text.matchAll(/Rechecked on (.+? UTC):/g)];
  let latestText = "unknown";
  let latestDate = null;

  for (const match of matches) {
    const timestampText = match[1].trim();
    const parsed = parseUtcTimestamp(timestampText);
    if (!parsed) {
      continue;
    }

    if (!latestDate || parsed > latestDate) {
      latestDate = parsed;
      latestText = timestampText;
    }
  }

  return latestText;
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

function extractInboxLatestSourceTag(text) {
  const match = text.match(/- Source tag:\s*([^\n]+)/i);
  return match ? match[1].trim() : "unknown";
}

function extractInboxBreakdownMetric(text, heading, label) {
  const escapedHeading = heading.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const escapedLabel = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const sectionPattern = new RegExp(`### ${escapedHeading}\\n\\n([\\s\\S]*?)(?:\\n### |\\n## |$)`, "i");
  const sectionMatch = text.match(sectionPattern);
  if (!sectionMatch) {
    return null;
  }

  const metricMatch = sectionMatch[1].match(new RegExp(`- ${escapedLabel}: (\\d+)`, "i"));
  return metricMatch ? Number(metricMatch[1]) : 0;
}

function sumMetrics(values) {
  if (values.some((value) => value == null)) {
    return null;
  }

  return values.reduce((total, value) => total + value, 0);
}

function formatMetric(value) {
  return value == null ? "unknown" : String(value);
}

function buildWatchedSourceGroup(text, entries) {
  const items = entries.map(({ tag, label }) => ({
    label,
    count: extractInboxBreakdownMetric(text, "Watched Source Tags", tag)
  }));

  return {
    total: sumMetrics(items.map((item) => item.count)),
    items
  };
}

function renderWatchedSourceGroup(label, group) {
  const breakdown = group.items.map((item) => `${formatMetric(item.count)} ${item.label}`).join(", ");
  return `- ${label}: ${formatMetric(group.total)} (${breakdown})`;
}

function extractHelpRequestStatus(text) {
  const match = text.match(/- Status:\s*([^\n]+)/i);
  return match ? match[1].trim().toLowerCase() : "unknown";
}

function extractHelpRequestWhat(text) {
  const match = text.match(/- What:\s*([^\n]+)/i);
  return match ? match[1].trim() : "unknown";
}

function extractHelpRequestCheckedAt(text) {
  const match = text.match(/Checked at:\s*([^\n]+)/i);
  return match ? match[1].trim() : "unknown";
}

function extractHelpRequestBlockers(text) {
  const sectionMatch = text.match(/## Open Blockers\s+([\s\S]*?)(?:\n## |\s*$)/i);
  if (!sectionMatch) {
    return [];
  }

  return sectionMatch[1]
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.replace(/^- /, "").trim())
    .filter(Boolean);
}

function extractHelpRequestConstraints(text) {
  const sectionMatch = text.match(/## Active Constraints\s+([\s\S]*?)(?:\n## |\s*$)/i);
  if (!sectionMatch) {
    return [];
  }

  return sectionMatch[1]
    .split(/\r?\n/)
    .map((line) => line.trim())
    .filter((line) => line.startsWith("- "))
    .map((line) => line.replace(/^- /, "").trim())
    .filter(Boolean);
}

function extractGeneratorStatus(text) {
  const match = text.match(/- Status:\s*([^\n]+)/i);
  return match ? match[1].trim().toLowerCase() : "unknown";
}

function extractGeneratorCheckedAt(text) {
  const match = text.match(/Checked at:\s*([^\n]+)/i);
  return match ? match[1].trim() : "unknown";
}

function extractGeneratorHandoffStatus(text) {
  const match = text.match(/- Status:\s*([^\n]+)/i);
  return match ? match[1].trim().toLowerCase() : "unknown";
}

function extractGeneratorHandoffCheckedAt(text) {
  const match = text.match(/Checked at:\s*([^\n]+)/i);
  return match ? match[1].trim() : "unknown";
}

function extractPartnerMetric(text, label) {
  const escaped = label.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
  const match = text.match(new RegExp(`- ${escaped}: (\\d+)`, "i"));
  return match ? Number(match[1]) : null;
}

function extractPartnerAction(text) {
  const match = text.match(/- Next partner action:\s*([^\n]+)/i);
  return match ? match[1].trim() : "unknown";
}

function extractPartnerReadiness(text) {
  const match = text.match(/- Follow-up readiness:\s*([^\n]+)/i);
  return match ? match[1].trim() : "unknown";
}

function extractPartnerCheckedAt(text) {
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

const currentDate = new Date();
const now = currentDate.toISOString().slice(0, 10);
const founderBatchRows = parseCsv(await readFile(BATCH_FILES[0].path, "utf8"));
const advisorBatchRows = parseCsv(await readFile(BATCH_FILES[1].path, "utf8"));
const contingencyRows = parseCsv(await readFile(BATCH_FILES[2].path, "utf8"));
const contingencyTwoRows = parseCsv(await readFile(BATCH_FILES[3].path, "utf8"));
const feedbackText = await readFile(FEEDBACK_FILE, "utf8");
const contactInboxStatusText = await readFile(CONTACT_INBOX_STATUS_FILE, "utf8").catch(() => "");
const helpRequestStatusText = await readFile(HELP_REQUEST_STATUS_FILE, "utf8").catch(() => "");
const generatorProductionStatusText = await readFile(GENERATOR_PRODUCTION_STATUS_FILE, "utf8").catch(() => "");
const generatorHandoffStatusText = await readFile(GENERATOR_HANDOFF_STATUS_FILE, "utf8").catch(() => "");
const partnerOutreachStatusText = await readFile(PARTNER_OUTREACH_STATUS_FILE, "utf8").catch(() => "");
const benchmarkOutreachStatusText = await readFile(BENCHMARK_OUTREACH_STATUS_FILE, "utf8").catch(() => "");
const agentReviewOutreachStatusText = await readFile(AI_AGENT_REVIEW_OUTREACH_STATUS_FILE, "utf8").catch(() => "");
const auditOutreachStatusText = await readFile(AI_AUDIT_OUTREACH_STATUS_FILE, "utf8").catch(() => "");
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
const feedbackCheckedAt = extractLatestRecheckTimestamp(feedbackText);
const feedbackSignals = extractFeedbackSignals(feedbackText);
const inboxCheckedAt = extractInboxCheckedAt(contactInboxStatusText);
const inboxRealSubmissions = extractInboxMetric(contactInboxStatusText, "Real submissions");
const inboxTeardowns = extractInboxMetric(contactInboxStatusText, "Real free async teardown submissions");
const inboxPartnerRequests = extractInboxMetric(contactInboxStatusText, "Real partner requests");
const inboxTaggedValidation = extractInboxMetric(contactInboxStatusText, "Real tagged validation replies");
const inboxLatestSourceTag = extractInboxLatestSourceTag(contactInboxStatusText);
const inboxTrackerTemplate = extractInboxBreakdownMetric(contactInboxStatusText, "By Source Tag", "blog-dpa-objection-window-template");
const inboxTrackerCta = extractInboxBreakdownMetric(contactInboxStatusText, "By Source Tag", "blog-dpa-objection-window-cta");
const inboxTeardownHomepage = extractInboxBreakdownMetric(contactInboxStatusText, "Free Async Teardown Source Families", "homepage");
const inboxTeardownPricing = extractInboxBreakdownMetric(contactInboxStatusText, "Free Async Teardown Source Families", "pricing");
const inboxTeardownAbout = extractInboxBreakdownMetric(contactInboxStatusText, "Free Async Teardown Source Families", "about");
const inboxTeardownGenerator = extractInboxBreakdownMetric(contactInboxStatusText, "Free Async Teardown Source Families", "generator");
const inboxTeardownHub = extractInboxBreakdownMetric(contactInboxStatusText, "Free Async Teardown Source Families", "hub");
const inboxTeardownChecker = extractInboxBreakdownMetric(contactInboxStatusText, "Free Async Teardown Source Families", "checker");
const inboxTeardownAiDisclosurePacket = extractInboxBreakdownMetric(contactInboxStatusText, "Free Async Teardown Source Families", "ai-disclosure-packet");
const inboxTeardownAiStack = extractInboxBreakdownMetric(contactInboxStatusText, "Free Async Teardown Source Families", "ai-stack");
const inboxTeardownTracker = extractInboxBreakdownMetric(contactInboxStatusText, "Free Async Teardown Source Families", "tracker");
const inboxTeardownReviewBriefBuilder = extractInboxBreakdownMetric(contactInboxStatusText, "Free Async Teardown Source Families", "review-brief-builder");
const inboxTeardownBlog = extractInboxBreakdownMetric(contactInboxStatusText, "Free Async Teardown Source Families", "blog");
const inboxTeardownOutreach = extractInboxBreakdownMetric(contactInboxStatusText, "Free Async Teardown Source Families", "outreach");
const inboxTeardownOther = extractInboxBreakdownMetric(contactInboxStatusText, "Free Async Teardown Source Families", "other");
const inboxOwnershipFounder = extractInboxBreakdownMetric(contactInboxStatusText, "By Ownership Signal", "founder");
const inboxOwnershipOperator = extractInboxBreakdownMetric(contactInboxStatusText, "By Ownership Signal", "operator");
const inboxOwnershipConsultant = extractInboxBreakdownMetric(contactInboxStatusText, "By Ownership Signal", "privacy consultant");
const inboxOwnershipFractionalDpo = extractInboxBreakdownMetric(contactInboxStatusText, "By Ownership Signal", "fractional dpo");
const inboxOwnershipAttorney = extractInboxBreakdownMetric(contactInboxStatusText, "By Ownership Signal", "attorney");
const inboxOwnershipOther = extractInboxBreakdownMetric(contactInboxStatusText, "By Ownership Signal", "other");
const inboxOwnershipUnknown = extractInboxBreakdownMetric(contactInboxStatusText, "By Ownership Signal", "unknown");
const inboxTeardownOwnershipFounder = extractInboxBreakdownMetric(contactInboxStatusText, "Free Async Teardown Ownership Signals", "founder");
const inboxTeardownOwnershipOperator = extractInboxBreakdownMetric(contactInboxStatusText, "Free Async Teardown Ownership Signals", "operator");
const inboxTeardownOwnershipConsultant = extractInboxBreakdownMetric(contactInboxStatusText, "Free Async Teardown Ownership Signals", "privacy consultant");
const inboxTeardownOwnershipFractionalDpo = extractInboxBreakdownMetric(contactInboxStatusText, "Free Async Teardown Ownership Signals", "fractional dpo");
const inboxTeardownOwnershipAttorney = extractInboxBreakdownMetric(contactInboxStatusText, "Free Async Teardown Ownership Signals", "attorney");
const inboxTeardownOwnershipOther = extractInboxBreakdownMetric(contactInboxStatusText, "Free Async Teardown Ownership Signals", "other");
const inboxTeardownOwnershipUnknown = extractInboxBreakdownMetric(contactInboxStatusText, "Free Async Teardown Ownership Signals", "unknown");
const inboxPartnerGoalReferralOnly = extractInboxBreakdownMetric(contactInboxStatusText, "Partner Request Goals", "referral_only");
const inboxPartnerGoalClientDelivery = extractInboxBreakdownMetric(contactInboxStatusText, "Partner Request Goals", "client_delivery");
const inboxPartnerGoalWhiteLabel = extractInboxBreakdownMetric(contactInboxStatusText, "Partner Request Goals", "white_label");
const inboxPartnerGoalOther = extractInboxBreakdownMetric(contactInboxStatusText, "Partner Request Goals", "other");
const inboxPartnerGoalUnknown = extractInboxBreakdownMetric(contactInboxStatusText, "Partner Request Goals", "unknown");
const inboxFreeToolsHero = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "free-tools-hero");
const inboxFreeToolsAiStackGuide = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "free-tools-ai-stack-guide");
const inboxFreeToolsAiQuestionnaire = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "free-tools-ai-questionnaire");
const inboxFreeToolsAiPacket = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "free-tools-ai-packet");
const inboxFreeToolsAiPacketSample = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "free-tools-ai-packet-sample");
const inboxFreeToolsGenerator = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "free-tools-generator");
const inboxFreeToolsGeneratorCard = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "free-tools-generator-card");
const inboxFreeToolsSelfAudit = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "free-tools-self-audit");
const inboxFreeToolsPageChecker = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "free-tools-page-checker");
const inboxFreeToolsBriefBuilder = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "free-tools-brief-builder");
const inboxFreeToolsDeadline = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "free-tools-deadline");
const inboxFreeToolsTracker = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "free-tools-tracker");
const inboxFreeToolsConversion = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "free-tools-conversion");
const inboxFreeToolsPartner = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "free-tools-partner");
const inboxFreeToolsRouteFinder = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "free-tools-route-finder");
const inboxAiDisclosurePacketStack = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "ai-disclosure-packet-stack");
const inboxAiDisclosurePacketNotice = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "ai-disclosure-packet-notice");
const inboxAiDisclosurePacketBrief = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "ai-disclosure-packet-brief");
const inboxAiDisclosurePacketTeardown = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "ai-disclosure-packet-teardown");
const inboxAiDisclosurePacketPricing = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "ai-disclosure-packet-pricing");
const inboxAiDisclosurePacketBottom = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "ai-disclosure-packet-bottom");
const inboxAiDisclosurePacketSample = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "ai-disclosure-packet-sample");
const inboxAiStackDisclosurePacket = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "ai-stack-template-disclosure-packet");
const inboxAiStackChecker = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "ai-stack-template-checker");
const inboxAiStackNoticeCsv = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "ai-stack-template-notice-csv");
const inboxAiStackNoticeDeadline = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "ai-stack-template-notice-deadline");
const inboxAiStackNoticeGenerator = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "ai-stack-template-notice-generator");
const inboxAiStackNoticeTeardown = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "ai-stack-template-notice-teardown");
const inboxAiStackNoticePricing = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "ai-stack-template-notice-pricing");
const inboxAiStackDownloadTeardown = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "ai-stack-template-download-teardown");
const inboxAiStackDownloadPricing = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "ai-stack-template-download-pricing");
const inboxAiStackTeardown = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "ai-stack-template-teardown");
const inboxAiStackPricing = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "ai-stack-template-pricing");
const inboxCheckerTeardown = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "blog-subprocessor-page-checker-teardown");
const inboxCheckerPricing = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "blog-subprocessor-page-checker-pricing");
const inboxCheckerPartner = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "blog-subprocessor-page-checker-partner");
const inboxGeneratorPage = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "generator-page");
const inboxGeneratorCta = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "generator-cta");
const inboxReviewBriefTeardown = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "review-brief-builder-teardown");
const inboxReviewBriefPartner = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "review-brief-builder-partner");
const inboxSampleTeardownHero = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "sample-teardown-hero");
const inboxSampleTeardownCta = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "sample-teardown-cta");
const inboxSampleTeardownPartner = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "sample-teardown-partner");
const inboxKitPreviewHero = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "kit-preview-hero");
const inboxKitPreviewGrid = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "kit-preview-grid");
const inboxKitPreviewBottom = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "kit-preview-bottom");
const inboxKitPreviewAiPacket = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "kit-preview-ai-packet");
const inboxPartnerPreviewHero = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "partner-preview-hero");
const inboxPartnerPreviewCta = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "partner-preview-cta");
const inboxPartnerClientHandoffHero = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "partner-client-handoff-hero");
const inboxPartnerClientHandoffFounder = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "partner-client-handoff-founder");
const inboxPartnerClientHandoffTeardown = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "partner-client-handoff-teardown");
const inboxPartnerClientHandoffCta = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "partner-client-handoff-cta");
const inboxSampleTeardownAiPacket = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "sample-teardown-ai-packet");
const inboxSampleAiPacketGuide = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "sample-ai-packet-guide");
const inboxSampleAiPacketStack = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "sample-ai-packet-stack");
const inboxSampleAiPacketTeardown = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "sample-ai-packet-teardown");
const inboxSampleAiPacketPricing = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "sample-ai-packet-pricing");
const inboxStartHereAiDisclosurePacket = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "start-here-ai-disclosure-packet");
const inboxStartHereAiQuestionnaire = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "start-here-ai-questionnaire");
const inboxStartHereAiPacketSample = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "start-here-ai-packet-sample");
const inboxStartHereAiRiskAssessment = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "start-here-ai-risk-assessment");
const inboxStartHereAiRiskWorksheet = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "start-here-ai-risk-worksheet");
const inboxStartHereAiStackGuide = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "start-here-ai-stack-guide");
const inboxAuditRequestAiPacket = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "audit-request-ai-packet");
const inboxAuditRequestAiStack = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "audit-request-ai-stack");
const inboxPricingAiDisclosurePacket = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "pricing-ai-disclosure-packet");
const inboxPricingAiRiskAssessment = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "pricing-ai-risk-assessment");
const inboxPricingAiRiskWorksheet = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "pricing-ai-risk-worksheet");
const inboxPricingAiQuestionnaire = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "pricing-ai-questionnaire");
const inboxPricingAiPacketSample = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "pricing-ai-packet-sample");
const inboxHomepageAiQuestionnaire = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "homepage-ai-questionnaire");
const inboxHomepageAiPacketSample = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "homepage-ai-packet-sample");
const inboxHomepageAiRiskAssessment = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "homepage-ai-risk-assessment");
const inboxHomepageAiRiskWorksheet = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "homepage-ai-risk-worksheet");
const inboxBlogIndexAiQuestionnaire = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "blog-index-ai-questionnaire");
const inboxBlogIndexAiPacketSample = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "blog-index-ai-packet-sample");
const inboxBlogIndexAiRiskAssessment = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "blog-index-ai-risk-assessment");
const inboxBlogIndexAiRiskWorksheet = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "blog-index-ai-risk-worksheet");
const inboxAiSecurityQuestionnaireGuide = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "ai-security-questionnaire-guide");
const inboxAiSecurityQuestionnaireSample = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "ai-security-questionnaire-sample");
const inboxAiSecurityQuestionnaireStack = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "ai-security-questionnaire-stack");
const inboxAiSecurityQuestionnaireTeardown = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "ai-security-questionnaire-teardown");
const inboxAiSecurityQuestionnairePricing = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "ai-security-questionnaire-pricing");
const inboxCommunityAiRiskAssessment = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "community-ai-risk-assessment");
const inboxAiProcurementHubRiskAssessment = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "ai-procurement-hub-risk-assessment");
const inboxAiProcurementHubRiskWorksheet = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "ai-procurement-hub-risk-worksheet");
const inboxFreeToolsAiRiskAssessment = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "free-tools-ai-risk-assessment");
const inboxFreeToolsAiRiskWorksheet = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "free-tools-ai-risk-worksheet");
const inboxAiVendorRiskAssessmentSample = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "ai-vendor-risk-assessment-sample");
const inboxAiVendorRiskAssessmentGuide = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "ai-vendor-risk-assessment-guide");
const inboxAiVendorRiskAssessmentStack = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "ai-vendor-risk-assessment-stack");
const inboxAiVendorRiskAssessmentTeardown = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "ai-vendor-risk-assessment-teardown");
const inboxAiVendorRiskAssessmentPricing = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "ai-vendor-risk-assessment-pricing");
const inboxAiVendorRiskAssessmentWorksheet = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "ai-vendor-risk-assessment-worksheet");
const inboxAiVendorRiskAssessmentWorksheetChecklist = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "ai-vendor-risk-assessment-worksheet-checklist");
const inboxAiVendorRiskAssessmentWorksheetSample = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "ai-vendor-risk-assessment-worksheet-sample");
const inboxAiVendorRiskAssessmentWorksheetGuide = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "ai-vendor-risk-assessment-worksheet-guide");
const inboxAiVendorRiskAssessmentWorksheetStack = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "ai-vendor-risk-assessment-worksheet-stack");
const inboxAiVendorRiskAssessmentWorksheetTeardown = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "ai-vendor-risk-assessment-worksheet-teardown");
const inboxAiVendorRiskAssessmentWorksheetPricing = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "ai-vendor-risk-assessment-worksheet-pricing");
const inboxPartnerBatch = extractInboxBreakdownMetric(contactInboxStatusText, "By Source Tag", "partner-outreach-batch-01");
const inboxPartnerFollowUp = extractInboxBreakdownMetric(contactInboxStatusText, "By Source Tag", "partner-outreach-follow-up-01");
const inboxFounderFollowUpTeardown = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "founder-follow-up-teardown");
const inboxAdvisorFollowUpTeardown = extractInboxBreakdownMetric(contactInboxStatusText, "Watched Source Tags", "advisor-follow-up-teardown");
const inboxHasRealSubmissions = hasRealInboxSubmission(contactInboxStatusText);
const helpRequestStatus = extractHelpRequestStatus(helpRequestStatusText);
const helpRequestWhat = extractHelpRequestWhat(helpRequestStatusText);
const helpRequestCheckedAt = extractHelpRequestCheckedAt(helpRequestStatusText);
const helpRequestBlockers = extractHelpRequestBlockers(helpRequestStatusText);
const helpRequestConstraints = extractHelpRequestConstraints(helpRequestStatusText);
const helpRequestDependencyNotes = helpRequestBlockers.length > 0 ? helpRequestBlockers : helpRequestConstraints;
const generatorProductionStatus = extractGeneratorStatus(generatorProductionStatusText);
const generatorProductionCheckedAt = extractGeneratorCheckedAt(generatorProductionStatusText);
const generatorHandoffStatus = extractGeneratorHandoffStatus(generatorHandoffStatusText);
const generatorHandoffCheckedAt = extractGeneratorHandoffCheckedAt(generatorHandoffStatusText);
const partnerOutreachCheckedAt = extractPartnerCheckedAt(partnerOutreachStatusText);
const partnerReadyToSend = extractPartnerMetric(partnerOutreachStatusText, "Ready to send");
const partnerSentWaiting = extractPartnerMetric(partnerOutreachStatusText, "Sent and waiting on reply");
const partnerReplied = extractPartnerMetric(partnerOutreachStatusText, "Replied");
const partnerFollowUpReadiness = extractPartnerReadiness(partnerOutreachStatusText);
const partnerNextAction = extractPartnerAction(partnerOutreachStatusText);
const benchmarkOutreachCheckedAt = extractBenchmarkCheckedAt(benchmarkOutreachStatusText);
const benchmarkSentWaiting = extractBenchmarkMetric(benchmarkOutreachStatusText, "Sent and waiting on reply");
const benchmarkFollowedUpWaiting = extractBenchmarkMetric(benchmarkOutreachStatusText, "Followed up and waiting on reply");
const benchmarkInboxSubmissions = extractBenchmarkMetric(benchmarkOutreachStatusText, "Benchmark-tagged inbox submissions");
const benchmarkNextAction = extractBenchmarkAction(benchmarkOutreachStatusText);
const agentReviewOutreachCheckedAt = extractBenchmarkCheckedAt(agentReviewOutreachStatusText);
const agentReviewSentWaiting = extractBenchmarkMetric(agentReviewOutreachStatusText, "Sent and waiting on reply");
const agentReviewFollowedUpWaiting = extractBenchmarkMetric(agentReviewOutreachStatusText, "Followed up and waiting on reply");
const agentReviewInboxSubmissions = extractBenchmarkMetric(agentReviewOutreachStatusText, "Agent-review-tagged inbox submissions");
const agentReviewNextAction = extractOutreachAction(agentReviewOutreachStatusText, "Next AI agent review action");
const auditOutreachCheckedAt = extractBenchmarkCheckedAt(auditOutreachStatusText);
const auditSentWaiting = extractBenchmarkMetric(auditOutreachStatusText, "Sent and waiting on reply");
const auditFollowedUpWaiting = extractBenchmarkMetric(auditOutreachStatusText, "Followed up and waiting on reply");
const auditTerminalRows = extractBenchmarkMetric(auditOutreachStatusText, "Terminal rows (reply/bounce/interview)");
const auditNextAction = extractOutreachAction(auditOutreachStatusText, "Next audit action");
const aiFirstEntryWatch = buildWatchedSourceGroup(contactInboxStatusText, [
  { tag: "start-here-card", label: "start-here teardown" },
  { tag: "about-page", label: "about teardown" },
  { tag: "partner-preview-hero", label: "partner-preview hero" },
  { tag: "partner-preview-cta", label: "partner-preview cta" },
  { tag: "homepage-hero", label: "homepage hero" },
  { tag: "homepage-shortcut", label: "homepage shortcut" },
  { tag: "homepage-job-one-answer", label: "homepage one-answer" },
  { tag: "homepage-job-repeat-review", label: "homepage repeat-review" },
  { tag: "homepage-ai-route-one-answer", label: "homepage route one-answer" },
  { tag: "homepage-ai-route-repeat-review", label: "homepage route repeat-review" },
  { tag: "homepage-ai-route-broader-handoff", label: "homepage broader-handoff" },
  { tag: "pricing-ai-deal-blocker", label: "pricing starter-pack" },
  { tag: "pricing-ai-route-one-answer", label: "pricing route one-answer" },
  { tag: "pricing-ai-route-repeat-review", label: "pricing route repeat-review" },
  { tag: "pricing-ai-route-broader-handoff", label: "pricing broader-handoff" }
]);
const dueDiligenceWatch = buildWatchedSourceGroup(contactInboxStatusText, [
  { tag: "blog-index-ai-due-diligence", label: "blog template" },
  { tag: "blog-index-ai-due-diligence-scorecard", label: "blog scorecard" },
  { tag: "free-tools-ai-due-diligence", label: "free-tools template" },
  { tag: "ai-procurement-hub-due-diligence", label: "hub template" },
  { tag: "ai-procurement-hub-due-diligence-scorecard", label: "hub scorecard" },
  { tag: "pricing-ai-due-diligence", label: "pricing template" },
  { tag: "pricing-ai-due-diligence-scorecard", label: "pricing scorecard" },
  { tag: "start-here-ai-due-diligence", label: "start-here template" },
  { tag: "start-here-ai-due-diligence-scorecard", label: "start-here scorecard" },
  { tag: "about-page-due-diligence", label: "about template" },
  { tag: "about-page-due-diligence-scorecard", label: "about scorecard" },
  { tag: "ai-due-diligence-scorecard", label: "scorecard page" },
  { tag: "ai-due-diligence-scorecard-template", label: "scorecard template" },
  { tag: "ai-due-diligence-evidence-map", label: "due-diligence evidence-map" },
  { tag: "ai-due-diligence-risk-checklist", label: "due-diligence risk-checklist" },
  { tag: "ai-due-diligence-starter-pack", label: "due-diligence starter-pack" },
  { tag: "ai-due-diligence-builder", label: "due-diligence builder" },
  { tag: "ai-due-diligence-answer-bank", label: "due-diligence answer-bank" },
  { tag: "ai-due-diligence-teardown", label: "due-diligence teardown" },
  { tag: "ai-due-diligence-audit", label: "due-diligence audit" },
  { tag: "ai-due-diligence-audit-sample", label: "due-diligence audit sample" }
]);
const aiAgentWatch = buildWatchedSourceGroup(contactInboxStatusText, [
  { tag: "blog-index-ai-agent-review", label: "blog review" },
  { tag: "blog-index-ai-agent-approval-gate", label: "blog approval-gate" },
  { tag: "free-tools-ai-agent-review", label: "free-tools review" },
  { tag: "free-tools-ai-agent-approval-gate", label: "free-tools approval-gate" },
  { tag: "ai-procurement-hub-agent-review", label: "hub review" },
  { tag: "ai-procurement-hub-agent-approval-gate", label: "hub approval-gate" },
  { tag: "ai-path-guide-agent-review", label: "path-guide review" },
  { tag: "ai-path-guide-agent-approval-gate", label: "path-guide approval-gate" },
  { tag: "start-here-ai-agent-review", label: "start-here review" },
  { tag: "start-here-ai-agent-approval-gate", label: "start-here approval-gate" },
  { tag: "homepage-ai-route-agent-review", label: "homepage review" },
  { tag: "homepage-ai-route-agent-approval-gate", label: "homepage approval-gate" },
  { tag: "pricing-ai-agent-review", label: "pricing review" },
  { tag: "pricing-ai-agent-approval-gate", label: "pricing approval-gate" },
  { tag: "ai-security-questionnaire-starter-pack-agent-review", label: "starter-pack review" },
  { tag: "ai-security-questionnaire-starter-pack-agent-approval-gate", label: "starter-pack approval-gate" }
]);
const aiAgentGapReadWatch = buildWatchedSourceGroup(contactInboxStatusText, [
  { tag: "agent-review-outreach-batch-01", label: "outreach gap-read" },
  { tag: "ai-agent-review-teardown", label: "tool-access gap-read" },
  { tag: "ai-agent-approval-gate-teardown", label: "approval-gate gap-read" },
  { tag: "agent-review-checklist-teardown", label: "checklist gap-read" },
  { tag: "ai-agent-workspace-teardown", label: "workspace gap-read" }
]);
const auditRouteWatch = buildWatchedSourceGroup(contactInboxStatusText, [
  { tag: "homepage-nav-audit", label: "homepage nav" },
  { tag: "pricing-nav-audit", label: "pricing nav" },
  { tag: "pricing-concierge-card", label: "pricing concierge card" },
  { tag: "start-here-nav-audit", label: "start-here nav" },
  { tag: "about-nav-audit", label: "about nav" },
  { tag: "free-tools-nav-audit", label: "free-tools nav" },
  { tag: "ai-procurement-hub-nav-audit", label: "procurement hub nav" },
  { tag: "kit-preview-nav-audit", label: "kit-preview nav" },
  { tag: "purchase-next-steps-audit", label: "purchase next steps" },
  { tag: "audit-request-nav-audit", label: "audit-request nav" },
  { tag: "audit-request-hero-audit", label: "audit-request hero" },
  { tag: "audit-request-side-panel", label: "audit-request side panel" },
  { tag: "blog-nav-audit", label: "blog nav" },
  { tag: "ai-answer-builder-nav-audit", label: "builder nav" },
  { tag: "ai-evidence-map-nav-audit", label: "evidence-map nav" },
  { tag: "ai-agent-gap-read-nav-audit", label: "agent gap-read nav" },
  { tag: "ai-agent-workspace-nav-audit", label: "agent-workspace nav" },
  { tag: "ai-answer-bank-nav-audit", label: "answer-bank nav" },
  { tag: "ai-follow-up-pack-nav-audit", label: "follow-up pack nav" },
  { tag: "ai-pro-kit-nav-audit", label: "pro-kit nav" },
  { tag: "ai-starter-pack-nav-audit", label: "starter-pack nav" },
  { tag: "ai-bundle-sample-nav-audit", label: "bundle sample nav" },
  { tag: "ai-risk-worksheet-nav-audit", label: "risk worksheet nav" },
  { tag: "openai-answer-template-nav-audit", label: "OpenAI template nav" },
  { tag: "openai-answer-bank-nav-audit", label: "OpenAI answer-bank nav" },
  { tag: "anthropic-answer-template-nav-audit", label: "Anthropic template nav" },
  { tag: "anthropic-answer-bank-nav-audit", label: "Anthropic answer-bank nav" },
  { tag: "blog-ai-agent-approval-gate-nav-audit", label: "AI blog approval-gate nav" },
  { tag: "blog-ai-agent-checklist-nav-audit", label: "AI blog checklist nav" },
  { tag: "blog-ai-agent-tool-access-nav-audit", label: "AI blog tool-access nav" },
  { tag: "blog-ai-answer-bank-vs-builder-nav-audit", label: "AI blog bank-vs-builder nav" },
  { tag: "blog-ai-answer-library-comparison-nav-audit", label: "AI blog library comparison nav" },
  { tag: "blog-ai-answer-bank-vs-pro-kit-nav-audit", label: "AI blog bank-vs-pro-kit nav" },
  { tag: "blog-ai-answer-example-nav-audit", label: "AI blog answer-example nav" },
  { tag: "blog-ai-answer-template-nav-audit", label: "AI blog answer-template nav" },
  { tag: "blog-ai-disclosure-packet-nav-audit", label: "AI blog disclosure-packet nav" },
  { tag: "blog-ai-follow-up-questions-nav-audit", label: "AI blog follow-up nav" },
  { tag: "blog-ai-path-guide-nav-audit", label: "AI blog path-guide nav" },
  { tag: "blog-ai-saas-list-template-nav-audit", label: "AI SaaS list-template nav" },
  { tag: "blog-ai-saas-notice-template-nav-audit", label: "AI SaaS notice-template nav" },
  { tag: "blog-ai-starter-pack-vs-builder-nav-audit", label: "AI blog starter-pack-vs-builder nav" },
  { tag: "blog-ai-questionnaire-nav-audit", label: "AI blog questionnaire nav" },
  { tag: "blog-ai-training-stance-nav-audit", label: "AI blog training-stance nav" },
  { tag: "blog-ai-inventory-nav-audit", label: "AI blog inventory nav" },
  { tag: "blog-ai-risk-assessment-nav-audit", label: "AI blog risk-assessment nav" },
  { tag: "blog-openai-bank-vs-builder-nav-audit", label: "OpenAI blog bank-vs-builder nav" },
  { tag: "blog-openai-answer-example-nav-audit", label: "OpenAI blog answer-example nav" },
  { tag: "blog-openai-answer-template-nav-audit", label: "OpenAI blog answer-template nav" },
  { tag: "blog-openai-path-guide-nav-audit", label: "OpenAI blog path-guide nav" },
  { tag: "blog-anthropic-bank-vs-builder-nav-audit", label: "Anthropic blog bank-vs-builder nav" },
  { tag: "blog-anthropic-answer-example-nav-audit", label: "Anthropic blog answer-example nav" },
  { tag: "blog-anthropic-path-guide-nav-audit", label: "Anthropic blog path-guide nav" },
  { tag: "free-teardown-nav-audit", label: "free teardown nav" },
  { tag: "generator-nav-audit", label: "generator nav" },
  { tag: "partner-client-handoff-nav-audit", label: "partner handoff nav" },
  { tag: "partner-preview-nav-audit", label: "partner preview nav" },
  { tag: "sample-ai-packet-nav-audit", label: "sample packet nav" },
  { tag: "sample-teardown-nav-audit", label: "sample teardown nav" },
  { tag: "self-audit-nav-audit", label: "self-audit nav" },
  { tag: "site-utility-nav-audit", label: "utility page nav" }
]);
const auditSampleProofWatch = {
  items: [
    {
      label: "audit email sample",
      count: extractInboxBreakdownMetric(contactInboxStatusText, "Audit Sample Proof Source Tags", "ai-audit-email-sample")
    },
    {
      label: "audit page sample",
      count: extractInboxBreakdownMetric(contactInboxStatusText, "Audit Sample Proof Source Tags", "ai-audit-page-sample")
    },
    {
      label: "audit sample page",
      count: extractInboxBreakdownMetric(contactInboxStatusText, "Audit Sample Proof Source Tags", "ai-audit-sample-page")
    },
    {
      label: "homepage audit sample",
      count: extractInboxBreakdownMetric(contactInboxStatusText, "Audit Sample Proof Source Tags", "homepage-audit-sample")
    },
    {
      label: "free-tools audit sample",
      count: extractInboxBreakdownMetric(contactInboxStatusText, "Audit Sample Proof Source Tags", "free-tools-audit-sample")
    },
    {
      label: "pricing audit sample",
      count: extractInboxBreakdownMetric(contactInboxStatusText, "Audit Sample Proof Source Tags", "pricing-audit-sample")
    }
  ]
};
auditSampleProofWatch.total = sumMetrics(auditSampleProofWatch.items.map((entry) => entry.count));
const openAiWatch = buildWatchedSourceGroup(contactInboxStatusText, [
  { tag: "blog-index-openai-answer-template", label: "blog template" },
  { tag: "blog-index-openai-answer-example", label: "blog example" },
  { tag: "blog-index-openai-answer-bank", label: "blog answer-bank" },
  { tag: "blog-index-openai-path-guide", label: "blog path-guide" },
  { tag: "free-tools-openai-answer-template", label: "free-tools template" },
  { tag: "free-tools-openai-answer-example", label: "free-tools example" },
  { tag: "free-tools-openai-answer-bank", label: "free-tools answer-bank" },
  { tag: "ai-procurement-hub-openai-answer-template", label: "hub template" },
  { tag: "ai-procurement-hub-openai-answer-example", label: "hub example" },
  { tag: "ai-procurement-hub-openai-answer-bank", label: "hub answer-bank" },
  { tag: "ai-procurement-hub-openai-path-guide", label: "hub path-guide" },
  { tag: "homepage-ai-route-openai-template", label: "homepage template" },
  { tag: "homepage-ai-route-openai-example", label: "homepage example" },
  { tag: "homepage-ai-route-openai-answer-bank", label: "homepage answer-bank" },
  { tag: "homepage-ai-route-openai-path-guide", label: "homepage path-guide" },
  { tag: "pricing-openai-answer-template", label: "pricing template" },
  { tag: "pricing-openai-answer-bank", label: "pricing answer-bank" },
  { tag: "pricing-openai-path-guide", label: "pricing path-guide" },
  { tag: "ai-security-questionnaire-starter-pack-openai-answer-template", label: "starter-pack template" },
  { tag: "ai-security-questionnaire-starter-pack-openai-answer-example", label: "starter-pack example" },
  { tag: "ai-security-questionnaire-starter-pack-openai-answer-bank", label: "starter-pack answer-bank" },
  { tag: "ai-security-questionnaire-starter-pack-openai-path-guide", label: "starter-pack path-guide" }
]);
const anthropicWatch = buildWatchedSourceGroup(contactInboxStatusText, [
  { tag: "free-tools-anthropic-answer-template", label: "free-tools template" },
  { tag: "free-tools-anthropic-answer-example", label: "free-tools example" },
  { tag: "free-tools-anthropic-answer-bank", label: "free-tools answer-bank" },
  { tag: "ai-procurement-hub-anthropic-answer-template", label: "hub template" },
  { tag: "ai-procurement-hub-anthropic-answer-example", label: "hub example" },
  { tag: "ai-procurement-hub-anthropic-answer-bank", label: "hub answer-bank" },
  { tag: "ai-procurement-hub-anthropic-path-guide", label: "hub path-guide" },
  { tag: "homepage-ai-route-anthropic-template", label: "homepage template" },
  { tag: "homepage-ai-route-anthropic-example", label: "homepage example" },
  { tag: "homepage-ai-route-anthropic-answer-bank", label: "homepage answer-bank" },
  { tag: "homepage-ai-route-anthropic-path-guide", label: "homepage path-guide" },
  { tag: "ai-path-guide-anthropic-template", label: "generic path-guide template" },
  { tag: "ai-path-guide-anthropic-example", label: "generic path-guide example" },
  { tag: "ai-path-guide-anthropic-route-guide", label: "generic path-guide route guide" }
]);
const benchmarkRouteWatch = buildWatchedSourceGroup(contactInboxStatusText, [
  { tag: "benchmark-outreach-batch-01", label: "outreach batch" },
  { tag: "benchmark-outreach-report", label: "outreach report" },
  { tag: "community-benchmark-report", label: "community report" },
  { tag: "community-benchmark-report-procurement", label: "community procurement" },
  { tag: "homepage-benchmark-report", label: "homepage report" },
  { tag: "free-tools-benchmark-report", label: "free-tools report" },
  { tag: "blog-index-benchmark-report", label: "blog-index report" },
  { tag: "benchmark-report-teardown", label: "report teardown" },
  { tag: "benchmark-report-tracker", label: "report tracker" }
]);
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
  `- Human-help request state: ${helpRequestStatus === "open" ? `open as of ${helpRequestCheckedAt}` : helpRequestStatus === "blocked" ? `blocked as of ${helpRequestCheckedAt}` : helpRequestStatus === "completed" ? `completed as of ${helpRequestCheckedAt}` : helpRequestStatus === "missing" ? `no active request as of ${helpRequestCheckedAt}` : "missing or unknown"}.`,
  `- Human-help blocker: ${helpRequestDependencyNotes.length > 0 ? helpRequestDependencyNotes[0] : "no related blocker or active constraint is called out in the current help snapshot."}`,
  `- Production generator state: ${generatorProductionCheckedAt === "unknown" ? "missing; run \`npm run build:generator-production-status\`." : generatorProductionStatus === "ok" ? `checked ${generatorProductionCheckedAt}; live generator smoke passed.` : `checked ${generatorProductionCheckedAt}; status ${generatorProductionStatus}.`}`,
  `- Generator handoff state: ${generatorHandoffCheckedAt === "unknown" ? "missing; run \`npm run build:generator-handoff-status\`." : generatorHandoffStatus === "ok" ? `checked ${generatorHandoffCheckedAt}; live generator-to-teardown handoff passed.` : `checked ${generatorHandoffCheckedAt}; status ${generatorHandoffStatus}.`}`,
  `- Benchmark outreach state: ${benchmarkOutreachCheckedAt === "unknown" ? "missing; run \`npm run build:benchmark-outreach-status\`." : `last checked ${benchmarkOutreachCheckedAt}; ${formatMetric(benchmarkSentWaiting)} sent/waiting, ${formatMetric(benchmarkFollowedUpWaiting)} followed_up/waiting, ${formatMetric(benchmarkInboxSubmissions)} inbox submission(s), next action ${benchmarkNextAction.replace(/\.$/, "")}.`}`,
  `- AI agent review outreach state: ${agentReviewOutreachCheckedAt === "unknown" ? "missing; run \`npm run build:ai-agent-review-outreach-status\`." : `last checked ${agentReviewOutreachCheckedAt}; ${formatMetric(agentReviewSentWaiting)} sent/waiting, ${formatMetric(agentReviewFollowedUpWaiting)} followed_up/waiting, ${formatMetric(agentReviewInboxSubmissions)} inbox submission(s), next action ${agentReviewNextAction.replace(/\.$/, "")}.`}`,
  `- AI audit outreach state: ${auditOutreachCheckedAt === "unknown" ? "missing; run \`npm run build:ai-audit-outreach-status\`." : `last checked ${auditOutreachCheckedAt}; ${formatMetric(auditSentWaiting)} sent/waiting, ${formatMetric(auditFollowedUpWaiting)} followed_up/waiting, ${formatMetric(auditTerminalRows)} terminal row(s), next action ${auditNextAction.replace(/\.$/, "")}.`}`,
  `- Partner outreach state: ${partnerOutreachCheckedAt === "unknown" ? "missing; run \`npm run build:partner-outreach-status\`." : `last checked ${partnerOutreachCheckedAt}; ${partnerReadyToSend == null ? "unknown" : partnerReadyToSend} ready, ${partnerSentWaiting == null ? "unknown" : partnerSentWaiting} sent/waiting, ${partnerReplied == null ? "unknown" : partnerReplied} replied.`}`,
  `- Partner follow-up readiness: ${partnerFollowUpReadiness === "unknown" ? "missing from the current partner status snapshot." : partnerFollowUpReadiness}`,
  describeFollowUpState("Founder follow-up pass", followUpDate, founderBatchRows),
  describeFollowUpState("Advisor follow-up pass", advisorFollowUpDate, advisorBatchRows),
  describeBatchPosition("Batch 03", contingencyRows),
  describeBatchPosition("Batch 04", contingencyTwoRows),
  "",
  "## Watch Freshness",
  "",
  `- Community feedback checkpoint: ${describeFreshness(feedbackCheckedAt, currentDate)}`,
  `- Contact inbox snapshot: ${describeFreshness(inboxCheckedAt, currentDate)}`,
  `- Human-help snapshot: ${describeFreshness(helpRequestCheckedAt, currentDate)}`,
  `- Generator production snapshot: ${describeFreshness(generatorProductionCheckedAt, currentDate)}`,
  `- Generator handoff snapshot: ${describeFreshness(generatorHandoffCheckedAt, currentDate)}`,
  `- Benchmark-outreach snapshot: ${describeFreshness(benchmarkOutreachCheckedAt, currentDate)}`,
  `- AI-agent-review snapshot: ${describeFreshness(agentReviewOutreachCheckedAt, currentDate)}`,
  `- AI-audit snapshot: ${describeFreshness(auditOutreachCheckedAt, currentDate)}`,
  `- Partner-outreach snapshot: ${describeFreshness(partnerOutreachCheckedAt, currentDate)}`,
  "",
  "## Batch Snapshot",
  "",
  renderBatchSummary(BATCH_FILES[0].label, founderBatchRows),
  renderBatchSummary(BATCH_FILES[1].label, advisorBatchRows),
  renderBatchSummary(BATCH_FILES[2].label, contingencyRows),
  renderBatchSummary(BATCH_FILES[3].label, contingencyTwoRows),
  "",
  "## Priority Route Watch",
  "",
  renderWatchedSourceGroup("AI-first entry-point inbox submissions", aiFirstEntryWatch),
  renderWatchedSourceGroup("Dedicated audit-route inbox submissions", auditRouteWatch),
  renderWatchedSourceGroup("Audit sample-proof inbox submissions", auditSampleProofWatch),
  renderWatchedSourceGroup("Due-diligence route inbox submissions", dueDiligenceWatch),
  renderWatchedSourceGroup("AI-agent-control inbox submissions", aiAgentWatch),
  renderWatchedSourceGroup("AI-agent gap-read inbox submissions", aiAgentGapReadWatch),
  renderWatchedSourceGroup("OpenAI route inbox submissions", openAiWatch),
  renderWatchedSourceGroup("Anthropic route inbox submissions", anthropicWatch),
  renderWatchedSourceGroup("Benchmark-led route inbox submissions", benchmarkRouteWatch),
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
  `- Human-help request check: ${helpRequestCheckedAt === "unknown" ? "missing; run \`npm run build:help-request-status\`." : `last checked ${helpRequestCheckedAt}`}`,
  `- Generator production check: ${generatorProductionCheckedAt === "unknown" ? "missing; run \`npm run build:generator-production-status\`." : `last checked ${generatorProductionCheckedAt}`}`,
  `- Generator handoff check: ${generatorHandoffCheckedAt === "unknown" ? "missing; run \`npm run build:generator-handoff-status\`." : `last checked ${generatorHandoffCheckedAt}`}`,
  `- Partner-outreach check: ${partnerOutreachCheckedAt === "unknown" ? "missing; run \`npm run build:partner-outreach-status\`." : `last checked ${partnerOutreachCheckedAt}`}`,
  `- Real inbox submissions: ${inboxRealSubmissions == null ? "unknown" : inboxRealSubmissions}`,
  `- Inbox ownership signals: ${sumMetrics([inboxOwnershipFounder, inboxOwnershipOperator, inboxOwnershipConsultant, inboxOwnershipFractionalDpo, inboxOwnershipAttorney, inboxOwnershipOther, inboxOwnershipUnknown]) == null ? "unknown" : sumMetrics([inboxOwnershipFounder, inboxOwnershipOperator, inboxOwnershipConsultant, inboxOwnershipFractionalDpo, inboxOwnershipAttorney, inboxOwnershipOther, inboxOwnershipUnknown])} (${inboxOwnershipFounder == null ? "unknown" : inboxOwnershipFounder} founder, ${inboxOwnershipOperator == null ? "unknown" : inboxOwnershipOperator} operator, ${inboxOwnershipConsultant == null ? "unknown" : inboxOwnershipConsultant} privacy consultant, ${inboxOwnershipFractionalDpo == null ? "unknown" : inboxOwnershipFractionalDpo} fractional dpo, ${inboxOwnershipAttorney == null ? "unknown" : inboxOwnershipAttorney} attorney, ${inboxOwnershipOther == null ? "unknown" : inboxOwnershipOther} other, ${inboxOwnershipUnknown == null ? "unknown" : inboxOwnershipUnknown} unknown)`,
  `- Real free async teardown submissions: ${inboxTeardowns == null ? "unknown" : inboxTeardowns}`,
  `- Free async teardown source families: ${sumMetrics([inboxTeardownHomepage, inboxTeardownPricing, inboxTeardownAbout, inboxTeardownGenerator, inboxTeardownHub, inboxTeardownChecker, inboxTeardownAiDisclosurePacket, inboxTeardownAiStack, inboxTeardownTracker, inboxTeardownReviewBriefBuilder, inboxTeardownBlog, inboxTeardownOutreach, inboxTeardownOther]) == null ? "unknown" : sumMetrics([inboxTeardownHomepage, inboxTeardownPricing, inboxTeardownAbout, inboxTeardownGenerator, inboxTeardownHub, inboxTeardownChecker, inboxTeardownAiDisclosurePacket, inboxTeardownAiStack, inboxTeardownTracker, inboxTeardownReviewBriefBuilder, inboxTeardownBlog, inboxTeardownOutreach, inboxTeardownOther])} (${inboxTeardownHomepage == null ? "unknown" : inboxTeardownHomepage} homepage, ${inboxTeardownPricing == null ? "unknown" : inboxTeardownPricing} pricing, ${inboxTeardownAbout == null ? "unknown" : inboxTeardownAbout} about, ${inboxTeardownGenerator == null ? "unknown" : inboxTeardownGenerator} generator, ${inboxTeardownHub == null ? "unknown" : inboxTeardownHub} hub, ${inboxTeardownChecker == null ? "unknown" : inboxTeardownChecker} checker, ${inboxTeardownAiDisclosurePacket == null ? "unknown" : inboxTeardownAiDisclosurePacket} ai-disclosure-packet, ${inboxTeardownAiStack == null ? "unknown" : inboxTeardownAiStack} ai-stack, ${inboxTeardownTracker == null ? "unknown" : inboxTeardownTracker} tracker, ${inboxTeardownReviewBriefBuilder == null ? "unknown" : inboxTeardownReviewBriefBuilder} review-brief-builder, ${inboxTeardownBlog == null ? "unknown" : inboxTeardownBlog} blog, ${inboxTeardownOutreach == null ? "unknown" : inboxTeardownOutreach} outreach, ${inboxTeardownOther == null ? "unknown" : inboxTeardownOther} other)`,
  `- Free async teardown ownership signals: ${sumMetrics([inboxTeardownOwnershipFounder, inboxTeardownOwnershipOperator, inboxTeardownOwnershipConsultant, inboxTeardownOwnershipFractionalDpo, inboxTeardownOwnershipAttorney, inboxTeardownOwnershipOther, inboxTeardownOwnershipUnknown]) == null ? "unknown" : sumMetrics([inboxTeardownOwnershipFounder, inboxTeardownOwnershipOperator, inboxTeardownOwnershipConsultant, inboxTeardownOwnershipFractionalDpo, inboxTeardownOwnershipAttorney, inboxTeardownOwnershipOther, inboxTeardownOwnershipUnknown])} (${inboxTeardownOwnershipFounder == null ? "unknown" : inboxTeardownOwnershipFounder} founder, ${inboxTeardownOwnershipOperator == null ? "unknown" : inboxTeardownOwnershipOperator} operator, ${inboxTeardownOwnershipConsultant == null ? "unknown" : inboxTeardownOwnershipConsultant} privacy consultant, ${inboxTeardownOwnershipFractionalDpo == null ? "unknown" : inboxTeardownOwnershipFractionalDpo} fractional dpo, ${inboxTeardownOwnershipAttorney == null ? "unknown" : inboxTeardownOwnershipAttorney} attorney, ${inboxTeardownOwnershipOther == null ? "unknown" : inboxTeardownOwnershipOther} other, ${inboxTeardownOwnershipUnknown == null ? "unknown" : inboxTeardownOwnershipUnknown} unknown)`,
  `- Real partner requests: ${inboxPartnerRequests == null ? "unknown" : inboxPartnerRequests}`,
  `- Partner request goals logged: ${sumMetrics([inboxPartnerGoalReferralOnly, inboxPartnerGoalClientDelivery, inboxPartnerGoalWhiteLabel, inboxPartnerGoalOther, inboxPartnerGoalUnknown]) == null ? "unknown" : sumMetrics([inboxPartnerGoalReferralOnly, inboxPartnerGoalClientDelivery, inboxPartnerGoalWhiteLabel, inboxPartnerGoalOther, inboxPartnerGoalUnknown])} (${inboxPartnerGoalReferralOnly == null ? "unknown" : inboxPartnerGoalReferralOnly} referral_only, ${inboxPartnerGoalClientDelivery == null ? "unknown" : inboxPartnerGoalClientDelivery} client_delivery, ${inboxPartnerGoalWhiteLabel == null ? "unknown" : inboxPartnerGoalWhiteLabel} white_label, ${inboxPartnerGoalOther == null ? "unknown" : inboxPartnerGoalOther} other, ${inboxPartnerGoalUnknown == null ? "unknown" : inboxPartnerGoalUnknown} unknown)`,
  `- Real tagged validation replies in inbox: ${inboxTaggedValidation == null ? "unknown" : inboxTaggedValidation}`,
  `- Checker-led inbox submissions: ${(inboxCheckerTeardown == null || inboxCheckerPricing == null || inboxCheckerPartner == null) ? "unknown" : inboxCheckerTeardown + inboxCheckerPricing + inboxCheckerPartner} (${inboxCheckerTeardown == null ? "unknown" : inboxCheckerTeardown} teardown, ${inboxCheckerPricing == null ? "unknown" : inboxCheckerPricing} pricing, ${inboxCheckerPartner == null ? "unknown" : inboxCheckerPartner} partner)`,
  `- Tracker-led inbox submissions: ${(inboxTrackerTemplate == null || inboxTrackerCta == null) ? "unknown" : inboxTrackerTemplate + inboxTrackerCta} (${inboxTrackerTemplate == null ? "unknown" : inboxTrackerTemplate} download CTA, ${inboxTrackerCta == null ? "unknown" : inboxTrackerCta} teardown CTA)`,
  `- Generator-led inbox submissions: ${(inboxGeneratorPage == null || inboxGeneratorCta == null) ? "unknown" : inboxGeneratorPage + inboxGeneratorCta} (${inboxGeneratorPage == null ? "unknown" : inboxGeneratorPage} page, ${inboxGeneratorCta == null ? "unknown" : inboxGeneratorCta} CTA)`,
  `- AI vendor risk assessment inbox submissions: ${sumMetrics([inboxHomepageAiRiskAssessment, inboxHomepageAiRiskWorksheet, inboxBlogIndexAiRiskAssessment, inboxBlogIndexAiRiskWorksheet, inboxFreeToolsAiRiskAssessment, inboxFreeToolsAiRiskWorksheet, inboxAiProcurementHubRiskAssessment, inboxAiProcurementHubRiskWorksheet, inboxPricingAiRiskAssessment, inboxPricingAiRiskWorksheet, inboxStartHereAiRiskAssessment, inboxStartHereAiRiskWorksheet, inboxCommunityAiRiskAssessment, inboxAiVendorRiskAssessmentWorksheet, inboxAiVendorRiskAssessmentSample, inboxAiVendorRiskAssessmentGuide, inboxAiVendorRiskAssessmentStack, inboxAiVendorRiskAssessmentTeardown, inboxAiVendorRiskAssessmentPricing, inboxAiVendorRiskAssessmentWorksheetChecklist, inboxAiVendorRiskAssessmentWorksheetSample, inboxAiVendorRiskAssessmentWorksheetGuide, inboxAiVendorRiskAssessmentWorksheetStack, inboxAiVendorRiskAssessmentWorksheetTeardown, inboxAiVendorRiskAssessmentWorksheetPricing]) == null ? "unknown" : sumMetrics([inboxHomepageAiRiskAssessment, inboxHomepageAiRiskWorksheet, inboxBlogIndexAiRiskAssessment, inboxBlogIndexAiRiskWorksheet, inboxFreeToolsAiRiskAssessment, inboxFreeToolsAiRiskWorksheet, inboxAiProcurementHubRiskAssessment, inboxAiProcurementHubRiskWorksheet, inboxPricingAiRiskAssessment, inboxPricingAiRiskWorksheet, inboxStartHereAiRiskAssessment, inboxStartHereAiRiskWorksheet, inboxCommunityAiRiskAssessment, inboxAiVendorRiskAssessmentWorksheet, inboxAiVendorRiskAssessmentSample, inboxAiVendorRiskAssessmentGuide, inboxAiVendorRiskAssessmentStack, inboxAiVendorRiskAssessmentTeardown, inboxAiVendorRiskAssessmentPricing, inboxAiVendorRiskAssessmentWorksheetChecklist, inboxAiVendorRiskAssessmentWorksheetSample, inboxAiVendorRiskAssessmentWorksheetGuide, inboxAiVendorRiskAssessmentWorksheetStack, inboxAiVendorRiskAssessmentWorksheetTeardown, inboxAiVendorRiskAssessmentWorksheetPricing])} (${inboxHomepageAiRiskAssessment == null ? "unknown" : inboxHomepageAiRiskAssessment} homepage checklist, ${inboxHomepageAiRiskWorksheet == null ? "unknown" : inboxHomepageAiRiskWorksheet} homepage worksheet, ${inboxBlogIndexAiRiskAssessment == null ? "unknown" : inboxBlogIndexAiRiskAssessment} blog-index checklist, ${inboxBlogIndexAiRiskWorksheet == null ? "unknown" : inboxBlogIndexAiRiskWorksheet} blog-index worksheet, ${inboxFreeToolsAiRiskAssessment == null ? "unknown" : inboxFreeToolsAiRiskAssessment} free-tools checklist, ${inboxFreeToolsAiRiskWorksheet == null ? "unknown" : inboxFreeToolsAiRiskWorksheet} free-tools worksheet, ${inboxAiProcurementHubRiskAssessment == null ? "unknown" : inboxAiProcurementHubRiskAssessment} procurement hub checklist, ${inboxAiProcurementHubRiskWorksheet == null ? "unknown" : inboxAiProcurementHubRiskWorksheet} procurement hub worksheet, ${inboxPricingAiRiskAssessment == null ? "unknown" : inboxPricingAiRiskAssessment} pricing checklist, ${inboxPricingAiRiskWorksheet == null ? "unknown" : inboxPricingAiRiskWorksheet} pricing worksheet, ${inboxStartHereAiRiskAssessment == null ? "unknown" : inboxStartHereAiRiskAssessment} start-here checklist, ${inboxStartHereAiRiskWorksheet == null ? "unknown" : inboxStartHereAiRiskWorksheet} start-here worksheet, ${inboxCommunityAiRiskAssessment == null ? "unknown" : inboxCommunityAiRiskAssessment} community reply, ${inboxAiVendorRiskAssessmentWorksheet == null ? "unknown" : inboxAiVendorRiskAssessmentWorksheet} checklist-to-worksheet CTA, ${inboxAiVendorRiskAssessmentSample == null ? "unknown" : inboxAiVendorRiskAssessmentSample} checklist sample CTA, ${inboxAiVendorRiskAssessmentGuide == null ? "unknown" : inboxAiVendorRiskAssessmentGuide} checklist guide CTA, ${inboxAiVendorRiskAssessmentStack == null ? "unknown" : inboxAiVendorRiskAssessmentStack} checklist stack CTA, ${inboxAiVendorRiskAssessmentTeardown == null ? "unknown" : inboxAiVendorRiskAssessmentTeardown} checklist teardown CTA, ${inboxAiVendorRiskAssessmentPricing == null ? "unknown" : inboxAiVendorRiskAssessmentPricing} checklist pricing CTA, ${inboxAiVendorRiskAssessmentWorksheetChecklist == null ? "unknown" : inboxAiVendorRiskAssessmentWorksheetChecklist} worksheet checklist CTA, ${inboxAiVendorRiskAssessmentWorksheetSample == null ? "unknown" : inboxAiVendorRiskAssessmentWorksheetSample} worksheet sample CTA, ${inboxAiVendorRiskAssessmentWorksheetGuide == null ? "unknown" : inboxAiVendorRiskAssessmentWorksheetGuide} worksheet guide CTA, ${inboxAiVendorRiskAssessmentWorksheetStack == null ? "unknown" : inboxAiVendorRiskAssessmentWorksheetStack} worksheet stack CTA, ${inboxAiVendorRiskAssessmentWorksheetTeardown == null ? "unknown" : inboxAiVendorRiskAssessmentWorksheetTeardown} worksheet teardown CTA, ${inboxAiVendorRiskAssessmentWorksheetPricing == null ? "unknown" : inboxAiVendorRiskAssessmentWorksheetPricing} worksheet pricing CTA)`,
  `- AI disclosure packet inbox submissions: ${(inboxAiDisclosurePacketStack == null || inboxAiDisclosurePacketNotice == null || inboxAiDisclosurePacketBrief == null || inboxAiDisclosurePacketTeardown == null || inboxAiDisclosurePacketPricing == null || inboxAiDisclosurePacketBottom == null || inboxAiDisclosurePacketSample == null || inboxPricingAiDisclosurePacket == null || inboxPricingAiPacketSample == null || inboxPricingAiQuestionnaire == null || inboxStartHereAiDisclosurePacket == null || inboxStartHereAiQuestionnaire == null || inboxStartHereAiPacketSample == null || inboxAuditRequestAiPacket == null || inboxSampleTeardownAiPacket == null || inboxKitPreviewAiPacket == null || inboxHomepageAiQuestionnaire == null || inboxHomepageAiPacketSample == null || inboxBlogIndexAiQuestionnaire == null || inboxBlogIndexAiPacketSample == null || inboxFreeToolsAiQuestionnaire == null || inboxFreeToolsAiPacketSample == null || inboxAiSecurityQuestionnaireGuide == null || inboxAiSecurityQuestionnaireSample == null || inboxAiSecurityQuestionnaireStack == null || inboxAiSecurityQuestionnaireTeardown == null || inboxAiSecurityQuestionnairePricing == null || inboxSampleAiPacketGuide == null || inboxSampleAiPacketStack == null || inboxSampleAiPacketTeardown == null || inboxSampleAiPacketPricing == null) ? "unknown" : inboxAiDisclosurePacketStack + inboxAiDisclosurePacketNotice + inboxAiDisclosurePacketBrief + inboxAiDisclosurePacketTeardown + inboxAiDisclosurePacketPricing + inboxAiDisclosurePacketBottom + inboxAiDisclosurePacketSample + inboxPricingAiDisclosurePacket + inboxPricingAiPacketSample + inboxPricingAiQuestionnaire + inboxStartHereAiDisclosurePacket + inboxStartHereAiQuestionnaire + inboxStartHereAiPacketSample + inboxAuditRequestAiPacket + inboxSampleTeardownAiPacket + inboxKitPreviewAiPacket + inboxHomepageAiQuestionnaire + inboxHomepageAiPacketSample + inboxBlogIndexAiQuestionnaire + inboxBlogIndexAiPacketSample + inboxFreeToolsAiQuestionnaire + inboxFreeToolsAiPacketSample + inboxAiSecurityQuestionnaireGuide + inboxAiSecurityQuestionnaireSample + inboxAiSecurityQuestionnaireStack + inboxAiSecurityQuestionnaireTeardown + inboxAiSecurityQuestionnairePricing + inboxSampleAiPacketGuide + inboxSampleAiPacketStack + inboxSampleAiPacketTeardown + inboxSampleAiPacketPricing} (${inboxAiDisclosurePacketStack == null ? "unknown" : inboxAiDisclosurePacketStack} stack bridge, ${inboxAiDisclosurePacketNotice == null ? "unknown" : inboxAiDisclosurePacketNotice} notice bridge, ${inboxAiDisclosurePacketBrief == null ? "unknown" : inboxAiDisclosurePacketBrief} brief bridge, ${inboxAiDisclosurePacketTeardown == null ? "unknown" : inboxAiDisclosurePacketTeardown} teardown, ${inboxAiDisclosurePacketPricing == null ? "unknown" : inboxAiDisclosurePacketPricing} pricing, ${inboxAiDisclosurePacketBottom == null ? "unknown" : inboxAiDisclosurePacketBottom} bottom CTA, ${inboxAiDisclosurePacketSample == null ? "unknown" : inboxAiDisclosurePacketSample} sample bridge, ${inboxPricingAiDisclosurePacket == null ? "unknown" : inboxPricingAiDisclosurePacket} pricing page guide, ${inboxPricingAiPacketSample == null ? "unknown" : inboxPricingAiPacketSample} pricing page sample, ${inboxPricingAiQuestionnaire == null ? "unknown" : inboxPricingAiQuestionnaire} pricing page questionnaire, ${inboxStartHereAiDisclosurePacket == null ? "unknown" : inboxStartHereAiDisclosurePacket} start-here guide, ${inboxStartHereAiQuestionnaire == null ? "unknown" : inboxStartHereAiQuestionnaire} start-here questionnaire, ${inboxStartHereAiPacketSample == null ? "unknown" : inboxStartHereAiPacketSample} start-here sample, ${inboxAuditRequestAiPacket == null ? "unknown" : inboxAuditRequestAiPacket} audit-request guide, ${inboxSampleTeardownAiPacket == null ? "unknown" : inboxSampleTeardownAiPacket} sample-teardown guide, ${inboxKitPreviewAiPacket == null ? "unknown" : inboxKitPreviewAiPacket} kit-preview guide, ${inboxHomepageAiQuestionnaire == null ? "unknown" : inboxHomepageAiQuestionnaire} homepage questionnaire, ${inboxHomepageAiPacketSample == null ? "unknown" : inboxHomepageAiPacketSample} homepage sample, ${inboxBlogIndexAiQuestionnaire == null ? "unknown" : inboxBlogIndexAiQuestionnaire} blog-index questionnaire, ${inboxBlogIndexAiPacketSample == null ? "unknown" : inboxBlogIndexAiPacketSample} blog-index sample, ${inboxFreeToolsAiQuestionnaire == null ? "unknown" : inboxFreeToolsAiQuestionnaire} free-tools questionnaire, ${inboxFreeToolsAiPacketSample == null ? "unknown" : inboxFreeToolsAiPacketSample} free-tools sample, ${inboxAiSecurityQuestionnaireGuide == null ? "unknown" : inboxAiSecurityQuestionnaireGuide} questionnaire page guide, ${inboxAiSecurityQuestionnaireSample == null ? "unknown" : inboxAiSecurityQuestionnaireSample} questionnaire page sample, ${inboxAiSecurityQuestionnaireStack == null ? "unknown" : inboxAiSecurityQuestionnaireStack} questionnaire page stack, ${inboxAiSecurityQuestionnaireTeardown == null ? "unknown" : inboxAiSecurityQuestionnaireTeardown} questionnaire page teardown, ${inboxAiSecurityQuestionnairePricing == null ? "unknown" : inboxAiSecurityQuestionnairePricing} questionnaire page pricing, ${inboxSampleAiPacketGuide == null ? "unknown" : inboxSampleAiPacketGuide} sample page guide, ${inboxSampleAiPacketStack == null ? "unknown" : inboxSampleAiPacketStack} sample page stack, ${inboxSampleAiPacketTeardown == null ? "unknown" : inboxSampleAiPacketTeardown} sample page teardown, ${inboxSampleAiPacketPricing == null ? "unknown" : inboxSampleAiPacketPricing} sample page pricing)`,
  `- AI-stack template inbox submissions: ${(inboxAiStackDisclosurePacket == null || inboxAiStackChecker == null || inboxAiStackNoticeCsv == null || inboxAiStackNoticeDeadline == null || inboxAiStackNoticeGenerator == null || inboxAiStackNoticeTeardown == null || inboxAiStackNoticePricing == null || inboxAiStackDownloadTeardown == null || inboxAiStackDownloadPricing == null || inboxAiStackTeardown == null || inboxAiStackPricing == null || inboxStartHereAiStackGuide == null || inboxAuditRequestAiStack == null) ? "unknown" : inboxAiStackDisclosurePacket + inboxAiStackChecker + inboxAiStackNoticeCsv + inboxAiStackNoticeDeadline + inboxAiStackNoticeGenerator + inboxAiStackNoticeTeardown + inboxAiStackNoticePricing + inboxAiStackDownloadTeardown + inboxAiStackDownloadPricing + inboxAiStackTeardown + inboxAiStackPricing + inboxStartHereAiStackGuide + inboxAuditRequestAiStack} (${inboxAiStackDisclosurePacket == null ? "unknown" : inboxAiStackDisclosurePacket} disclosure-packet bridge, ${inboxAiStackChecker == null ? "unknown" : inboxAiStackChecker} checker, ${inboxAiStackNoticeCsv == null ? "unknown" : inboxAiStackNoticeCsv} notice csv, ${inboxAiStackNoticeDeadline == null ? "unknown" : inboxAiStackNoticeDeadline} notice deadline, ${inboxAiStackNoticeGenerator == null ? "unknown" : inboxAiStackNoticeGenerator} notice generator, ${inboxAiStackNoticeTeardown == null ? "unknown" : inboxAiStackNoticeTeardown} notice teardown, ${inboxAiStackNoticePricing == null ? "unknown" : inboxAiStackNoticePricing} notice pricing, ${inboxAiStackDownloadTeardown == null ? "unknown" : inboxAiStackDownloadTeardown} download teardown, ${inboxAiStackDownloadPricing == null ? "unknown" : inboxAiStackDownloadPricing} download pricing, ${inboxAiStackTeardown == null ? "unknown" : inboxAiStackTeardown} general teardown, ${inboxAiStackPricing == null ? "unknown" : inboxAiStackPricing} general pricing, ${inboxStartHereAiStackGuide == null ? "unknown" : inboxStartHereAiStackGuide} start-here guide, ${inboxAuditRequestAiStack == null ? "unknown" : inboxAuditRequestAiStack} audit-request guide)`,
  `- Free-tools hub inbox submissions: ${(inboxFreeToolsHero == null || inboxFreeToolsAiStackGuide == null || inboxFreeToolsAiQuestionnaire == null || inboxFreeToolsAiPacket == null || inboxFreeToolsAiPacketSample == null || inboxFreeToolsGenerator == null || inboxFreeToolsGeneratorCard == null || inboxFreeToolsSelfAudit == null || inboxFreeToolsPageChecker == null || inboxFreeToolsBriefBuilder == null || inboxFreeToolsDeadline == null || inboxFreeToolsTracker == null || inboxFreeToolsConversion == null || inboxFreeToolsPartner == null || inboxFreeToolsRouteFinder == null) ? "unknown" : inboxFreeToolsHero + inboxFreeToolsAiStackGuide + inboxFreeToolsAiQuestionnaire + inboxFreeToolsAiPacket + inboxFreeToolsAiPacketSample + inboxFreeToolsGenerator + inboxFreeToolsGeneratorCard + inboxFreeToolsSelfAudit + inboxFreeToolsPageChecker + inboxFreeToolsBriefBuilder + inboxFreeToolsDeadline + inboxFreeToolsTracker + inboxFreeToolsConversion + inboxFreeToolsPartner + inboxFreeToolsRouteFinder} (${inboxFreeToolsHero == null ? "unknown" : inboxFreeToolsHero} hero, ${inboxFreeToolsAiStackGuide == null ? "unknown" : inboxFreeToolsAiStackGuide} ai-stack guide, ${inboxFreeToolsAiQuestionnaire == null ? "unknown" : inboxFreeToolsAiQuestionnaire} ai-questionnaire guide, ${inboxFreeToolsAiPacket == null ? "unknown" : inboxFreeToolsAiPacket} ai-packet guide, ${inboxFreeToolsAiPacketSample == null ? "unknown" : inboxFreeToolsAiPacketSample} ai-packet sample, ${inboxFreeToolsGenerator == null ? "unknown" : inboxFreeToolsGenerator} generator, ${inboxFreeToolsGeneratorCard == null ? "unknown" : inboxFreeToolsGeneratorCard} generator-card, ${inboxFreeToolsSelfAudit == null ? "unknown" : inboxFreeToolsSelfAudit} self-audit, ${inboxFreeToolsPageChecker == null ? "unknown" : inboxFreeToolsPageChecker} page-checker, ${inboxFreeToolsBriefBuilder == null ? "unknown" : inboxFreeToolsBriefBuilder} brief-builder, ${inboxFreeToolsDeadline == null ? "unknown" : inboxFreeToolsDeadline} deadline, ${inboxFreeToolsTracker == null ? "unknown" : inboxFreeToolsTracker} tracker, ${inboxFreeToolsConversion == null ? "unknown" : inboxFreeToolsConversion} teardown CTA, ${inboxFreeToolsPartner == null ? "unknown" : inboxFreeToolsPartner} partner, ${inboxFreeToolsRouteFinder == null ? "unknown" : inboxFreeToolsRouteFinder} route finder)`,
  `- Review-brief-builder-led inbox submissions: ${(inboxReviewBriefTeardown == null || inboxReviewBriefPartner == null) ? "unknown" : inboxReviewBriefTeardown + inboxReviewBriefPartner} (${inboxReviewBriefTeardown == null ? "unknown" : inboxReviewBriefTeardown} teardown, ${inboxReviewBriefPartner == null ? "unknown" : inboxReviewBriefPartner} partner)`,
  `- Sample-teardown inbox submissions: ${(inboxSampleTeardownHero == null || inboxSampleTeardownCta == null || inboxSampleTeardownPartner == null || inboxSampleTeardownAiPacket == null) ? "unknown" : inboxSampleTeardownHero + inboxSampleTeardownCta + inboxSampleTeardownPartner + inboxSampleTeardownAiPacket} (${inboxSampleTeardownHero == null ? "unknown" : inboxSampleTeardownHero} hero, ${inboxSampleTeardownCta == null ? "unknown" : inboxSampleTeardownCta} CTA, ${inboxSampleTeardownPartner == null ? "unknown" : inboxSampleTeardownPartner} partner, ${inboxSampleTeardownAiPacket == null ? "unknown" : inboxSampleTeardownAiPacket} ai-packet guide)`,
  `- Kit-preview inbox submissions: ${(inboxKitPreviewHero == null || inboxKitPreviewGrid == null || inboxKitPreviewBottom == null || inboxKitPreviewAiPacket == null) ? "unknown" : inboxKitPreviewHero + inboxKitPreviewGrid + inboxKitPreviewBottom + inboxKitPreviewAiPacket} (${inboxKitPreviewHero == null ? "unknown" : inboxKitPreviewHero} hero, ${inboxKitPreviewGrid == null ? "unknown" : inboxKitPreviewGrid} grid, ${inboxKitPreviewBottom == null ? "unknown" : inboxKitPreviewBottom} bottom, ${inboxKitPreviewAiPacket == null ? "unknown" : inboxKitPreviewAiPacket} ai-packet guide)`,
  `- Partner-preview inbox submissions: ${(inboxPartnerPreviewHero == null || inboxPartnerPreviewCta == null) ? "unknown" : inboxPartnerPreviewHero + inboxPartnerPreviewCta} (${inboxPartnerPreviewHero == null ? "unknown" : inboxPartnerPreviewHero} hero, ${inboxPartnerPreviewCta == null ? "unknown" : inboxPartnerPreviewCta} CTA)`,
  `- Partner-client-handoff inbox submissions: ${(inboxPartnerClientHandoffHero == null || inboxPartnerClientHandoffFounder == null || inboxPartnerClientHandoffTeardown == null || inboxPartnerClientHandoffCta == null) ? "unknown" : inboxPartnerClientHandoffHero + inboxPartnerClientHandoffFounder + inboxPartnerClientHandoffTeardown + inboxPartnerClientHandoffCta} (${inboxPartnerClientHandoffHero == null ? "unknown" : inboxPartnerClientHandoffHero} hero, ${inboxPartnerClientHandoffFounder == null ? "unknown" : inboxPartnerClientHandoffFounder} founder teardown, ${inboxPartnerClientHandoffTeardown == null ? "unknown" : inboxPartnerClientHandoffTeardown} teardown CTA, ${inboxPartnerClientHandoffCta == null ? "unknown" : inboxPartnerClientHandoffCta} partner CTA)`,
  `- Follow-up teardown inbox submissions: ${(inboxFounderFollowUpTeardown == null || inboxAdvisorFollowUpTeardown == null) ? "unknown" : inboxFounderFollowUpTeardown + inboxAdvisorFollowUpTeardown} (${inboxFounderFollowUpTeardown == null ? "unknown" : inboxFounderFollowUpTeardown} founder follow-up, ${inboxAdvisorFollowUpTeardown == null ? "unknown" : inboxAdvisorFollowUpTeardown} advisor follow-up)`,
  `- Partner-tagged inbox submissions: ${(inboxPartnerBatch == null || inboxPartnerFollowUp == null) ? "unknown" : inboxPartnerBatch + inboxPartnerFollowUp} (${inboxPartnerBatch == null ? "unknown" : inboxPartnerBatch} initial outreach, ${inboxPartnerFollowUp == null ? "unknown" : inboxPartnerFollowUp} follow-up outreach)`,
  "",
  "## Notes",
  "",
  "- Use `scripts/record-validation-feedback.mjs --input <json>` when a reply arrives.",
  "- Use `CONTACT-INBOX-STATUS.md` as the live intake snapshot for `free_async_teardown`, `partner_request`, and tagged self-audit submissions.",
  `- Human help: ${helpRequestStatus === "open" ? `\`HELP-REQUEST-STATUS.md\` still shows an open request for "${helpRequestWhat}".` : helpRequestStatus === "blocked" ? `\`HELP-REQUEST-STATUS.md\` shows the current request is blocked for "${helpRequestWhat}".` : helpRequestStatus === "completed" ? `\`HELP-REQUEST-STATUS.md\` shows the current request as completed.` : helpRequestStatus === "missing" ? "`HELP-REQUEST-STATUS.md` shows no active request right now." : "help-request status snapshot missing or empty."}`,
  `- Help blocker summary: ${helpRequestDependencyNotes.length > 0 ? helpRequestDependencyNotes[0] : "no related blocker or active constraint is called out in `HELP-REQUEST-STATUS.md`."}`,
  `- Production generator: ${generatorProductionStatus === "ok" ? "`GENERATOR-PRODUCTION-STATUS.md` shows the live generator smoke passing." : generatorProductionCheckedAt === "unknown" ? "status snapshot missing." : `latest smoke check status is ${generatorProductionStatus}.`}`,
  `- Generator handoff: ${generatorHandoffStatus === "ok" ? "`GENERATOR-HANDOFF-STATUS.md` shows the live generator-to-teardown handoff passing." : generatorHandoffCheckedAt === "unknown" ? "status snapshot missing." : `latest handoff check status is ${generatorHandoffStatus}.`}`,
  `- Partner outreach: ${partnerNextAction === "unknown" ? "status snapshot missing or empty." : `\`PARTNER-OUTREACH-STATUS.md\` says the next action is to ${partnerNextAction}`}`,
  "- Use `scripts/append-validation-interview.mjs --input <json>` only after a real conversation or specific referral.",
  `- Decision brief: ${decisionHeadline === "unknown" ? "missing; run \`npm run build:validation-decision-brief\`." : `\`VALIDATION-DECISION-BRIEF.md\` says: ${decisionHeadline}`}`,
  `- Positioning brief: ${positioningHeadline === "unknown" ? "missing; run \`node scripts/build-validation-positioning-brief.mjs\`." : `\`VALIDATION-POSITIONING-BRIEF.md\` says: ${positioningHeadline}`}`,
  `- Homepage advisor-handoff copy refresh queue: ${shouldQueueAdvisorCopyRefresh ? "queue it now based on logged ownership signals." : "not triggered."}`,
  `- Queue file: ${homepageQueueState === "unknown" ? "missing; run \`npm run build:homepage-copy-refresh-queue\`." : `\`HOMEPAGE-COPY-REFRESH-QUEUE.md\` is ${homepageQueueState}.`}`,
  `- Inbox evidence read: ${contactInboxStatusText ? (inboxHasRealSubmissions ? `real intake exists and the latest source tag is ${inboxLatestSourceTag}.` : "no real intake is stored in Blob yet.") : "inbox snapshot missing."}`,
  ...contingencyNotes,
  ""
].join("\n");

await writeFile(OUTPUT, output);
console.log(`Wrote ${OUTPUT}`);
